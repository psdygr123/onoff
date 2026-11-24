/* 초상화가 늦게 도착해도 대화창이 대체 그림에 머물지 않음 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let f = 0; const ck = (k, ok, e) => { console.log((ok ? 'PASS ' : 'FAIL ') + k + (e ? ' :: ' + e : '')); if (!ok) f++; };
  const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/assets/prologue/pt/pt_pro_child.webp', async (r) => { await new Promise((x) => setTimeout(x, 2500)); r.continue(); });
  await p.goto((process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1'); await p.waitForTimeout(500);
  await p.evaluate(() => { AU.UI.dialog = { npc: AU.PRO_SPEAKERS.child, lines: ['안녕'], i: 0, opt: {} }; AU.UI.dlgEl.classList.remove('hidden'); AU.UI.renderDialog(); });
  const first = await p.evaluate(() => (document.querySelector('.dlgbox .pt img') || {}).src || 'none');
  await p.waitForTimeout(3500);
  const later = await p.evaluate(() => (document.querySelector('.dlgbox .pt img') || {}).src || 'none');
  ck('P1 늦게 도착한 뒤 본래 꼬마 초상화로 교체', /pt_pro_child/.test(later), first + ' -> ' + later);
  ck('P99 오류 없음', !errs.length, errs.join('|'));
  await b.close(); process.exit(f ? 1 : 0);
})();
