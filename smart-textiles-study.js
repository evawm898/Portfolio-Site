// smart-textiles-study.js — the page code for /smart-textiles-study.html.
//
// Mounts the study scenes with the note's own player, wires the lab sliders to the scenes' state,
// and runs the games: mnemonic cards (Leitner boxes), the chapter checks, the metal cards, Pick the
// Metal, Which Sensor, Build the Stack and the mixed round. Progress lives in localStorage under
// st-study.v1, guarded so a blocked storage simply means a session with no memory.

import { mount } from './smart-textiles-core.js';
import { STUDY_SCENES, FILS } from './smart-textiles-study-scenes.js';
import { CHAPTERS, CARDS, QUIZ, STATS, METALS, PICK_METAL, WHICH_SENSOR, STACKS } from './smart-textiles-study-data.js';

const KEY = 'st-study.v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const chName = id => CHAPTERS.find(c => c.id === id);
const metal = id => METALS.find(m => m.id === id);
const DARK = new Set(['carbon', 'pedot']);   // swatches that need light lettering

// ---------------------------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------------------------
const blank = () => ({ cards: {}, quiz: {}, games: {} });
let S = blank();
try { const raw = localStorage.getItem(KEY); if (raw) S = { ...blank(), ...JSON.parse(raw) }; } catch { S = blank(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode: no memory */ } paintProgress(); };

const box = id => S.cards[id] || 0;              // 0 new/missed, 1 once, 2 twice, 3 solid
const quizRight = id => !!(S.quiz[id] && S.quiz[id].last);

// ---------------------------------------------------------------------------------------------
// progress: a card counts as known at box 2, a check question once its last answer was right
// ---------------------------------------------------------------------------------------------
function chapterScore(ch) {
  const cards = CARDS.filter(c => c.ch === ch), qs = QUIZ.filter(q => q.ch === ch);
  const items = cards.map(c => Math.min(box(c.id), 2) / 2).concat(qs.map(q => quizRight(q.id) ? 1 : 0));
  return items.length ? items.reduce((a, b) => a + b, 0) / items.length : 0;
}
function paintProgress() {
  const list = $('[data-sx-chapters]'); if (!list) return;
  const scores = CHAPTERS.map(c => chapterScore(c.id));
  list.innerHTML = CHAPTERS.map((c, i) => `<li><a href="${c.anchor}"><span class="n">${c.n}</span><span>${esc(c.name)}</span><span class="sx-bar" aria-hidden="true"><span style="width:${Math.round(scores[i] * 100)}%"></span></span><span class="pct">${Math.round(scores[i] * 100)}%</span></a></li>`).join('');
  const total = scores.reduce((a, b) => a + b, 0) / scores.length;
  $('[data-sx-total]').textContent = `${Math.round(total * 100)}%`;
  $('[data-sx-totalbar]').style.width = `${Math.round(total * 100)}%`;
}

// ---------------------------------------------------------------------------------------------
// scenes and labs
// ---------------------------------------------------------------------------------------------
// The stack picker's buttons must exist before mount() wires every [data-st-for] button.
const stackPick = $('[data-sx-stackpick]');
stackPick.innerHTML = STACKS.map((s, i) => `<button type="button" class="st-btn" data-st-for="stack" data-st-key="id" data-st-value="${s.id}" aria-pressed="${i === 0}">${esc(s.name)}</button>`).join('');

const players = mount(STUDY_SCENES, document, { onState: p => { if (p.name === 'stack') { p.state.sel = -1; paintStackLayers(); } } });
const player = name => players.find(p => p.name === name);
window.__sxPlayers = players;   // test hook, read by tools/smart-textiles/verify-study.mjs

const READOUT = {
  'ohm.V': v => `${(+v).toFixed(1)} V`,
  'ohm.R': v => `${v} Ω`,
  'yarnR.len': v => `${(+v).toFixed(2)} m`,
  'yarnR.fil': v => `${FILS[+v]}`,
  'heater.n': v => `${v}`,
  'heater.len': v => `${(+v).toFixed(2)} m`,
  'divider.press': v => `${Math.round(v * 100)}%`,
  'bucket.gap': v => `${(+v).toFixed(1)} mm`,
};
for (const input of $$('input[data-sx-for]')) {
  const p = player(input.dataset.sxFor), key = input.dataset.sxKey, id = `${input.dataset.sxFor}.${key}`;
  const out = $(`[data-sx-out="${id}"]`);
  const apply = () => {
    if (p) { p.state[key] = +input.value; if (!p.running) p.draw(0.55); }
    if (out && READOUT[id]) out.textContent = READOUT[id](input.value);
  };
  input.addEventListener('input', apply);
  apply();
}

