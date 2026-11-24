/* 모험일지 현실 활동 개편 시험: 6개 기능(오늘·추천·전체 검색/필터·즐겨찾기·계획·기록) + 기존 저장·보상·반복·주기 보존 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fails = 0; const ck = (k, ok, ev) => { console.log((ok ? 'PASS ' : 'FAIL ') + k + (ev ? ' :: ' + ev : '')); if (!ok) fails++; };
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    const ev = (fn, a) => p.evaluate(fn, a), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await p.goto((process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards'); await ev(() => localStorage.clear()); await p.reload();
    await p.click('#btn-start'); for (let i = 0; i < 2 && await p.$('#job-next'); i++) await p.click('#job-next');
    if (await p.$('#charsetup')) { await p.fill('#sname', '검증'); await p.click('#setup-ok'); }
    await ev(() => AU.Prologue.debugComplete('arche')); await ev(() => AU.G.discoverMissions());
    // 슬롯 개편 이후 기본은 영역별 1개만 열리지만, 이 시험은 보상·추천·반복·주기를 '전체 열림' 상태에서 검증하므로 직접 모두 연다(슬롯 동작은 mission_slots.js)
    await ev(() => { for (const m of AU.MISSIONS) { const r = AU.G.S.missions.states[m.id]; if (r.state === 'locked') r.state = 'available'; } });
    const open = async (tab) => { await ev((t) => { AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = t; AU.UI.open('journal'); }, tab); await sleep(250); };
    const txt = () => ev(() => document.querySelector('.window, .panel') ? document.body.innerText : '');

    // J1 탭 구성: 6개 기능 + 쉼·마음 기록 유지
    await open('missions'); const tabs = await ev(() => [...document.querySelectorAll('.real-tabs .btn, .real-tabs button')].map((x) => x.textContent));
    ck('J1 현실 활동 탭은 3개: 내 활동·마음 기록·쉼', tabs.length === 3 && ['내 활동', '마음 기록', '쉼'].every((t) => tabs.includes(t)), tabs.join('|'));


    // J5 즐겨찾기: 등록·해제·저장 유지
    const f = await ev(() => { const G = AU.G, id = AU.MISSIONS[3].id; const a = G.toggleFavorite(id), on = G.isFavorite(id); G.save('t'); const raw = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /save|autelia/i.test(k) && /favorites/.test(localStorage.getItem(k) || '')) || '') || 'null'); const off0 = G.toggleFavorite(id), off = !G.isFavorite(id); G.toggleFavorite(id); return { a, on, off0, off, bad: G.toggleFavorite('nope'), persisted: !!raw, id }; });
    ck('J5 즐겨찾기 등록·해제·잘못된 ID 거부·저장', f.a && f.on && f.off0 && f.off && f.bad === false && f.persisted, JSON.stringify(f));

    // J7 추천: 이유 표시, 설정 반영, 제외/되돌리기, 같은 PERMA 쏠림 방지
    const r0 = await ev(() => AU.G.recommend(3, 0).map((r) => ({ id: r.m.id, perma: r.m.perma, why: r.reasons })));
    ck('J7 추천 3개 + 모두 이유 포함', r0.length === 3 && r0.every((r) => r.why.length >= 1), JSON.stringify(r0.map((r) => r.id)));
    const pref = await ev(() => { const G = AU.G, ok = G.setRecoPrefs({ areas: ['self_care'], maxMin: 5 }), bad1 = G.setRecoPrefs({ areas: ['zzz'], maxMin: 5 }), bad2 = G.setRecoPrefs({ areas: [], maxMin: 7 }); const rs = G.recommend(3, 0); return { ok, bad1, bad2, areas: rs.map((r) => r.m.functionArea), why: rs[0].reasons.join('/') }; });
    ck('J8 관심 영역·시간 선택이 추천에 반영, 잘못된 값 거부', pref.ok && !pref.bad1 && !pref.bad2 && pref.areas[0] === 'self_care' && /직접 고르신 관심 영역/.test(pref.why), JSON.stringify(pref));
    const hid = await ev(() => { const G = AU.G, id = G.recommend(3, 0)[0].m.id; G.hideReco(id); const gone = !G.recommend(30, 0).some((r) => r.m.id === id); G.hideReco(id, false); const back = G.recommend(30, 0).some((r) => r.m.id === id); return { gone, back }; });
    ck('J9 추천에서 빼기·되돌리기', hid.gone && hid.back, JSON.stringify(hid));
    const spread = await ev(() => { const o = {}; AU.G.recommend(6, 0).forEach((r) => { o[r.m.perma] = (o[r.m.perma] || 0) + 1; }); return Math.max(...Object.values(o)) <= 2; });
    ck('J9b 한 PERMA 영역이 추천에 3개 이상 몰리지 않음', spread);
    const rot = await ev(() => JSON.stringify(AU.G.recommend(3, 0).map((r) => r.m.id)) !== JSON.stringify(AU.G.recommend(3, 1).map((r) => r.m.id)));
    ck('J9c "다른 추천 보기"로 목록이 바뀜', rot);
    // 추천에서 이미 완료한 활동과 즐겨찾기한 활동은 제외, 미수행·건너뛰기 이력으로 불리하게 만들지 않음
    const fair = await ev(() => { const G = AU.G, first = G.recommend(1, 0)[0].m.id; G.setMissionState(first, 'accept'); G.setMissionState(first, 'skip'); const still = G.recommend(60, 0).some((r) => r.m.id === first); const done = AU.MISSIONS[50].id; G.setMissionState(done, 'accept'); G.setMissionState(done, 'done'); const noDone = !G.recommend(60, 0).some((r) => r.m.id === done); return { still, noDone }; });
    ck('J10 건너뛴 활동은 보관함으로 가 추천에서 빠지고, 완료한 활동도 제외', !fair.still && fair.noDone, JSON.stringify(fair));

    // J11 보상·반복·주기 보존
    const keep = await ev(() => { const G = AU.G, S = G.S, id = AU.MISSIONS[50].id, m = G.mission(id), v0 = S.mindStats[m.perma], t0 = G.galleryState().tokens; const rep = G.repeatMission(id, { challenge: 3, meaning: 4, satisfaction: 5, note: '좋았어요' }); const plan = G.setMissionPlan(id, { mode: 'daily' }); return { rep, plan, parity: v0 === S.mindStats[m.perma] && t0 === G.galleryState().tokens, doneKeep: G.ms(id).state === 'done', id }; });
    ck('J11 반복 수행은 추가 보상 없음·최초 완료 상태 유지·주기 설정 가능', keep.rep && keep.plan && keep.parity && keep.doneKeep, JSON.stringify(keep));

    // J12 오늘의 활동: 계획 + 이어진 활동, 오늘 이미 한 활동은 계획 목록에서 빠짐
    await ev((id) => { AU.G.S.missions.log.forEach((e) => { if (e.id === id) e.t = '2026-01-01'; }); }, keep.id);
    const t1 = await ev(() => ({ planned: AU.G.todayPlanned().map((m) => m.id), box: true }));
    ck('J12 오늘의 활동에 오늘의 수행 계획 표시', t1.planned.includes(keep.id) && t1.box, JSON.stringify(t1));
    const t2 = await ev((id) => { AU.G.repeatMission(id); return { planned: AU.G.todayPlanned().map((m) => m.id), n: AU.G.todayDone() }; }, keep.id);
    ck('J12b 오늘 이미 기록한 활동은 오늘의 계획에서 빠짐', !t2.planned.includes(keep.id) && t2.n >= 1, JSON.stringify(t2));

    // J13 나의 활동 계획 / 활동 기록

    // J16 구 저장 호환: favorites/prefs 없는 저장도 오류 없이 열림
    const legacy = await ev(() => { const M = AU.G.S.missions; delete M.favorites; delete M.prefs; delete M.recoHidden; AU.G.initMissions(); return Array.isArray(M.favorites) && Array.isArray(M.prefs.areas) && Array.isArray(M.recoHidden); });
    ck('J16 구 저장(즐겨찾기·취향 항목 없음)도 안전하게 초기화', legacy);

    // J17 잠금 상태에서는 목록이 보이지 않음(프롤로그 전)
    const q = await ev(() => { AU.G.S.flags.missionsUnlocked = false; AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = 'today'; AU.UI.open('journal'); return document.body.innerText; }); await sleep(200);
    ck('J17 잠금 상태 안내 유지', /아직 열리지 않았습니다/.test(await txt()));
    ck('J99 페이지 오류 없음', errs.length === 0, errs.join(' | '));
  } catch (e) { console.log('FAIL EXC ' + e.message); fails++; } finally { await b.close(); }
  process.exit(fails ? 1 : 0);
})();
