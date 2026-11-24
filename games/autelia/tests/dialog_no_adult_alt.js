const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let f = 0; const ck = (k, ok, e) => { console.log((ok ? 'PASS ' : 'FAIL ') + k + (e ? ' :: ' + e : '')); if (!ok) f++; };
  const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto((process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const rec = AU.Img.map.pt_pro_child; const keep = [rec.ok, rec.done]; rec.ok = false; rec.done = false;
    AU.UI.dialog = { npc: AU.PRO_SPEAKERS.child, lines: ['안녕'], i: 0, opt: {} }; AU.UI.dlgEl.classList.remove('hidden'); AU.UI.renderDialog();
    const during = { img: !!document.querySelector('.dlgbox .pt img'), fb: (document.querySelector('.dlgbox .ptfallback') || {}).textContent || '' };
    rec.ok = true; rec.done = true; AU.UI.renderDialog(); const after = (document.querySelector('.dlgbox .pt img') || {}).src || ''; return { during, after }; });
  ck('A1 도착 전에는 그림 없이 이름 첫 글자', !r.during.img && r.during.fb === '야', JSON.stringify(r.during));
  ck('A2 도착 후 꼬마 초상화', /pt_pro_child/.test(r.after), r.after);
  ck('A99 오류 없음', !errs.length, errs.join('|'));
  await b.close(); process.exit(f ? 1 : 0);
})();
