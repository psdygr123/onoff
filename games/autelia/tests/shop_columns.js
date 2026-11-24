/* 상점 A안: 한 줄 고정 열 + 재료 전부 팔기 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fail = 0;
const T = (l, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + ' :: ' + JSON.stringify(d)); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await sleep(300);
  await ev(() => { AU.G.S.silver = 746; for (const [id, n] of [['snake_skin', 2], ['fur', 9], ['fox_tail', 2], ['iron_scrap', 2]]) if (AU.ITEMS[id]) AU.G.S.inv[id] = n; AU.G.shop = 'general'; AU.UI.open('shop'); }); await sleep(400);
  const L = await ev(() => { const rows = [...document.querySelectorAll('.shoprow.g')]; return rows.map((r) => { const bs = r.querySelectorAll('button'); const act = r.querySelector('.shopbtn'); const a = act && act.getBoundingClientRect(); return { n: r.querySelector('.iname').textContent, x: a ? Math.round(a.left) : null, w: a ? Math.round(a.width) : null, h: Math.round(r.getBoundingClientRect().height) }; }); });
  console.log(JSON.stringify(L));
  const buy = L.filter((r) => r.x != null && /회복|주문서/.test(r.n)), sell = L.filter((r) => r.x != null && !/회복|주문서/.test(r.n));
  T('사기 버튼 x·폭 모두 동일', buy.length >= 2 && new Set(buy.map((r) => r.x + ':' + r.w)).size === 1, buy);
  T('팔기 버튼 x·폭 모두 동일', sell.length >= 2 && new Set(sell.map((r) => r.x + ':' + r.w)).size === 1, sell);
  T('줄 높이 일정(버튼이 아래 줄로 내려가지 않음)', new Set(L.map((r) => r.h)).size <= 2 && Math.max(...L.map((r) => r.h)) < 80, L.map((r) => r.h));
  await p.screenshot({ path: '/tmp/shop_real.png' });
  const before = await ev(() => AU.G.S.silver);
  await ev(() => { [...document.querySelectorAll('.sellall')][0].click(); }); await sleep(300);
  const after = await ev(() => ({ s: AU.G.S.silver, etc: Object.keys(AU.G.S.inv).filter((id) => AU.ITEMS[id] && AU.ITEMS[id].type === 'etc' && AU.ITEMS[id].sell > 0 && AU.G.S.inv[id] > 0) }));
  T('재료 전부 팔기: 은화 증가·판매 재료 소진', after.s > before && after.etc.length === 0, { before, after });
  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0);
})();
