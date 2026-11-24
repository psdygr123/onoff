/* 달려가는 아이 그림(kid_run1/2) 로드·크기·투명 배경 확인 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#btn-start');
  const r = await p.evaluate(async () => {
    const out = [];
    for (const n of ['kid_run1', 'kid_run2']) { const im = new Image(); im.src = 'assets/prologue/ch/' + n + '.webp'; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); out.push({ n, w: im.width, h: im.height, a: x.getImageData(0, 0, 2, 2).data[3] }); }
    return out;
  });
  const ok = r.every((o) => o.w === 200 && o.h === 236 && o.a === 0) && !errs.length; console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r), errs);
  await b.close(); process.exit(ok ? 0 : 1);
})();
