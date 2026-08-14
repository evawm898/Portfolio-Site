// Shared "Flower designs" gallery — a tiny public JSON store backed by Netlify
// Blobs. No auth: anyone visiting the (eventually public) site can save a design
// and browse all saves. Because it is an unauthenticated public write endpoint,
// every write is validated and rate-limited here (this Function is the only
// enforcement point). Deletes are gated by a per-device "owner token" so a
// browser can remove its own saves but not other people's.
//
// Storage layout in the single site-wide store `flower-designs`:
//   index          -> JSON array of PUBLIC records { id, name, ts, params }
//   tok:<id>       -> { token } the owner token for that id (NEVER returned by GET)
//   rl:<ip>        -> { n, t0 } a per-IP save counter for the current rate window
//
// getStore() is shared across all deploys (production + deploy previews all read
// and write the same gallery), which is the intended "one shared gallery".
import { getStore } from '@netlify/blobs';

// ---- Guardrails / limits (documented; chosen to blunt abuse before the site is public) ----
const MAX_NAME_LEN     = 50;                 // design name characters (sanitized, then capped)
const MAX_RECORD_BYTES = 8 * 1024;           // 8 KB per stored record (name + params JSON)
const MAX_TOTAL_SAVES  = 500;                // global cap on gallery size — new saves rejected past this
const RATE_MAX         = 10;                 // max saves per IP per window
const RATE_WINDOW_MS   = 60 * 60 * 1000;     // rate window = 1 hour
const MAX_PARAM_KEYS   = 200;                // structural caps on the params object
const MAX_KEY_LEN      = 40;
const MAX_STR_VAL_LEN  = 300;
const MIN_TOKEN_LEN    = 8;
const MAX_TOKEN_LEN    = 200;
const KEY_RE = /^[A-Za-z0-9]+$/;             // control ids are plain alphanumerics
const CONTROL_CHARS_RE = /[\x00-\x1F\x7F]/g; // ASCII control characters

const openStore = () => getStore({ name: 'flower-designs', consistency: 'strong' });

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

// Sanitize a user-supplied name: drop control chars, remove angle brackets (so it
// can never inject markup where shown), collapse whitespace, trim, hard-cap length.
function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw
    .replace(CONTROL_CHARS_RE, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > MAX_NAME_LEN) s = s.slice(0, MAX_NAME_LEN);
  return s;
}

// The saved control-panel state must be a FLAT object of primitives — no nested
// objects/arrays, bounded key count, alphanumeric keys, bounded string values.
function validParams(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const keys = Object.keys(p);
  if (keys.length === 0 || keys.length > MAX_PARAM_KEYS) return false;
  for (const k of keys) {
    if (typeof k !== 'string' || k.length === 0 || k.length > MAX_KEY_LEN || !KEY_RE.test(k)) return false;
    const v = p[k];
    const t = typeof v;
    if (t === 'string') { if (v.length > MAX_STR_VAL_LEN) return false; }
    else if (t === 'number') { if (!Number.isFinite(v)) return false; }
    else if (t === 'boolean') { /* ok */ }
    else return false;
  }
  return true;
}

function clientIp(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

function makeId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export default async (req) => {
  const store = openStore();
  try {
    // ---- LIST ----
    if (req.method === 'GET') {
      const index = (await store.get('index', { type: 'json' })) || [];
      return json(200, { designs: index });
    }

    // ---- CREATE ----
    if (req.method === 'POST') {
      let body;
      try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON.' }); }

      const name = sanitizeName(body && body.name);
      if (!name) return json(400, { error: 'A design name is required.' });
      if (!validParams(body && body.params)) return json(400, { error: 'Invalid design parameters.' });

      const ownerToken = typeof body.ownerToken === 'string' ? body.ownerToken.slice(0, MAX_TOKEN_LEN) : '';
      if (ownerToken.length < MIN_TOKEN_LEN) return json(400, { error: 'Missing owner token.' });

      // Per-IP rate limit (best-effort; read-modify-write on a per-IP blob).
      const ip = clientIp(req);
      const now = Date.now();
      const rlKey = 'rl:' + ip;
      const rl = (await store.get(rlKey, { type: 'json' })) || { n: 0, t0: now };
      if (now - rl.t0 > RATE_WINDOW_MS) { rl.n = 0; rl.t0 = now; }
      if (rl.n >= RATE_MAX) return json(429, { error: 'Too many saves from this network. Try again later.' });

      const index = (await store.get('index', { type: 'json' })) || [];
      if (index.length >= MAX_TOTAL_SAVES) return json(507, { error: 'The shared gallery is full.' });

      const record = { id: makeId(), name, ts: now, params: body.params };
      if (Buffer.byteLength(JSON.stringify(record), 'utf8') > MAX_RECORD_BYTES) {
        return json(413, { error: 'This design is too large to save.' });
      }

      index.push(record);
      await store.setJSON('index', index);
      await store.setJSON('tok:' + record.id, { token: ownerToken });
      rl.n += 1;
      await store.setJSON(rlKey, rl);

      return json(201, { design: record });
    }

    // ---- DELETE (owner-token gated) ----
    if (req.method === 'DELETE') {
      const id = new URL(req.url).searchParams.get('id') || '';
      const token = req.headers.get('x-owner-token') || '';
      if (!id) return json(400, { error: 'Missing id.' });
      const tokRec = await store.get('tok:' + id, { type: 'json' });
      if (!tokRec || !token || tokRec.token !== token) return json(403, { error: 'You can only delete your own saves.' });
      const index = (await store.get('index', { type: 'json' })) || [];
      await store.setJSON('index', index.filter((d) => d.id !== id));
      await store.delete('tok:' + id);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed.' });
  } catch (err) {
    return json(500, { error: 'Server error.' });
  }
};