// the stack viewer's layer buttons and detail panel
function paintStackLayers() {
  const p = player('stack'); if (!p) return;
  const st = STACKS.find(s => s.id === p.state.id) || STACKS[0];
  const host = $('[data-sx-layers]');
  host.innerHTML = st.layers.map((l, i) => `<button type="button" class="st-btn" data-layer="${i}" aria-pressed="${+p.state.sel === i}">${i + 1} · ${esc(l.name)}</button>`).join('');
  const detail = $('[data-sx-layerdetail]');
  const sel = +p.state.sel, l = st.layers[sel];
  detail.innerHTML = l
    ? `<b>${esc(l.name)}.</b> ${esc(l.role)}${l.fails ? `<span class="without">${esc(l.fails)}</span>` : ''}`
    : `<b>${esc(st.name)}</b>, ${esc(st.from)} to ${esc(st.to)}. Current ${st.current === 'through' ? 'passes through the layers' : st.current === 'across' ? 'never crosses the gap: the field does' : 'runs along a conductor inside the stack'}. Tap a layer.`;
  for (const b of $$('button', host)) b.addEventListener('click', () => {
    const i = +b.dataset.layer;
    p.state.sel = +p.state.sel === i ? -1 : i;
    p.draw(0.55); paintStackLayers();
  });
}
paintStackLayers();

// ---------------------------------------------------------------------------------------------
// mnemonic cards: one at a time; "Got it" moves the card up a box, "Not yet" sends it back to 0.
// The deck runs lowest box first, so what you miss comes round again before what you know.
// ---------------------------------------------------------------------------------------------
function makeDeck(host) {
  const ch = host.dataset.sxCards;
  const pool = () => (ch === 'review' ? CARDS.filter(c => box(c.id) < 2) : CARDS.filter(c => c.ch === ch));
  let order = [], at = 0, shown = false, listView = false;
  const reorder = () => { order = pool().slice().sort((a, b) => box(a.id) - box(b.id)); at = 0; shown = false; };
  reorder();
  const paint = () => {
    const all = ch === 'review' ? CARDS : CARDS.filter(c => c.ch === ch);
    if (listView) {
      host.innerHTML = `<div class="sx-deck"><div class="sx-deck__bar"><span>All ${all.length} lines</span><button type="button" class="sx-btn" data-a="deck">Back to the deck</button></div>
        <div class="sx-list">${all.map(c => `<div class="sx-mini"><div class="q">${esc(c.front)}</div><div class="h">${esc(c.hook)}</div><div class="box">${['new', 'seen once', 'got it', 'solid'][box(c.id)]}</div></div>`).join('')}</div></div>`;
      $('[data-a="deck"]', host).addEventListener('click', () => { listView = false; reorder(); paint(); });
      return;
    }
    if (!order.length) {
      host.innerHTML = `<div class="sx-deck"><div class="sx-card" data-shown="true"><span class="sx-card__ch">${ch === 'review' ? 'Review' : 'Deck done'}</span>
        <p class="sx-card__front">${ch === 'review' ? 'Nothing to review: every line is at “got it” or better.' : 'Every card in this deck is done.'}</p>
        <div class="sx-card__actions"><button type="button" class="sx-btn" data-a="again">Go again</button><button type="button" class="sx-btn" data-a="list">See all the lines</button></div></div></div>`;
      $('[data-a="again"]', host).addEventListener('click', () => { order = all.slice().sort((a, b) => box(a.id) - box(b.id)); at = 0; shown = false; paint(); });
      $('[data-a="list"]', host).addEventListener('click', () => { listView = true; paint(); });
      return;
    }
    const c = order[at], ci = chName(c.ch);
    host.innerHTML = `<div class="sx-deck">
      <div class="sx-deck__bar"><span>Card ${at + 1} of ${order.length}</span><span class="sx-dots" aria-hidden="true">${order.map((d, i) => `<i data-box="${box(d.id)}" class="${i === at ? 'is-on' : ''}"></i>`).join('')}</span></div>
      <div class="sx-card" data-shown="${shown}" data-card="${c.id}">
        <span class="sx-card__ch">${ci ? `${ci.n} · ${esc(ci.name)}` : ''}</span>
        <p class="sx-card__front">${esc(c.front)}</p>
        <p class="sx-card__hook">${esc(c.hook)}</p>
        <p class="sx-card__back">${esc(c.back)}</p>
        <div class="sx-card__actions">${shown
          ? `<button type="button" class="sx-btn sx-btn--go" data-a="got">Got it</button><button type="button" class="sx-btn" data-a="miss">Not yet</button>`
          : `<button type="button" class="sx-btn sx-btn--go" data-a="show">Show the line</button><span class="sx-hint">Say your answer first, then check.</span>`}
          <button type="button" class="sx-btn" data-a="list" style="margin-left:auto">All lines</button></div>
      </div></div>`;
    const act = (a, f) => { const b = $(`[data-a="${a}"]`, host); if (b) b.addEventListener('click', f); };
    act('show', () => { shown = true; paint(); $('[data-a="got"]', host)?.focus(); });
    act('got', () => { S.cards[c.id] = Math.min(3, box(c.id) + 1); save(); next(); });
    act('miss', () => { S.cards[c.id] = 0; save(); order.push(c); next(); });   // a miss comes back at the end of this pass
    act('list', () => { listView = true; paint(); });
  };
  const next = () => { at++; shown = false; if (at >= order.length) { order = []; } paint(); refreshDecks(host); };
  host._repaint = () => { if (!order.length || listView) { reorder(); } paint(); };
  paint();
}
const decks = $$('[data-sx-cards]');
const refreshDecks = except => { for (const d of decks) if (d !== except && d.dataset.sxCards === 'review' && d._repaint) d._repaint(); };
decks.forEach(makeDeck);

