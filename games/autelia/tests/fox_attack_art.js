/* 들여우 준비·도약 새 그림: 495×208, 투명 배경, 로드 확인 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#btn-start');
  const r = await p.evaluate(async () => { const o = {}; for (const n of ['fox_a1', 'fox_a2']) { const im = new Image(); im.src = 'assets/monster/' + n + '.webp'; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, 4, 4).data; o[n] = { w: im.width, h: im.height, cornerAlpha: d[3] }; } return o; });
  let fail = 0; for (const n in r) { const ok = r[n].w === 495 && r[n].h === 208 && r[n].cornerAlpha === 0; console.log((ok ? 'PASS ' : 'FAIL ') + n + ' ' + JSON.stringify(r[n])); if (!ok) fail++; }
  if (errs.length) { console.log('FAIL errors', errs); fail++; }
  await b.close(); process.exit(fail ? 1 : 0);
})();
