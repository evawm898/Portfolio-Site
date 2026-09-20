// scene/registry.js — the eight slots, and which of them exist.
//
// ONE DECLARATION, READ BY EVERYTHING. The nav builds its buttons from this,
// the loader resolves a number to a module from this, the random picker draws
// from this, and the gate counts against this. A second list of "which scenes
// are built" is the thing that goes stale the day a ninth is added.
//
// A SLOT IS NOT A SCENE. Slots 2-8 are declared with no loader and render as
// disabled nav numbers — the shell is built to host eight, and saying so in the
// nav is more honest than a row that grows a button at a time and leaves nobody
// able to tell how far along the section is.
//
// THE CAP IS ASSERTED RATHER THAN COMMENTED. The brief caps the section at
// eight; a ninth entry throws at module load rather than quietly producing a
// nav row that no longer fits its corner.

export const MAX_SCENES = 8;

export const SCENES = [
  {
    id: 1,
    title: 'Koi rain pond',
    load: () => import('./scene-koi.js'),
  },
  { id: 2, title: null, load: null },
  {
    id: 3,
    title: 'Beach swash line',
    load: () => import('./scene-beach.js'),
  },
  { id: 4, title: null, load: null },
  { id: 5, title: null, load: null },
  { id: 6, title: null, load: null },
  { id: 7, title: null, load: null },
  { id: 8, title: null, load: null },
];

if (SCENES.length > MAX_SCENES) {
  throw new Error(`/scene is capped at ${MAX_SCENES} scenes; the registry declares ${SCENES.length}`);
}
SCENES.forEach((s, i) => {
  if (s.id !== i + 1) throw new Error(`scene slot ${i} declares id ${s.id}; slots are 1..${MAX_SCENES} in order`);
});

export const isBuilt = (slot) => typeof slot?.load === 'function';
export const builtScenes = () => SCENES.filter(isBuilt);
export const sceneById = (id) => SCENES.find(s => s.id === id) || null;

// The "?" button. It excludes whatever is showing, so it always moves — and
// with only one scene built there is nothing to move to, which is why the
// button is disabled rather than a no-op that looks broken.
export function randomSceneId(currentId, unit) {
  const pool = builtScenes().filter(s => s.id !== currentId);
  if (!pool.length) return null;
  const r = typeof unit === 'function' ? unit() : Math.random();
  return pool[Math.min(pool.length - 1, Math.floor(r * pool.length))].id;
}

// Which scene the URL asks for. `?scene=N` so a deploy-preview link can name
// one; anything unbuilt or out of range falls back to the first built scene
// rather than to an empty stage.
export function sceneFromUrl(search) {
  const m = /(?:^|[?&])scene=(\d+)/.exec(search || '');
  const want = m ? Number(m[1]) : NaN;
  const slot = sceneById(want);
  if (slot && isBuilt(slot)) return slot.id;
  const first = builtScenes()[0];
  return first ? first.id : null;
}
