// knit-lab-worker.js — the simulation's thread. Everything is in knit-lab-engine.js.
import { createEngine } from './knit-lab-engine.js';
const engine = createEngine((m, transfer) => postMessage(m, transfer || []), 30);
onmessage = e => engine(e.data);
