/* 프롤로그 정식 그림(아트팩 변환본)을 그리는 도우미. art.js의 임시 그래픽 함수를 같은 이름으로 덮어쓰며,
   그림이 아직 로드되지 않았거나 파일이 없으면 art.js의 임시 그래픽으로 자동 대체됩니다. */
window.AU = window.AU || {};
(function () {
  const A = AU.PArt, ART = AU.PRO_ART || { ch: {}, ob: {} };
  const has = (k) => AU.Img.has(k), img = (k) => AU.Img.get(k);
  const meta = (key) => ART.ch[key.replace(/^pc_/, "")];
  const SCALE = 0.5; // 변환본은 인물 높이 300px 기준 → 게임에서 150px로 표시
  A.has = has;

  /* 시트(strip)에서 이름으로 프레임을 골라 발 위치(x,y)에 그림. k는 추가 배율. 없으면 false */
  A.spr = function (ctx, key, name, x, y, dir, k) {
    const m = meta(key); if (!m || !has(key)) return false;
    const i = Math.max(0, m.names.indexOf(name)); return AU.World.sprite(ctx, key, x, y, m.ch * SCALE * (k || 1), dir, i);
  };
  A.sprFrame = (key, name) => { const m = meta(key); return m ? Math.max(0, m.names.indexOf(name)) : 0; };
  /* 한 장짜리 그림을 바닥 가운데 기준으로 그림 */
  A.pic = function (ctx, key, x, y, h, dir, rot, alpha) {
    if (!has(key)) return false; const im = img(key), w = h * im.naturalWidth / im.naturalHeight;
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(dir < 0 ? -1 : 1, 1); if (alpha != null) ctx.globalAlpha *= alpha; ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore(); return true;
  };
  /* 중심 기준 그림 */
  A.picC = function (ctx, key, x, y, w, rot, flip) {
    if (!has(key)) return false; const im = img(key), h = w * im.naturalHeight / im.naturalWidth;
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); return true;
  };

  /* 신전: state frame/done/burn, cx=가운데, by=바닥선, w=폭, o.alpha */
  const oldTemple = A.temple;
  A.temple = function (ctx, cx, by, w, h, o) {
    o = o || {}; const key = "po_temple_" + (o.state || "done");
    if (!has(key)) return oldTemple(ctx, cx, by, w, h, o);
    const im = img(key), hh = w * im.naturalHeight / im.naturalWidth;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.glow > 0) { ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(cx, by - hh * 0.5, 20, cx, by - hh * 0.5, w * 0.8); g.addColorStop(0, "rgba(255,226,140," + (0.38 * o.glow) + ")"); g.addColorStop(1, "rgba(255,226,140,0)"); ctx.fillStyle = g; ctx.fillRect(cx - w, by - hh * 1.4, w * 2, hh * 1.6); ctx.globalCompositeOperation = "source-over"; }
    ctx.drawImage(im, cx - w / 2, by - hh, w, hh); ctx.restore();
  };
  const oldScaffold = A.scaffold; A.scaffold = function (ctx, x, by, w, h, a) { if (has("po_temple_frame")) return; oldScaffold(ctx, x, by, w, h, a); };

  const oldPlank = A.plank;
  A.plank = function (ctx, x, y, len, ang) { const k = (Math.round(y) & 1) ? "po_plank_a" : "po_plank_b"; if (!A.picC(ctx, k, x, y, len, ang || 0)) oldPlank(ctx, x, y, len, ang); };
  const oldHammer = A.hammer;
  A.hammer = function (ctx, x, y, ang, s) { s = s || 1; if (!A.picC(ctx, "po_hammer", x, y - 4 * s, 82 * s, (ang || 0) + Math.PI / 2, false)) oldHammer(ctx, x, y, ang, s); };
  const oldFrag = A.fragment;
  A.fragment = function (ctx, x, y, s, rot, t) { if (!A.picC(ctx, "po_metal_fragment_big", x, y, 150 * s, rot || 0)) oldFrag(ctx, x, y, s, rot, t); };
  const oldBag = A.bag;
  A.bag = function (ctx, x, y, s, ang) { if (!A.pic(ctx, "po_bag_floor", x, y, 74 * s, 1, ang || 0)) oldBag(ctx, x, y, s, ang); };
  A.bagBack = function (ctx, x, y, h, d, rot) { if (!has("po_bag_back")) return false; const im = img("po_bag_back"); return A.picC(ctx, "po_bag_back", x, y + h / 2, h * im.naturalWidth / im.naturalHeight, rot || 0, d < 0); };

  /* 흑철 갑옷 습격자: 서기/걷기 2프레임. s=0.5가 키 150 */
  const oldRaider = A.raider;
  A.raider = function (ctx, x, y, s, t, dir) { const f = Math.floor(t * 3) % 2 ? "walk1" : "walk2"; if (!A.spr(ctx, "pc_raider_actions", f, x, y, dir, s / 0.5)) oldRaider(ctx, x, y, s, t, dir); };

  /* 배경 그림에 이미 있는 것은 코드로 겹쳐 그리지 않음 */
  const oldPenn = A.pennants; A.pennants = function (ctx, a, b, y, s, t, o) { if (has("pb_road")) return; oldPenn(ctx, a, b, y, s, t, o); };
  const oldCity = A.city; A.city = function (ctx, x0, x1, by, t, r) { if (has("pb_port")) return; oldCity(ctx, x0, x1, by, t, r); };
  const oldCrowd = A.crowd; A.crowd = function (ctx, x0, x1, y, t, seed, n, o) { if (has("pc_villager_a_actions")) return; oldCrowd(ctx, x0, x1, y, t, seed, n, o); };
  const oldVista = A.vista; A.vista = function (ctx, t, W, H, o) { if (has("pb_fire")) { ctx.drawImage(img("pb_fire"), 0, 0, W, H);
      // 뒤돌아보는 주인공을 어둡게(실루엣처럼) 왼쪽 아래 흙길에 세움
      ctx.save(); try { ctx.filter = "brightness(.42) saturate(.7)"; } catch (e) { /* 필터 미지원이면 그대로 */ }
      A.spr(ctx, "pc_player_" + (AU.PRO_GENDER || "m") + "_actions", "lookback", 250, 604, 1, 1.5); ctx.restore(); return; } oldVista(ctx, t, W, H, o); };
})();

