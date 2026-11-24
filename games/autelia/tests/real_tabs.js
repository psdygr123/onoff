/* 일상 활동 탭 3개(내 활동·마음 기록·쉼) 시험: 진행 중 + 추천 1~2개, 완료 목록, 쉼 하루 5개·날마다 다름 */
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
    const open = async (tab) => { await ev((t) => { AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = t; AU.UI.open('journal'); }, tab); await sleep(250); };
    const names = () => ev(() => [...document.querySelectorAll('.real-tabs button')].map((x) => x.textContent));
    await open('missions'); const t = await names();
    ck('T1 탭은 내 활동·마음 기록·쉼 세 개', JSON.stringify(t) === JSON.stringify(['내 활동', '마음 기록', '쉼']), t.join('|'));
    ck('T2 옛 탭 이름(오늘의 활동)도 내 활동으로 열림', await (async () => { await open('today'); return ev(() => !!document.querySelector('.real-tabs .on') && document.querySelector('.real-tabs .on').textContent === '내 활동'); })());
    // 내 활동: 진행 중(수락한 것만) + 추천 1~2개
    await open('missions');
    const a0 = await ev(() => ({ going: document.querySelectorAll('[data-mine="going"] .mission[data-mid]').length, reco: document.querySelectorAll('[data-reco="list"] .mission[data-mid]').length }));
    ck('T3 처음엔 진행 중 0개, 추천 1~2개', a0.going === 0 && a0.reco >= 1 && a0.reco <= 2, JSON.stringify(a0));
    const id = await ev(() => { const G = AU.G, r = G.recommend(2, 0)[0].m.id; G.setMissionState(r, 'accept'); return r; }); await ev(() => AU.UI.renderWin()); await sleep(200);
    const a1 = await ev((i) => ({ going: [...document.querySelectorAll('[data-mine="going"] .mission[data-mid]')].map((c) => c.dataset.mid), reco: [...document.querySelectorAll('[data-reco="list"] .mission[data-mid]')].map((c) => c.dataset.mid), i }), id);
    ck('T4 수락한 활동은 진행 중에 나타나고 추천에서는 빠짐', a1.going.includes(id) && !a1.reco.includes(id) && a1.reco.length <= 2, JSON.stringify(a1));
    // 마음 기록: 완료한 것만
    await open('record'); const r0 = await ev(() => document.querySelectorAll('[data-record="done"] .mission[data-mid]').length);
    ck('T5 완료한 활동이 없으면 마음 기록은 비어 있음', r0 === 0);
    await ev((i) => { AU.G.setMissionState(i, 'done', { challenge: 3, meaning: 4, satisfaction: 5 }); AU.UI.renderWin(); }, id); await sleep(250);
    const r1 = await ev(() => [...document.querySelectorAll('[data-record="done"] .mission[data-mid]')].map((c) => c.dataset.mid));
    ck('T6 완료하면 마음 기록에 나타남', r1.includes(id), r1.join(','));
    // 쉼: 하루 5개, 날마다 다름
    const rest = await ev(() => { AU.G.S.skills.unlocked = ['strike']; const day = (n) => { const o = AU.dateStr; AU.dateStr = () => n; const ids = AU.G.restDaily().map((m) => m.id); AU.dateStr = o; return ids; }; const a = day('2026-11-24'), b = day('2026-11-24'), c = day('2026-11-25'), d = day('2026-11-26'); return { a, same: JSON.stringify(a) === JSON.stringify(b), c, nextDiff: a.every((x) => !c.includes(x)), n: a.length, d, dDiff: c.every((x) => !d.includes(x)) }; });
    ck('T7 쉼은 하루 5개, 같은 날은 같은 구성', rest.n === 5 && rest.same, JSON.stringify(rest.a));
    ck('T8 다음 날에는 다른 5개(겹치지 않음)', rest.nextDiff && rest.dDiff, JSON.stringify({ a: rest.a, c: rest.c }));
    await open('rest'); const cards = await ev(() => document.querySelectorAll('.mission').length);
    ck('T9 쉼 화면에 활동 카드 5개', cards === 5, 'cards=' + cards);
    const rc = await ev(() => { const G = AU.G, S = G.S; S.flags.guideMet = true; G.setFatigue(80); const ids = G.restDaily().map((m) => m.id), n = { feeling: 'calm', note: '' }; const a = G.doRestMission(ids[0], n), f1 = S.fatigue, b = G.doRestMission(ids[0], n), f2 = S.fatigue, c = G.doRestMission(ids[1], n), f3 = S.fatigue; return { a, b, c, drop1: 80 - f1, same: f1 === f2 && f2 === f3, cnt: G.restDoneToday(ids[0]) }; });
    ck('T10 쉼 활동은 하루에 여러 번 가능, 5번까지 현재 피로도의 절반씩 회복', rc.a && rc.b && rc.c && rc.drop1 === 40 && !rc.same && rc.cnt === 2, JSON.stringify(rc));
    ck('T99 페이지 오류 없음', errs.length === 0, errs.join(' | '));
  } catch (e) { console.log('FAIL EXC ' + e.message); fails++; } finally { await b.close(); }
  process.exit(fails ? 1 : 0);
})();
