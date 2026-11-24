/* 아지트 외곽 잠입 임무: 들키면 입구에서 재시작 · 숨는 상자 · 시야 가림 · 3회 실패 도움 · 첫 시도 보너스 */
const { chromium } = require("playwright");
const URL = "http://localhost:8801/index.html?dev=1&intro=cards", sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(), errs = []; let ok = 0, n = 0;
  p.on("pageerror", (e) => errs.push(e.message));
  const T = (id, name, c, d) => { n++; if (c) ok++; console.log((c ? "PASS " : "FAIL ") + id + " " + name + " :: " + JSON.stringify(d)); };
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector("#btn-start"); await p.click("#btn-start"); await sleep(300);
  for (let i = 0; i < 2 && await p.$("#job-next"); i++) { await p.click("#job-next"); await sleep(200); }
  if (await p.$("#charsetup")) { await p.fill("#sname", "시험용"); await p.click("#setup-ok"); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete("arche")); await sleep(300);
  await ev(() => { const S = AU.G.S; S.level = 10; S.quests.q_h1a = { state: "active", prog: [0], spots: {} }; AU.World.enterMap("hide_outer", 700, true); AU.World.trans = null; });
  await sleep(200);
  const setup = () => ev(() => { const W = AU.World; W.trans = null; W.monsters.slice(1).forEach((x) => { x.alive = false; x.respawnT = -1; }); const m = W.monsters[0]; m.alive = true; m.state = "patrol"; m.dir = 1; m.x = 700; m.min = 700; m.max = 700; m.pause = 99; const p = W.player; p.x = 560; p.vx = 0; p.hidden = false; return W.stealthOn(); });
  T("S1", "퀘스트 진행 중 잠입 임무 활성", await setup(), null);
  // 정면에서 발견 → 실패 연출 → 입구 복귀
  await ev(() => { const W = AU.World; W.monsters[0].dir = -1; W.updateMonsters(0.05); });
  const c1 = await ev(() => !!(AU.World.trans && AU.World.trans.caught)); T("S2", "정면 발견 시 실패 연출 시작(전투로 이어지지 않음)", c1, null);
  await sleep(1300);
  const r = await ev(() => ({ x: Math.round(AU.World.player.x), tries: AU.G.S.flags.stealth_tries_hide_outer, hp: AU.G.S.hp === AU.G.d().maxHp, st: AU.World.monsters.map((m) => m.state).join() }));
  T("S3", "입구(x=120)로 복귀·도전 1회·체력 회복·경비 순찰 복귀", r.x === 120 && r.tries === 1 && r.hp && !/chase/.test(r.st), r);
  // 숨기
  await setup(); await ev(() => { const W = AU.World; W.player.x = 960; W.scan(); W.updatePlayer(0.016, false); });
  const nh = await ev(() => !!AU.World.nearHide); await p.keyboard.press("Space"); await sleep(120);
  const hid = await ev(() => AU.World.player.hidden); T("S4", "상자 앞에서 Space로 숨기", nh && hid, { nh, hid });
  await ev(() => { const W = AU.World, m = W.monsters[0]; m.alive = true; m.state = "patrol"; m.dir = 1; m.x = 800; m.min = 800; m.max = 800; m.pause = 99; W.player.x = 960; W.updateMonsters(0.05); });
  T("S5", "숨은 동안은 시야 안에 있어도 발각되지 않음", await ev(() => !AU.World.trans && AU.World.monsters[0].state === "patrol"), null);
  await p.keyboard.down("ArrowRight"); await sleep(150); await p.keyboard.up("ArrowRight");
  T("S6", "움직이면 숨기 해제", await ev(() => !AU.World.player.hidden), null);
  // 기둥은 제거됨(11-25): 시야를 막는 구조물이 없어야 함
  await setup(); T("S7", "외곽에 시야를 가리는 기둥이 없음", await ev(() => !(AU.World.map.blockers && AU.World.map.blockers.length)), null);
  await ev(() => { const W = AU.World, m = W.monsters[0]; m.x = 1300; m.min = 1300; m.max = 1300; m.dir = 1; m.state = "patrol"; W.player.x = 1500; W.player.y = m.y; W.updateMonsters(0.05); });
  T("S8", "시야 안에서는 어디서든 정상 발각", await ev(() => !!(AU.World.trans && AU.World.trans.caught)), null);
  // 3회 이상 실패 도움
  await setup(); await ev(() => { AU.G.S.flags.stealth_tries_hide_outer = 3; });
  T("S9", "3회 실패 후 시야 배율 0.8", await ev(() => AU.World.sightMul() === 0.8), null);
  // 첫 시도 보너스 vs 재도전
  await ev(() => { AU.G.S.flags.stealth_tries_hide_outer = 0; AU.G.S.flags.hide_sneak_bonus = false; AU.G.S.flags.hide_outer_clear = false; AU.World.trans = null; AU.World.enterMap("hide_outer", 2480, true); AU.World.monsters.forEach((x) => { x.alive = false; x.respawnT = -1; }); });
  const s0 = await ev(() => AU.G.S.silver); await ev(() => AU.World.travel("hide_tunnel", 90)); await sleep(1100);
  const s1 = await ev(() => ({ s: AU.G.S.silver, clear: AU.G.S.flags.hide_outer_clear, map: AU.World.mapId }));
  T("S10", "한 번도 안 들키고 통과하면 보너스 +100, 구간 완료", s1.s - s0 === 100 && s1.clear && s1.map === "hide_tunnel", s1);
  await ev(() => { AU.World.enterMap("hide_outer", 700, true); AU.World.trans = null; AU.World.monsters.forEach((x) => { x.alive = true; }); });
  T("S11", "통과 후에는 경비가 평소처럼 행동(잠입 비활성)", await ev(() => !AU.World.stealthOn()), null);
  T("S12", "페이지 오류 없음", errs.length === 0, errs);
  console.log(`\n${ok}/${n} PASS`); await b.close(); process.exit(ok === n ? 0 : 1);
})();
