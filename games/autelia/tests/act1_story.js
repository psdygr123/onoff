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
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
  await ev(() => { AU.World._origSpawn = AU.World.spawn; });
  const key = async (k, ms = 60) => { await p.keyboard.down(k); await sleep(ms); await p.keyboard.up(k); };
  const st = (id) => ev((id) => AU.G.questStatus(id), id);
  const talk = async (npc) => { await ev((n) => AU.UI.talkNpc(n), npc); await sleep(200); for (let i = 0; i < 14 && (await ev(() => !!AU.UI.dialog)); i++) { await key((await ev(() => !!(AU.UI.dialog && AU.UI.dialog.opt.accept && AU.UI.dialog.i >= AU.UI.dialog.lines.length - 1))) ? 'Enter' : 'Space'); await sleep(120); } };
  const accept = async (npc) => { await ev((n) => AU.UI.talkNpc(n), npc); await sleep(200); for (let i = 0; i < 14 && (await ev(() => !!AU.UI.dialog)); i++) { const has = await ev(() => !!(AU.UI.dialog && AU.UI.dialog.opt.choices) && AU.UI.dialog.i >= AU.UI.dialog.lines.length - 1); await key((await ev(() => !!(AU.UI.dialog && AU.UI.dialog.opt.accept && AU.UI.dialog.i >= AU.UI.dialog.lines.length - 1))) ? 'Enter' : 'Space'); await sleep(120); if (has) break; } await sleep(150); };

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
      const n = AU.NPCS[q.turnIn || q.giver]; if (n && !q.autoDone && !(n.quests || []).includes(id)) out.push(id + ': 보고 NPC의 quests에 없음');
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
  await ev(() => { const G = AU.G; G.S.level = 10; G.S.silver = 0; for (const id of ['q_s1_silver', 'q_s1_test', 'q_first', 'q_forest', 'q_guild_talk', 'q_a1_fence', 'q_a1_parcel', 'q_a1_traces', 'q_a1_boars']) G.S.quests[id] = { state: 'done', prog: [], spots: {} }; G.save('t'); });
  note('B0', '1장을 마치면 금속의 비밀 퀘스트가 열림', (await st('q_a2_secret')) === 'available', await st('q_a2_secret'));
  const tr = await ev(() => !AU.QUESTS.q_a1_traces.done.some((l) => /쇳조각/.test(l)));
  note('B1', '십장 완료 대사에 쇳조각·정보상 구매 안내가 없음(개편)', tr, String(tr));
  // 포르투 노바 → 잔다리 골목 포털
  await ev(() => AU.World.enterMap('porto', AU.PORTO_OFF + 215, true)); await sleep(300);
  const pp = await ev(() => { AU.World.scan(); return AU.World.nearPortal && AU.World.nearPortal.to; });
  note('B2', '포르투 노바에 잔다리 골목 출입구', pp === 'jandari', String(pp));
  await key('ArrowUp'); await sleep(1500);
  note('B3', '위 키로 잔다리 골목에 도착', (await ev(() => AU.World.mapId)) === 'jandari', await ev(() => AU.World.mapId));
  // 잔다리 골목 → 공방 문 → 공방 안
  await ev(() => { AU.World.player.x = 960; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  const door = await ev(() => AU.World.nearPortal && AU.World.nearPortal.to);
  note('B3b', '골목에 정보상 공방 문(포털)이 있음', door === 'jandari_shop', String(door));
  await key('ArrowUp'); await sleep(1500);
  note('B3c', '문으로 들어가면 정보상의 공방 안에 도착', (await ev(() => AU.World.mapId)) === 'jandari_shop', await ev(() => AU.World.mapId));
  // 바르샤: 정보 구매 없음, 바로 수락
  await ev(() => { AU.G.S.silver = 0; });
  await ev(() => { AU.World.player.x = 940; AU.World.player.vx = 0; AU.World.scan(); });
  await accept('barsha');
  const sv = await ev(() => AU.G.S.silver);
  note('B4', '은화 없이도 바르샤의 전언을 수락(정보 구매 폐지)', (await st('q_a2_secret')) === 'active' && sv === 0, (await st('q_a2_secret')) + ' silver=' + sv);
  // 지점 조사
  await ev(() => { AU.World.player.x = 730; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  const ns = await ev(() => { AU.World.scan(); return AU.World.nearSpot && AU.World.nearSpot.id; });
  note('B6', '작업대 앞에서 결정 조각 조사 안내', ns === 'barsha_lens', String(ns));
  await key('Space'); await sleep(200); for (let i = 0; i < 8 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); }
  await ev(() => { AU.World.player.x = 1150; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await key('Space'); await sleep(200); for (let i = 0; i < 8 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); }
  note('B7', '두 곳 조사 → 보고 가능', (await st('q_a2_secret')) === 'ready', await st('q_a2_secret'));
  // 보고 전에는 골목 북쪽 포털이 닫혀 있음(문으로 나가서 확인)
  await ev(() => { AU.World.player.x = 70; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await key('ArrowUp'); await sleep(1500);
  note('B7b', '나가기(문)로 골목에 돌아와 문 앞에 섬', (await ev(() => AU.World.mapId + ':' + Math.round(AU.World.player.x))) === 'jandari:960', await ev(() => AU.World.mapId + ':' + Math.round(AU.World.player.x)));
  await ev(() => { AU.World.player.x = 1460; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  const po = await ev(() => AU.World.portalOpen(AU.World.nearPortal));
  note('B8', '정찰 퀘스트를 받기 전에는 북쪽 포털 닫힘', po === false, String(po));
  await ev(() => AU.World.enterMap('jandari_shop', 940, true)); await sleep(200);
  await talk('barsha');
  note('B9', '보고하면 완료 + 양피지 지도', (await st('q_a2_secret')) === 'done' && (await ev(() => AU.G.count('barsha_map'))) === 1, await st('q_a2_secret'));
  await accept('barsha');
  note('B10', '하차장 잠입 퀘스트 수락(레벨 8 이상)', (await st('q_a3_recon')) === 'active' && (await st('q_a3_crystal')) !== 'active', await st('q_a3_recon'));
  // 수락 후 골목 북쪽 포털 확인(공방에서 나와 이동)
  await ev(() => AU.World.enterMap('jandari', 1460, true)); await sleep(200); await ev(() => AU.World.scan());
  const po3 = await ev(() => AU.World.portalOpen(AU.World.nearPortal));
  note('B11', '수락 후 북쪽 포털 열림', po3 === true, String(po3));
  // 검은 골짜기: 하차장 포털
  await ev(() => { AU.World.enterMap('valley', 560, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(300);
  const yp = await ev(() => { AU.World.scan(); const p = AU.World.nearPortal; return p && p.to === 'yard' && AU.World.portalOpen(p); });
  note('B12', '골짜기: 하차장 포털이 열림', yp === true, String(yp));
  // 하차장 잠입
  await ev(() => { AU.World.spawn = AU.World._origSpawn; AU.World.enterMap('yard', 120, true); }); await sleep(500);
  const ys = await ev(() => ({ on: AU.World.stealthOn(), n: AU.World.monsters.filter((m) => m.type === 'merc_sentry' && m.d.sight).length }));
  note('B12b', '하차장은 잠입 중(시야 있는 경계 용병 8명)', ys.on === true && ys.n === 8, JSON.stringify(ys));
  await ev(() => { AU.World.player.x = 700; AU.World.caught(AU.World.monsters[0]); }); await sleep(2200);
  const cg = await ev(() => ({ tries: AU.G.S.flags.stealth_tries_yard, map: AU.World.mapId, x: Math.round(AU.World.player.x), st: AU.G.questStatus('q_a3_recon') }));
  note('B12c', '들키면 입구에서 다시 시작(횟수 기록·퀘스트 유지)', cg.tries === 1 && cg.map === 'yard' && cg.x < 300 && cg.st === 'active', JSON.stringify(cg));
  for (const x of [1860, 3600]) { await ev((x) => { AU.World.monsters = []; AU.World.player.x = x; AU.World.player.vx = 0; AU.World.player.hidden = false; AU.World.scan(); }, x); await sleep(100); await key('Space'); await sleep(200); for (let i = 0; i < 6 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); } }
  note('B12d', '하차장 두 곳 조사 → 보고 대기', (await st('q_a3_recon')) === 'ready', await st('q_a3_recon'));
  const sb = await ev(() => AU.G.S.silver); await ev(() => { AU.Hideout.onTravel(AU.World, 'valley'); AU.World.enterMap('valley', 620, true); });
  const clr = await ev(() => ({ f: !!AU.G.S.flags.yard_clear, d: AU.G.S.silver }));
  note('B12e', '입구로 나가면 잠입 성공(깃발 기록·두 번째 이후라 보너스 없음)', clr.f === true && clr.d === sb, JSON.stringify(clr));
  // 정보상에게 보고 → 변형의 증거 수락
  await ev(() => { AU.World.enterMap('jandari_shop', 940, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(300);
  await ev(() => { AU.World.player.x = 940; AU.World.player.vx = 0; AU.World.scan(); });
  await talk('barsha');
  note('B13d', '정보상에게 보고하면 잠입 완료', (await st('q_a3_recon')) === 'done', await st('q_a3_recon'));
  await accept('barsha');
  note('B13e', '정보상에게서 변형의 증거 퀘스트를 받음', (await st('q_a3_crystal')) === 'active' && (await st('q_a3_scout')) !== 'active', await st('q_a3_crystal'));
  await ev(() => { AU.World.enterMap('valley', 1400, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(300);
  const hero = await ev(() => { const all = [].concat(AU.QUESTS.q_a3_scout.done, AU.QUESTS.q_a2_secret.done, AU.QUESTS.q_a3_jepeto.done).filter((x) => typeof x === 'object'); const l = all.find((x) => /{이름/.test(x.t)); return l ? AU.Profile.fmt(l.t) : ''; });
  note('B14', '주인공 대사에 닉네임이 들어감', /시험용/.test(hero), hero.slice(0, 30));
  for (let i = 0; i < 5; i++) await ev(() => AU.G.onKill('mutfox'));
  note('B15', '변형 여우 5마리 처치 반영', await ev(() => AU.G.S.quests.q_a3_crystal.prog[0] === 5), await ev(() => JSON.stringify(AU.G.S.quests.q_a3_crystal.prog)));
  note('B15b', '여우는 검은 결정을 떨굼(변형의 증거 진행 중에만)', await ev(() => AU.MONSTERS.mutfox.drops.some((d) => d[0] === 'black_crystal' && d[4] === 'q_a3_crystal')), '');
  await ev(() => AU.G.giveItem('black_crystal', 3, true));
  note('B16', '결정 3개를 모으면 보고 가능', (await st('q_a3_crystal')) === 'ready', await st('q_a3_crystal'));
  await ev(() => { AU.World.enterMap('jandari_shop', 940, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(300);
  await ev(() => { AU.World.player.x = 940; AU.World.player.vx = 0; AU.World.scan(); });
  await talk('barsha');
  note('B17', '정보상에게 보고하면 변형의 증거 완료', (await st('q_a3_crystal')) === 'done', await st('q_a3_crystal'));
  await accept('barsha');
  note('B17b', '정보상에게서 중심 천막 퀘스트를 받음', (await st('q_a3_scout')) === 'active', await st('q_a3_scout'));
  // 천막 엿보기 → 컷신 → 협곡
  await ev(() => { AU.World.enterMap('valley', 1700, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(300);
  const g0 = await ev(() => { AU.World.player.x = 3150; AU.World.player.vx = 0; AU.World.scan(); return AU.World.portalOpen(AU.World.nearPortal); });
  note('B18', '천막을 보기 전에는 협곡 포털 닫힘', g0 === false, String(g0));
  const rp = await ev(() => { AU.World.player.x = 1700; AU.World.player.vx = 0; AU.World.scan(); const pt = AU.World.nearPortal; return pt && pt.to + ':' + AU.World.portalOpen(pt); });
  note('B18b', '골짜기 중심 천막이 천막 위 바위틈 포털로 열림', rp === 'ridge:true', String(rp));
  await ev(() => { AU.World.enterMap('ridge', 90, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(300);
  const rbg = await ev(() => ({ w: AU.MAPS.ridge.width, bgm: AU.BGM && AU.BGM.groupOf ? AU.BGM.groupOf('ridge') : null }));
  await ev(() => { AU.World.player.x = 1300; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await key('Space'); await sleep(150);
  const lis = await ev(() => !!AU.World.listen);
  await p.keyboard.down('Space'); await sleep(9500); await p.keyboard.up('Space'); await sleep(300);
  const nb = await ev(() => (AU.World.listenBubbles || []).length);
  note('B12c', '엿듣기: Space 길게 눌러 게이지가 차고 대화 조각이 5개 떠오른 뒤 컷신', lis === true && nb >= 1, lis + ' ' + nb);
  const dl = await ev(() => AU.UI.dialog && AU.UI.dialog.lines.length);
  const speakers = await ev(() => AU.UI.dialog.lines.filter((l) => typeof l === 'object').map((l) => l.npc.name));
  const cutN = await ev(() => AU.UI.dialog.opt.cuts.length);
  for (let i = 0; i < 24 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); }
  note('B13', '발각 컷신에 흰 로브 남자·제페토·주인공 화자가 나오고 컷 6장 연결', /흰 로브/.test(speakers.join()) && /제페토/.test(speakers.join()) && dl >= 14 && cutN === 6, dl + ' ' + cutN + ' ' + speakers.join('|'));
  const tl = await ev(() => AU.MAPS.ridge.spots.find((x) => x.id === 'relay_tent').lines.map((l) => (typeof l === 'string' ? l : l.t)));
  note('B13b', '들킨 장면: 외침이 "거기 누구냐!"로 짧고 사슬 문구 없음', tl.includes('거기 누구냐!') && /도망가자/.test(tl[3]) && !tl.some((t) => /사슬|쥐새끼/.test(t)), tl.slice(2, 4).join(' | '));
  await sleep(1800);
  const gm = await ev(() => ({ map: AU.World.mapId, st: AU.G.questStatus('q_a3_scout') }));
  note('B13c', '컷신이 끝나면 협곡 바위틈으로 이동하고 보고 가능 상태', gm.map === 'gorge' && gm.st === 'ready', JSON.stringify(gm));
  // 협곡: 제페토에게 보고
  await ev(() => { AU.World.enterMap('gorge', 740, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(300);
  const before = await ev(() => AU.G.S.silver);
  await talk('jepeto');
  note('B19', '제페토에게 보고하면 정찰 완료·은화 +120', (await st('q_a3_scout')) === 'done' && (await ev(() => AU.G.S.silver)) - before === 120, (await st('q_a3_scout')) + ' ' + ((await ev(() => AU.G.S.silver)) - before));
  note('B19b', '제페토 보고로 Lv10 달성·힘의 각성(스킬 열림, 전직 아님)', (await ev(() => AU.G.S.level)) === 10 && (await ev(() => AU.G.awakened() && !AU.G.S.jobChanged && AU.G.S.skills.unlocked.length > 0)), String(await ev(() => AU.G.S.level)));
  note('B20', '제페토의 부탁 퀘스트가 열림', (await st('q_a3_jepeto')) === 'available', await st('q_a3_jepeto'));
  await accept('jepeto');
  await ev(() => { for (let i = 0; i < 4; i++) AU.G.onKill('wolf'); });
  note('B21', '변형 늑대 4마리 → 보고 가능', (await st('q_a3_jepeto')) === 'ready', await st('q_a3_jepeto'));
  await talk('jepeto');
  const fin = await ev(() => ({ s: AU.G.questStatus('q_a3_jepeto'), flag: AU.G.S.flags.a1_jepeto_done }));
  note('B22', '완료 → 제페토 부탁 완료 표시', fin.s === 'done' && fin.flag === true, JSON.stringify(fin));
  // 막다른 포털 안내
  await ev(() => { AU.World.player.x = 2800; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await key('ArrowUp'); await sleep(300);
  const still = await ev(() => AU.World.mapId);
  note('B23', '협곡 안쪽 길은 안내만 나오고 이동하지 않음', still === 'gorge', still);
  // 저장·복원
  await ev(() => AU.G.save('t')); await p.reload(); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(500);
  const rs = await ev(() => ({ q: AU.G.questStatus('q_a3_jepeto'), f: AU.G.S.flags.a1_jepeto_done }));
  note('B24', '새로고침 후에도 1막 완료 상태 유지', rs.q === 'done' && rs.f === true, JSON.stringify(rs));
  note('Z', '페이지 오류 없음', errs.length === 0, errs.slice(0, 3).join(' || ') || '0건');
  await b.close();
  const f = R.filter((x) => !x.ok); console.log('\n' + (R.length - f.length) + '/' + R.length + ' PASS'); process.exit(f.length ? 1 : 0);
})();
