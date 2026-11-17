// 단계별 튜토리얼 시험: ?tut=1 로 열어 각 단계를 실제로 해 보면 ✔가 되고 다음 단계로 넘어가는지 확인
const { chromium } = require('playwright'); const OUT = process.env.SHOTS || '/tmp/claude-0/shots/'; require('fs').mkdirSync(OUT, { recursive: true });
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&tut=1&intro=cards'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; let pass = 0, fail = 0;
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
  const ok = (n, c, e) => { console.log((c ? 'PASS ' : 'FAIL ') + n + ' :: ' + (e || '')); c ? pass++ : fail++; };
  const idx = () => p.evaluate(() => AU.G.S.flags.tut && AU.G.S.flags.tut.i); const card = () => p.evaluate(() => { const c = document.querySelector('.tutcard'); return c ? c.querySelector('.ttitle').textContent + '|' + c.querySelector('.tstep').textContent : null; });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(400);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await p.evaluate(() => AU.Prologue.debugComplete('arche')); await sleep(1200);
  ok('T1 본편 시작 시 1단계 카드', /이동과 점프/.test(await card() || ''), await card());
  await p.keyboard.down('ArrowRight'); await sleep(1500); await p.keyboard.up('ArrowRight'); await p.keyboard.down('Alt'); await sleep(150); await p.keyboard.up('Alt'); await sleep(1800);
  ok('T2 걷기·점프 후 2단계로', (await idx()) === 1, 'i=' + await idx() + ' ' + await card());
  await p.screenshot({ path: OUT + 'tut_step2.png' });
  await p.evaluate(() => { AU.World.enterMap('porto', AU.PORTO_OFF + 1330, true); AU.World.trans = null; }); await sleep(400);
  await p.keyboard.press('Space'); await sleep(500); await p.screenshot({ path: OUT + 'tut_talk.png' });
  ok('T3 대화하면 talk ✔', await p.evaluate(() => !!AU.G.S.flags.tut.c.talk), '');
  await p.evaluate(() => AU.UI.close && AU.UI.close()); 
  ok('T4 건너뛰기', await p.evaluate(() => { document.querySelector('.tskip') && document.querySelector('.tskip').click(); return AU.G.S.flags.tut.off === true && !document.querySelector('.tutcard'); }), '');
  ok('T5 오류 없음', errs.length === 0, JSON.stringify(errs));
  console.log(`합계 ${pass}/${pass + fail} 통과`); await b.close(); process.exit(fail ? 1 : 0);
})();
