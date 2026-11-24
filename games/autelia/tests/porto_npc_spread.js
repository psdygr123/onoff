/* 포르투 노바 NPC가 맵 전체에 고르게 퍼져 있는지 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#btn-start');
  const r = await p.evaluate(() => { const m = AU.MAPS.porto, xs = m.npcs.map((n) => n.x).sort((a, c) => a - c), W = m.width; const third = [0, 0, 0]; xs.forEach((x) => third[Math.min(2, Math.floor(x / (W / 3)))]++); let gap = 0; for (let i = 1; i < xs.length; i++) gap = Math.max(gap, xs[i] - xs[i - 1]); return { n: xs.length, third, gap, first: xs[0], last: xs[xs.length - 1], W }; });
  const ok = r.third.every((c) => c >= 4) && Math.max(...r.third) - Math.min(...r.third) <= 2 && r.gap <= 1200 && !errs.length; console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r), errs);
  await b.close(); process.exit(ok ? 0 : 1);
})();
