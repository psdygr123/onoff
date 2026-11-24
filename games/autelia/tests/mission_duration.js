// 기간형 미션: span 배정, 진행(n일차·마감·중간확인), 기한 경과 처리(연장/수행 못함/중도 포기), 재제시, 소감 텍스트, 카드·창 UI
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://localhost:8801';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fail = 0; const T = (n, ok, d) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
  const boot = async () => {
    await p.goto(URL + '/?dev=1&intro=cards'); await p.evaluate(() => localStorage.clear()); await p.reload();
    await p.click('#btn-start'); await p.click('#job-next'); await p.click('#job-next'); await p.fill('#sname', '테스트'); await p.click('#setup-ok');
    await p.waitForTimeout(500); await p.evaluate(() => AU.Prologue.debugComplete('arche')); await p.evaluate(() => AU.G.discoverMissions());
  };
  await boot();

  // 1. 기간 배정
  const sp = await p.evaluate(() => { const c = {}; AU.MISSIONS.forEach(m => c[m.span] = (c[m.span] || 0) + 1); return { c, d2: AU.MISSIONS.filter(m => m.difficulty === 2).every(m => m.span === 3), d3: AU.MISSIONS.filter(m => m.difficulty === 3).every(m => m.span === 7), d1: AU.MISSIONS.filter(m => m.difficulty === 1).every(m => m.span === 1), titleOk: AU.MISSIONS.find(m => m.id === 'm_e1').title.includes('일주일') }; });
  T('2단계=3일 20개, 3단계=7일 14개, 1단계=오늘 하루 66개', sp.c[1] === 66 && sp.c[3] === 20 && sp.c[7] === 14 && sp.d1 && sp.d2 && sp.d3 && sp.titleOk, sp);

  // 2. 보상 등급에 기간 반영 (3단계·7일은 도전 등급)
  const tier = await p.evaluate(() => { const G = AU.G; return { e1: G.missionTier(G.mission('m_e1')), e2: G.missionTier(G.mission('m_e2')), p1: G.missionTier(G.mission('m_p1')) }; });
  T('7일형 30분은 도전(7점), 오늘 하루 쉬운 활동은 가벼움', tier.e2.tier === 3 && tier.e2.score === 7 && tier.p1.tier === 1, tier);

  // 3. 수락하면 기간 시작, 진행 상태
  const prog = await p.evaluate(() => {
    const G = AU.G, S = G.S, id = 'm_e1', t = AU.dateStr();
    S.missions.states[id].state = 'available'; G.setMissionState(id, 'accept');
    const r = S.missions.states[id], p1 = G.missionProgress(id);
    const out = { start: r.startDate === t, due: r.dueDate === AU.addDays(t, 6), day1: p1.day, span: p1.span, finishable: p1.finishable, needMid: p1.needMid, left: p1.left };
    r.startDate = AU.addDays(t, -3); r.dueDate = AU.addDays(t, 3); const p4 = G.missionProgress(id);   // 4일차
    out.day4 = p4.day; out.needMid4 = p4.needMid; out.fin4 = p4.finishable;
    out.mid = G.midCheck(id, '시간 내기가 어려워요'); out.midText = r.mid.text; out.needMidAfter = G.missionProgress(id).needMid;
    r.startDate = AU.addDays(t, -6); r.dueDate = t; out.finLast = G.missionProgress(id).finishable;
    return out;
  });
  T('수락 → 오늘 시작·6일 뒤 마감, 1일차에는 완료 불가·중간확인 아직', prog.start && prog.due && prog.day1 === 1 && prog.span === 7 && !prog.finishable && !prog.needMid && prog.left === 6, prog);
  T('4일차에 중간 확인 필요 → 어려운 점 텍스트 저장 → 필요 없음', prog.day4 === 4 && prog.needMid4 && !prog.fin4 && prog.mid && prog.midText === '시간 내기가 어려워요' && !prog.needMidAfter, prog);
  T('마감일에는 완료 가능', prog.finLast === true);

  // 4. 기한 경과 감지 + 연장
  const ov = await p.evaluate(() => {
    const G = AU.G, r = G.S.missions.states.m_e1, t = AU.dateStr(); r.startDate = AU.addDays(t, -8); r.dueDate = AU.addDays(t, -1);
    const list = G.overdueMissions().map(m => m.id); const ext = G.resolveMission('m_e1', 'extend');
    return { list, ext, overdueAfter: G.missionProgress('m_e1').overdue, due: r.dueDate > t, extended: r.extended };
  });
  T('기한 경과 감지 → 연장하면 다시 진행 중', ov.list.includes('m_e1') && ov.ext && !ov.overdueAfter && ov.due && ov.extended === 1, ov);

  // 5. 수행하지 못함 → 필요한 것 기록 + 보관함 + 같은 영역 다른(쉬운) 활동 열림
  const nd = await p.evaluate(() => {
    const G = AU.G, S = G.S; const before = AU.MISSIONS.filter(m => m.perma === 'E' && AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).map(m => m.id);
    const ok = G.resolveMission('m_e1', 'notdone', { text: '여유 시간이 필요해요' }); const r = S.missions.states.m_e1;
    const after = AU.MISSIONS.filter(m => m.perma === 'E' && AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).map(m => ({ id: m.id, d: m.difficulty }));
    const e = S.missions.log[S.missions.log.length - 1];
    return { before, ok, state: r.state, need: r.need, reason: r.skipReason, after, logReason: e && e.reason, newEasier: after.length === 1 && after[0].id !== 'm_e1' && after[0].d <= 1 };
  });
  T('수행 못함: 보관함 + 필요한 것 기록 + 더 쉬운 활동 열림', nd.ok && nd.state === 'skipped' && nd.need === '여유 시간이 필요해요' && nd.reason === 'notdone' && nd.logReason === 'notdone' && nd.newEasier, nd);

  // 6. 중도 포기: 다시 도전(새 기간) / 안 함(보관함 + 다른 활동)
  const q = await p.evaluate(() => {
    const G = AU.G, S = G.S, t = AU.dateStr(); const pid = AU.MISSIONS.find(m => m.perma === 'P' && AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).id;
    G.setMissionState(pid, 'accept'); const r = S.missions.states[pid]; r.startDate = AU.addDays(t, -2); r.dueDate = AU.addDays(t, 1);
    const retry = G.resolveMission(pid, 'quit', { retry: true });
    const a = { retry, state: r.state, restarted: r.startDate === t, count: r.quitCount };
    const stop = G.resolveMission(pid, 'quit', { retry: false });
    const next = AU.MISSIONS.filter(m => m.perma === 'P' && AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).map(m => m.id);
    return { a, stop, state: r.state, reason: r.skipReason, next, other: next.length === 1 && next[0] !== pid, pid };
  });
  T('중도 포기 → 다시 도전하면 새 기간으로 재시작', q.a.retry && q.a.state === 'accepted' && q.a.restarted && q.a.count === 1, q.a);
  T('중도 포기 → 도전 안 하면 보관함 + 다른 활동', q.stop && q.state === 'skipped' && q.reason === 'quit' && q.other, q);

  // 7. 재제시: 후보가 없으면 보관함 활동이 다시 나오고 reoffer 표시, 필요한 것 기록 후 수락
  const ro = await p.evaluate(() => {
    const G = AU.G, S = G.S, k = 'M', ms = AU.MISSIONS.filter(m => m.perma === k);
    for (const m of ms) { const r = S.missions.states[m.id]; if (r.state === 'locked') r.state = 'done'; }
    const cur = ms.find(m => AU.MISSION_ACTIVE.includes(G.ms(m.id).state)); if (cur) G.setMissionState(cur.id, 'skip');
    const a1 = ms.filter(m => AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).length;
    const other = ms.find(m => G.ms(m.id).state === 'done'); S.missions.states[other.id].state = 'skipped'; S.missions.states[other.id].skipSeq = 99;
    G.fillSlots(); const re = ms.find(m => AU.MISSION_ACTIVE.includes(G.ms(m.id).state));
    const flag = re && S.missions.states[re.id].reoffer; const note = G.setReofferNote(re.id, '저녁에 하기'); const acc = G.setMissionState(re.id, 'accept');
    return { a1, id: re && re.id, flag, note, acc, st: S.missions.states[re.id].state, saved: S.missions.states[re.id].reofferNote, cleared: !S.missions.states[re.id].reoffer };
  });
  T('재제시: reoffer 표시 → 필요한 것 기록 → 수락', ro.flag === true && ro.note && ro.acc && ro.st === 'accepted' && ro.saved === '저녁에 하기' && ro.cleared, ro);

  // 8. 구 저장: 날짜 없는 수락 활동은 오늘부터 기간 계산(불이익 없음)
  const legacy = await p.evaluate(() => { const G = AU.G, r = G.S.missions.states.m_e2; r.state = 'accepted'; delete r.startDate; delete r.dueDate; G.initMissions(); return { start: r.startDate === AU.dateStr(), overdue: G.missionProgress('m_e2').overdue }; });
  T('구 저장 수락 활동에 기간 부여(기한 경과 아님)', legacy.start && !legacy.overdue, legacy);

  // 9. UI: 카드 진행 줄, 버튼 단계
  await boot();
  await p.evaluate(() => { const G = AU.G; AU.MISSIONS.forEach(m => { const r = G.S.missions.states[m.id]; if (r.state === 'locked') r.state = 'available'; }); G.setMissionState('m_e1', 'accept'); AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = 'missions'; AU.UI.tab.missionStatus = 'active'; AU.UI.open('journal'); });
  await p.waitForTimeout(300);
  const card = (id) => p.evaluate((id) => { const c = document.querySelector('.mission[data-mid="' + id + '"]'); return c ? { prog: (c.querySelector('.span-progress') || {}).textContent, btns: [...c.querySelectorAll('.macts .btn')].map(x => x.textContent), tag: c.querySelector('.mh').textContent } : null; }, id);
  let c1 = await card('m_e1');
  T('1일차 카드: 7일 중 1일차 표시, 완료 버튼 없이 그만하기만', c1 && /7일 중 1일차/.test(c1.prog) && !c1.btns.includes('완료했어요') && c1.btns.includes('그만하기') && /기간 7일/.test(c1.tag), c1);
  await p.evaluate(() => { const r = AU.G.S.missions.states.m_e1, t = AU.dateStr(); r.startDate = AU.addDays(t, -3); r.dueDate = AU.addDays(t, 3); AU.UI.renderWin(); }); await p.waitForTimeout(200);
  c1 = await card('m_e1'); T('4일차 카드: 중간 확인하기 버튼', c1.btns.includes('중간 확인하기') && /중간 확인할 때예요/.test(c1.prog), c1);
  await p.evaluate(() => [...document.querySelectorAll('.mission[data-mid="m_e1"] .macts .btn')].find(x => x.textContent === '중간 확인하기').click()); await p.waitForTimeout(250);
  T('중간 확인 창 질문', (await p.evaluate(() => document.querySelector('.review-step .rv-q').textContent)) === '수행하면서 어려운 부분이 있나요? 있다면 무엇인가요?');
  await p.fill('.review-step textarea', '집중이 안 돼요'); await p.click('.review-step .btn.primary'); await p.waitForTimeout(300);
  c1 = await card('m_e1'); T('중간 확인 저장 후 표시', /중간 확인 완료/.test(c1.prog) && (await p.evaluate(() => AU.G.S.missions.states.m_e1.mid.text)) === '집중이 안 돼요', c1);
  await p.evaluate(() => { const r = AU.G.S.missions.states.m_e1, t = AU.dateStr(); r.startDate = AU.addDays(t, -6); r.dueDate = t; AU.UI.renderWin(); }); await p.waitForTimeout(200);
  c1 = await card('m_e1'); T('마감일 카드: 완료·일부·그만하기', c1.btns.includes('완료했어요') && c1.btns.includes('일부만 했어요') && c1.btns.includes('그만하기'), c1);
  // 완료 → 첫 질문이 기분(텍스트)
  await p.evaluate(() => [...document.querySelectorAll('.mission[data-mid="m_e1"] .macts .btn')].find(x => x.textContent === '완료했어요').click()); await p.waitForTimeout(250);
  const q1 = await p.evaluate(() => document.querySelector('.review-step .rv-q').textContent);
  T('7일형 완료: 첫 질문은 기분 텍스트', /7일 동안 수행하면서 기분이 어떠했나요/.test(q1), q1);
  await p.fill('.review-step textarea', '처음엔 힘들었는데 뿌듯해요'); await p.click('.review-step .btn.primary'); await p.waitForTimeout(200);
  for (const v of [4, 4, 5]) { await p.click('.likert-btn:nth-child(' + v + ')'); await p.waitForTimeout(320); }
  await p.fill('.review-step textarea', '타이머 기록').catch(() => {});
  await p.evaluate(() => [...document.querySelectorAll('.review-step .btn')].find(x => x.textContent.includes('평가하고 완료')).click()); await p.waitForTimeout(500);
  const doneInfo = await p.evaluate(() => { const r = AU.G.S.missions.states.m_e1, e = AU.G.S.missions.log.find(x => x.id === 'm_e1' && x.state === 'done'); return { st: r.state, note: e && e.reflection && e.reflection.note, sat: e && e.reflection && e.reflection.satisfaction }; });
  T('완료: 기분 텍스트가 소감 note로 저장', doneInfo.st === 'done' && doneInfo.note === '처음엔 힘들었는데 뿌듯해요' && doneInfo.sat === 5, doneInfo);

  // 10. 기한 경과 카드 → 창 4선택 → 수행 못함 입력
  await p.evaluate(() => { const G = AU.G; const id = AU.MISSIONS.find(m => m.perma === 'R' && AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).id; window.__r = id; G.setMissionState(id, 'accept'); const r = G.S.missions.states[id], t = AU.dateStr(); r.startDate = AU.addDays(t, -2); r.dueDate = AU.addDays(t, -1); AU.UI.tab.missionStatus = 'active'; AU.UI.renderWin(); }); await p.waitForTimeout(250);
  const od = await p.evaluate(() => { const c = document.querySelector('.mission[data-mid="' + window.__r + '"]'); return { prog: c.querySelector('.span-progress').textContent, btns: [...c.querySelectorAll('.macts .btn')].map(x => x.textContent) }; });
  T('기한 경과 카드: 확인하기 버튼 하나', /기한이 지났어요/.test(od.prog) && od.btns.length === 1 && /확인하기/.test(od.btns[0]), od);
  await p.evaluate(() => [...document.querySelectorAll('.mission[data-mid="' + window.__r + '"] .macts .btn')][0].click()); await p.waitForTimeout(250);
  const opts = await p.evaluate(() => [...document.querySelectorAll('.review-step .btn')].map(x => x.textContent));
  T('기한 경과 창: 연장·끝냈어요·그만뒀어요·수행 못함', opts.includes('아직 하고 있어요 (기한 늘리기)') && opts.includes('끝냈어요') && opts.includes('하다가 그만뒀어요') && opts.includes('수행하지 못했어요'), opts);
  await p.evaluate(() => [...document.querySelectorAll('.review-step .btn')].find(x => x.textContent === '수행하지 못했어요').click()); await p.waitForTimeout(250);
  const q2 = await p.evaluate(() => ({ q: document.querySelector('.review-step .rv-q').textContent, dis: document.querySelector('.review-step .btn.primary').hasAttribute('disabled') }));
  T('수행 못함 창: 질문 문구 + 입력 전엔 비활성', q2.q === '미션을 수행하기 위해서 필요한 것이 있다면 무엇인가요?' && q2.dis, q2);
  await p.fill('.review-step textarea', '같이 할 사람'); await p.click('.review-step .btn.primary'); await p.waitForTimeout(400);
  const fin = await p.evaluate(() => { const r = AU.G.S.missions.states[window.__r]; return { st: r.state, need: r.need }; });
  T('입력 후 저장: 보관함 + 필요한 것', fin.st === 'skipped' && fin.need === '같이 할 사람', fin);

  // 11. 재제시 카드: 수락 누르면 '성공하려면 필요한 것' 질문
  await p.evaluate(() => { const G = AU.G, id = window.__r; G.S.missions.states[id].state = 'available'; G.S.missions.states[id].reoffer = true; AU.UI.tab.missionStatus = 'active'; AU.UI.renderWin(); }); await p.waitForTimeout(250);
  await p.evaluate(() => [...document.querySelectorAll('.mission[data-mid="' + window.__r + '"] .macts .btn')].find(x => x.textContent.startsWith('수락')).click()); await p.waitForTimeout(250);
  T('재제시 수락 전 질문', (await p.evaluate(() => document.querySelector('.review-step .rv-q').textContent)) === '이 활동을 성공하기 위해서 필요한 것이 무엇이라고 생각하나요?');

  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS');
  await b.close(); process.exit(fail ? 1 : 0);
})();
