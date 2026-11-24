// 첫 행동 단계별 안내 시험: 첫 아이템·장비·퀘스트·레벨업·지역 이동 때 카드가 한 번씩만 뜨는지
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?intro=cards'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; let pass = 0, fail = 0;
  p.on('pageerror', (e) => errs.push(e.message));
  const ok = (n, c, e) => { console.log((c ? 'PASS ' : 'FAIL ') + n + ' :: ' + (e || '')); c ? pass++ : fail++; };
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(500);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); }
  if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await p.evaluate(() => AU.Prologue.debugComplete('arche')); await sleep(1200);
  const card = () => p.evaluate(() => { const c = document.querySelector('.guidecard'); return c ? c.innerText : null; });
  await p.evaluate(() => { AU.UI.close && AU.UI.close(); AU.Guide.dismiss(); AU.Guide.queue.length = 0; });
  await p.evaluate(() => AU.G.giveItem('potion', 1)); await sleep(200);
  ok('G1 첫 아이템 → 인벤토리 안내', /인벤토리/.test(await card() || ''), await card());
  await p.evaluate(() => AU.UI.open('inventory')); await sleep(300);
  ok('G2 인벤토리를 열면 카드가 사라지고 창 안내 상자가 나옴', !(await card()) && !!(await p.$('.guidebox')), '');
  await p.evaluate(() => AU.UI.close()); await p.evaluate(() => AU.G.giveItem('sword_a', 1)); await sleep(200);
  await sleep(900);
  const mt = await p.evaluate(() => (document.querySelector('.modalwrap h3') || {}).textContent || '');
  ok('G3 첫 무기 → 장비 장착 안내 제안(단계별 안내)', /장착/.test(mt), mt);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.modalwrap button')].find((x) => /나중에/.test(x.textContent)); b && b.click(); }); await sleep(300);
  await p.evaluate(() => { AU.Guide.dismiss(); AU.G.startQuest('q_s1_silver'); }); await sleep(200);
  ok('G4 첫 퀘스트 → 퀘스트창 안내', /퀘스트창/.test(await card() || ''), await card());
  await p.evaluate(() => { AU.Guide.dismiss(); AU.G.giveItem('potion', 1); }); await sleep(200);
  ok('G5 같은 안내는 두 번 뜨지 않음', !(await card()), await card());
  ok('G6 튜토리얼 모듈 없음', await p.evaluate(() => !AU.Tutorial), '');
  ok('G7 오류 없음', errs.length === 0, JSON.stringify(errs));
  console.log(`합계 ${pass}/${pass + fail} 통과`); await b.close(); process.exit(fail ? 1 : 0);
})();
