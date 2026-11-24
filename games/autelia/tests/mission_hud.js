// 일상미션 화면 연동: 중간 확인 6일차까지, HUD 마감순 표시, Q 진행 표시, 접속 안내
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://localhost:8801';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fail = 0; const T = (n, ok, d) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
  await p.goto(URL + '/?dev=1&intro=cards'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#btn-start'); await p.click('#job-next'); await p.click('#job-next'); await p.fill('#sname', '테스트'); await p.click('#setup-ok');
  await p.waitForTimeout(500); await p.evaluate(() => AU.Prologue.debugComplete('arche')); await p.evaluate(() => { AU.G.S.flags.missionsUnlocked = true; AU.G.S.flags.guideMet = true; AU.G.discoverMissions(); AU.MISSIONS.forEach(m => { const r = AU.G.S.missions.states[m.id]; if (r.state === 'locked') r.state = 'available'; }); });

  // 1. 중간 확인은 4~6일차에만
  const mid = await p.evaluate(() => {
    const G = AU.G, t = AU.dateStr(); G.setMissionState('m_e1', 'accept'); const r = G.S.missions.states.m_e1, o = {};
    for (const d of [3, 4, 6, 7]) { r.startDate = AU.addDays(t, -(d - 1)); r.dueDate = AU.addDays(t, 7 - d); o['d' + d] = G.missionProgress('m_e1').needMid; }
    return o;
  });
  T('중간 확인: 3일차 X, 4·6일차 O, 7일차 X', !mid.d3 && mid.d4 && mid.d6 && !mid.d7, mid);

  // 2. 마감순 정렬 (기한 지난 것이 먼저)
  const ord = await p.evaluate(() => {
    const G = AU.G, t = AU.dateStr(), ids = AU.MISSIONS.filter(m => m.span === 1 && AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).map(m => m.id);
    const e1 = G.S.missions.states.m_e1; e1.startDate = t; e1.dueDate = AU.addDays(t, 6);
    const other = AU.MISSIONS.find(m => m.id !== 'm_e1' && m.span === 3 && AU.MISSION_ACTIVE.includes(G.ms(m.id).state)) || AU.MISSIONS.find(m => m.id !== 'm_e1' && AU.MISSION_ACTIVE.includes(G.ms(m.id).state));
    G.setMissionState(other.id, 'accept'); const r2 = G.S.missions.states[other.id]; r2.startDate = AU.addDays(t, -5); r2.dueDate = AU.addDays(t, -1); window.__o = other.id;
    return G.activeMissionsByDue().map(m => m.id).slice(0, 2).concat([other.id]);
  });
  T('진행 중 미션이 마감순', ord[0] === ord[2] && ord[1] === 'm_e1', ord);

  // 3. HUD 알림
  await p.evaluate(() => { AU.UI.close && AU.UI.close(); AU.UI.hud.cache.trk = null; AU.UI.updateTracker(); }); await p.waitForTimeout(200);
  const hud = await p.evaluate(() => { const t = AU.UI.hud.tracker, items = [...t.querySelectorAll('.treal-item')]; return { shown: t.style.display !== 'none', head: (t.querySelector('.treal .tt') || {}).textContent, items: items.map(x => x.textContent), overdueFirst: items[0] && items[0].classList.contains('overdue') }; });
  T('HUD에 진행 중 일상미션 마감순 표시(기한 지남 먼저)', hud.shown && /진행 중 2개 · 마감순/.test(hud.head) && hud.items.length === 2 && /기한 지남/.test(hud.items[0]) && /D-6/.test(hud.items[1]) && hud.overdueFirst, hud);
  await p.evaluate(() => document.querySelector('.treal-item').click()); await p.waitForTimeout(300);
  const open = await p.evaluate(() => ({ win: AU.UI.curName === 'journal', tab: AU.UI.tab.j, jg: AU.UI.tab.jg }));
  T('HUD 항목 클릭 → 모험일지 내 활동', open.win && open.tab === 'missions' && open.jg === 'real', open);

  // 4. Q창에 진행 표시
  const q = await p.evaluate(() => { AU.UI.close(); AU.UI.tab.q = 'active'; AU.UI.selected.q = 'm_e1'; AU.UI.open('quests'); const el = document.querySelector('.detail .span-progress'); return el && el.textContent; });
  T('Q창 일상미션 상세에 n일차·마감 표시', q && /7일 중 1일차/.test(q) && /마감/.test(q), q);

  // 5. 접속 안내
  await p.evaluate(() => AU.UI.close()); await p.waitForTimeout(100);
  const n1 = await p.evaluate(() => { const ok = AU.UI.missionNotice(); const m = document.querySelector('.missionnotice'); return { ok, title: m && m.querySelector('h3').textContent, btns: m ? [...m.querySelectorAll('.btn')].map(x => x.textContent) : [] }; });
  T('접속 안내: 기한 지난 미션이 있으면 안내 창', n1.ok && n1.title === '일상 미션이 있습니다' && n1.btns.includes('확인하러 가기') && n1.btns.includes('나중에'), n1);
  await p.evaluate(() => [...document.querySelectorAll('.missionnotice .btn')].find(x => x.textContent === '확인하러 가기').click()); await p.waitForTimeout(300);
  T('확인하러 가기 → 모험일지 내 활동', await p.evaluate(() => AU.UI.tab.j === 'missions' && !document.querySelector('.missionnotice')));
  await p.evaluate(() => { AU.UI.close(); AU.G.resolveMission(window.__o, 'extend'); });
  T('기한 지난 미션 없으면 안내 없음', (await p.evaluate(() => AU.UI.missionNotice())) === false);
  // 6. 완료 방법 안내 + 탭 4개
  const how = await p.evaluate(() => { AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = 'missions'; AU.UI.tab.missionStatus = 'all'; AU.UI.open('journal'); return { a4: AU.UI.missionHow(AU.G.mission('m_a4')), a3: AU.UI.missionHow(AU.G.mission('m_a3')), a1: AU.UI.missionHow(AU.G.mission('m_p1')), tabs: [...document.querySelectorAll('.real-tabs .btn')].map(x => x.textContent) }; });
  T('완료 방법: 한 줄 기록·사진(선택)·타이머를 구분해 안내', /한 줄을 이 게임 안에 적어요/.test(how.a4) && /사진을 올릴 수 있어요\(선택\)/.test(how.a3) && /타이머/.test(how.a1) && /내 활동에서 '완료했어요'/.test(how.a4), how);
  T('일상 활동 탭 3개', how.tabs.length === 3 && how.tabs.join('|') === '내 활동|마음 기록|쉼', how.tabs);
  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0);
})();
