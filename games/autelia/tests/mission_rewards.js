// 현실 미션 보상: 난이도+시간+기간 3등급, 인증 전액/미인증 일부, 나중에 인증하면 소급 지급, 카드 문구·인증 버튼, 오각형 이번 주/지난주
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://localhost:8801';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fail = 0; const T = (n, ok, d) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
  await p.goto(URL + '/?dev=1&intro=cards'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#btn-start'); await p.click('#job-next'); await p.click('#job-next'); await p.fill('#sname', '테스트'); await p.click('#setup-ok');
  await p.waitForTimeout(500); await p.evaluate(() => AU.Prologue.debugComplete('arche')); await p.evaluate(() => AU.G.discoverMissions());
  const OPEN = () => p.evaluate(() => AU.MISSIONS.forEach(m => { const r = AU.G.S.missions.states[m.id]; if (r.state === 'locked') r.state = 'available'; }));
  await OPEN();

  // 1. 등급 계산
  const tiers = await p.evaluate(() => {
    const G = AU.G, f = (o) => G.missionTier(Object.assign({ difficulty: 1, minutes: 3, span: 1 }, o)).tier;
    return { easy: f({}), mid: f({ difficulty: 2, minutes: 10, span: 3 }), hard: f({ difficulty: 3, minutes: 20, span: 7 }), longOnly: f({ difficulty: 1, minutes: 3, span: 7 }), score: G.missionTier({ difficulty: 3, minutes: 20, span: 7 }).score };
  });
  T('등급: 쉬움=1, 2단계 10분 3일=2, 3단계 20분 7일=3(7점)', tiers.easy === 1 && tiers.mid === 2 && tiers.hard === 3 && tiers.score === 7 && tiers.longOnly === 1, tiers);

  // 2. 인증 없이 완료 → 일부, 인증 → 전액, 소급 인증 → 차액 지급
  const r = await p.evaluate(() => {
    const G = AU.G, fb = { challenge: 3, meaning: 3, satisfaction: 3 }, S = G.S;
    const m = AU.MISSIONS.find(x => x.evidence === 'record' && G.missionReward(x).tier === 1 && S.missions.states[x.id].state === 'available');
    G.setMissionState(m.id, 'accept');
    const t0 = G.galleryState().tokens, mind0 = S.mindStats[m.perma];
    G.setMissionState(m.id, 'done', fb, null);
    const rw = G.missionReward(m), afterDone = { tok: G.galleryState().tokens - t0, mind: S.mindStats[m.perma] - mind0, reward: S.missions.states[m.id].reward };
    const bad = G.verifyMission(m.id, { method: 'record', text: '' });
    const ok = G.verifyMission(m.id, { method: 'record', text: '10분 정리했어요' });
    const after = { tok: G.galleryState().tokens - t0, mind: S.mindStats[m.perma] - mind0, reward: S.missions.states[m.id].reward };
    const again = G.verifyMission(m.id, { method: 'record', text: '또' });
    const e = S.missions.log.find(x => x.id === m.id && x.state === 'done');
    return { id: m.id, rw, afterDone, bad, ok, after, again, proof: e.proof, sup: !!e.supplementary, late: !!e.verifiedLate, logTok: e.galleryTokens, logMind: e.mindGained };
  });
  T('인증 없이 완료 → 일부 지급(토큰 1·마음 +1)', r.afterDone.tok === r.rw.part.tokens && r.afterDone.mind === r.rw.part.mind && r.afterDone.reward.verified === false, r);
  T('빈 인증은 거부', r.bad === false);
  T('나중에 인증 → 남은 보상 소급 지급(합계 = 전액)', r.ok === true && r.after.tok === r.rw.full.tokens && r.after.mind === r.rw.full.mind && r.after.reward.verified, r);
  T('이중 지급 없음 + 로그에 인증 표시', r.again === false && r.proof === 'evidence' && r.sup && r.late && r.logTok === r.rw.full.tokens, r);

  // 3. 처음부터 인증하며 완료 → 전액
  const full = await p.evaluate(() => {
    const G = AU.G, S = G.S, m = AU.MISSIONS.find(x => G.missionReward(x).tier >= 1 && x.evidence === 'record' && S.missions.states[x.id].state === 'available');
    G.setMissionState(m.id, 'accept'); const t0 = G.galleryState().tokens;
    G.setMissionState(m.id, 'done', { challenge: 3, meaning: 3, satisfaction: 3 }, { method: 'record', text: '했어요' });
    return { tok: G.galleryState().tokens - t0, full: G.missionReward(m).full.tokens, verified: S.missions.states[m.id].reward.verified };
  });
  T('인증하며 완료 → 전액', full.tok === full.full && full.verified, full);

  // 4. 자기보고형(self_report) 활동도 한 줄 기록으로 인증 가능
  const sr = await p.evaluate(() => { const G = AU.G, m = AU.MISSIONS.find(x => x.evidence === 'self_report' && G.S.missions.states[x.id].state === 'available'); return !!m && !!AU.MissionEvidence.clean({ method: 'record', text: '했어요' }, m); });
  T('자기보고형도 기록으로 인증 가능', sr);

  // 5. UI: 카드 예상 보상 문구, 완료 카드의 인증 버튼 → 모달 → 소급
  await p.evaluate(() => {
    const G = AU.G, S = G.S; const m = AU.MISSIONS.find(x => x.evidence === 'record' && S.missions.states[x.id].state === 'available');
    window.__m = m.id; G.setMissionState(m.id, 'accept'); G.setMissionState(m.id, 'done', { challenge: 3, meaning: 3, satisfaction: 3 }, null);
    AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = 'missions'; AU.UI.tab.missionStatus = 'active'; AU.UI.open('journal');
  });
  await p.waitForTimeout(300);
  const reward = await p.evaluate(() => document.querySelector('.mission .note.reward') && document.querySelector('.mission .note.reward').textContent);
  T('진행 중 카드에 예상 보상 표시', /예상 보상/.test(reward || '') && /인증하면/.test(reward || ''), reward);
  await p.evaluate(() => { AU.UI.tab.missionStatus = 'done'; AU.UI.renderWin(); }); await p.waitForTimeout(200);
  const btnTxt = await p.evaluate(() => [...document.querySelectorAll('.mission[data-mid="' + window.__m + '"] .macts .btn')].map(x => x.textContent));
  T('완료 카드에 인증 버튼', btnTxt.includes('인증하고 남은 보상 받기'), btnTxt);
  const tok0 = await p.evaluate(() => AU.G.galleryState().tokens);
  await p.evaluate(() => [...document.querySelectorAll('.mission[data-mid="' + window.__m + '"] .macts .btn')].find(x => x.textContent.includes('인증하고')).click());
  await p.waitForTimeout(300); await p.fill('.review-step textarea', '정리 끝'); await p.click('.review-step .btn.primary'); await p.waitForTimeout(500);
  const after = await p.evaluate(() => ({ tok: AU.G.galleryState().tokens, v: AU.G.S.missions.states[window.__m].reward.verified, btn: !![...document.querySelectorAll('.mission[data-mid="' + window.__m + '"] .macts .btn')].find(x => x.textContent.includes('인증하고')) }));
  T('모달에서 인증 → 소급 지급·버튼 사라짐', after.v && after.tok > tok0 && !after.btn, { tok0, after });

  // 6. 나만의 공간 3탭: 내 방 / 내 기록(PERMA별) / 내 변화(오각형 이번 주 실선·지난주 점선)
  await p.evaluate(() => { AU.UI.close(); AU.UI.tab.gal = 'room'; AU.UI.open('gallery'); }); await p.waitForTimeout(400);
  T('3탭: 내 방·내 기록·내 변화', (await p.evaluate(() => [...document.querySelectorAll('.room-tabs [data-gtab]')].map(x => x.textContent).join('|'))) === '내 방|내 기록|내 변화');
  await p.screenshot({ path: '/tmp/room_tab_room.png' });
  await p.click('[data-gtab="rec"]'); await p.waitForTimeout(250);
  const rec = await p.evaluate(() => ({ sections: [...document.querySelectorAll('.rec-perma')].map(x => x.dataset.perma).join(''), rows: document.querySelectorAll('.rec-row').length, verify: [...document.querySelectorAll('.rec-row .btn')].map(x => x.textContent) }));
  T('내 기록: PERMA 5개 영역으로 정리', rec.sections === 'PERMA', rec);
  await p.screenshot({ path: '/tmp/room_tab_rec.png' });
  await p.click('[data-gtab="change"]'); await p.waitForTimeout(250);
  const rad = await p.evaluate(() => ({ leg: [...document.querySelectorAll('.mleg .lg')].map(x => x.textContent), dotted: !!document.querySelector('.mradsvg polygon[stroke-dasharray]'), cur: document.querySelector('.mradsvg .rcur').getAttribute('fill') }));
  T('내 변화: 이번 주(실선)·지난주(점선), 옅은 채움', rad.leg.join('|') === '이번 주 (실선)|지난주 (점선)' && rad.dotted && /\.16/.test(rad.cur), rad);
  await p.screenshot({ path: '/tmp/room_tab_change.png' });
  await p.evaluate(() => { AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = 'record'; AU.UI.open('journal'); }); await p.waitForTimeout(300);
  T('일지 마음 기록 탭: 내 방 바로가기(오각형은 없음)', await p.evaluate(() => !!document.querySelector('.roomlink') && !document.querySelector('.mradsvg')));
  await p.evaluate(() => [...document.querySelectorAll('.roomlink .btn')].find(x => x.textContent.includes('내 변화')).click()); await p.waitForTimeout(300);
  T('바로가기 → 내 변화 탭이 열림', await p.evaluate(() => AU.UI.curName === 'gallery' && !!document.querySelector('.mradsvg')));

  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS');
  await b.close(); process.exit(fail ? 1 : 0);
})();