/* 장애물: 배경 그림의 붓 터치에 가깝게(얇은 갈색 윤곽·이끼·바닥 그림자)다시 그림. 정식 장애물 그림이 오면 이 부분만 교체합니다. */
(function () {
  const A = AU.PArt, TAU = Math.PI * 2, rr = (s) => { let x = (s >>> 0) || 1; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const shadow = (ctx, x, y, w) => { const g = ctx.createRadialGradient(x, y, 2, x, y, w * 0.62); g.addColorStop(0, "rgba(30,24,16,.45)"); g.addColorStop(1, "rgba(30,24,16,0)"); ctx.save(); ctx.translate(0, 0); ctx.scale(1, 0.22); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y / 0.22, w * 0.62, 0, TAU); ctx.fill(); ctx.restore(); };
  const OUT = "#3b2d22";
  function rock(ctx, x, y, w, h) {
    const base = y + h; shadow(ctx, x + w / 2, base - 1, w * 1.2);
    const p = [[0, 1], [0.04, 0.5], [0.2, 0.16], [0.42, 0.02], [0.72, 0.1], [0.94, 0.42], [1, 1]];
    ctx.beginPath(); p.forEach(([a, b], i) => (i ? ctx.lineTo(x + w * a, y + h * b) : ctx.moveTo(x + w * a, y + h * b))); ctx.closePath();
    const g = ctx.createLinearGradient(x, y, x + w, base); g.addColorStop(0, "#9a988f"); g.addColorStop(0.55, "#757369"); g.addColorStop(1, "#4f4d47"); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = OUT; ctx.lineJoin = "round"; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.2); ctx.lineTo(x + w * 0.45, y + h * 0.03); ctx.lineTo(x + w * 0.62, y + h * 0.3); ctx.lineTo(x + w * 0.3, y + h * 0.5); ctx.fill();
    ctx.fillStyle = "rgba(60,120,50,.8)"; ctx.beginPath(); ctx.ellipse(x + w * 0.42, y + h * 0.12, w * 0.3, h * 0.2, -0.1, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(120,170,70,.7)"; ctx.beginPath(); ctx.ellipse(x + w * 0.36, y + h * 0.08, w * 0.17, h * 0.1, -0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(40,34,28,.45)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + h * 0.4); ctx.lineTo(x + w * 0.58, y + h * 0.72); ctx.moveTo(x + w * 0.22, y + h * 0.6); ctx.lineTo(x + w * 0.3, y + h * 0.9); ctx.stroke(); ctx.restore();
  }
  function log(ctx, x, y, w, h) {
    const base = y + h, top = y + h * 0.2, hh = base - top; shadow(ctx, x + w / 2, base - 1, w * 1.15);
    const g = ctx.createLinearGradient(0, top, 0, base); g.addColorStop(0, "#8a6440"); g.addColorStop(0.5, "#6a4a2c"); g.addColorStop(1, "#4a331f");
    ctx.beginPath(); ctx.moveTo(x + hh * 0.5, top); ctx.lineTo(x + w - hh * 0.4, top); ctx.ellipse(x + w - hh * 0.4, top + hh / 2, hh * 0.38, hh / 2, 0, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + hh * 0.5, base); ctx.ellipse(x + hh * 0.5, top + hh / 2, hh * 0.38, hh / 2, 0, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = "rgba(35,22,12,.42)"; ctx.lineWidth = 1.6; const r = rr(7); for (let i = 0; i < 6; i++) { const yy = top + hh * (0.15 + r() * 0.7), a = x + w * (0.1 + r() * 0.5); ctx.beginPath(); ctx.moveTo(a, yy); ctx.lineTo(a + w * (0.15 + r() * 0.25), yy + (r() - 0.5) * 3); ctx.stroke(); }
    ctx.fillStyle = "#d9b27a"; ctx.beginPath(); ctx.ellipse(x + w - hh * 0.4, top + hh / 2, hh * 0.3, hh * 0.45, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(120,80,40,.7)"; ctx.lineWidth = 1.3; for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x + w - hh * 0.4, top + hh / 2, hh * 0.3 * k / 3, hh * 0.45 * k / 3, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = "rgba(70,130,55,.85)"; ctx.beginPath(); ctx.ellipse(x + w * 0.3, top + 3, w * 0.16, 5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + w * 0.62, top + 2, w * 0.1, 4, 0, 0, TAU); ctx.fill();
  }
  function debris(ctx, x, y, w, h, t) { // 부서진 널빤지 더미(정식 널빤지 그림 사용) + 그을림
    const base = y + h; shadow(ctx, x + w / 2, base - 1, w * 1.3);
    const L = [[0.5, 0.78, w * 1.25, -0.28, "po_plank_a"], [0.4, 0.55, w * 1.1, 0.32, "po_plank_b"], [0.62, 0.38, w * 0.95, -0.08, "po_plank_a"], [0.3, 0.88, w * 0.9, 0.05, "po_plank_b"]];
    for (const [fx, fy, len, ang, k] of L) A.picC(ctx, k, x + w * fx, y + h * fy, len, ang);
    const g = ctx.createRadialGradient(x + w / 2, y + h * 0.7, 4, x + w / 2, y + h * 0.7, w * 0.7); g.addColorStop(0, "rgba(20,12,8,.35)"); g.addColorStop(1, "rgba(20,12,8,0)"); ctx.fillStyle = g; ctx.fillRect(x - w * 0.3, y - h * 0.2, w * 1.6, h * 1.4);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const k = 0.5 + 0.5 * Math.sin(t * 6 + x); const f = ctx.createRadialGradient(x + w * 0.5, base - 6, 1, x + w * 0.5, base - 6, 22); f.addColorStop(0, "rgba(255,150,50," + (0.4 + 0.3 * k) + ")"); f.addColorStop(1, "rgba(255,120,40,0)"); ctx.fillStyle = f; ctx.fillRect(x + w * 0.5 - 24, base - 30, 48, 36); ctx.restore();
  }
  const oldObs = A.obstacle, oldStall = A.stall;
  const OBST = { rock: "po_obst_rock", log: "po_obst_log", beam: "po_obst_burnt_beams" };
  A.obstacle = function (ctx, pl, kind, t) {
    const key = OBST[kind] || OBST.beam;   // 정식 장애물 그림(바위·통나무·불탄 들보). 발판 상자(폭×높이)에 그림 비율이 맞도록 데이터 좌표를 잡아 둠
    if (A.has(key)) { const base = pl.y + (pl.h || 40); shadow(ctx, pl.x + pl.w / 2, base - 1, pl.w * 1.08); A.pic(ctx, key, pl.x + pl.w / 2, base + 1, pl.h || 40, 1); return; }
    if (!A.has("po_plank_a")) return oldObs(ctx, pl, kind, t);
    const h = pl.h || 40; ctx.save();
    if (kind === "rock") rock(ctx, pl.x, pl.y, pl.w, h); else if (kind === "log") log(ctx, pl.x, pl.y, pl.w, h); else debris(ctx, pl.x, pl.y, pl.w, h, t);
    ctx.restore();
  };
  A.stall = function (ctx, x, by, w, t) { if (!A.has("po_plank_a")) return oldStall(ctx, x, by, w, t); const o = (AU.PRO_LAY && AU.PRO_LAY.plaza.obst[0]) || { x: x - 50, y: by - 50, w: 100, h: 50 }; if (A.has("po_obst_burnt_beams")) A.obstacle(ctx, o, "beam", t); else debris(ctx, o.x, o.y, o.w, o.h, t); };

  /* ---------- 불꽃·연기 효과(2차 그림): 프레임을 돌려 가며 그림. 발 위치(x,y) 기준 ---------- */
  A.fire = function (ctx, x, y, h, t, seed) {
    if (!A.has("fx_fire")) return false; const im = AU.Img.get("fx_fire"), n = 6, fw = im.naturalWidth / n, fh = im.naturalHeight, w = h * fw / fh;
    const f = Math.floor(((t || 0) * 9 + (seed || 0) * 1.7) % n + n) % n, wob = 1 + 0.05 * Math.sin((t || 0) * 11 + (seed || 0));
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.28; const g = ctx.createRadialGradient(x, y - h * 0.4, 2, x, y - h * 0.4, h * 0.95); g.addColorStop(0, "rgba(255,170,70,1)"); g.addColorStop(1, "rgba(255,90,20,0)"); ctx.fillStyle = g; ctx.fillRect(x - h, y - h * 1.5, h * 2, h * 1.8); ctx.restore();
    ctx.drawImage(im, f * fw, 0, fw, fh, x - w * wob / 2, y - h * wob, w * wob, h * wob); return true;
  };
  A.smoke = function (ctx, x, y, h, age, alpha, seed) {   // age 0..1: 아래에서 위로 올라가며 커지고 흐려지는 연기 한 덩이
    if (!A.has("fx_smoke")) return false; const im = AU.Img.get("fx_smoke"), n = 4, fw = im.naturalWidth / n, fh = im.naturalHeight, f = Math.min(n - 1, Math.floor(age * n)), s = 0.55 + age * 0.9, hh = h * s, w = hh * fw / fh;
    ctx.save(); ctx.globalAlpha = (alpha == null ? 0.5 : alpha) * Math.sin(Math.min(1, age) * Math.PI) ; ctx.filter = "brightness(0.42) sepia(0.25)"; ctx.drawImage(im, f * fw, 0, fw, fh, x - w / 2 + Math.sin(age * 5 + (seed || 0)) * 12, y - age * h * 1.6 - hh, w, hh); ctx.restore(); return true;
  };
})();
