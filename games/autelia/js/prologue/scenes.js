/* 프롤로그 장면 6개의 구성(맵 연출·개체·상호작용·컷신 순서). 대사·자막 문장은 data.js의 AU.PRO_TEXT(요청서 원문)만 사용합니다.
   장면 규칙: 시작할 때 체크포인트 저장 → 조작·컷신 진행 → 종료 조건을 만족하면 P.advance()로 다음 장면. 건너뛰기를 해도 set/give/이동은 모두 실행됩니다. */
window.AU = window.AU || {};
(function () {
  const W = 1280, H = 720, G = 590, LAY = AU.PRO_LAY, A = AU.PArt, T = AU.PRO_TEXT, OBJ = AU.PRO_OBJ, SP = AU.PRO_SPEAKERS;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const D = AU.PRO_DRAW = {};
  const SC = AU.PRO_SCENES = {};

  /* ---------- 공통 도우미 ---------- */
  function npc(P, id, speaker, sprite, x, h, extra) { return P.addEnt(Object.assign({ id, x, sprite, h, name: SP[speaker].name, faceP: true }, extra || {})); }
  function raider(P, id, x, y, s, dir, min, max) {
    return P.addEnt({ id, x, y, s, face: dir, min, max, range: 0, layer: "mid",
      update(e, dt) { if (e.min == null) return; e.x += e.face * 26 * dt; if (e.x > e.max) e.face = -1; if (e.x < e.min) e.face = 1; },
      draw(ctx, e, P) { ctx.save(); ctx.globalAlpha = e.alpha == null ? (A.has("pc_raider_actions") ? 1 : 0.78) : e.alpha; A.raider(ctx, e.x, e.y, e.s, P.time, e.face); ctx.restore(); } });
  }
  const SHEETS = "abcdefghijklm".split("").filter(() => true); // 주민 동작 시트(a~c 1차, d~m NPC 다양화). 없는 시트는 runner/crowd 에서 건너뜀
  const pickSheet = () => { const ok = SHEETS.filter((c) => A.has("pc_villager_" + c + "_actions")); return ok.length ? ok[(Math.random() * ok.length) | 0] : "a"; };
  // 도망치는 주민 실루엣(배경 연출용, 충돌 없음)
  function runner(P, x, dir, speed) {
    const C = ["#8C6A52", "#6E7F8C", "#A5775A", "#7C8A66", "#9A6F7A", "#C0A06C"], col = C[(Math.random() * C.length) | 0], s = rnd(0.8, 1.05), sheet = "pc_villager_" + pickSheet() + "_actions";
    return P.addEnt({ id: "run" + Math.random(), x, dir, speed, s, col, sheet, ph: Math.random() * 6, range: 0, layer: "mid", runner: true,
      update(e, dt, P) { e.x += e.dir * e.speed * dt; if (e.x < -200 || e.x > AU.World.map.width + 200) P.ents = P.ents.filter((q) => q !== e); },
      draw(ctx, e, P) { const t = P.time * 11 + e.ph;
        if (A.spr(ctx, e.sheet, Math.floor(t / 2) % 2 ? "run1" : "run2", e.x, G - Math.abs(Math.sin(t)) * 3, e.dir, e.s * 0.95)) return;
        const sw = Math.sin(t) * 12; ctx.save(); ctx.translate(e.x, G - Math.abs(Math.sin(t)) * 4); ctx.scale(e.dir * e.s, e.s); ctx.fillStyle = e.col; ctx.strokeStyle = e.col; ctx.lineCap = "round"; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(-4, -50); ctx.lineTo(-4 - sw, -4); ctx.moveTo(4, -50); ctx.lineTo(4 + sw, -4); ctx.stroke(); A.rrect(ctx, -15, -108, 30, 62, 11); ctx.fill();
        ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-12, -96); ctx.lineTo(-24, -122 + sw); ctx.moveTo(12, -96); ctx.lineTo(24, -118 - sw); ctx.stroke(); ctx.fillStyle = "#E8C4A0"; ctx.beginPath(); ctx.arc(2, -122, 14, 0, 7); ctx.fill(); ctx.fillStyle = "#4b392c"; ctx.beginPath(); ctx.arc(0, -126, 14, Math.PI, 0); ctx.fill(); ctx.restore(); } });
  }
  // 주기적으로 도망치는 주민을 만들어 내는 보이지 않는 개체
  function runnerSpawner(P, every) {
    let acc = 0; P.addEnt({ id: "spawner", x: 0, range: 0, hidden: false, draw() {}, update(e, dt, P) { acc += dt; if (acc < every) return; acc = 0; if (P.ents.filter((q) => q.runner).length >= 5) return; const cx = AU.World.camX, dir = Math.random() < 0.5 ? 1 : -1; runner(P, dir > 0 ? cx - 90 : cx + W + 90, dir, rnd(150, 210)); } });
  }
  function flames(P, list) { P.v.flames = list; }
  function drawFlames(ctx, P) { if (A.has("pb_road_atk")) return; /* 정식 배경에 불길이 그려져 있음 */ for (const f of P.v.flames || []) A.flame(ctx, f.x, f.y, f.s, P.time + f.x * 0.01, f.dark !== false); }
  function fireEmitters(P, w, y0, y1, dens) {
    P.emitter({ kind: "ember", x0: 0, x1: w, y0: y0, y1: y1, rate: 16 * (dens || 1) }); P.emitter({ kind: "smoke", x0: 0, x1: w, y0: y0 + 80, y1: y1, rate: 3.2 * (dens || 1) });
  }
  async function go(P, mapId, x, setup, color) { // 장면 안에서 맵 이동(페이드)
    P.frozen = true; await P.fade(1, 0.5, color); P.room(mapId, x, setup); P.fadeS.a = 1; P.frozen = false; await P.cutscene(async () => { await P.fade(0, 0.7); }); 
  }
  const live = (P, g) => P.gen === g;

  /* ============================================================
     맵별 그리기 (back: 배경 바로 위 / mid: 인물 뒤·개체 / front: 인물 앞)
     ============================================================ */
  const artSpr = (art, fb) => (A.has(art) ? art : fb);
  /* 서 있는 NPC: 대기 자세 시트(villager_?_idle, 2프레임을 천천히 교대)가 있으면 그것, 없으면 환호2 자세(이전 방식). 반환값은 npc()의 sprite·h·extra 조각 */
  const standing = (k, fb) => {
    const key = "pc_villager_" + k + "_idle", m = AU.PRO_ART && AU.PRO_ART.ch && AU.PRO_ART.ch["villager_" + k + "_idle"];
    if (A.has(key) && m) return { sprite: key, h: Math.round(m.ch * 0.5), extra: { idle: true } };
    const act = "pc_villager_" + k + "_actions"; return { sprite: artSpr(act, fb), h: 150, extra: { frame: A.sprFrame(act, "cheer2") } };
  };  // 정식 그림이 있으면 그것, 없으면 이전 시제품 그림
  function drawCrowd(ctx, P) { // 축제 군중(정식 주민 시트): 가까운 곳에 NPC가 있어 피해서 배치, 깊이감을 위해 살짝 작고 위에 선다
    const L = LAY.plaza, c = P.v.cheer == null ? 0.12 : P.v.cheer, xs = [60, 130, 330, 470, 545, 650, 905, 1010, 1100, 1200], sh = ["f", "d", "g", "a", "j", "l", "b", "i", "e", "m"].map((k, i) => (A.has("pc_villager_" + k + "_actions") ? k : "abc"[i % 3]));
    xs.forEach((x, i) => { const bob = Math.abs(Math.sin(P.time * (3 + c * 5) + i * 1.7)) * (2 + c * 9); A.spr(ctx, "pc_villager_" + sh[i] + "_actions", c > 0.45 ? "cheer1" : "cheer2", x + (i % 2 ? 6 : -6), 566 - bob, i % 3 === 0 ? -1 : 1, 0.86); });
  }
  D.pro_temple = { // BG-01 신전 건축 현장 / 완공 상태
    back(ctx, P) { const v = P.v, L = LAY.temple, fa = v.scaff == null ? 1 : v.scaff;
      if (A.has("po_temple_frame")) { if (v.done) A.temple(ctx, L.tx, L.tBase, L.tW, 0, { state: "done", glow: v.glow || 0 }); A.temple(ctx, L.tx, L.tBase, L.tW, 0, { state: "frame", alpha: v.done ? fa : 1 }); }
      else { A.temple(ctx, 1560, 556, 640, 400, { state: v.done ? "done" : "frame", t: P.time, glow: v.glow || 0, joint: v.jointIn ? 1 : 0, gapX: 1560 + 640 * 0.12 }); A.scaffold(ctx, 1240, 556, 640, 330, fa); } },
    mid(ctx, P) { if (P.v.fly && P.v.fly.t < 1) { const f = P.v.fly, J = LAY.temple.joint, x = f.x0 + (J - f.x0) * f.t, y = f.y0 + ((A.has("po_joint_frame") ? 514 : 478) - f.y0) * f.t - Math.sin(f.t * Math.PI) * 90; A.plank(ctx, x, y, 90, -0.3 + f.t * 0.3); } },
    front(ctx, P) { /* 입자는 엔진이 그림 */ }
  };
  D.pro_road = {
    back(ctx, P) { if (A.has("pb_road")) return; const atk = P.variant === "attack", t = P.time; for (const [a, b, y, s] of [[420, 1020, 130, 70], [1020, 1650, 150, 80], [1650, 2300, 135, 70]]) A.pennants(ctx, a, b, y, s, t, { burn: atk, seed: a }); },
    mid(ctx, P) { const atk = P.variant === "attack"; if (atk) { for (const o of LAY.road.obst) A.obstacle(ctx, o, "beam", P.time); drawFlames(ctx, P); } }
  };
  D.pro_plaza = {
    back(ctx, P) {
      const atk = P.variant === "attack", t = P.time, v = P.v, L = LAY.plaza;
      if (A.has("po_temple_done")) { A.temple(ctx, L.tx, L.tBase, L.tW, 0, { state: atk ? "burn" : "done", glow: atk ? 0 : 0.5 + 0.12 * Math.sin(t * 1.2) }); if (!atk) drawCrowd(ctx, P); return; }
      A.temple(ctx, 1245, 455, 430, 300, { state: atk ? "burn" : "done", t, glow: atk ? 0 : 0.55 + 0.15 * Math.sin(t * 1.2), alpha: 0.97 });
      if (atk) { for (const [x, y, s] of [[1130, 250, 1.4], [1250, 215, 1.7], [1350, 270, 1.2], [1180, 380, 1.0], [1330, 400, 1.0]]) A.flame(ctx, x, y, s, t + x * 0.01, true); }
      else A.crowd(ctx, 100, 2400, 548, t, 5, 30, { cheer: v.cheer == null ? 0.12 : v.cheer });
      for (const [a, b, y, s] of [[40, 700, 120, 60], [700, 1500, 100, 50], [1500, 2440, 120, 60]]) A.pennants(ctx, a, b, y, s, t, { burn: atk, seed: a + 3 });
    },
    mid(ctx, P) { if (P.variant === "attack") { A.stall(ctx, LAY.plaza.obst[0].x + 50, G, 100, P.time); drawFlames(ctx, P); } }
  };
  // 집 안(습격 상태): 배경 그림은 아늑한 실내라서, 불꽃·연기·그을린 잔해·열기를 코드로 겹쳐 '불타는 집'으로 보이게 함(2차 효과 그림)
  const HOUSE_FIRE = [[150, 238, 120, 0], [196, 222, 86, 8], [352, 270, 70, 1], [520, 168, 62, 9], [760, 156, 64, 10], [968, 246, 110, 2], [1030, 226, 78, 11], [1148, 300, 150, 3], [1010, 396, 80, 4], [1200, 400, 90, 12]];   // 서까래·창가·기둥 위쪽
  const HOUSE_FLOOR = [[62, 590, 170, 5], [128, 590, 96, 13], [1136, 590, 185, 6], [1214, 590, 130, 14], [1010, 590, 92, 7]];                                       // 바닥 가장자리(아버지 위치 860 근처는 비움)
  D.pro_house = {
    back(ctx, P) {
      if (!A.has("fx_fire")) return;
      const g = ctx.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, "rgba(18,10,8,.78)"); g.addColorStop(0.6, "rgba(18,10,8,.38)"); g.addColorStop(1, "rgba(18,10,8,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 360);   // 천장 쪽 검은 연기
      for (const [x, y, h, s] of HOUSE_FIRE) A.fire(ctx, x, y, h, P.time, s);
    },
    mid(ctx, P) {
      if (!A.has("fx_fire")) { drawFlames(ctx, P); return; }
      if (A.has("po_obst_burnt_beams")) { A.obstacle(ctx, { x: 520, y: 561, w: 108, h: 29 }, "beam", P.time); A.obstacle(ctx, { x: 1060, y: 563, w: 96, h: 27 }, "beam", P.time); }   // 떨어진 그을린 들보
      for (const [x, y, h, s] of HOUSE_FLOOR) A.fire(ctx, x, y, h, P.time, s);
    },
    front(ctx, P) {
      if (!A.has("fx_fire")) return;
      for (let i = 0; i < 9; i++) { const age = ((P.time * 0.1 + i / 9) % 1); A.smoke(ctx, 90 + i * 135 + Math.sin(i * 2.3) * 40, 400 + (i % 2) * 50, 230, age, 0.85, i); }   // 천장 아래로 퍼지는 연기
      const k = 0.5 + 0.5 * Math.sin(P.time * 7.3) * Math.sin(P.time * 3.1 + 1); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.05 + 0.05 * k; ctx.fillStyle = "#ff6a2a"; ctx.fillRect(0, 0, W, H); ctx.restore();   // 열기로 일렁이는 붉은 빛
    }
  };
  D.pro_escape = {
    mid(ctx, P) { const m = AU.World.map, kinds = [null, "rock", "log", "log", "rock"]; m.platforms.forEach((pl, i) => { if (i > 0 && pl.h) A.obstacle(ctx, pl, kinds[i] || "rock", P.time); }); }
  };
  D.pro_hill = {
    back(ctx, P) {
      const v = P.v, r = v.reveal == null ? 1 : v.reveal; A.city(ctx, 380, 900, 430, P.time, r * 0.6);
      for (let i = 0; i < 4; i++) A.gull(ctx, 500 + ((P.time * 40 + i * 330) % 1100), 120 + i * 38 + Math.sin(P.time + i) * 12, 1 - i * 0.12, P.time + i);
    }
  };

  /* ============================================================
     SCENE 00 — 아침의 아르케아 (시작 글 카드 → 마을길 → 기념비)  /  SCENE 01B — 해 질 녘의 마을길(축제 깃발)
     그림: 배경은 기존 마을길(평화), 주민은 기존 주민 시트. 기념비·깃대는 코드 도형(정식 그림이 오면 교체)
     ============================================================ */
  function arrowMark(ctx, P, x, by) { if (P.locked()) return; const y = by + Math.sin(P.time * 4) * 4; ctx.fillStyle = "#E8B94E"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 11, y - 12); ctx.lineTo(x + 11, y - 12); ctx.lineTo(x, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  function drawStele(ctx, x, y) { // 빛의 승리 기념비: 돌비석 + 태양 문양 + 새긴 글줄
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = "round"; ctx.strokeStyle = "#5b4126"; ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(60,40,20,.26)"; ctx.beginPath(); ctx.ellipse(0, 3, 70, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#b4a68e"; A.rrect(ctx, -58, -28, 116, 28, 6); ctx.fill(); ctx.stroke();
    const g = ctx.createLinearGradient(-44, -196, 44, -28); g.addColorStop(0, "#e6dcc6"); g.addColorStop(1, "#b0a189");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-44, -28); ctx.lineTo(-44, -150); ctx.quadraticCurveTo(-44, -196, 0, -198); ctx.quadraticCurveTo(44, -196, 44, -150); ctx.lineTo(44, -28); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(91,65,38,.28)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, -58); ctx.lineTo(-26, -120); ctx.moveTo(24, -70); ctx.lineTo(30, -40); ctx.stroke();   // 돌결
    ctx.fillStyle = "#E3B24A"; ctx.strokeStyle = "#8a5f1f"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -150, 14, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.moveTo(Math.cos(a) * 19, -150 + Math.sin(a) * 19); ctx.lineTo(Math.cos(a) * 27, -150 + Math.sin(a) * 27); } ctx.stroke();
    ctx.strokeStyle = "rgba(91,65,38,.5)"; ctx.lineWidth = 3; ctx.lineCap = "round"; for (const [yy, w] of [[-112, 54], [-96, 62], [-80, 48], [-64, 58]]) { ctx.beginPath(); ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); ctx.stroke(); }
    ctx.restore();
  }
  function setupMorning(P) {
    const R = LAY.road, M = R.m; P.variant = "peace"; P.tint = { color: "#EAF1FF", a: 0.07 }; P.vig = 0.15;
    P.limits = { max: M.limit, msg: "길 끝의 기념비를 먼저 읽어 보세요." };
    const chat = (id, spk, sprite, x, h, label, key, extra) => npc(P, id, spk, sprite, x, h, Object.assign({ range: 100, interact: { label, fn: () => P.cutscene(() => P.say(T[key])) } }, extra || {}));
    chat("child", "child", artSpr("pc_festival_child", "villager_b"), M.child, 118, "대화: 축제 어린이", "s0_child");
    { const s = standing("b", "baker"); chat("baker", "vendor", s.sprite, M.baker, s.h, "대화: 빵을 나누는 주민", "s0_baker", s.extra); }
    { const s = standing("c", "villager_a"); chat("elder", "elder", s.sprite, M.elder, s.h, "대화: 나이 든 주민", "s0_elder", s.extra); }
    { const s = standing("d", "villager_a"); chat("farmer", "farmer", s.sprite, M.farmer, s.h, "대화: 젊은 농부", "s0_farmer", s.extra); }
    { const s = standing("j", "villager_a"); chat("priest", "priest", s.sprite, M.priest, s.h, "대화: 신관", "s0_priest", s.extra); }
    const stele = P.addEnt({ id: "stele", x: M.stele, range: 110, layer: "mid", mark: true, interact: { label: "기념비 읽기", fn: async () => {
      await P.cutscene(async () => { await P.say(T.s0_stele); }); if (P.flag("stele_read")) return;
      P.setFlag("stele_read"); stele.mark = false; P.limits = null; P.obj(OBJ.s0_exit);
      P.trigger({ id: "s0end", goal: R.end, test: (p) => p.x >= R.end, fn: () => { P.frozen = true; P.advance(); } }); } },
      draw(ctx, e, P) { drawStele(ctx, e.x, G); if (e.mark) arrowMark(ctx, P, e.x, G - 232); } });
  }
  SC.SCENE_00_MORNING = { name: "아침의 아르케아", async enter(P) {
    const g = P.gen; P.room("pro_road", LAY.road.m.start, (P) => setupMorning(P)); P.amb("birds", true);
    await P.cutscene(async () => { await P.wait(0.9); await P.cards(T.cards); await P.fade(0, 1.8); await P.caption(T.cap1, 3.4); }, { id: "cs00a", skip: true });
    if (!live(P, g)) return; P.obj(OBJ.s0_walk); const k = P.keys(); P.hint("이동 " + k.move + " · 점프 " + k.jump + " · 상호작용 " + k.act, 9);
  } };

  function drawPole(ctx, e, P) { // 깃대와 축제 깃발(e.f: 0 말려 있음 → 1 꼭대기까지 올라감)
    const x = e.x, top = G - 250, fy = G - 78 - e.f * 150, wv = Math.sin(P.time * 3 + x) * 5 * e.f;
    ctx.save(); ctx.strokeStyle = "#5b4126"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.fillStyle = "#9a6b3a";
    ctx.fillRect(x - 4, top, 8, G - top); ctx.strokeRect(x - 4, top, 8, G - top); ctx.fillStyle = "#E3B24A"; ctx.beginPath(); ctx.arc(x, top - 4, 7, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = e.col; ctx.beginPath();
    if (e.f < 0.05) { ctx.rect(x + 4, fy, 22, 12); } else { ctx.moveTo(x + 4, fy); ctx.quadraticCurveTo(x + 36, fy - 6 + wv, x + 72 + wv, fy + 20); ctx.quadraticCurveTo(x + 36, fy + 34 + wv * 0.5, x + 4, fy + 40); ctx.closePath(); }
    ctx.fill(); ctx.stroke(); if (e.f >= 0.05) { ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(x + 26, fy + 20, 7, 0, 7); ctx.fill(); }
    ctx.restore(); if (e.mark) arrowMark(ctx, P, x, top - 40);
  }
  function setupBanners(P) {
    const R = LAY.road, B = R.b; P.variant = "peace"; P.tint = { color: "#FFC98A", a: 0.2 }; P.vig = 0.24;
    const st = { talk: false, done: 0 }; P.limits = { max: B.elder + 150, msg: "먼저 마을 사람에게 말을 걸어 보세요." };
    const sE = standing("c", "villager_a"), sB = standing("b", "baker"), sM = standing("f", "villager_a"), sS = standing("k", "villager_a");
    const elder = npc(P, "elder", "elder", sE.sprite, B.elder, sE.h, Object.assign({}, sE.extra, { range: 110, mark: true }));
    npc(P, "baker", "vendor", sB.sprite, B.baker, sB.h, Object.assign({}, sB.extra, { range: 110, interact: { label: "대화: 빵을 나누는 주민", fn: () => P.cutscene(() => P.say(T.s1b_baker)) } }));
    npc(P, "musician", "musician", sM.sprite, B.musician, sM.h, Object.assign({}, sM.extra, { range: 100, interact: { label: "대화: 악사", fn: () => P.cutscene(() => P.say(T.s1b_musician)) } }));
    npc(P, "scribe", "scribe", sS.sprite, B.scribe, sS.h, Object.assign({}, sS.extra, { range: 100, interact: { label: "대화: 서기", fn: () => P.cutscene(() => P.say(T.s1b_scribe)) } }));
    const cols = ["#C0573E", "#E3B24A", "#4F8A6B"];
    const poles = B.poles.map((x, i) => P.addEnt({ id: "pole" + i, x, f: 0, col: cols[i % 3], range: 90, layer: "mid", draw: drawPole, interact: { label: "깃발 달기", off: true, fn: () => hang(poles[i]) } }));
    elder.interact = { label: "대화: 나이 든 주민", fn: async () => {
      if (!st.talk) { st.talk = true; await P.cutscene(async () => { await P.say(T.s1b_elder); }); elder.mark = false; P.limits = { max: B.poles[2] + 130, msg: "먼저 깃발을 달아 주세요." };
        poles.forEach((q) => { q.interact.off = false; q.mark = true; }); P.obj(OBJ.s1b_flags.replace("{n}", 0)); return; }
      await P.cutscene(async () => { await P.say(T.s1b_elder2); }); } };
    async function hang(q) {
      if (q.hung) return; q.hung = true; q.mark = false; q.interact.off = true;
      await P.cutscene(async () => { await P.walkTo(q.x - 48, 1); P.face(1); await P.wait(0.2); P.sfx("pick"); await P.tween(q, { f: 1 }, 1.0, (k) => k); P.sfx("item"); await P.wait(0.25); });
      st.done++; P.obj(OBJ.s1b_flags.replace("{n}", st.done));
      if (st.done < 3) return;
      await P.cutscene(async () => { await P.say(T.s1b_done); }); P.setFlag("banners_done"); P.limits = null; P.obj(OBJ.s1b_exit);
      P.trigger({ id: "s1bend", goal: B.limit, test: (p) => p.x >= B.limit, fn: () => { P.frozen = true; P.advance(); } });
    }
  }
  SC.SCENE_01B_BANNERS = { name: "해 질 녘의 마을길", async enter(P) {
    const g = P.gen; P.room("pro_road", LAY.road.start, (P) => setupBanners(P));
    await P.cutscene(async () => { await P.fade(0, 1.4); await P.caption(T.cap1c, 2.8); }, { id: "cs01c", skip: true });
    if (!live(P, g)) return; P.obj(OBJ.s1b_talk);
  } };

  /* ============================================================
     SCENE 01 — 마지막 망치질 (신전 건축 현장 → 마을길)
     ============================================================ */
  function setupTemple(P, step) { // step: 0 시작 / 이후 상태 복원은 하지 않음(장면은 항상 처음부터)
    const k = P.keys(), v = P.v; v.scaff = 1; v.done = false; v.glow = 0; v.jointIn = false; v.nails = 0; v.swing = 0; v.pile = 5; P.variant = "peace";
    P.tint = { color: "#FFF1DA", a: 0.1 }; P.vig = 0.15; const L = LAY.temple;
    P.limits = { max: L.limit, msg: "아직 끝내지 못한 작업이 있습니다." };
    const st = { talk: false, carry: false, installed: false, hammered: false, finished: false };
    const father = npc(P, "father", "father", artSpr("pc_father_actions", "smith"), L.father, 150, { range: 120, working: true, mark: true, faceP: false, face: 1,
      draw(ctx, e, P) { const w = AU.World, art = A.has("pc_father_actions"); w.nameTag(ctx, e.name, e.x, G - (art && e.working ? 172 : 160));
        if (art) A.spr(ctx, "pc_father_actions", e.working ? (Math.sin(P.time * 5) > 0.15 ? "hammer2" : "hammer1") : "stand", e.x, G, e.face);
        else { w.sprite(ctx, "smith", e.x, G, 150, e.face, 0); if (e.working) { const sw = Math.max(0, Math.sin(P.time * 5)); A.hammer(ctx, e.x + e.face * 30, G - 76, e.face * (-0.5 + sw * 1.9), 0.9); } }
        if (e.mark && !P.locked()) { const by = G - 204 + Math.sin(P.time * 4) * 4; ctx.fillStyle = "#E8B94E"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(e.x - 11, by - 12); ctx.lineTo(e.x + 11, by - 12); ctx.lineTo(e.x, by + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); } } });
    const pile = P.addEnt({ id: "pile", x: L.pile, range: 90, layer: "mid", interact: { label: "목재 들기", off: true, fn: () => { if (st.carry) return; st.carry = true; v.carry = true; P.sfx("pick"); pile.mark = false; father.mark = true; father.interact.label = "목재 건네기"; P.hint("목재를 들었습니다. 아버지에게 가져가세요.", 3.5); } },
      draw(ctx, e, P) { for (let i = 0; i < v.pile; i++) A.plank(ctx, e.x + (i % 2) * 6, G - 10 - i * 15, 150, (i % 2 ? 0.01 : -0.01)); ctx.fillStyle = "#6e4a25"; ctx.fillRect(e.x - 66, G - 6, 8, 6); ctx.fillRect(e.x + 58, G - 6, 8, 6);
        if (e.mark && !P.locked()) { const by = G - 130 + Math.sin(P.time * 4) * 4; ctx.fillStyle = "#E8B94E"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(e.x - 11, by - 12); ctx.lineTo(e.x + 11, by - 12); ctx.lineTo(e.x, by + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); } } });
    const frame = P.addEnt({ id: "frame", x: L.joint, range: 100, layer: "mid", interact: { label: "이음새 망치질", off: true, fn: () => hammerJoint() },
      draw(ctx, e, P) { const x = e.x; ctx.save();
        const jf = A.has("po_joint_frame"), jy = jf ? 514 : 478; // 정식 이음 골조 그림이 있으면 그것을 쓰고, 널빤지·못 높이를 빈 가운데 칸에 맞춤
        if (jf) A.pic(ctx, "po_joint_frame", x, G, 118, 1);
        else if (A.has("po_plank_a")) { // (임시) 정식 널빤지 그림으로 짠 작은 이음 골조(기둥 2 + 가로대 2)
          const post = (px) => { ctx.save(); ctx.translate(px, 530); ctx.rotate(Math.PI / 2); ctx.drawImage(AU.Img.get("po_plank_b"), -60, -9, 120, 18); ctx.restore(); }; post(x - 69); post(x + 69);
          ctx.drawImage(AU.Img.get("po_plank_a"), x - 80, 466, 54, 14); ctx.drawImage(AU.Img.get("po_plank_a"), x + 26, 466, 54, 14);
        } else { ctx.fillStyle = "#B98B4E"; ctx.strokeStyle = "#5b4126"; ctx.lineWidth = 3; ctx.fillRect(x - 76, 470, 14, G - 470); ctx.strokeRect(x - 76, 470, 14, G - 470); ctx.fillRect(x + 62, 470, 14, G - 470); ctx.strokeRect(x + 62, 470, 14, G - 470);
          ctx.fillRect(x - 76, 470, 46, 16); ctx.strokeRect(x - 76, 470, 46, 16); ctx.fillRect(x + 30, 470, 46, 16); ctx.strokeRect(x + 30, 470, 46, 16); }
        if (v.fly && v.fly.t >= 1) A.plank(ctx, x, jy, 66, 0); else if (v.planked) A.plank(ctx, x, jy, 66, 0);
        for (let i = 0; i < 3; i++) { const sunk = v.nails > i; ctx.fillStyle = sunk ? "#555a62" : "#9aa0a8"; ctx.fillRect(x - 18 + i * 18, jy + (sunk ? -3 : -12), 6, sunk ? 3 : 12); }
        if (e.mark && !P.locked()) { const by = 440 + Math.sin(P.time * 4) * 4; ctx.fillStyle = "#E8B94E"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 11, by - 12); ctx.lineTo(x + 11, by - 12); ctx.lineTo(x, by + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.restore(); } });

    father.interact = { label: "대화: 아버지", fn: async () => {
      if (!st.talk) { st.talk = true; await P.cutscene(async () => { await P.say(T.father1); }); pile.interact.off = false; pile.mark = true; father.mark = false; P.obj(OBJ.s1_lumber); return; }
      if (st.carry && !st.installed) { st.installed = true; await P.cutscene(async () => {
        v.carry = false; P.sfx("pick"); v.fly = { t: 0, x0: AU.World.player.x + 10, y0: G - 126 }; await P.tween(v.fly, { t: 1 }, 0.9, (k) => k); v.planked = true; P.sfx("plank"); P.burst("dust", L.joint, 478, 6); P.shake(4, 0.2);
        await P.say(T.father2); });
        frame.interact.off = false; frame.mark = true; father.mark = false; P.obj(OBJ.s1_joint); return; }
      if (st.finished) { if (!P.flag("father_final_conversation_complete")) await finalTalk(); return; }
      await P.cutscene(async () => { await P.say(st.installed ? T.father2 : T.father1); }); // 이미 한 대화를 다시 걸면 같은 대사를 반복
    } };

    async function hammerJoint() {
      if (st.hammered) return; st.hammered = true; frame.mark = false;
      await P.cutscene(async () => {
        await P.walkTo(L.joint - 80, 1); P.face(1); P.pose("hammer");
        for (let i = 0; i < 3; i++) { await P.tween(v, { swing: 1 }, 0.26); P.sfx("hammer"); v.nails = i + 1; P.burst("spark", L.joint - 10 + i * 18, 470, 7, { override: { col: "#FFE9A0" } }); P.burst("chip", L.joint, 470, 3); P.shake(3, 0.14); await P.tween(v, { swing: 0 }, 0.3); await P.wait(0.14); }
        P.pose(null); P.setFlag("temple_work_complete"); await P.wait(0.5);
      });
      await P.cutscene(async () => { // CS-01 신전 완공
        await P.camPan(L.tx - 20, 1.8); await P.wait(0.4); P.sfx("stone"); v.jointIn = true; P.shake(5, 0.4); P.burst("dust", L.tx + 40, 330, 10);
        await P.wait(0.6); P.tween(v, { scaff: 0 }, 2.6); P.sfx("chime"); P.tween(v, { glow: 1 }, 2.2); P.emitter({ kind: "glow", x0: L.tx - 300, x1: L.tx + 300, y0: 330, y1: 540, rate: 12 }); v.done = true; frame.hidden = true;
        await P.wait(3.2); P.camFollow(); await P.wait(0.8);
      }, { id: "cs01a", skip: true, bars: true });
      st.finished = true; father.mark = true; father.working = false; father.faceP = true; father.interact.label = "대화: 아버지"; P.obj(OBJ.s1_back);
    }
    async function finalTalk() {
      await P.cutscene(async () => {
        await P.say(T.father3); father.faceP = false; father.face = 1; await P.camPan(L.tx - 100, 1.6); await P.wait(2.2); await P.say(T.father4); await P.camFollow(); father.faceP = true;
        P.setFlag("father_final_conversation_complete");
      }, { id: "cs01b", skip: true, bars: true });
      father.mark = false; P.limits = null; P.obj(OBJ.s1_exit); father.working = false;
      P.trigger({ id: "s1exit", goal: L.exit, test: (p) => p.x >= L.exit, fn: () => { P.frozen = true; P.advance(); } });
    }
  }
  function setupRoad(P, variant, scene) {
    P.variant = variant;
    if (variant === "peace") return;
    { // BG-V01 마을길 습격 상태
      P.tint = { color: "#c9a79f", a: 0.5 }; P.vig = 0.4; P.setPlatforms(LAY.road.obst);
      flames(P, [{ x: 560, y: G, s: 1.1 }, { x: 760, y: G, s: 0.8 }, { x: 1240, y: G, s: 1.2 }, { x: 1900, y: G, s: 1.0 }, { x: 2130, y: G, s: 0.9 }, { x: 180, y: 300, s: 1.5 }, { x: 300, y: 285, s: 1.8 }, { x: 400, y: 310, s: 1.3 }]);
      fireEmitters(P, LAY.road.w, 150, 560, 1); for (const [i, r] of LAY.road.raiders.entries()) raider(P, "r" + (i + 1), r[0], r[1], 0.5 - i * 0.05, -1, r[2], r[3]); runnerSpawner(P, 2.2);
      P.trigger({ id: "jumphint", test: (p) => p.x <= 1000, fn: () => P.hint("장애물은 점프(" + P.keys().jump + ")로 넘을 수 있습니다.", 4) });
      P.trigger({ id: "s3end", goal: LAY.road.doorX, test: (p) => p.x <= LAY.road.doorX + 60, fn: () => houseDoor() });
    }
  }
  async function houseDoor() { const P = AU.Prologue, g = P.gen; await P.cutscene(async () => { await P.walkTo(LAY.road.doorX, 1); P.sfx("door"); await P.wait(0.5); }); if (live(P, g)) { P.frozen = true; P.advance(); } }

  SC.SCENE_01_TEMPLE = { name: "마지막 망치질", async enter(P) {
    const g = P.gen; P.room("pro_temple", LAY.temple.start, (P) => setupTemple(P));
    await P.cutscene(async () => { // 검은 화면에서 망치 소리 → 서서히 밝아짐 → 자막
      P.sfx("hammer"); await P.wait(0.9); P.sfx("hammer"); await P.wait(0.8); P.sfx("hammer"); await P.wait(0.7); P.sfx("hammer"); await P.wait(0.6);
      P.fade(0, 2.4); await P.wait(1.4); await P.caption(T.cap1b, 3.2);
    }, { id: "cs00", skip: true });
    if (!live(P, g)) return; P.obj(OBJ.s1_talk); const k = P.keys(); P.hint("이동 " + k.move + " · 점프 " + k.jump + " · 상호작용 " + k.act, 9);
  } };

  /* ============================================================
     SCENE 02 — 빛의 승리 100주년 (축제 광장)
     ============================================================ */
  function setupPlaza(P, variant) {
    const v = P.v, L = LAY.plaza; P.variant = variant;
    if (variant === "peace") {
      P.tint = { color: "#FFF1DA", a: 0.08 }; P.vig = 0.12; v.cheer = 0.12;
      P.limits = { max: L.limit, msg: "먼저 주민과 이야기를 나눠 보세요." };
      const elder = npc(P, "elder", "elder", artSpr("pc_villager_c_actions", "villager_a"), L.elder, 150, { frame: A.sprFrame("pc_villager_c_actions", "cheer2"), range: 100, interact: { label: "대화: 나이 든 주민", fn: () => P.cutscene(() => P.say(T.elder)) } });
      const child = npc(P, "child", "child", artSpr("pc_festival_child", "villager_b"), L.child, 118, { range: 90, interact: { label: "대화: 축제 어린이", fn: () => P.cutscene(() => P.say(T.child)) } });
      const vendor = npc(P, "vendor", "vendor", artSpr("pc_villager_b_actions", "baker"), L.vendor, 150, { frame: A.sprFrame("pc_villager_b_actions", "cheer2"), range: 110, mark: true, interact: { label: "대화: 빵을 나누는 주민", fn: async () => {
        await P.cutscene(async () => { await P.say(T.vendor); }); if (P.flag("festival_interaction_complete")) return;
        P.setFlag("festival_interaction_complete"); vendor.mark = false; P.limits = null; P.obj(OBJ.s2_center);
        P.trigger({ id: "center", goal: L.center, test: (p) => p.x >= L.center, fn: () => centerEvent() }); } } });
      void elder; void child;
    } else { // BG-V02 광장 습격 상태
      P.tint = { color: "#c9a79f", a: 0.45 }; P.vig = 0.4; P.setPlatforms(L.obst);
      flames(P, [{ x: 420, y: G, s: 1.0 }, { x: 760, y: G - 4, s: 0.9 }, { x: 1500, y: G, s: 1.3 }, { x: 1760, y: G, s: 1.1 }, { x: 2100, y: G, s: 1.2 }]);
      fireEmitters(P, L.w, 120, 560, 1.2); raider(P, "r1", 500, 520, 0.55, -1, 380, 640); raider(P, "r2", 800, 524, 0.5, -1, 650, 900); raider(P, "r3", 1030, 520, 0.58, -1, 900, 1180);
      runnerSpawner(P, 1.6);
      P.trigger({ id: "jumphint", test: (p) => p.x <= 980, fn: () => P.hint("장애물은 점프(" + P.keys().jump + ")로 넘을 수 있습니다.", 4) });
      P.trigger({ id: "toroad", goal: 70, test: (p) => p.x <= 70, fn: () => go(P, "pro_road", LAY.road.w - 100, (P) => setupRoad(P, "attack", 3)) });
    }
  }
  async function centerEvent() {
    const P = AU.Prologue, g = P.gen, v = P.v;
    await P.cutscene(async () => {
      P.obj(""); await P.tween(v, { cheer: 1 }, 1.0); P.zoomTo(1.12, 2.6, 640, 330); await P.caption(T.cap2, 4.4);
      await P.tween(v, { cheer: 0 }, 0.8); P.zoomTo(1, 0.8); await P.wait(1.6); // 음악이 멈춘 듯한 짧은 정적
      P.sfx("boom"); P.shake(18, 1.6); await P.fade(1, 0.2, "#fff"); await P.wait(0.5);
    }, { id: "cs02a", skip: true, bars: true });
    if (live(P, g)) { P.frozen = true; P.advance("#fff"); }
  }
  SC.SCENE_02_FESTIVAL = { name: "빛의 승리 100주년", async enter(P) {
    const g = P.gen; P.room("pro_plaza", LAY.plaza.start, (P) => setupPlaza(P, "peace")); P.amb("crowd", true);
    await P.cutscene(async () => { await P.fade(0, 1.4); });
    if (!live(P, g)) return; P.obj(OBJ.s2_talk);
  } };

  /* ============================================================
     SCENE 03 — 검은 화염 (광장 → 마을길 → 집 앞)
     ============================================================ */
  SC.SCENE_03_ATTACK = { name: "검은 화염", async enter(P) {
    const g = P.gen; P.room("pro_plaza", LAY.plaza.w - 180, (P) => setupPlaza(P, "attack")); P.fadeS.color = "#fff"; P.fadeS.a = 1; P.setFlag("attack_triggered"); P.face(1);
    await P.cutscene(async () => { // CS-02 축제 습격
      await P.wait(0.5); P.amb("fire", true); P.sfx("boom"); P.shake(12, 1.4); P.fade(0, 1.6);
      await P.zoomTo(1.22, 2.0, 640, 300); runner(P, 1100, -1, 230); runner(P, 1240, -1, 200); runner(P, 980, 1, 210);
      await P.wait(1.0); P.sfx("collapse"); P.shake(8, 0.8); P.burst("dust", 1050, 300, 12); await P.say(T.attack);
      await P.zoomTo(1, 1.4); P.face(-1); await P.wait(0.6); await P.say(T.hero_dad);
    }, { id: "cs02", skip: true, bars: true });
    if (!live(P, g)) return; P.obj(OBJ.s3_dad);
  } };

  /* ============================================================
     SCENE 04 — 아버지의 마지막 유언 (집 안)
     ============================================================ */
  function setupHouse(P) {
    const v = P.v; P.variant = "attack"; P.tint = { color: A.has("fx_fire") ? "#a8603c" : "#ffd9b8", a: A.has("fx_fire") ? 0.44 : 0.18 }; P.vig = A.has("fx_fire") ? 0.68 : 0.45; v.bag = false;
    P.limits = { min: 120, max: null, msg: "아버지를 먼저 찾아야 합니다." };
    flames(P, [{ x: 260, y: 330, s: 1.1 }, { x: 620, y: 300, s: 1.4 }, { x: 980, y: 335, s: 1.2 }, { x: 1150, y: 590, s: 1.0 }, { x: 90, y: 590, s: 0.7 }, { x: 430, y: 560, s: 0.5 }]);
    fireEmitters(P, 1280, 180, 520, 1.1);
    const father = P.addEnt({ id: "father", x: LAY.house.father, range: 0, hand: 0, drop: 0, frag: false, layer: "mid",
      draw(ctx, e, P) { const w = AU.World;
        if (A.has("pc_father_down")) { // 쓰러진 아버지(머리가 왼쪽): 팔이 뻗은 한 장 그림만 사용(팔 조각을 따로 겹치면 손만 잘려 보여서 제거). 손이 앞으로 내민 쪽에 조각을 쥔 표시만 겹침
          A.pic(ctx, "pc_father_down", e.x, G + 4, 42, -1);
          const tipX = e.x - 96, tipY = G - 6;
          if (e.frag) A.fragment(ctx, tipX - 22 * e.hand, tipY - 14 - 8 * e.hand, 0.34, -0.5, P.time);
          return; }
        ctx.save(); ctx.translate(e.x, G - 6); ctx.rotate(-Math.PI / 2); ctx.scale(-1, 1); w.sprite(ctx, "smith", 0, 0, 150, 1, 0); ctx.restore();
        const sx = e.x - 112, sy = G - 40, hx = sx - 70 * e.hand, hy = sy - 34 * e.hand + 52 * e.drop;
        if (e.hand > 0.02 || e.drop > 0) { ctx.strokeStyle = "#D9B08C"; ctx.lineWidth = 15; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke(); ctx.fillStyle = "#E8C4A0"; ctx.beginPath(); ctx.arc(hx - 4, hy, 11, 0, 7); ctx.fill(); if (e.frag) A.fragment(ctx, hx - 6, hy - 12, 0.34, -0.5, P.time); } } });
    const bag = P.addEnt({ id: "bag", x: 420, range: 90, hidden: true, layer: "mid", mark: true, interact: { label: "도구 가방 챙기기", fn: () => takeBag() },
      lift: 0,
      draw(ctx, e, P) { if (e.lift > 0) { liftBag(ctx, e, P); return; } A.bag(ctx, e.x, G - 4, 1.05, 0); const k = 0.5 + 0.5 * Math.sin(P.time * 4); ctx.strokeStyle = "rgba(255,230,150," + (0.35 + 0.4 * k) + ")"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, G - 4, 46, 9, 0, 0, 7); ctx.stroke();
        if (e.mark && !P.locked()) { const by = G - 90 + Math.sin(P.time * 4) * 4; ctx.fillStyle = "#E8B94E"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(e.x - 11, by - 12); ctx.lineTo(e.x + 11, by - 12); ctx.lineTo(e.x, by + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); } } });
    P.trigger({ id: "find", goal: LAY.house.find, test: (p) => p.x >= LAY.house.find, fn: () => willScene(father, bag) });
    /* 바닥의 가방이 포물선을 그리며 등으로 올라가는 모습(바닥 그림 → 등에 멘 그림으로 서서히 바뀜) */
    function liftBag(ctx, e, P) {
      const p = AU.World.player, d = p.dir, k = e.lift, ease = k * k * (3 - 2 * k), b = P.bagDyn(p), fx = e.x, fy = G - 4 - 39, tx = p.x - d * 20, ty = p.y - 74 + 29 + b.y;
      const x = fx + (tx - fx) * ease, y = fy + (ty - fy) * ease - Math.sin(k * Math.PI) * 46, h = 78 + (58 - 78) * ease, mix = Math.min(1, Math.max(0, (k - 0.55) / 0.4)), rot = d * 0.35 * Math.sin(k * Math.PI);
      ctx.save(); ctx.globalAlpha = 1 - mix; A.picC(ctx, "po_bag_floor", x, y, h * 1.12, rot, false); ctx.globalAlpha = mix; A.bagBack(ctx, x, y - h / 2, h, d, rot); ctx.restore();
    }
    async function takeBag() {
      if (P.flag("carpenter_bag_acquired") || bag.taking) return; bag.taking = true; bag.mark = false;
      await P.cutscene(async () => {
        const p = AU.World.player, side = p.x < bag.x ? -1 : 1;
        await P.walkTo(bag.x + side * 52, 1.2); P.face(-side); await P.wait(0.15);
        P.pose("kneel"); await P.wait(0.45); P.sfx("bag");
        await P.tween(bag, { lift: 0.42 }, 0.5); P.pose(null);                       // 무릎을 꿇은 채 집어 들고 일어서면서
        await P.tween(bag, { lift: 1 }, 0.55);                                      // 어깨 위로 올려 등에 멤
        P.setFlag("carpenter_bag_acquired"); P.give("carpenter_bag"); bag.hidden = true; bag.lift = 0; P.bagKick(120); P.sfx("keyitem"); P.hint("목수 도구 가방을 챙겼습니다.", 2.8);
        await P.wait(0.5);
      }, { bars: false });
      P.limits = null; P.obj(OBJ.s4_exit); P.trigger({ id: "s4exit", goal: 100, test: (p) => p.x <= 100, fn: () => { P.frozen = true; P.advance(); } });
    }
  }
  async function willScene(father, bag) {
    const P = AU.Prologue, g = P.gen, v = P.v;
    await P.cutscene(async () => { // CS-03 아버지의 유언
      P.obj(""); P.amb("fire", true); P.face(1); await P.say([T.will[0]]); await P.walkTo(612, 1.5); await P.say([T.will[1]]); P.pose("kneel"); P.zoomTo(1.25, 1.6, 700, 450); await P.wait(1.0);
      await P.say(T.will.slice(2, 5)); // 아버지 "...왔구나." / 주인공 / 아버지 "아니... 시간이 없다."
      await P.tween(father, { hand: 1 }, 1.3); father.frag = true; await P.wait(0.5);
      P.closeup = { a: 0 }; P.sfx("fragment"); await P.tween(P.closeup, { a: 1 }, 0.9); P.setFlag("metal_fragment_acquired"); P.give("metal_fragment"); father.frag = false; await P.wait(3.0); await P.tween(P.closeup, { a: 0 }, 0.8); P.closeup = null;
      await P.tween(father, { hand: 0.5 }, 0.6); await P.say(T.will2);
      P.sfx("slump"); await P.tween(father, { hand: 0, drop: 1 }, 0.8); P.amb("fire", false); await P.wait(1.8); await P.say(T.will3);
      P.setFlag("father_final_words_seen"); P.pose(null); P.zoomTo(1, 1.2); await P.wait(0.9); P.amb("fire", true);
    }, { id: "cs03", skip: true, bars: true });
    if (!live(P, g)) return; bag.hidden = false; P.obj(OBJ.s4_bag); P.limits = { min: 120, max: null, msg: "도구 가방을 챙겨야 합니다." };
  }
  SC.SCENE_04_FATHER = { name: "아버지의 마지막 유언", async enter(P) {
    const g = P.gen; P.room("pro_house", LAY.house.start, (P) => setupHouse(P)); P.amb("fire", true);
    await P.cutscene(async () => { await P.fade(0, 1.6); }); if (!live(P, g)) return; P.obj(OBJ.s3_dad);
  } };

  /* ============================================================
     SCENE 05 — 잿더미를 뒤로하고 (탈출로 → 사흘 후 암전 전환)
     ============================================================ */
  function montage(ctx, P, t) { // 시간 경과: 새벽 안개 숲길 → 비 내리는 산길 → 해 뜨는 서쪽 언덕 (임시: 기존 배경 그림을 잘라 씀)
    const dur = 3.6, n = 3, idx = Math.min(n - 1, Math.floor(t / dur)), local = t - idx * dur, a = Math.min(1, local / 0.7) * Math.min(1, (dur - local) / 0.7 + 0.0001);
    const art = A.has("pb_escape") && A.has("pb_port"), shots = art ? [{ key: "pb_escape", sx: 900, veil: "rgba(206,216,230,.42)", kind: "fog" }, { key: "pb_escape", sx: 1750, veil: "rgba(150,166,186,.34)", kind: "rain" }, { key: "pb_port", sx: 560, veil: null, kind: "sun" }]
      : [{ key: "forest_road", sx: 300, tint: "#a9b6c8", kind: "fog" }, { key: "forest_road", sx: 1500, tint: "#9aa6b6", kind: "rain" }, { key: "harbor_road", sx: 650, tint: "#ffffff", kind: "sun" }];
    const s = shots[idx]; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    if (AU.Img.has(s.key)) { const im = AU.Img.get(s.key), k = H / im.naturalHeight, cw = W / k, drift = local * 24; ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.drawImage(im, s.sx + drift, 0, cw, im.naturalHeight, 0, 0, W, H);
      if (s.veil) { ctx.fillStyle = s.veil; ctx.fillRect(0, 0, W, H); } else if (s.tint) { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = s.tint; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
      if (s.kind === "fog") { for (let i = 0; i < 3; i++) { const fx = ((t * 30 + i * 500) % 1800) - 400, g = ctx.createLinearGradient(fx, 0, fx + 700, 0); g.addColorStop(0, "rgba(235,240,245,0)"); g.addColorStop(0.5, "rgba(235,240,245,.55)"); g.addColorStop(1, "rgba(235,240,245,0)"); ctx.fillStyle = g; ctx.fillRect(fx, 200 + i * 90, 700, 220); } }
      else if (s.kind === "rain") { ctx.strokeStyle = "rgba(210,225,240,.5)"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 140; i++) { const rx = (i * 97 + t * 420) % (W + 100) - 50, ry = (i * 53 + t * 900) % H; ctx.moveTo(rx, ry); ctx.lineTo(rx - 10, ry + 26); } ctx.stroke(); }
      else { const g = ctx.createRadialGradient(W * 0.5, 330, 10, W * 0.5, 330, 520); g.addColorStop(0, "rgba(255,230,160,.6)"); g.addColorStop(1, "rgba(255,200,120,0)"); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
      const px = 260 + local * 120, bob = Math.abs(Math.sin(local * 7)) * 3; if (!A.spr(ctx, "pc_player_" + (AU.PRO_GENDER || "m") + "_locomotion", "walk" + (1 + Math.floor(local * 8) % 4), px, G + 6 - bob, 1)) AU.World.sprite(ctx, "player_male", px, G + 6 - bob, 150, 1, Math.floor(local * 8) % 4); ctx.restore(); }
  }
  SC.SCENE_05_ESCAPE = { name: "잿더미를 뒤로하고", async enter(P) {
    const g = P.gen, k = P.keys();
    P.room("pro_escape", LAY.escape.start, (P) => {
      P.variant = "night"; P.tint = { color: "#8c9cc8", a: 0.22 }; P.vig = 0.38;
      P.emitter({ kind: "ash", x0: 0, x1: LAY.escape.w, y0: 0, y1: 120, rate: 20 }); P.emitter({ kind: "ember", x0: 0, x1: 1400, y0: 300, y1: 560, rate: 5 });
      P.overlayFn = (ctx, P) => { const cx = AU.World.camX, k = Math.max(0, 1 - cx / 1900) * (0.42 + 0.06 * Math.sin(P.time * 3)); if (k > 0.01) { const g = ctx.createRadialGradient(0, 430, 20, 0, 430, 760); g.addColorStop(0, "rgba(255,110,50," + k + ")"); g.addColorStop(1, "rgba(255,90,40,0)"); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
        const v = P.v.vista; if (v && v.a > 0.01) { ctx.save(); ctx.globalAlpha = v.a; A.vista(ctx, P.time, W, H); ctx.restore(); } };
      P.v.vista = { a: 0 };
      P.trigger({ id: "recall", test: (p) => p.x >= LAY.escape.recall, fn: () => P.recall(T.recall, 5.5) });
      P.trigger({ id: "look", test: (p) => p.x >= LAY.escape.look, fn: () => lookBack() });
      P.trigger({ id: "end", goal: LAY.escape.end, test: (p) => p.x >= LAY.escape.end, fn: () => escapeEnd() });
    });
    P.amb("wind", true); P.amb("fire", true);
    await P.cutscene(async () => { await P.fade(0, 1.6); }); if (!live(P, g)) return;
    P.obj(OBJ.s5_escape); P.hint("점프 " + k.jump + " · 이동 " + k.move, 6);
  } };
  async function lookBack() {
    const P = AU.Prologue, v = P.v;
    await P.cutscene(async () => { // 마지막 조망
      P.obj(""); await P.walkTo(LAY.escape.look + 40, 0.5); if (P.heroArt()) P.pose("lookback"); else P.face(-1); await P.wait(0.7); await P.tween(v.vista, { a: 1 }, 1.4); P.recall(T.lookNarr, 4.4); await P.wait(4.6); await P.tween(v.vista, { a: 0 }, 1.2); P.pose(null); P.face(1); await P.wait(0.6);
    }, { id: "cs04a", skip: true, bars: true });
    P.obj(OBJ.s5_escape);
  }
  async function escapeEnd() {
    const P = AU.Prologue, g = P.gen, v = P.v;
    await P.cutscene(async () => { // CS-04 아르케아와 작별 + 사흘 동안의 이동(짧은 화면 전환)
      P.obj(""); P.setFlag("arkea_escape_complete"); await P.fade(1, 0.9); P.amb("wind", false); P.amb("fire", false);
      const t0 = { t: 0 }; P.shotFn = (ctx) => montage(ctx, P, t0.t); P.fadeS.a = 0; await P.tween(t0, { t: 10.8 }, 10.8, (k) => k); P.shotFn = null; P.fadeS.a = 1;
    }, { id: "cs04", skip: true });
    if (live(P, g)) { P.frozen = true; P.advance(); }
  }

  /* ============================================================
     SCENE 06 — 중립도시 포르투 노바 (외곽 언덕 → 종료 화면)
     ============================================================ */
  SC.SCENE_06_PORT_VIEW = { name: "중립도시 포르투 노바", async enter(P) {
    const g = P.gen;
    P.room("pro_hill", LAY.hill.start, (P) => { P.variant = "dawn"; P.v.reveal = 0; P.tint = { color: "#FFE6C8", a: 0.12 }; P.vig = 0.2; P.emitter({ kind: "glow", x0: 300, x1: 1300, y0: 300, y1: 500, rate: 3 }); });
    P.amb("waves", true); P.face(1);
    await P.cutscene(async () => { // CS-05 포르투 노바 도착
      await P.wait(1.4); P.sfx("gull"); await P.wait(1.2); P.sfx("gull"); P.tween(P.v, { reveal: 1 }, 4.0); P.camPan(LAY.hill.w - 640, 4.5); await P.fade(0, 3.4);
      await P.wait(0.6); await P.caption(T.cap6, 4.2); await P.camPan(560, 1.8);
      P.v.bag = true; P.pose("shrug"); await P.wait(1.4); P.pose(null); await P.wait(0.5);
      await P.say(T.last); await P.wait(1.4);
    }, { id: "cs05", skip: true, bars: true });
    if (live(P, g)) { P.frozen = true; await P.fade(1, 1.6); if (live(P, g)) P.finish(); }
  } };
})();
