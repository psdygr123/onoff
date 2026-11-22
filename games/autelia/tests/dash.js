// 이동기 시험: Lv.5부터, 최대 3회 연속 사용(대기시간 없음), 10초마다 1회 충전
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; let pass = 0, fail = 0;
  p.on('pageerror', (e) => errs.push(e.message));
  const ok = (n, c, e) => { console.log((c ? 'PASS ' : 'FAIL ') + n + ' :: ' + (e || '')); c ? pass++ : fail++; };
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(500);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); }
  if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await p.evaluate(() => AU.Prologue.debugComplete('arche')); await sleep(1200);
  await p.evaluate(() => { AU.UI.close && AU.UI.close(); AU.World.enterMap('harbor_road', 600, true); AU.World.trans = null; AU.G.S.level = 4; }); await sleep(300);
  const st = () => p.evaluate(() => ({ x: AU.World.player.x, n: AU.World.player.dashN, rt: AU.World.player.dashRt }));
  await p.keyboard.press('ShiftLeft'); await sleep(100);
  ok('H1 Lv.4에서는 이동기 불가', (await st()).n === 3, JSON.stringify(await st()));
  await p.evaluate(() => { AU.G.S.level = 5; }); const x0 = (await st()).x;
  await p.keyboard.press('ShiftLeft'); await sleep(300); const a = await st();
  ok('H2 Lv.5 이동기 사용: 앞으로 이동·충전 2', a.x > x0 + 100 && a.n === 2, JSON.stringify(a));
  await p.keyboard.press('ShiftLeft'); await sleep(40); await p.keyboard.press('ShiftLeft'); await sleep(300); const c = await st();
  ok('H3 대기시간 없이 연속 사용 → 0회', c.n === 0, JSON.stringify(c));
  await p.keyboard.press('ShiftLeft'); await sleep(200);
  ok('H4 충전이 없으면 사용 불가', (await st()).n === 0, '');
  await p.evaluate(() => { AU.World.player.dashRt = 9.9; }); await sleep(400);
  ok('H5 10초 경과 시 1회 충전', (await st()).n === 1, JSON.stringify(await st()));
  ok('H6 오류 없음', errs.length === 0, JSON.stringify(errs));
  console.log(`합계 ${pass}/${pass + fail} 통과`); await b.close(); process.exit(fail ? 1 : 0);
})();
