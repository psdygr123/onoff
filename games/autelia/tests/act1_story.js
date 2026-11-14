/* 1막 후반(2~3장) 시험: 데이터 연결 정합성 + 잔다리 골목 → 검은 골짜기 → 협곡 흐름 */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  if (await p.$('#job-next')) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
  const key = async (k, ms = 60) => { await p.keyboard.down(k); await sleep(ms); await p.keyboard.up(k); };
  const st = (id) => ev((id) => AU.G.questStatus(id), id);
  const talk = async (npc) => { await ev((n) => AU.UI.talkNpc(n), npc); await sleep(200); for (let i = 0; i < 14 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(120); } };
  const accept = async (npc) => { await ev((n) => AU.UI.talkNpc(n), npc); await sleep(200); for (let i = 0; i < 14 && (await ev(() => !!AU.UI.dialog)); i++) { const has = await ev(() => !!(AU.UI.dialog && AU.UI.dialog.opt.choices) && AU.UI.dialog.i >= AU.UI.dialog.lines.length - 1); await key('Space'); await sleep(120); if (has) break; } await sleep(150); };

  // A. 데이터 정합성
  const bad = await ev(() => {
    const out = [];
    for (const [id, q] of Object.entries(AU.QUESTS)) {
      if (!AU.NPCS[q.giver]) out.push(id + ': 의뢰인 없음 ' + q.giver);
      if (q.turnIn && !AU.NPCS[q.turnIn]) out.push(id + ': 보고 NPC 없음');
      for (const p of q.pre) if (!AU.QUESTS[p]) out.push(id + ': 선행 퀘스트 없음 ' + p);
      for (const [it] of (q.reward.items || [])) if (!AU.ITEMS[it]) out.push(id + ': 보상 아이템 없음 ' + it);
      for (const o of q.objectives) {
        if (o.kind === 'kill' && !AU.MONSTERS[o.target]) out.push(id + ': 몬스터 없음 ' + o.target);
        if (o.kind === 'talk' && !AU.NPCS[o.target]) out.push(id + ': 대화 NPC 없음');
        for (const t of o.targets || []) if (!Object.values(AU.MAPS).some((m) => (m.spots || []).some((s) => s.id === t))) out.push(id + ': 지점 없음 ' + t);
      }
      const n = AU.NPCS[q.turnIn || q.giver]; if (n && !(n.quests || []).includes(id)) out.push(id + ': 보고 NPC의 quests에 없음');
    }
    for (const [id, m] of Object.entries(AU.MAPS)) {
      for (const pt of m.portals || []) { if (!pt.lock && !AU.MAPS[pt.to]) out.push(id + ': 포털 대상 없음 ' + pt.to); if (pt.reqQuest && !AU.QUESTS[pt.reqQuest]) out.push(id + ': 포털 조건 퀘스트 없음'); }
      for (const n of m.npcs || []) if (!AU.NPCS[n.id]) out.push(id + ': NPC 없음 ' + n.id);
      for (const s of m.spawns || []) if (!AU.MONSTERS[s.type]) out.push(id + ': 몬스터 없음 ' + s.type);
      for (const m2 of m.spawns || []) for (const d of AU.MONSTERS[m2.type].drops || []) if (!AU.ITEMS[d[0]]) out.push(id + ': 드롭 아이템 없음 ' + d[0]);
    }
    for (const [a, c] of AU.AREA_LINKS) if (!AU.MAPS[a] || !AU.MAPS[c]) out.push('지역 연결 오류 ' + a + c);
    return out;
  });
  note('A1', '퀘스트·NPC·맵·포털·드롭 데이터 연결 오류 없음', bad.length === 0, bad.join(' / ') || '0건');
  // 대사 줄이 객체일 때 npc 필드와 t 필드 확인
  const lines = await ev(() => { const bad = []; const chk = (where, arr) => (arr || []).forEach((l, i) => { if (typeof l === 'object' && (!l.npc || typeof l.t !== 'string')) bad.push(where + '#' + i); else if (typeof l !== 'string' && typeof l !== 'object') bad.push(where + '#' + i); }); for (const [id, q] of Object.entries(AU.QUESTS)) { chk(id + '.offer', q.offer); chk(id + '.done', q.done); chk(id + '.reminder', q.reminder); } for (const [id, m] of Object.entries(AU.MAPS)) for (const s of m.spots || []) chk(id + '.' + s.id, s.lines); return bad; });
  note('A2', '대사 줄 형식 정상', lines.length === 0, lines.join(',') || '0건');

  // B. 흐름
  await ev(() => { const G = AU.G; G.S.level = 10; G.S.silver = 0; for (const id of ['q_first', 'q_forest', 'q_guild_talk', 'q_a1_fence', 'q_a1_parcel', 'q_a1_traces']) G.S.quests[id] = { state: 'done', prog: [], spots: {} }; G.save('t'); });
  note('B0', '1장을 마치면 금속의 비밀 퀘스트가 열림', (await st('q_a2_secret')) === 'available', await st('q_a2_secret'));
  const tr = await ev(() => AU.QUESTS.q_a1_traces.done.some((l) => /잔다리 골목/.test(l)));
  note('B1', '십장 완료 대사에 잔다리 골목 안내가 이어짐', tr, String(tr));
  // 포르투 노바 → 잔다리 골목 포털
  await ev(() => AU.World.enterMap('porto', 215, true)); await sleep(300);
  const pp = await ev(() => { AU.World.scan(); return AU.World.nearPortal && AU.World.nearPortal.to; });
  note('B2', '포르투 노바에 잔다리 골목 출입구', pp === 'jandari', String(pp));
  await key('ArrowUp'); await sleep(1500);
  note('B3', '위 키로 잔다리 골목에 도착', (await ev(() => AU.World.mapId)) === 'jandari', await ev(() => AU.World.mapId));
  // 은화 부족: 수락 불가
  await ev(() => AU.UI.talkNpc('barsha')); await sleep(200);
  const fl = await ev(() => AU.UI.dialog && AU.UI.dialog.lines.length);
  for (let i = 0; i < 6 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); }
  note('B4', '은화가 모자라면 수락 대신 거절 대사', fl === 3 && (await st('q_a2_secret')) === 'available', 'lines=' + fl);
  // 은화 충분: 수락 시 80 차감
  await ev(() => { AU.G.S.silver = 200; });
  await accept('barsha');
  const sv = await ev(() => AU.G.S.silver);
  note('B5', '수락하면 은화 80이 빠지고 퀘스트 시작', (await st('q_a2_secret')) === 'active' && sv === 120, (await st('q_a2_secret')) + ' silver=' + sv);
  // 지점 조사
  await ev(() => { AU.World.player.x = 640; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  const ns = await ev(() => { AU.World.scan(); return AU.World.nearSpot && AU.World.nearSpot.id; });
  note('B6', '돋보기 앞에서 조사 안내', ns === 'barsha_lens', String(ns));
  await key('Space'); await sleep(200); for (let i = 0; i < 8 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); }
  await ev(() => { AU.World.player.x = 1010; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await key('Space'); await sleep(200); for (let i = 0; i < 8 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); }
  note('B7', '두 곳 조사 → 보고 가능', (await st('q_a2_secret')) === 'ready', await st('q_a2_secret'));
  // 보고 전에는 북쪽 포털이 닫혀 있음
  await ev(() => { AU.World.player.x = 1460; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  const po = await ev(() => AU.World.portalOpen(AU.World.nearPortal));
  note('B8', '정찰 퀘스트를 받기 전에는 북쪽 포털 닫힘', po === false, String(po));
  await talk('barsha');
  note('B9', '보고하면 완료 + 양피지 지도', (await st('q_a2_secret')) === 'done' && (await ev(() => AU.G.count('barsha_map'))) === 1, await st('q_a2_secret'));
  await accept('barsha');
  note('B10', '정찰 퀘스트 수락(레벨 8 이상)', (await st('q_a3_scout')) === 'active', await st('q_a3_scout'));
  const po2 = await ev(() => AU.World.portalOpen(AU.World.nearPortal));
  note('B11', '수락 후 북쪽 포털 열림', po2 === true, String(po2));
  // 검은 골짜기
  await ev(() => { AU.World.enterMap('valley', 500, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(300);
  const sp1 = await ev(() => { AU.World.scan(); return AU.World.nearSpot && AU.World.nearSpot.id; });
  note('B12', '골짜기: 궤짝 조사 안내', sp1 === 'valley_crates', String(sp1));
  await key('Space'); await sleep(200); for (let i = 0; i < 8 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); }
  await ev(() => { AU.World.player.x = 1700; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await key('Space'); await sleep(200);
  const dl = await ev(() => AU.UI.dialog && AU.UI.dialog.lines.length);
  const speakers = await ev(() => AU.UI.dialog.lines.filter((l) => typeof l === 'object').map((l) => l.npc.name));
  for (let i = 0; i < 12 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); }
  note('B13', '천막 대화에 클로드·발테인·주인공 화자가 나옴', /클로드/.test(speakers.join()) && /발테인/.test(speakers.join()) && dl >= 7, dl + ' ' + speakers.join('|'));
  const hero = await ev(() => { const l = AU.QUESTS.q_a3_scout.done.find((x) => typeof x === 'object' && /{이름}/.test(x.t)); return AU.Profile.fmt(l.t); });
  note('B14', '주인공 대사에 닉네임이 들어감', /시험용/.test(hero), hero.slice(0, 30));
  for (let i = 0; i < 5; i++) await ev(() => AU.G.onKill('merc'));
  note('B15', '용병 5명 처치 반영', await ev(() => AU.G.S.quests.q_a3_scout.prog[1] === 5), await ev(() => JSON.stringify(AU.G.S.quests.q_a3_scout.prog)));
  // 협곡 포털은 밧줄을 끊기 전 닫힘
  await ev(() => { AU.World.player.x = 3150; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  const g0 = await ev(() => AU.World.portalOpen(AU.World.nearPortal));
  note('B16', '리프트 밧줄을 끊기 전에는 협곡 포털 닫힘', g0 === false, String(g0));
  await ev(() => { AU.World.player.x = 2500; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await key('Space'); await sleep(2300);
  note('B17', '밧줄 수리 지점 완료 → 보고 가능 상태', (await st('q_a3_scout')) === 'ready', await st('q_a3_scout'));
  await ev(() => { AU.World.player.x = 3150; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  const g1 = await ev(() => AU.World.portalOpen(AU.World.nearPortal));
  note('B18', '밧줄을 끊으면 협곡 포털 열림', g1 === true, String(g1));
  // 협곡: 제페토에게 보고
  await ev(() => { AU.World.enterMap('gorge', 420, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(300);
  const before = await ev(() => AU.G.S.silver);
  await talk('jepeto');
  note('B19', '제페토에게 보고하면 정찰 완료·은화 +120', (await st('q_a3_scout')) === 'done' && (await ev(() => AU.G.S.silver)) - before === 120, (await st('q_a3_scout')) + ' ' + ((await ev(() => AU.G.S.silver)) - before));
  note('B20', '제페토의 결 읽기 퀘스트가 열림', (await st('q_a3_jepeto')) === 'available', await st('q_a3_jepeto'));
  await accept('jepeto');
  await ev(() => { AU.G.completeSpot('grain_a'); AU.G.completeSpot('grain_b'); for (let i = 0; i < 4; i++) AU.G.onKill('wolf'); });
  note('B21', '결 읽기 2곳 + 늑대 4마리 → 보고 가능', (await st('q_a3_jepeto')) === 'ready', await st('q_a3_jepeto'));
  await talk('jepeto');
  const fin = await ev(() => ({ s: AU.G.questStatus('q_a3_jepeto'), flag: AU.G.S.flags.act1_done, bp: AU.G.count('jepeto_blueprint') }));
  note('B22', '완료 → 1막 완료 표시 + 도면 부품 지급', fin.s === 'done' && fin.flag === true && fin.bp === 1, JSON.stringify(fin));
  // 막다른 포털 안내
  await ev(() => { AU.World.player.x = 1460; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await key('ArrowUp'); await sleep(300);
  const still = await ev(() => AU.World.mapId);
  note('B23', '서부 수송로는 안내만 나오고 이동하지 않음', still === 'gorge', still);
  // 저장·복원
  await ev(() => AU.G.save('t')); await p.reload(); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(500);
  const rs = await ev(() => ({ q: AU.G.questStatus('q_a3_jepeto'), f: AU.G.S.flags.act1_done }));
  note('B24', '새로고침 후에도 1막 완료 상태 유지', rs.q === 'done' && rs.f === true, JSON.stringify(rs));
  note('Z', '페이지 오류 없음', errs.length === 0, errs.slice(0, 3).join(' || ') || '0건');
  await b.close();
  const f = R.filter((x) => !x.ok); console.log('\n' + (R.length - f.length) + '/' + R.length + ' PASS'); process.exit(f.length ? 1 : 0);
})();