// ---------------------------------------------------------------------------------------------
// one multiple-choice question, used by the chapter checks and the mixed round
// ---------------------------------------------------------------------------------------------
function questionHTML(q, n, total) {
  return `<div class="sx-q" data-q="${q.id}">
    <span class="sx-q__n">${n != null ? `Question ${n}${total ? ` of ${total}` : ''}` : ''}</span>
    <p class="sx-q__q">${esc(q.q)}</p>
    <div class="sx-opts">${q.o.map((o, i) => `<button type="button" class="sx-opt" data-key="${'ABCD'[i]}" data-i="${i}">${esc(o)}</button>`).join('')}</div>
    <div class="sx-why" hidden></div></div>`;
}
function wireQuestion(el, q, onAnswer, link = false) {
  const opts = $$('.sx-opt', el);
  for (const b of opts) b.addEventListener('click', () => {
    const i = +b.dataset.i, ok = i === q.a;
    opts.forEach((o, k) => { o.disabled = true; o.dataset.r = k === q.a ? 'right' : k === i ? 'wrong' : 'dim'; });
    const why = $('.sx-why', el);
    why.hidden = false;
    why.innerHTML = `<b>${ok ? '✓ Right.' : `✕ It’s ${'ABCD'[q.a]}.`}</b> ${esc(q.why)}${link && q.ch ? ` <a href="${chName(q.ch)?.anchor}">Back to chapter ${chName(q.ch)?.n} &rarr;</a>` : ''}`;
    const rec = S.quiz[q.id] || { right: 0, wrong: 0, last: false };
    rec[ok ? 'right' : 'wrong']++; rec.last = ok; S.quiz[q.id] = rec; save();
    onAnswer?.(ok);
  });
}

