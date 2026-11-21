/* 창 끌어서 위치 조정: 제목 줄 끌기·위치 기억·다시 열어도 유지·더블클릭 되돌리기·화면 밖 제한 */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const note = (id, name, ok, ev) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ev ? ' :: ' + ev : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('porto')); await sleep(600);
  const rect = () => ev(() => { const r = document.querySelector('.winwrap .window').getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; });
  await ev(() => AU.UI.open('journal')); await sleep(300); const r0 = await rect();
  const t = await (await p.$('.winwrap .wtitle')).boundingBox(); const sx = t.x + 200, sy = t.y + t.height / 2;
  await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(sx + 150, sy + 60, { steps: 8 }); await p.mouse.up(); await sleep(200);
  const r1 = await rect(); note('W1', '제목 줄을 끌면 창이 이동', r1.x - r0.x > 100 && r1.y - r0.y > 40, JSON.stringify([r0, r1]));
  await ev(() => AU.UI.close()); await sleep(100); await ev(() => AU.UI.open('journal')); await sleep(300); const r2 = await rect(); note('W2', '닫았다 다시 열어도 위치 유지', Math.abs(r2.x - r1.x) < 2 && Math.abs(r2.y - r1.y) < 2, JSON.stringify(r2));
  const t2 = await (await p.$('.winwrap .wtitle')).boundingBox(); await p.mouse.move(t2.x + 200, t2.y + t2.height / 2); await p.mouse.down(); await p.mouse.move(t2.x + 5000, t2.y + 5000, { steps: 5 }); await p.mouse.up(); await sleep(200);
  const r3 = await rect(); note('W3', '화면 밖으로는 못 나감(제목 줄 보임)', r3.x < 1280 - 100 && r3.y < 720 - 30, JSON.stringify(r3));
  await p.dblclick('.winwrap .wtitle span'); await sleep(200); const r4 = await rect(); note('W4', '제목 줄 더블클릭하면 가운데로 복귀', Math.abs(r4.x - r0.x) < 2 && Math.abs(r4.y - r0.y) < 2, JSON.stringify(r4));
  await p.click('.winwrap .wtitle .close'); await sleep(200); note('W5', '닫기 버튼은 그대로 동작', await ev(() => !AU.UI.cur), '');
  note('Z', '오류 없음', errs.length === 0, errs.slice(0, 2).join('|'));
  await b.close(); console.log('합계 ' + pass + '/' + (pass + fail) + ' 통과'); process.exit(fail ? 1 : 0);
})();
