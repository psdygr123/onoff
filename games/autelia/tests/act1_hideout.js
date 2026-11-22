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
  const key = async (k, ms = 60) => { await p.keyboard.down(k); await sleep(ms); await p.keyboard.up(k); };
  const st = (id) => ev((id) => AU.G.questStatus(id), id);
  const talk = async (npc) => { await ev((n) => AU.UI.talkNpc(n), npc); await sleep(200); for (let i = 0; i < 14 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(120); } };
  const accept = async (npc) => { await ev((n) => AU.UI.talkNpc(n), npc); await sleep(200); for (let i = 0; i < 14 && (await ev(() => !!AU.UI.dialog)); i++) { const has = await ev(() => !!(AU.UI.dialog && AU.UI.dialog.opt.choices) && AU.UI.dialog.i >= AU.UI.dialog.lines.length - 1); await key('Space'); await sleep(120); if (has) break; } await sleep(150); };

  // A. 데이터
  const bad = await ev(() => { const out = []; const need = ['hide_outer','hide_tunnel','hide_lab','hide_boss'];
    for (const id of need) { const m = AU.MAPS[id]; if (!m) { out.push('맵 없음 ' + id); continue; } for (const pt of m.portals) if (!AU.MAPS[pt.to]) out.push(id + ' 포털 ' + pt.to); for (const s of m.spawns) if (!AU.MONSTERS[s.type]) out.push('몬스터 ' + s.type); for (const k of (m.bgs || [m.bg])) if (!AU.ASSETS[k]) out.push('배경 미등록 ' + k); }
    const q = AU.QUESTS.q_h1; for (const o of q.objectives) { if (o.kind === 'kill' && !AU.MONSTERS[o.target]) out.push('kill ' + o.target); for (const t of o.targets || []) if (!Object.values(AU.MAPS).some((m) => (m.spots || []).some((s) => s.id === t))) out.push('지점 ' + t); }
    if (!AU.NPCS.jepeto.quests.includes('q_h1')) out.push('제페토 quests'); if (AU.MONSTERS.umbra_boss.lv !== 15) out.push('움브라 레벨');
    for (const [id, m] of Object.entries(AU.MAPS)) for (const pt of m.portals || []) if (!pt.lock && !AU.MAPS[pt.to]) out.push(id + ' 포털대상 ' + pt.to);
    return out; });
  note('A1', '아지트 데이터 연결', bad.length === 0, bad.join(' / ') || '0건');
  // B. 흐름
  await ev(() => { const G = AU.G; G.S.level = 10; for (const id of ['q_s1_silver','q_s1_test','q_first','q_forest','q_guild_talk','q_a1_fence','q_a1_parcel','q_a1_traces','q_a2_secret','q_a3_scout','q_a3_jepeto']) G.S.quests[id] = { state: 'done', prog: [], spots: {} }; G.save('t'); });
  note('B0', '제페토 부탁 후 아지트 퀘스트 열림', (await st('q_h1')) === 'available', await st('q_h1'));
  await ev(() => AU.World.enterMap('gorge', 420, true)); await sleep(200);
  await accept('jepeto'); note('B1', '아지트 퀘스트 수락', (await st('q_h1')) === 'active', await st('q_h1'));
  await ev(() => AU.World.enterMap('gorge', 1460, true)); await sleep(150);
  await ev(() => { AU.World.scan(); }); const gp = await ev(() => AU.World.nearPortal && AU.World.nearPortal.to);
  note('B2', '협곡 안쪽 포털이 외곽으로 연결', gp === 'hide_outer', String(gp));
  await ev(() => AU.World.enterMap('hide_outer', 90, true)); await sleep(200);
  const wd = await ev(() => ({ w: AU.World.map.width, st: AU.World.map.stealth, n: AU.World.monsters.length }));
  note('B3', '외곽: 2558 폭·잠입맵·경비 4', wd.w === 2558 && wd.st && wd.n === 4, JSON.stringify(wd));
  // 시야 시험: 경비 앞(바라보는 쪽) vs 등 뒤
  const sight = await ev(() => { const W = AU.World, m = W.monsters[0]; W.monsters.slice(1).forEach((x) => { x.alive = false; x.respawnT = -1; });
    m.state = 'patrol'; m.dir = 1; m.x = 700; m.min = 700; m.max = 700; m.pause = 99; W.spotted = false; const p = W.player; p.x = 560; p.vx = 0; W.updateMonsters(0.05); const behind = W.spotted || m.state === 'chase';
    m.state = 'patrol'; m.dir = -1; p.x = 560; W.spotted = false; W.updateMonsters(0.05); const front = W.spotted && !!(W.trans && W.trans.caught); W.trans = null; AU.G.S.flags.stealth_tries_hide_outer = 0; return { behind, front }; });
  note('B4', '경비는 등 뒤에서는 못 보고, 바라보는 쪽에서 들키면 실패(입구 복귀 연출)', sight.behind === false && sight.front === true, JSON.stringify(sight));
  // 보너스: 안 들키고 이동
  await ev(() => { AU.World.enterMap('hide_outer', 2480, true); AU.World.spotted = false; AU.World.monsters.forEach((x) => { x.alive = false; x.respawnT = -1; }); AU.World.scan(); }); await sleep(100);
  const b0 = await ev(() => AU.G.S.silver); await ev(() => { AU.World.travel('hide_tunnel', 90); }); await sleep(1200);
  const b1 = await ev(() => AU.G.S.silver); note('B5', '안 들키고 통과 시 보너스 은화 +100(1회)', b1 - b0 >= 100 && (await ev(() => AU.World.mapId)) === 'hide_tunnel', (b1 - b0) + ' ' + await ev(() => AU.World.mapId));
  // 조사 지점·처치 목표
  const spot = async (id, mapId) => { const sx = await ev(([id, mapId]) => { if (AU.World.mapId !== mapId) AU.World.enterMap(mapId, 100, true); const s = AU.World.map.spots.find((s) => s.id === id); AU.World.player.x = s.x; AU.World.player.vx = 0; AU.World.scan(); return !!AU.World.nearSpot; }, [id, mapId]); await sleep(80); await key('Space'); await sleep(200); for (let i = 0; i < 10 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(100); } return sx; };
  const ok1 = await spot('hide_gate', 'hide_outer') && await spot('hide_cargo', 'hide_outer') && await spot('tun_cages', 'hide_tunnel') && await spot('tun_notes', 'hide_tunnel');
  note('B6', '외곽·갱도 조사 4곳 완료', ok1 && (await ev(() => AU.G.S.quests.q_h1.prog.slice(0, 2).join())) === '2,2', await ev(() => AU.G.S.quests.q_h1.prog.join()));
  await ev(() => { for (let i = 0; i < 4; i++) AU.G.onKill('hide_beast'); for (let i = 0; i < 2; i++) AU.G.onKill('hide_keeper'); });
  note('B7', '갱도·실험구역 처치 목표 집계', (await ev(() => AU.G.S.quests.q_h1.prog.slice(2, 4).join())) === '4,2', await ev(() => AU.G.S.quests.q_h1.prog.join()));
  // 실험 구역: 기록 + 파우스토스 대화(초상화 3표정)
  const ok2 = await spot('lab_records', 'hide_lab');
  const portrait = await ev(() => { const ks = AU.MAPS.hide_lab.spots.find((s) => s.id === 'lab_faustos').lines.filter((l) => typeof l === 'object' && /faustos/.test(l.npc.portrait)).map((l) => l.npc.portrait); return [...new Set(ks)].sort().join(); });
  const closed = await ev(() => { AU.World.enterMap('hide_lab', 2480, true); AU.World.scan(); const pt = AU.World.nearPortal; return pt && !AU.World.portalOpen(pt); });
  note('B8', '파우스토스 만나기 전에는 보스 포털 잠김, 표정 3종 사용', ok2 && closed && portrait === 'pt_faustos,pt_faustos_mad,pt_faustos_shock', portrait + ' closed=' + closed);
  await spot('lab_faustos', 'hide_lab');
  const open = await ev(() => { AU.World.enterMap('hide_lab', 2480, true); AU.World.scan(); const pt = AU.World.nearPortal; return pt && AU.World.portalOpen(pt); });
  note('B9', '파우스토스 대화 후 보스 포털 열림', !!open, String(open));
  // 보스
  await ev(() => AU.World.enterMap('hide_boss', 90, true)); await sleep(300);
  const bs = await ev(() => { AU.World.syncBoss(); const b = AU.World.monsters.find((m) => m.type === 'umbra_boss'); return b && { lv: b.d.lv, hp: b.hp }; });
  note('B10', '보스 방에 움브라(Lv15) 등장', bs && bs.lv === 15, JSON.stringify(bs));
  const fl0 = await ev(() => { AU.World.scan(); return AU.World.nearSpot && AU.World.nearSpot.id; });
  await ev(() => { const W = AU.World, b = W.monsters.find((m) => m.type === 'umbra_boss'); b.hp = 1; W.hurtMonster(b, 1, 1, 0); }); await sleep(300);
  const after = await ev(() => ({ flag: AU.G.S.flags.boss_umbra_boss, fx: AU.World.fx.some((f) => f.kind === 'runner' && f.img === 'faustos'), respawn: AU.World.monsters.filter((m) => m.type === 'umbra_boss' && m.alive).length }));
  await sleep(1300); const respawn = await ev(() => AU.World.monsters.filter((m) => m.type === 'umbra_boss' && m.alive).length);
  note('B11', '보스 처치: 플래그·서 있는 파우스토스·재등장 없음', after.flag && after.fx && respawn === 0, JSON.stringify(after) + ' respawn=' + respawn);
  // 도주 연출
  const okf = await spot('faustos_flee', 'hide_boss');
  const run = await ev(() => AU.World.fx.some((f) => f.kind === 'runner' && f.img === 'faustos_run'));
  note('B12', '철수 대사 후 파우스토스 달리기 연출', okf && run && fl0 === null, 'near=' + okf + ' run=' + run + ' before=' + fl0);
  note('B13', '모든 목표 완료 → 보고 가능', (await st('q_h1')) === 'ready', await st('q_h1') + ' ' + await ev(() => AU.G.S.quests.q_h1.prog.join()));
  await ev(() => AU.World.enterMap('gorge', 420, true)); await sleep(200);
  await talk('jepeto');
  note('B14', '제페토 보고 → 완료·Lv15·1막 종료 플래그', (await st('q_h1')) === 'done' && (await ev(() => AU.G.S.level)) === 15 && (await ev(() => AU.G.S.flags.a1_hideout_done)), (await st('q_h1')) + ' Lv' + await ev(() => AU.G.S.level));
  const bad2 = errs.filter((e) => !/Failed to load/.test(e)); note('Z', '콘솔 오류 없음', bad2.length === 0, bad2.join(' | ') || '0건');
  await b.close(); const f = R.filter((r) => !r.ok); console.log('\n' + (R.length - f.length) + '/' + R.length + ' 통과'); process.exit(f.length ? 1 : 0);
})();
