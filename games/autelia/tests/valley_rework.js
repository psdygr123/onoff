/* 검은 골짜기 재구성: 발판 도달 가능성·밧줄 오르기·변형 여우·조사 장면·BGM */
const { chromium } = require('playwright'); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const out = []; const note = (n, ok, d) => { out.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(500);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); }
  if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('porto')); await sleep(1200);
  // 1) 정적 검사: 모든 발판은 점프(96px)로 닿는 계단이거나 바로 옆 밧줄로 오를 수 있어야 함
  const r1 = await ev(() => {
    const M = AU.MAPS.valley, J = AU.CONFIG.move.jump ** 2 / (2 * AU.CONFIG.move.gravity) - 12, bad = [];
    const hs = M.platforms.filter((q) => q.thin);
    for (const pl of hs) {
      const below = [590].concat(hs.filter((o) => o !== pl && o.y > pl.y && o.x < pl.x + pl.w - 30 && o.x + o.w > pl.x + 30).map((o) => o.y));   // 아래 받침(겹치는 발판)
      const gap = pl.y - 0; const support = Math.min(...below.map((y) => y - pl.y).filter((d) => d > 0));
      const rope = (M.ropes || []).find((r) => r.x >= pl.x + 8 && r.x <= pl.x + pl.w - 8 && Math.abs(r.top - (pl.y - 15)) < 6 && r.bottom >= 585);
      if (support > J && !rope) bad.push({ x: pl.x, y: pl.y, support });
      if (pl.y > 590 - 40) bad.push({ x: pl.x, low: true });
    }
    return { J: Math.round(J), n: hs.length, ropes: M.ropes.length, bad };
  });
  note('V1 모든 발판이 점프 계단 또는 밧줄로 닿을 수 있음', r1.bad.length === 0, r1);
  // 2) 실제 이동: 밧줄을 타고 올라 발판 위에 서기
  await ev(() => { AU.World.enterMap('valley', 1900, true); AU.World.trans = null; AU.World.monsters.length = 0; AU.G.S.hp = 9999; });
  await sleep(400);
  await p.keyboard.down('ArrowRight'); await sleep(250); await p.keyboard.up('ArrowRight');
  const pos0 = await ev(() => ({ x: Math.round(AU.World.player.x), y: Math.round(AU.World.player.y) }));
  await ev(() => { AU.World.player.x = 2020; AU.World.player.y = 590; AU.World.player.vx = 0; }); await sleep(100);
  await p.keyboard.down('ArrowUp'); let climbed = false, sawRope = false, frames = new Set(), rel = false;
  for (let i = 0; i < 80; i++) { await sleep(60); const s = await ev(() => ({ rope: !!AU.World.player.rope, y: AU.World.player.y, a: Math.floor(AU.World.player.anim * 0.6) % 4 })); if (s.rope) { sawRope = true; frames.add(s.a); } if (sawRope && !s.rope) { climbed = true; await p.keyboard.up('ArrowUp'); break; } }
  await sleep(500); await p.keyboard.up('ArrowRight'); await p.keyboard.up('ArrowUp'); await sleep(900);
  const pos1 = await ev(() => ({ x: Math.round(AU.World.player.x), y: Math.round(AU.World.player.y), g: AU.World.player.onGround }));
  note('V2 밧줄을 타고 올라 잔교 위(y=400)에 선다', sawRope && climbed && pos1.y === 400 && pos1.g, { pos1, frames: [...frames] });
  note('V3 오르는 동작 프레임이 여러 장 쓰임', frames.size >= 3, [...frames]);
  // 3) 계단식 잔교: 땅 → 첫 잔교(y520)로 점프
  await ev(() => { AU.World.enterMap('valley', 900, true); AU.World.trans = null; AU.World.monsters.length = 0; AU.World.player.x = 900; AU.World.player.y = 590; AU.World.player.vx = 0; AU.World.player.onGround = true; }); await sleep(200);
  await p.keyboard.down('Alt'); await sleep(60); await p.keyboard.up('Alt'); await sleep(900);
  const j1 = await ev(() => ({ y: Math.round(AU.World.player.y), g: AU.World.player.onGround }));
  note('V4 땅에서 점프하면 첫 잔교(y=520)에 올라섬', j1.y === 520 && j1.g, j1);
  await ev(() => { AU.World.player.x = 1060; }); await sleep(100);
  await p.keyboard.down('Alt'); await sleep(60); await p.keyboard.up('Alt'); await sleep(900);
  const j2 = await ev(() => ({ y: Math.round(AU.World.player.y), g: AU.World.player.onGround }));
  note('V5 첫 잔교에서 점프하면 둘째 잔교(y=450)에 올라섬', j2.y === 450 && j2.g, j2);
  // 4) 몬스터·퀘스트·그림·BGM
  const r4 = await ev(() => { const M = AU.MAPS.valley; const RM = AU.MAPS.ridge; return { types: [...new Set(M.spawns.map((s) => s.type))], q: AU.QUESTS.q_a3_crystal.objectives.find((o) => o.kind === 'kill').target, art: ['mon_mutfox', 'ob_plank', 'ob_rope', 'pt_scene_tent', 'pc_player_m_climb', 'pc_player_f_climb'].map((k) => AU.Img.has(k)), sp: RM.spots.filter((s) => s.portrait).map((s) => s.portrait), bg: [AU.Bgm.groups.relay, AU.Bgm.groups.alley] }; });
  note('V6 몬스터가 모두 변형 여우이고 퀘스트 목표도 변형 여우', r4.types.join() === 'mutfox' && r4.q === 'mutfox', r4);
  note('V7 그림 6종이 모두 불러와짐', r4.art.every(Boolean), r4.art);
  note('V8 천막 조사 지점에 장면 일러스트 연결', r4.sp.length === 1, r4.sp);
  await ev(() => AU.World.enterMap('valley', 500, true)); await sleep(300);
  const g1 = await ev(() => AU.Bgm.pickGroup()); await ev(() => AU.World.enterMap('jandari', 500, true)); await sleep(300); const g2 = await ev(() => AU.Bgm.pickGroup());
  note('V9 골짜기·잔다리 골목 배경음 배정', g1 === 'valley' && g2 === 'alley', { g1, g2 });
  note('Z 오류 없음', errs.length === 0, errs);
  await b.close(); process.exit(out.every(Boolean) ? 0 : 1);
})();