// chapter checks: one question at a time; at the end, redo just the ones you missed
for (const host of $$('[data-sx-quiz]')) {
  const ch = host.dataset.sxQuiz, all = QUIZ.filter(q => q.ch === ch);
  let round, at, right, missed;
  const start = (qs = all) => { round = qs; at = 0; right = 0; missed = []; paint(); };
  const paint = () => {
    if (at >= round.length) {
      host.innerHTML = `<div class="sx-game"><div class="sx-game__bar"><span>Chapter check</span><span>${all.filter(q => quizRight(q.id)).length} of ${all.length} right last time you answered</span></div>
        <p class="sx-done">${right} of ${round.length}${round.length < all.length ? ' on the retry' : ''}.</p>
        <p class="sx-done-sub">${missed.length ? 'The ones you missed come round first in the mixed round too.' : 'All right. The mixed round will mix these with the other chapters.'}</p>
        <div class="sx-next">${missed.length ? '<button type="button" class="sx-btn sx-btn--go" data-a="missed">Redo the ' + missed.length + ' you missed</button>' : ''}<button type="button" class="sx-btn" data-a="all">Start the check over</button></div></div>`;
      $('[data-a="missed"]', host)?.addEventListener('click', () => start(missed.slice()));
      $('[data-a="all"]', host).addEventListener('click', () => start());
      return;
    }
    const q = round[at];
    host.innerHTML = `<div class="sx-game"><div class="sx-game__bar"><span>Question ${at + 1} of ${round.length}</span><span class="sx-streak">right <b>${right}</b></span></div>
      ${questionHTML(q).replace('class="sx-q"', 'class="sx-q sx-q--bare"')}
      <div class="sx-next" hidden><button type="button" class="sx-btn sx-btn--go" data-a="next">${at + 1 < round.length ? 'Next question' : 'See the score'}</button></div></div>`;
    wireQuestion($('.sx-q', host), q, ok => {
      if (ok) right++; else missed.push(q);
      $('.sx-streak', host).innerHTML = `right <b>${right}</b>`;
      const nx = $('.sx-next', host); nx.hidden = false;
      $('[data-a="next"]', nx).addEventListener('click', () => { at++; paint(); host.querySelector('.sx-opt')?.focus({ preventScroll: true }); });
      refreshDecks();
    });
  };
  start();
}

