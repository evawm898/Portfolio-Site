// smart-textiles.js — entry point for /smart-textiles.html (Field Notes No. 09). Gathers every scene from
// the part modules and hands them to the player in smart-textiles-core.js. window.__st exposes the players
// for tools/smart-textiles/verify-page.mjs.
import { mount } from './smart-textiles-core.js';
import { YARN_SCENES } from './smart-textiles-yarns.js';
import { FABRIC_SCENES } from './smart-textiles-fabric.js';
import { SENSE_SCENES } from './smart-textiles-sense.js';
import { ACT_SCENES, POWER_SCENES } from './smart-textiles-act.js';
import { TIER_SCENES, CONNECT_SCENES } from './smart-textiles-connect.js';

export const SCENES = { ...TIER_SCENES, ...YARN_SCENES, ...FABRIC_SCENES, ...SENSE_SCENES, ...ACT_SCENES, ...POWER_SCENES, ...CONNECT_SCENES };
window.__st = mount(SCENES, document.getElementById('smart'));
