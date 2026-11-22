/* 메인(금색 ★) / 서브(파란 !) 퀘스트 구분 시험: 종류 표, NPC 표시, 퀘스트 창 목록, 목표창, 월드맵, 알림, q_a1_parcel 방향 안내 */
const { chromium } = require('playwright');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); let fails = 0; const errs = [];
  const check = (n, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + ' ' + JSON.stringify(d)); if (!ok) fails++; };
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    const URL = (process.env.GAME_URL || 'http://localhost:8863') + '/index.html?dev=1&intro=cards';
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto(URL); await p.click('#btn-start');
    for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); }
    if (await p.$('#charsetup')) { await p.fill('#sname', '구분시험'); await p.click('#setup-ok'); }
    await p.evaluate(() => AU.Prologue.debugComplete('arche')); await sleep(300);
    const ev = (fn, a) => p.evaluate(fn, a);
    const done = (ids) => ev((ids) => { for (const id of ids) AU.G.S.quests[id] = { state: 'done', prog: [], spots: {} }; }, ids);

    // Q1 종류 표(상수 한 곳): 입단 시험 계열은 메인, 길드 의뢰와 짐 전하기는 서브
    const kinds = await ev(() => Object.fromEntries(['q_s1_silver', 'q_s1_test', 'q_first', 'q_forest', 'q_guild_talk', 'q_guild_rats', 'q_guild_crabs', 'q_a1_parcel', 'q_a1_variant', 'q_a1_traces', 'q_a2_secret', 'q_a3_scout', 'q_a3_jepeto', 'q_h1'].map((id) => [id, AU.questKind(id)])));
    check('Q1 종류 표', kinds.q_forest === 'main' && kinds.q_guild_rats === 'sub' && kinds.q_a1_parcel === 'sub' && kinds.q_a1_variant === 'main' && kinds.q_h1 === 'main', kinds);
    check('Q1b 표시 정의', await ev(() => AU.QKIND.main.icon === '★' && AU.QKIND.sub.icon === '!' && AU.QKIND.main.label === '메인' && AU.QKIND.sub.label === '서브'), {});

    // Q2 NPC 표시: 새 메인 → ★, 새 서브만 → !, 메인+서브 → ★(메인 우선), 완료 가능 → ?(같은 종류)
    const m1 = await ev(() => AU.npcQuestMark('porto_dock'));
    check('Q2a 새 메인 의뢰 NPC는 ★/main', m1 && m1.mark === '★' && m1.kind === 'main', m1);
    await done(['q_s1_silver', 'q_s1_test', 'q_first', 'q_forest', 'q_guild_talk']); await ev(() => { AU.G.S.level = 5; });
    const m2 = await ev(() => ({ guild: AU.npcQuestMark('porto_guild'), foreman: AU.npcQuestMark('porto_foreman') }));
    check('Q2b 길드 접수원(서브만)은 !/sub, 십장(변형의 흔적 메인 가능)은 ★', m2.guild && m2.guild.mark === '!' && m2.guild.kind === 'sub' && m2.foreman && m2.foreman.mark === '★' && m2.foreman.kind === 'main', m2);
    await done(['q_guild_rats']);
    const m3 = await ev(() => AU.npcQuestMark('porto_foreman'));
    check('Q2c 메인+서브가 함께 있으면 메인 ★ 우선', m3 && m3.mark === '★' && m3.kind === 'main', m3);
    await ev(() => { AU.G.S.quests.q_guild_crabs = { state: 'ready', prog: [5], spots: {} }; });
    const m4 = await ev(() => AU.npcQuestMark('porto_guild'));
    check('Q2d 완료 가능은 ? + 같은 종류(sub)', m4 && m4.mark === '?' && m4.kind === 'sub', m4);
    await ev(() => { delete AU.G.S.quests.q_guild_crabs; });

    // Q3 알림 문구: 메인/서브 수락 알림(아이콘+종류)
    await ev(() => AU.G.startQuest('q_a1_variant')); await sleep(150);
    await ev(() => AU.G.startQuest('q_a1_parcel')); await sleep(150);
    const toasts = await ev(() => [...document.querySelectorAll('.toast')].map((t) => ({ t: t.textContent, c: t.className })));
    check('Q3 알림: ★ 메인 퀘스트 수락 / ! 서브 퀘스트 수락', toasts.some((x) => /★ 메인 퀘스트 수락: 변형의 흔적/.test(x.t) && /qk-main/.test(x.c)) && toasts.some((x) => /! 서브 퀘스트 수락: 길드 짐 전하기/.test(x.t) && /qk-sub/.test(x.c)), toasts);

    // Q4 퀘스트 창: 메인/서브 목록 분리, 메인이 먼저
    await ev(() => { AU.UI.closeAll && AU.UI.closeAll(); AU.UI.open('quests'); }); await sleep(250);
    const win = await ev(() => ({ secs: [...document.querySelectorAll('.qlist .qsec')].map((e) => e.textContent), order: [...document.querySelectorAll('.qlist > *')].map((e) => e.classList.contains('qsec') ? 'S' : e.classList.contains('qk-main') ? 'm' : e.classList.contains('qk-sub') ? 's' : '?').join(''), tags: [...document.querySelectorAll('.qlist .qitem .tag')].map((e) => e.textContent) }));
    check('Q4 퀘스트 창: 메인/서브 소제목 + 순서 S m S s', win.secs.length === 2 && /^★\s*메인 퀘스트 \(1\)$/.test(win.secs[0]) && /^!\s*서브 퀘스트 \(1\)$/.test(win.secs[1]) && win.order === 'SmSs' && win.tags[0] === '★ 메인' && win.tags[1] === '! 서브', win);
    await p.screenshot({ path: (process.env.SHOTS || '/tmp') + '/qs_window.png' });

    // Q5 목표창(추적기): 종류별 줄, 메인 먼저
    await ev(() => AU.UI.closeAll && AU.UI.closeAll()); await sleep(500);
    const trk = await ev(() => [...document.querySelectorAll('.tracker .tq')].map((e) => e.className + '|' + (e.querySelector('.qki') || {}).textContent));
    check('Q5 목표창: 메인(★)이 서브(!)보다 먼저', trk.length >= 2 && /qk-main\|★/.test(trk[0]) && /qk-sub\|!/.test(trk[1]), trk);

    // Q6 q_a1_parcel: area + 방향 안내(포르투에서)
    check('Q6a q_a1_parcel area 필드', await ev(() => AU.QUESTS.q_a1_parcel.area === 'general_store' && !!AU.MAPS[AU.QUESTS.q_a1_parcel.area]), await ev(() => AU.QUESTS.q_a1_parcel.area));
    await ev(() => { AU.World.enterMap('porto', 400, true); }); await sleep(500);
    const g = await ev(() => AU.UI.questGuide('q_a1_parcel'));
    check('Q6b 포르투에서 잡화점 방향 안내가 나옴', typeof g === 'string' && g.length > 3, g);

    check('Q6c 전달 목표 조사(을/를)', await ev(() => { const q = AU.QUESTS.q_a1_parcel; return /꾸러미를 페넬로페에게 전하기/.test(AU.UI.objText(q.objectives[0], AU.G.S.quests.q_a1_parcel, 0)); }), await ev(() => AU.UI.objText(AU.QUESTS.q_a1_parcel.objectives[0], AU.G.S.quests.q_a1_parcel, 0)));

    // Q7 월드맵: 메인 목적지 ★(금색), 서브 목적지 !(파란색)
    await ev(() => { AU.G.S.quests.q_forest = { state: 'active', prog: [0], spots: {} }; delete AU.G.S.quests.q_a1_variant; AU.G.S.visited.forest = 1; AU.G.S.visited.porto = 1; });
    await ev(() => AU.UI.open('worldmap')); await sleep(300);
    const wm = await ev(() => ({ main: [...document.querySelectorAll('.node u.dk-main')].map((e) => e.textContent), sub: [...document.querySelectorAll('.node u.dk-sub')].map((e) => e.textContent), note: document.querySelector('.wbody .note') && document.querySelector('.wbody .note').textContent }));
    check('Q7 월드맵 ★ 메인 / ! 서브 목적지', wm.main.length >= 1 && wm.main.every((t) => t === '★') && wm.sub.length >= 1 && wm.sub.every((t) => t === '!') && /★ 메인 퀘스트 목적지/.test(wm.note || '') && /! 서브 퀘스트 목적지/.test(wm.note || ''), wm);
    await p.screenshot({ path: (process.env.SHOTS || '/tmp') + '/qs_worldmap.png' });
    await ev(() => AU.UI.closeAll && AU.UI.closeAll());

    // Q8 NPC 머리 위 표시·미니맵이 그려지는 동안 오류 없음(길드 홀: 메인 ★ 또는 서브 ! 표시 NPC)
    await ev(() => { AU.World.enterMap('guild_hall', 300, true); }); await sleep(900);
    await p.screenshot({ path: (process.env.SHOTS || '/tmp') + '/qs_guild.png' });
    check('Q8 길드 홀 렌더(NPC 표시·미니맵) 오류 없음', errs.length === 0, errs);

    // Q10 메인 체인은 서브를 거치지 않음: 선행 퀘스트에 서브가 없고, 서브를 건너뛰고 Lv9로 올려도 변형→창고→전언→정찰→제페토가 차례로 열림
    const chain = await ev(() => { const bad = []; for (const [id, q] of Object.entries(AU.QUESTS)) if (q.type === 'main') for (const x of q.pre) if (AU.QUESTS[x].type !== 'main') bad.push(id + '<-' + x); return bad; });
    check('Q10a 메인 퀘스트의 선행은 모두 메인', chain.length === 0, chain);
    await ev(() => { AU.G.S.quests = {}; for (const id of ['q_s1_silver', 'q_s1_test', 'q_first', 'q_forest', 'q_guild_talk']) AU.G.S.quests[id] = { state: 'done', prog: [], spots: {} }; AU.G.S.level = 9; });
    const seq = [];
    for (const id of ['q_a1_variant', 'q_a1_traces', 'q_a2_secret', 'q_a3_recon', 'q_a3_scout', 'q_a3_jepeto']) { if (id === 'q_a3_jepeto') await ev(() => { AU.G.S.level = 10; }); const st0 = await ev((id) => AU.G.questStatus(id), id); seq.push(id + ':' + st0); await ev((id) => { AU.G.S.quests[id] = { state: 'done', prog: [], spots: {} }; }, id); }
    check('Q10b 서브(쥐 소탕) 없이 Lv9(제페토 의뢰는 Lv10 조건)에서 메인 체인이 차례로 열림', seq.every((x) => x.endsWith(':available')), seq);

    // Q11 선택된 서브 항목의 왼쪽 띠가 종류 색을 유지, 색 변수가 AU.QKIND에서 주입됨
    await ev(() => { AU.G.S.quests = { q_a1_parcel: { state: 'active', prog: [0], spots: {} } }; AU.UI.open('quests'); }); await sleep(250);
    const bc = await ev(() => { const e = document.querySelector('.window .qitem.sel.qk-sub'); return e ? [getComputedStyle(e).borderLeftColor, getComputedStyle(document.documentElement).getPropertyValue('--qk-sub').trim(), AU.QKIND.sub.color] : null; });
    check('Q11 선택된 서브 항목 왼쪽 띠 = 파란색, CSS 변수 = QKIND', !!bc && bc[0] === 'rgb(76, 141, 198)' && bc[1].toLowerCase() === bc[2].toLowerCase(), bc);
    await ev(() => AU.UI.closeAll && AU.UI.closeAll());

    // Q9 해금 문구 보정
    check('Q9 Lv4 해금 문구가 길드 접수대 안내', await ev(() => { const u = AU.UNLOCKS.find((x) => x.level === 4); return !!u && /접수대/.test(u.text) && !/찾아보세요/.test(u.text); }), await ev(() => (AU.UNLOCKS.find((x) => x.level === 4) || {}).text));
  } catch (e) { console.log('FAIL EXC ' + e.message); fails++; }
  await b.close(); console.log(fails ? 'FAILS=' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
