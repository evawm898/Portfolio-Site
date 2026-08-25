import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';
const b = await chromium.launch({ executablePath: findChromium(), args:['--no-sandbox'] });
const p = await b.newPage({ viewport:{width:1520,height:660}, deviceScaleFactor:2 });
await p.goto('file://' + process.argv[2]); await p.waitForTimeout(300);
const el = await p.$('svg'); await el.screenshot({ path: process.argv[3] }); await b.close();
