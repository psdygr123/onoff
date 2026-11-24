/* 은화 동전 아이콘: HUD 은화·의뢰 보상·판매가 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#btn-start');
  await p.click('#btn-start').catch(() => {});
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const hs = document.querySelector('.hudsilver');
    return { hud: !!hs, hudText: hs ? hs.textContent : null, hudBefore: hs ? getComputedStyle(hs, '::before').backgroundImage.includes('silver_coin') : false,
      svRule: (() => { const e = document.createElement('span'); e.className = 'sv'; document.body.append(e); const v = getComputedStyle(e, '::before').backgroundImage.includes('silver_coin'); e.remove(); return v; })() };
  });
  const ok = r.hud && r.hudBefore && r.svRule && !errs.length; console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r), errs);
  await b.close(); process.exit(ok ? 0 : 1);
})();
