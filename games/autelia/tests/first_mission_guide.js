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
  const tourOpen = () => p.evaluate(() => !!document.querySelector('.jt-card'));
  const prompting = () => p.evaluate(() => document.body.innerText.includes('나만의 공간을 보여 드릴까요?'));
  const complete = async (id) => {
    await p.evaluate((id) => { AU.G.S.missions.states[id] = { state: 'accepted', rewarded: false, tries: 0 }; AU.UI.missionReview(AU.G.mission(id), 'done', (f, e) => AU.G.setMissionState(id, 'done', f, e)); }, id);
    for (const v of [3, 4, 5]) { await p.click('.modal .likert-btn:nth-child(' + v + ')'); await p.waitForTimeout(350); }
    await p.click('.modal .choices .btn.primary'); await p.waitForTimeout(900);
  };
  const title = () => p.evaluate(() => document.querySelector('.jt-title').textContent);
  const prog = () => p.evaluate(() => document.querySelector('.jt-prog').textContent);
  const next = async () => { await p.click('.jt-card .btn.primary'); await p.waitForTimeout(350); };

  await complete('m_e5');
  T('첫 완료 직후 제안 표시', await prompting());
  await p.click('text=천천히 알려 주세요'); await p.waitForTimeout(500);
  T('투어 시작(화면 어둡게+카드)', (await tourOpen()) && (await p.evaluate(() => !!document.querySelector('.jt-shade'))));
  T('진행 1 / 7 · 공간 소개', (await prog()) === '1 / 7' && (await title()).includes('나만의 공간'));
  T('나만의 공간 창이 열려 있음', (await p.evaluate(() => AU.UI.curName)) === 'gallery');
  await next(); await next();
  T('3단계 오각형을 실제 요소로 비춤', (await title()).includes('오각형') && (await p.evaluate(() => { const s = document.querySelector('.jt-spot'); return s && s.style.display === 'block' && parseFloat(s.style.width) > 50; })));
  await next(); await next(); await next();
  T('6단계는 모험일지 마음 기록 탭', (await title()).includes('마음 기록') && (await p.evaluate(() => AU.UI.curName)) === 'journal' && (await p.evaluate(() => !!document.querySelector('.window .mtrend'))));
  await next();
  T('7단계 마지막 버튼 이해했어요', (await p.evaluate(() => document.querySelector('.jt-card .btn.primary').textContent)) === '이해했어요');
  await next();
  T('투어 종료 후 창 닫힘', !(await tourOpen()) && (await p.evaluate(() => AU.UI.curName)) === null);
  T('seen 플래그 저장', (await p.evaluate(() => AU.G.S.flags.firstDoneGuideSeen)) === true);

  await complete('m_e4');
  T('두 번째 완료에는 제안 없음', !(await prompting()) && !(await tourOpen()));

  await p.evaluate(() => AU.UI.open('gallery')); await p.waitForTimeout(300);
  await p.click('text=사용법 보기'); await p.waitForTimeout(500);
  T('사용법 보기로 투어 재시작', await tourOpen());
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  T('Esc로 건너뛰기', !(await tourOpen()));

  // '나중에'를 고르면 이후 자동 제안 없음
  await p.evaluate(() => { AU.G.S.flags.firstDoneGuideSeen = false; });
  await complete('m_e3');
  T('플래그 초기화 후 제안 표시', await prompting());
  await p.click('text=나중에'); await p.waitForTimeout(300);
  T('나중에 선택 시 seen 저장', (await p.evaluate(() => AU.G.S.flags.firstDoneGuideSeen)) === true && !(await tourOpen()));

  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS');
  await b.close(); process.exit(fail ? 1 : 0);
})();