// ---------------------------------------------------------------------------------------------
// metal cards, sortable by any stat or by resistivity
// ---------------------------------------------------------------------------------------------
const sortHost = $('[data-sx-sort]'), metalHost = $('[data-sx-metals]');
let sortBy = 'conduct';
const SORTS = [['rho', 'Resistivity'], ...STATS];
function paintMetals() {
  sortHost.innerHTML = `<span>Sort by</span>` + SORTS.map(([k, n]) => `<button type="button" class="st-btn" data-sort="${k}" aria-pressed="${k === sortBy}">${esc(n)}</button>`).join('');
  for (const b of $$('button', sortHost)) b.addEventListener('click', () => { sortBy = b.dataset.sort; paintMetals(); });
  const list = METALS.slice().sort((a, b) => sortBy === 'rho' ? a.rho - b.rho : (b.stats[sortBy] - a.stats[sortBy]) || a.rho - b.rho);
  metalHost.innerHTML = list.map(m => `<article class="sx-metal" data-metal="${m.id}">
    <div class="sx-metal__head"><span class="sx-metal__sym" style="border-color:${m.color}" data-dark="${DARK.has(m.id)}" data-long="${m.sym.length > 2}">${esc(m.sym)}</span>
      <div><div class="sx-metal__name">${esc(m.name)}</div><div class="sx-metal__rho">&rho; ${esc(m.rhoNote)} &Omega;&middot;m</div></div></div>
    <p class="sx-metal__hook">${esc(m.hook)}</p>
    <div class="sx-stats">${STATS.map(([k, n]) => `<span class="${k === sortBy ? 'is-sort' : ''}">${esc(n)}</span><span class="sx-pips" role="img" aria-label="${esc(n)}: ${m.stats[k]} of 5">${[1, 2, 3, 4, 5].map(v => `<i class="${v <= m.stats[k] ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</div>
    <dl><dt>Where you meet it</dt><dd>${esc(m.meet)}</dd><dt>Best at</dt><dd>${esc(m.best)}</dd><dt>How it fails</dt><dd>${esc(m.fails)}</dd></dl>
  </article>`).join('');
}
paintMetals();

// ---------------------------------------------------------------------------------------------
// Pick the Metal: 2 points for the right call, 1 for one that works with a trade
// ---------------------------------------------------------------------------------------------
(function pickMetal() {
  const host = $('[data-sx-pickmetal]');
  let round, at, pts;
  const start = () => { round = shuffle(PICK_METAL); at = 0; pts = 0; paint(); };
  const chip = (id, attrs = '') => { const m = metal(id); return `<button type="button" class="sx-chip" data-id="${id}" ${attrs}><span class="dot" style="border-color:${m.color}" data-dark="${DARK.has(id)}" data-long="${m.sym.length > 2}">${esc(m.sym)}</span>${esc(m.name)}</button>`; };
  const paint = (picked) => {
    if (at >= round.length) {
      const max = round.length * 2, best = Math.max(S.games.pick || 0, pts); S.games.pick = best; save();
      host.innerHTML = `<div class="sx-game__bar"><span>Pick the metal</span><span>best <b>${best}</b> / ${max}</span></div>
        <p class="sx-done">${pts} of ${max} points.</p>
        <p class="sx-done-sub">${pts >= max - 2 ? 'You’re choosing on the whole picture, not just conductivity.' : 'The misses are usually a metal that conducts well and fails on skin, sweat or joining. Read the cards above for the ones you missed.'}</p>
        <div class="sx-next"><button type="button" class="sx-btn sx-btn--go" data-a="again">Play again</button></div>`;
      $('[data-a="again"]', host).addEventListener('click', start);
      return;
    }
    const sc = round[at], opts = shuffle(sc.o);
    host.innerHTML = `<div class="sx-game__bar"><span>Scenario ${at + 1} of ${round.length}</span><span>points <b>${pts}</b></span></div>
      <p class="sx-prompt">${esc(sc.prompt)}</p>
      <div class="sx-choices">${opts.map(o => chip(o[0], picked ? `disabled data-pick="${o[0] === picked}"` : '')).join('')}</div>
      ${picked ? `<ul class="sx-results">${sc.o.slice().sort((a, b) => b[1] - a[1]).map(o => `<li data-pick="${o[0] === picked}"><span class="m">${esc(metal(o[0]).name)}</span><span class="s" data-s="${o[1]}">${['wrong', 'works', 'best'][o[1]]}</span><span>${esc(o[2])}</span></li>`).join('')}</ul>
        <div class="sx-next"><button type="button" class="sx-btn sx-btn--go" data-a="next">${at + 1 < round.length ? 'Next scenario' : 'See the score'}</button></div>` : ''}`;
    if (!picked) for (const b of $$('.sx-chip', host)) b.addEventListener('click', () => { pts += sc.o.find(o => o[0] === b.dataset.id)[1]; paint(b.dataset.id); });
    else $('[data-a="next"]', host).addEventListener('click', () => { at++; paint(); });
  };
  start();
})();

// ---------------------------------------------------------------------------------------------
// Which Sensor: resistive, capacitive, or either
// ---------------------------------------------------------------------------------------------
const SENSOR_LABEL = { R: 'Resistive', C: 'Capacitive', E: 'Either works' };
(function whichSensor() {
  const host = $('[data-sx-which]');
  let round, at, right;
  const start = () => { round = shuffle(WHICH_SENSOR); at = 0; right = 0; paint(); };
  const paint = (picked) => {
    if (at >= round.length) {
      const best = Math.max(S.games.which || 0, right); S.games.which = best; save();
      host.innerHTML = `<div class="sx-game__bar"><span>Which sensor?</span><span>best <b>${best}</b> / ${round.length}</span></div>
        <p class="sx-done">${right} of ${round.length}.</p>
        <p class="sx-done-sub">The questions to ask, in order: does it need force, or only presence? Will it get wet? Does it have to hold steady for hours?</p>
        <div class="sx-next"><button type="button" class="sx-btn sx-btn--go" data-a="again">Play again</button></div>`;
      $('[data-a="again"]', host).addEventListener('click', start);
      return;
    }
    const sc = round[at];
    host.innerHTML = `<div class="sx-game__bar"><span>${at + 1} of ${round.length}</span><span>right <b>${right}</b></span></div>
      <p class="sx-prompt">${esc(sc.prompt)}</p>
      <div class="sx-choices">${['R', 'C', 'E'].map(k => `<button type="button" class="sx-chip sx-chip--wide" data-k="${k}" ${picked ? `disabled data-pick="${k === picked}"` : ''}>${SENSOR_LABEL[k]}</button>`).join('')}</div>
      ${picked ? `<p class="sx-why"><b>${picked === sc.a ? '✓ Right.' : `✕ ${SENSOR_LABEL[sc.a]}.`}</b> ${esc(sc.why)}</p>
        <div class="sx-next"><button type="button" class="sx-btn sx-btn--go" data-a="next">${at + 1 < round.length ? 'Next' : 'See the score'}</button></div>` : ''}`;
    if (!picked) for (const b of $$('.sx-chip', host)) b.addEventListener('click', () => { if (b.dataset.k === sc.a) right++; paint(b.dataset.k); });
    else $('[data-a="next"]', host).addEventListener('click', () => { at++; paint(); });
  };
  start();
})();

// ---------------------------------------------------------------------------------------------
// Build the Stack: tap the layers in order. A wrong tap says what that mistake would do.
// ---------------------------------------------------------------------------------------------
const SWATCH = { fabric: 'var(--color-line-strong)', conductor: null, shield: null, sense: 'var(--st-carbon)', dielectric: 'var(--color-raised)', insulation: 'var(--color-ink-2)', skin: 'var(--st-skin)', pod: 'var(--color-ground)', core: 'var(--color-ink-2)', wire: 'var(--st-copper)' };
const swatchOf = l => (l.mat ? `var(--st-${l.mat === 'agcu' ? 'copper' : l.mat})` : SWATCH[l.kind] || 'var(--color-dim)');
(function buildStack() {
  const host = $('[data-sx-build]');
  let st = STACKS[0], placed, pile, misses, msg;
  const start = id => { st = STACKS.find(s => s.id === id) || st; placed = []; misses = 0; msg = ''; pile = shuffle(st.layers.map((_, i) => i)); paint(); };
  const ok = (i, k) => i === k || (!!st.layers[i].group && st.layers[i].group === st.layers[k].group);
  const paint = () => {
    const done = placed.length === st.layers.length;
    host.innerHTML = `<div class="sx-game__bar"><span>Build the stack</span><span>${(S.games.build || {})[st.id] != null ? `best <b>${S.games.build[st.id]}</b> misses` : 'not built yet'}</span></div>
      <div class="st-toggles" role="group" aria-label="Stack to build" style="margin-top:0.9rem">${STACKS.map(s => `<button type="button" class="st-btn" data-stack="${s.id}" aria-pressed="${s.id === st.id}">${esc(s.name)}</button>`).join('')}</div>
      <div class="sx-build">
        <div><h4>The pile</h4><div class="sx-pile">${done ? '<span class="sx-hint">Empty: every layer is placed.</span>' : pile.filter(i => !placed.includes(i)).map(i => `<button type="button" class="sx-layer-btn" data-i="${i}"><span class="sx-swatch" style="background:${swatchOf(st.layers[i])}"></span>${esc(st.layers[i].name)}</button>`).join('')}</div></div>
        <div><h4>Your stack, ${esc(st.from)} to ${esc(st.to)}</h4><div class="sx-built"><span class="sx-ends">${esc(st.from)}</span>${st.layers.map((_, k) => { const i = placed[k]; return `<div class="sx-slot" data-filled="${i != null}"><span class="k">${k + 1}</span>${i != null ? esc(st.layers[i].name) : ''}</div>`; }).join('')}<span class="sx-ends">${esc(st.to)}</span></div></div>
      </div>
      <div class="sx-feedback" aria-live="polite">${msg}</div>
      ${done ? `<div class="sx-next"><button type="button" class="sx-btn sx-btn--go" data-a="again">Shuffle and build again</button></div>` : ''}`;
    for (const b of $$('[data-stack]', host)) b.addEventListener('click', () => start(b.dataset.stack));
    for (const b of $$('.sx-layer-btn', host)) b.addEventListener('click', () => {
      const i = +b.dataset.i, k = placed.length, want = st.layers[k];
      if (ok(i, k)) {
        placed.push(i);
        msg = `<span class="good"><b>${esc(st.layers[i].name)}.</b> ${esc(st.layers[i].role)}</span>`;
        if (placed.length === st.layers.length) {
          const rec = S.games.build || {}; rec[st.id] = Math.min(rec[st.id] ?? 99, misses); S.games.build = rec; save();
          msg = `<span class="good"><b>Built${misses ? ` with ${misses} miss${misses > 1 ? 'es' : ''}` : ', no misses'}.</b></span> What each layer prevents:<br>${st.layers.filter(l => l.fails).map(l => `<b>${esc(l.name)}</b>: ${esc(l.fails)}`).join('<br>')}`;
        }
      } else {
        misses++;
        const it = st.layers[i];
        msg = `<span class="bad"><b>${esc(it.name)}</b> doesn’t go in position ${k + 1}.</span> Position ${k + 1} needs the layer whose job is: ${esc(lower(want.role))}.${want.fails ? `<br>Why it matters: ${esc(want.fails)}` : ''}`;
      }
      paint();
      $('.sx-layer-btn', host)?.focus();
    });
    $('[data-a="again"]', host)?.addEventListener('click', () => start(st.id));
  };
  start(st.id);
})();
function lower(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '') : ''; }

// ---------------------------------------------------------------------------------------------
// mixed round: ten questions across every chapter and the sensor game. Missed-last-time first,
// then never-seen, then the rest; interleaved so two in a row rarely share a chapter.
// ---------------------------------------------------------------------------------------------
const SENSOR_Q = WHICH_SENSOR.map(w => ({ id: `w-${w.id}`, ch: 'sense', q: `Which sensor? ${w.prompt}`, o: ['Resistive', 'Capacitive', 'Either works'], a: { R: 0, C: 1, E: 2 }[w.a], why: w.why }));
const ALL_Q = QUIZ.concat(SENSOR_Q);
function pickRound(n = 10) {
  const rank = q => { const r = S.quiz[q.id]; return !r ? 1 : r.last ? 2 : 0; };   // 0 missed, 1 new, 2 right
  const pool = shuffle(ALL_Q).sort((a, b) => rank(a) - rank(b)).slice(0, n * 2);
  const out = [];
  while (out.length < n && pool.length) {
    const prev = out[out.length - 1]?.ch, k = pool.findIndex(q => q.ch !== prev);
    out.push(pool.splice(k >= 0 ? k : 0, 1)[0]);
  }
  return out;
}
(function mixedRound() {
  const host = $('[data-sx-round]');
  let round, at, right, streak, bestStreak, misses;
  const start = () => { round = pickRound(); at = 0; right = 0; streak = 0; bestStreak = 0; misses = {}; paint(); };
  const paint = () => {
    if (at >= round.length) {
      S.games.round = Math.max(S.games.round || 0, right); save();
      const weak = Object.entries(misses).sort((a, b) => b[1] - a[1]);
      host.innerHTML = `<div class="sx-game sx-round-card"><div class="sx-game__bar"><span>Mixed round</span><span>best <b>${S.games.round}</b> / ${round.length}</span></div>
        <p class="sx-done">${right} of ${round.length}, longest streak ${bestStreak}.</p>
        ${weak.length ? `<p class="sx-done-sub">Worth another look:</p><ul class="sx-weak">${weak.map(([ch, n]) => `<li><a href="${chName(ch).anchor}">${chName(ch).n} · ${esc(chName(ch).name)}</a> (${n} missed)</li>`).join('')}</ul>` : '<p class="sx-done-sub">No misses. Run another; the missed-first ordering means you’ll get fresh ones.</p>'}
        <div class="sx-next"><button type="button" class="sx-btn sx-btn--go" data-a="again">Another round</button></div></div>`;
      $('[data-a="again"]', host).addEventListener('click', start);
      return;
    }
    const q = round[at];
    host.innerHTML = `<div class="sx-game"><div class="sx-game__bar"><span>${at + 1} of ${round.length} · ${esc(chName(q.ch).name)}</span><span class="sx-streak">right <b>${right}</b> · streak <b>${streak}</b></span></div>
      ${questionHTML(q).replace('class="sx-q"', 'class="sx-q sx-q--bare"')}
      <div class="sx-next" hidden><button type="button" class="sx-btn sx-btn--go" data-a="next">${at + 1 < round.length ? 'Next' : 'See the score'}</button></div></div>`;
    wireQuestion($('.sx-q', host), q, ok => {
      if (ok) { right++; streak++; bestStreak = Math.max(bestStreak, streak); } else { streak = 0; misses[q.ch] = (misses[q.ch] || 0) + 1; }
      $('.sx-streak', host).innerHTML = `right <b>${right}</b> · streak <b>${streak}</b>`;
      const nx = $('.sx-next', host); nx.hidden = false;
      $('[data-a="next"]', nx).addEventListener('click', () => { at++; paint(); });
      refreshDecks();
    }, true);
  };
  start();
})();

// ---------------------------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------------------------
$('[data-sx-reset]').addEventListener('click', () => {
  if (!confirm('Clear every card box, answer and best score on this page?')) return;
  S = blank(); save();
  decks.forEach(d => d._repaint?.());
});

paintProgress();
