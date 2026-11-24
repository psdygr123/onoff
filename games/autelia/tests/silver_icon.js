/* 은화 표시 앞 동전 그림 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fail = 0; const errs = [];
const T = (l, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + ' :: ' + JSON.stringify(d)); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(300);
  await ev(() => { AU.UI.open('inventory'); }); await sleep(300);
  const r = await ev(() => { const e = document.querySelector('.window .silver'); if (!e) return null; const cs = getComputedStyle(e, '::before'); return { text: e.textContent, img: cs.backgroundImage, w: cs.width }; });
  T('인벤토리 은화 줄에 동전 그림', !!r && /silver_coin.webp/.test(r.img) && parseFloat(r.w) > 10, r);
  await p.screenshot({ path: '/tmp/inv_silver.png' });
  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0);
})();
