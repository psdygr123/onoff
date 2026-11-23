// 소감 확장(efficacy + mood) 저장 호환 테스트
// 효능감 1문항 + 기분 칩이 선택 항목으로 저장되고, 기존 로그와 호환되는지 확인
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://localhost:8801';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fail = 0; const T = (n, ok, d) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };

  await p.goto(URL + '/?dev=1&intro=cards'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#btn-start'); await p.click('#job-next'); await p.click('#job-next'); await p.fill('#sname', '테스트'); await p.click('#setup-ok');
  await p.waitForTimeout(500); await p.evaluate(() => AU.Prologue.debugComplete('porto'));

  // 1. validMissionFeedback: 필수 3항목만으로 유효
  const v1 = await p.evaluate(() => AU.G.validMissionFeedback({ challenge: 3, meaning: 4, satisfaction: 5 }));
  T('validMissionFeedback 필수 3항목', v1 === true, v1);

  // 2. validMissionFeedback: efficacy + mood 포함 유효
  const v2 = await p.evaluate(() => AU.G.validMissionFeedback({ challenge: 2, meaning: 3, satisfaction: 4, efficacy: 5, mood: '😊 좋음' }));
  T('validMissionFeedback efficacy+mood 포함', v2 === true, v2);

  // 3. validMissionFeedback: efficacy/mood null 유효 (선택 미입력)
  const v3 = await p.evaluate(() => AU.G.validMissionFeedback({ challenge: 1, meaning: 2, satisfaction: 3, efficacy: null, mood: null }));
  T('validMissionFeedback null 선택항목', v3 === true, v3);

  // 4. efficacy + mood 포함 미션 완료 → log에 기록되는지
  await p.evaluate(() => { AU.G.discoverMissions();AU.MISSIONS.forEach(function(m){var r=AU.G.S.missions.states[m.id];if(r&&r.state==='locked')r.state='available'}); AU.G.setMissionState('m_e5', 'accept'); });
  await p.evaluate(() => {
    AU.G.setMissionState('m_e5', 'done', { challenge: 3, meaning: 4, satisfaction: 5, efficacy: 4, mood: '💪 뿌듯함', note: '잘 됐다' }, null);
  });
  const log1 = await p.evaluate(() => {
    const e = AU.G.S.missions.log.find(x => x.id === 'm_e5' && x.state === 'done');
    return e ? { efficacy: e.reflection && e.reflection.efficacy, mood: e.reflection && e.reflection.mood } : null;
  });
  T('log efficacy 저장', log1 && log1.efficacy === 4, log1);
  T('log mood 저장', log1 && log1.mood === '💪 뿌듯함', log1);

  // 5. efficacy 없이 완료 → log.reflection.efficacy는 null (하위 호환)
  //    m_e5는 이미 done이므로 repeatMission으로 테스트
  await p.evaluate(() => {
    AU.G.repeatMission('m_e5', { challenge: 2, meaning: 2, satisfaction: 2 }, null);
  });
  const log2 = await p.evaluate(() => {
    const entries = AU.G.S.missions.log.filter(x => x.id === 'm_e5' && x.repeat === true);
    const e = entries[entries.length - 1];
    return e ? e.reflection : null;
  });
  T('하위 호환: efficacy null', log2 && log2.efficacy === null, log2);
  T('하위 호환: mood null', log2 && log2.mood === null, log2);

  // 7. 필수 3문항만 단계형 리커트: 도전도 → 의미 → 만족도(+선택 첨부) → 제출
  await p.evaluate(() => { window.__sub = null; AU.UI.missionReview(AU.G.mission('m_e5'), 'done', (f) => { window.__sub = f; }); });
  T('1단계 리커트 버튼 5개', (await p.evaluate(() => document.querySelectorAll('.modal .likert-btn').length)) === 5);
  T('진행 표시 1 / 3', (await p.evaluate(() => document.querySelector('.rv-prog span').textContent)) === '1 / 3');
  T('select 미사용', (await p.evaluate(() => document.querySelectorAll('.modal select').length)) === 0);
  for (const v of [4, 3]) { await p.click('.modal .likert-btn:nth-child(' + v + ')'); await p.waitForTimeout(400); }
  T('3단계 만족도 도달', (await p.evaluate(() => document.querySelector('.modal .rv-q').textContent.includes('만족'))) === true);
  T('기분 칩·소감 글 삭제됨', (await p.evaluate(() => document.querySelectorAll('.mood-chip, textarea.memo').length)) === 0);
  T('만족도 선택 전 제출 비활성', (await p.evaluate(() => document.querySelector('.modal .choices .btn.primary').hasAttribute('disabled'))) === true);
  await p.click('.modal .likert-btn:nth-child(5)'); await p.waitForTimeout(400);
  await p.click('.modal .choices .btn.primary'); await p.waitForTimeout(500);
  const sub = await p.evaluate(() => window.__sub);
  T('제출 값(도전4·의미3·만족5)', sub && sub.challenge === 4 && sub.meaning === 3 && sub.satisfaction === 5 && sub.efficacy === null && sub.mood === null, sub);

  // 8. 수락 뒤 바로 완료 가능(해 봤어요 없음)
  const flow = await p.evaluate(() => {
    const G = AU.G; G.S.missions.states['m_e4'] = { state: 'accepted', rewarded: false, tries: 0 };
    const fb = { challenge: 2, meaning: 3, satisfaction: 4, note: '' };
    return G.setMissionState('m_e4', 'done', fb, null) && G.S.missions.states['m_e4'].state === 'done';
  });
  T('accepted → done 직행', flow === true, flow);
  const part = await p.evaluate(() => { const G = AU.G; G.S.missions.states['m_e3'] = { state: 'accepted', rewarded: false, tries: 0 }; return G.setMissionState('m_e3', 'partial', null, null); });
  T('accepted → partial 직행', part === true, part);

  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS');
  await b.close(); process.exit(fail ? 1 : 0);
})();
