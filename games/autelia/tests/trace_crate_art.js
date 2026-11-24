/* 창고의 흔적: 검은 결정 상자·부식 돌 그림 로드·투명 배경·대사 확인 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#btn-start');
  const r = await p.evaluate(async () => {
    const out = [];
    for (const n of ['trace_stain', 'trace_crystal_crate']) { const im = new Image(); im.src = 'assets/object/' + n + '.webp'; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); out.push({ n, w: im.width, h: im.height, a: x.getImageData(0, 0, 2, 2).data[3] }); }
    const sp = AU.MAPS.warehouse.spots.find((s) => s.id === 'trace_crate');
    return { out, img: sp.img, label: sp.label, crystal: sp.lines.join(' ').includes('검은 결정이 가득'), asset: !!AU.ASSETS.ob_trace_crystal_crate };
  });
  const ok = r.out.every((o) => o.w > 200 && o.a === 0) && r.img === 'ob_trace_crystal_crate' && r.crystal && r.asset && !errs.length; console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r), errs);
  await b.close(); process.exit(ok ? 0 : 1);
})();
