// 미션 슬롯: 영역별 1개 노출·완료/건너뛰기 자동 채움·보관함 재제공·단계 우선순위·구 저장 정리·스토리 연계·인증 라벨·창 UI
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
  const act = () => p.evaluate(() => AU.MISSIONS.filter(m => AU.MISSION_ACTIVE.includes(AU.G.ms(m.id).state)).map(m => ({ id: m.id, perma: m.perma, d: m.difficulty })));
  const area = (k) => p.evaluate((k) => AU.MISSIONS.filter(m => m.perma === k && AU.MISSION_ACTIVE.includes(AU.G.ms(m.id).state)).map(m => m.id), k);

  // 1. 처음에는 영역(P·E·R·M·A)마다 1개씩 5개만 열림
  const a0 = await act();
  T('처음 5개, 영역마다 1개', a0.length === 5 && new Set(a0.map(x => x.perma)).size === 5 && a0.every(x => x.d === 1), a0);
  T('나머지는 미공개(locked)', (await p.evaluate(() => AU.MISSIONS.filter(m => AU.G.ms(m.id).state === 'locked').length)) === 95);

  // 2. 완료하면 같은 영역의 다음 활동이 열림, 완료한 것은 done
  const pid = (await area('P'))[0];
  const r2 = await p.evaluate((id) => { const G = AU.G; G.setMissionState(id, 'accept'); const ok = G.setMissionState(id, 'done', { challenge: 3, meaning: 3, satisfaction: 4 }, null); return { ok, st: G.ms(id).state }; }, pid);
  const pNext = await area('P');
  T('완료 후 done + 같은 영역 새 활동 1개', r2.ok && r2.st === 'done' && pNext.length === 1 && pNext[0] !== pid, { r2, pNext });
  T('accept 없이도 수락 직후 바로 완료 가능(해 봤어요 불필요)', await p.evaluate(() => { const G = AU.G, id = AU.MISSIONS.find(m => m.perma === 'E' && G.ms(m.id).state === 'available').id; G.setMissionState(id, 'accept'); return G.setMissionState(id, 'done', { challenge: 2, meaning: 3, satisfaction: 3 }, null); }));

  // 3. 건너뛰면 다른 활동이 먼저 열리고, 건너뛴 활동은 보관함(skipped)
  const rid = (await area('R'))[0];
  await p.evaluate((id) => AU.G.setMissionState(id, 'skip'), rid);
  const rNext = await area('R');
  T('건너뛰기 → 같은 영역의 다른 활동이 열림', rNext.length === 1 && rNext[0] !== rid, rNext);
  T('건너뛴 활동은 보관함(skipped)', (await p.evaluate((id) => AU.G.ms(id).state, rid)) === 'skipped');

  // 4. 새 후보가 소진되면 건너뛴 활동이 다시 제공됨(방금 건너뛴 것은 제외)
  const redo = await p.evaluate(() => {
    const G = AU.G, k = 'M', ms = AU.MISSIONS.filter(m => m.perma === k);
    for (const m of ms) { const r = G.S.missions.states[m.id]; if (r.state === 'locked') r.state = 'done'; }   // 미공개 후보를 모두 소진시킴
    const cur = ms.find(m => AU.MISSION_ACTIVE.includes(G.ms(m.id).state)); const first = cur.id;
    G.setMissionState(first, 'skip');
    const open1 = ms.filter(m => AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).map(m => m.id);
    return { first, open1 };
  });
  T('후보가 없으면 방금 건너뛴 활동을 곧바로 되돌리지 않음(빈 슬롯 허용)', redo.open1.length === 0, redo);

  // 5. 허용 단계: 낮은 단계 3종 완료 + 만족도 3 이상이면 다음 단계, 만족도 낮으면 유지
  const gate = await p.evaluate(() => {
    const G = AU.G, k = 'E'; const lg = (n, sat, ch) => { const m = AU.MISSIONS.filter(x => x.perma === k && x.difficulty === 1)[n]; G.S.missions.log.push({ t: AU.dateStr(), id: m.id, perma: k, state: 'done', reflection: { challenge: ch, meaning: 3, satisfaction: sat } }); };
    G.S.missions.log = G.S.missions.log.filter(e => e.perma !== k);
    const before = G.allowedDifficulty(k); lg(0, 4, 2); lg(1, 4, 2); const two = G.allowedDifficulty(k); lg(2, 4, 2); const three = G.allowedDifficulty(k);
    G.S.missions.log = G.S.missions.log.filter(e => e.perma !== k); lg(0, 2, 2); lg(1, 2, 2); lg(2, 2, 2); const lowSat = G.allowedDifficulty(k);
    G.S.missions.log = G.S.missions.log.filter(e => e.perma !== k); lg(0, 3, 5); lg(1, 3, 5); lg(2, 3, 5); const hardMid = G.allowedDifficulty(k);
    return { before, two, three, lowSat, hardMid };
  });
  T('단계 허용: 0·2회→1단계, 3회+만족→2단계, 만족도 낮음→유지, 힘들고 만족 보통→유지', gate.before === 1 && gate.two === 1 && gate.three === 2 && gate.lowSat === 1 && gate.hardMid === 1, gate);

  // 6. 구 저장 정리: 예전에 모두 열린 활동은 미공개로, 즐겨찾기·진행 중·완료는 유지
  await boot();
  const mig = await p.evaluate(() => {
    const G = AU.G, S = G.S; for (const m of AU.MISSIONS) S.missions.states[m.id].state = 'available';   // 구 저장: 100개 전부 열림
    const fav = AU.MISSIONS[40].id, acc = AU.MISSIONS[41].id, dn = AU.MISSIONS[42].id;
    S.missions.favorites = [fav]; S.missions.states[acc].state = 'accepted'; S.missions.states[dn].state = 'done'; delete S.flags.missionSlotsV2;
    G.initMissions();
    const open = AU.MISSIONS.filter(m => AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).map(m => m.id);
    return { favKept: G.ms(fav).state === 'available', accKept: G.ms(acc).state === 'accepted', doneKept: G.ms(dn).state === 'done', n: open.length, flag: S.flags.missionSlotsV2 };
  });
  T('구 저장 정리(즐겨찾기·수락·완료 유지, 나머지 미공개)', mig.favKept && mig.accKept && mig.doneKept && mig.flag === true && mig.n <= 12, mig);

  // 7. 스토리 연계 활동은 슬롯과 무관하게 열림
  await boot();
  const story = await p.evaluate(() => { const G = AU.G, id = 'm_a4'; const before = G.ms(id).state; const r = G.revealMission(id); return { before, r, after: G.ms(id).state }; });
  T('스토리 연계 활동 열기(locked → available)', story.after === 'available' && (story.before === 'locked' ? story.r === true : true), story);

  // 8. 인증 등급 라벨: 증거(기록·타이머·사진)가 있으면 인증 완료, 없으면 자기보고 완료. 보상은 동일
  const lab = await p.evaluate(() => {
    const G = AU.G, fb = { challenge: 3, meaning: 3, satisfaction: 3 };
    const pick = (ev) => AU.MISSIONS.find(m => m.evidence === ev && G.ms(m.id).state === 'locked');
    const withEv = pick('record') || pick('timer'), plain = pick('self_report');
    for (const m of [withEv, plain]) G.S.missions.states[m.id].state = 'accepted';
    const tok0 = G.galleryState().tokens;
    G.setMissionState(plain.id, 'done', fb, null);
    const tok1 = G.galleryState().tokens;
    const e = withEv.evidence === 'record' ? { method: 'record', text: '했어요' } : { method: 'timer', seconds: 60 };
    G.setMissionState(withEv.id, 'done', fb, e);
    const tok2 = G.galleryState().tokens;
    const lp = G.S.missions.log.find(x => x.id === plain.id), lw = G.S.missions.log.find(x => x.id === withEv.id);
    return { evMethod: withEv.evidence, plainSup: !!lp.supplementary, plainProof: lp.proof, evSup: !!lw.supplementary, evProof: lw.proof, tokPlain: tok1 - tok0, tokEv: tok2 - tok1, evId: withEv.id, plainId: plain.id };
  });
  T('증거 없음 → self_report', lab.plainSup === false && lab.plainProof === 'self_report', lab);
  T('증거 있음 → evidence(인증)', lab.evSup === true && lab.evProof === 'evidence', lab);
  T('토큰: 인증 시 전액 > 미인증 일부(등급표 기준)', lab.tokPlain === 1 && lab.tokEv === 2 && lab.tokEv > lab.tokPlain, lab);
  await p.evaluate(() => { AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = 'record'; AU.UI.open('journal'); }); await p.waitForTimeout(300);
  const tags = await p.evaluate((l) => ({ ev: document.querySelector('.mission[data-mid="' + l.evId + '"] .tag.proof').textContent, plain: document.querySelector('.mission[data-mid="' + l.plainId + '"] .tag.proof').textContent }), lab);
  T('완료 창 라벨: 인증 완료 / 자기보고 완료', tags.ev === '인증 완료' && tags.plain === '자기보고 완료', tags);
  // 9. 내 활동(진행 중 + 추천 1~2개) · 마음 기록(완료)
  await boot();
  await p.evaluate(() => { const G = AU.G, id = AU.MISSIONS.find(m => AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).id; G.setMissionState(id, 'accept'); G.setMissionState(id, 'done', { challenge: 3, meaning: 3, satisfaction: 4 }, null); const s = AU.MISSIONS.find(m => m.perma === 'E' && AU.MISSION_ACTIVE.includes(G.ms(m.id).state)).id; G.setMissionState(s, 'accept'); AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = 'missions'; AU.UI.open('journal'); });
  await p.waitForTimeout(300);
  T('내 활동: 진행 중 1개 + 추천 1~2개', await p.evaluate(() => document.querySelectorAll('[data-mine="going"] .mission[data-mid]').length === 1 && document.querySelectorAll('[data-reco="list"] .mission[data-mid]').length >= 1 && document.querySelectorAll('[data-reco="list"] .mission[data-mid]').length <= 2));
  await p.evaluate(() => { AU.UI.tab.j = 'record'; AU.UI.renderWin(); }); await p.waitForTimeout(200);
  T('마음 기록: 완료 1개 + 자기보고 완료 라벨', (await p.evaluate(() => document.querySelectorAll('[data-record="done"] .mission[data-mid]').length)) === 1 && (await p.evaluate(() => document.querySelector('.mission .tag.proof').textContent)) === '자기보고 완료');
  T('추천은 아직 수락하지 않은 활동만', await p.evaluate(() => AU.G.recommend(30, 0).every(r => AU.G.ms(r.m.id).state === 'available')));

  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS');
  await b.close(); process.exit(fail ? 1 : 0);
})();
