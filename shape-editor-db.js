// IndexedDB-backed shell/layout library — replaces the old single-slot
// localStorage save. Two stores:
//   shells:  { id, name, createdAt, updatedAt, aPoints, bFrontPoints,
//              bBackPoints, neckline, backdropCalibration, thumbnail }
//   layouts: { id, shellId, name, panels, createdAt, updatedAt }
// A layout's `panels` is the same shape parseLayoutPanels() produces from
// layout.yaml: [{ id, classId, theta, s, rotation, layer, mirrored }].
//
// localStorage would run out (thumbnails + curve sets add up); IndexedDB
// doesn't have that ceiling in practice. No external dependency — this is
// a thin, dependency-free wrapper, same stance as shape-editor-yaml.js.

const DB_NAME = "dress-shell-editor";
const DB_VERSION = 1;
const SHELLS = "shells";
const LAYOUTS = "layouts";

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function txDone(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

let dbPromise = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains(SHELLS)) idb.createObjectStore(SHELLS, { keyPath: "id" });
        if (!idb.objectStoreNames.contains(LAYOUTS)) {
          const store = idb.createObjectStore(LAYOUTS, { keyPath: "id" });
          store.createIndex("shellId", "shellId", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

// -- shells ---------------------------------------------------------------
export async function putShell(shell) {
  const idb = await getDB();
  const t = idb.transaction(SHELLS, "readwrite");
  t.objectStore(SHELLS).put(shell);
  await txDone(t);
  return shell;
}
export async function getShell(id) {
  const idb = await getDB();
  return reqToPromise(idb.transaction(SHELLS, "readonly").objectStore(SHELLS).get(id));
}
export async function listShells() {
  const idb = await getDB();
  const all = await reqToPromise(idb.transaction(SHELLS, "readonly").objectStore(SHELLS).getAll());
  return all.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}
export async function deleteShell(id) {
  const idb = await getDB();
  const layouts = await listLayoutsForShell(id);
  const t = idb.transaction([SHELLS, LAYOUTS], "readwrite");
  t.objectStore(SHELLS).delete(id);
  const layoutsStore = t.objectStore(LAYOUTS);
  for (const l of layouts) layoutsStore.delete(l.id);
  await txDone(t);
}

// -- layouts ----------------------------------------------------------------
export async function putLayout(layout) {
  const idb = await getDB();
  const t = idb.transaction(LAYOUTS, "readwrite");
  t.objectStore(LAYOUTS).put(layout);
  await txDone(t);
  return layout;
}
export async function getLayout(id) {
  const idb = await getDB();
  return reqToPromise(idb.transaction(LAYOUTS, "readonly").objectStore(LAYOUTS).get(id));
}
export async function listLayoutsForShell(shellId) {
  const idb = await getDB();
  const idx = idb.transaction(LAYOUTS, "readonly").objectStore(LAYOUTS).index("shellId");
  const all = await reqToPromise(idx.getAll(shellId));
  return all.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}
export async function deleteLayout(id) {
  const idb = await getDB();
  const t = idb.transaction(LAYOUTS, "readwrite");
  t.objectStore(LAYOUTS).delete(id);
  await txDone(t);
}

// -- whole-library export/import (disaster recovery — a browser reset
// wipes IndexedDB same as it wipes localStorage) ---------------------------
export async function exportLibrary() {
  const idb = await getDB();
  const shells = await reqToPromise(idb.transaction(SHELLS, "readonly").objectStore(SHELLS).getAll());
  const layouts = await reqToPromise(idb.transaction(LAYOUTS, "readonly").objectStore(LAYOUTS).getAll());
  return { version: 1, exportedAt: new Date().toISOString(), shells, layouts };
}
export async function importLibrary(data) {
  if (!data || !Array.isArray(data.shells) || !Array.isArray(data.layouts)) {
    throw new Error("not a recognized library export (expected { shells: [...], layouts: [...] })");
  }
  const idb = await getDB();
  const t = idb.transaction([SHELLS, LAYOUTS], "readwrite");
  const shellsStore = t.objectStore(SHELLS), layoutsStore = t.objectStore(LAYOUTS);
  for (const s of data.shells) shellsStore.put(s);
  for (const l of data.layouts) layoutsStore.put(l);
  await txDone(t);
  return { shells: data.shells.length, layouts: data.layouts.length };
}

// Best-effort browser storage estimate (Safari < 15 and some private-mode
// contexts don't implement this — callers must handle null).
export async function estimateUsage() {
  if (!navigator.storage || !navigator.storage.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
