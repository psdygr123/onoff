// 첫 현실미션 완료 안내: 첫 완료 직후 한 번만 자동 표시, 건너뛰어도 재표시 없음, 나만의 공간에서 다시 보기
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://localhost:8801';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fail = 0; const T = (n, ok, d) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
  await p.goto(URL + '/?dev=1&intro=cards'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#btn-start'); await p.click('#job-next'); await p.click('#job-next'); await p.fill('#sname', '테스트'); await p.click('#setup-ok');
  await p.waitForTimeout(500); await p.evaluate(() => AU.Prologue.debugComplete('porto'));
  const guideOpen = () => p.evaluate(() => !!document.querySelector('.fg-card'));
  const complete = async (id) => {
    await p.evaluate((id) => { AU.G.S.missions.states[id] = { state: 'accepted', rewarded: false, tries: 0 }; AU.UI.missionReview(AU.G.mission(id), 'done', (f, e) => AU.G.setMissionState(id, 'done', f, e)); }, id);
    for (const v of [3, 4, 5]) { await p.click('.modal .likert-btn:nth-child(' + v + ')'); await p.waitForTimeout(350); }
    await p.click('.modal .choices .btn.primary'); await p.waitForTimeout(900);
  };

  await complete('m_e5');
  T('첫 완료 직후 안내 표시', await guideOpen());
  T('진행 표시 1 / 6', (await p.evaluate(() => document.querySelector('.fg-card .rv-prog span').textContent)) === '1 / 6');
  for (let k = 0; k < 3; k++) { await p.click('.fg-card .choices .btn.primary'); await p.waitForTimeout(100); }
  T('4단계에 오각형 도식', (await p.evaluate(() => !!document.querySelector('.fg-card svg.fg-pent'))) === true);
  await p.click('.fg-card .rv-foot .btn'); await p.waitForTimeout(200); // 건너뛰기
  T('건너뛰기로 닫힘', !(await guideOpen()));
  T('seen 플래그 저장', (await p.evaluate(() => AU.G.S.flags.firstDoneGuideSeen)) === true);

  await complete('m_e4');
  T('두 번째 완료에는 자동 표시 없음', !(await guideOpen()));

  await p.evaluate(() => AU.UI.open('gallery')); await p.waitForTimeout(300);
  await p.click('text=사용법 보기'); await p.waitForTimeout(200);
  T('사용법 보기로 재표시', await guideOpen());
  for (let k = 0; k < 5; k++) { await p.click('.fg-card .choices .btn.primary'); await p.waitForTimeout(100); }
  T('마지막 단계에 공간 열기 버튼', (await p.evaluate(() => document.querySelector('.fg-card .choices .btn.primary').textContent)) === '나만의 공간 열기');
  await p.click('.fg-card .choices .btn.primary'); await p.waitForTimeout(300);
  T('안내 닫힘', !(await guideOpen()));

  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS');
  await b.close(); process.exit(fail ? 1 : 0);
})();
