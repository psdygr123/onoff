/* 프롤로그 임시 그래픽(코드로 그린 그림). 정식 그림이 오기 전까지 쓰는 대체물이며, 파일 하나(이 파일)만 교체·삭제하면 됩니다.
   신전·금속 조각·습격자·도구 가방·불꽃·원경 등 '아직 그림이 없는 것'만 그립니다. 기존 배경·인물 그림은 world.js가 그대로 그립니다. */
window.AU = window.AU || {};
(function () {
  const A = AU.PArt = {};
  const TAU = Math.PI * 2, GROUND = AU.CONFIG.GROUND;
  const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const rand = (seed) => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  A.rand = rand; A.rrect = rrect;

  /* ---------- 불꽃: dark=true면 요청서의 '검은 화염'(검은 자주색 바깥 + 붉은 속) ---------- */
  A.flame = function (ctx, x, y, s, t, dark) {
    const f = 1 + Math.sin(t * 9 + x * 0.13) * 0.12, sway = Math.sin(t * 7 + x * 0.07) * 9 * s;
    const L = dark ? [["#1b1024", 1], ["#4a1522", 0.78], ["#d93a28", 0.52], ["#ff9c3f", 0.26]] : [["#c4321a", 1], ["#ff7a1f", 0.76], ["#ffc247", 0.5], ["#fff1b0", 0.24]];
    ctx.save(); ctx.translate(x, y);
    for (const [col, k] of L) {
      const w = 24 * s * k + 4 * s, h = 78 * s * k * f; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-w, 0);
      ctx.bezierCurveTo(-w * 1.15, -h * 0.4, -w * 0.2 + sway * 0.5, -h * 0.72, sway * k, -h);
      ctx.bezierCurveTo(w * 0.35 + sway * 0.3, -h * 0.62, w * 1.18, -h * 0.36, w, 0); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  /* ---------- 비계(공사용 발판 구조물) ---------- */
  A.scaffold = function (ctx, x, by, w, h, a) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round";
    const n = Math.max(2, Math.round(w / 110));
    ctx.strokeStyle = "#5b4126"; ctx.lineWidth = 9; for (let i = 0; i <= n; i++) { const px = x + w * i / n; ctx.beginPath(); ctx.moveTo(px, by); ctx.lineTo(px, by - h); ctx.stroke(); }
    ctx.strokeStyle = "#A27A47"; ctx.lineWidth = 5; for (let i = 0; i <= n; i++) { const px = x + w * i / n; ctx.beginPath(); ctx.moveTo(px, by); ctx.lineTo(px, by - h); ctx.stroke(); }
    for (const k of [0.34, 0.68, 1]) { ctx.strokeStyle = "#5b4126"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, by - h * k); ctx.lineTo(x + w, by - h * k); ctx.stroke(); ctx.strokeStyle = "#B98B4E"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, by - h * k); ctx.lineTo(x + w, by - h * k); ctx.stroke(); }
    ctx.strokeStyle = "#7A5530"; ctx.lineWidth = 4; for (let i = 0; i < n; i++) { const a0 = x + w * i / n, a1 = x + w * (i + 1) / n; ctx.beginPath(); ctx.moveTo(a0, by); ctx.lineTo(a1, by - h * 0.34); ctx.moveTo(a1, by); ctx.lineTo(a0, by - h * 0.34); ctx.stroke(); }
    ctx.fillStyle = "#C99B5C"; ctx.fillRect(x - 6, by - h * 0.68 - 3, w + 12, 8); ctx.restore();
  };

  /* ---------- 신전: state = frame(공사 중) / done(완공) / burn(불타는 중). cx=가운데, by=바닥선 ---------- */
  A.temple = function (ctx, cx, by, w, h, o) {
    o = o || {}; const st = o.state || "done", t = o.t || 0, x0 = cx - w / 2, burn = st === "burn", frame = st === "frame";
    const stone = burn ? "#6d615e" : "#F1E8D4", shade = burn ? "#41383a" : "#D2C5AB", line = burn ? "#231c1d" : "#8a7857", gold = burn ? "#6a4f2c" : "#E8B94E";
    const stepsH = 38, colH = h * 0.5, entH = h * 0.085, pedH = h * 0.2, topCol = by - stepsH - colH, topEnt = topCol - entH;
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.glow > 0) { const g = ctx.createRadialGradient(cx, by - h * 0.55, 20, cx, by - h * 0.55, w * 0.85); g.addColorStop(0, "rgba(255,226,140," + (0.55 * o.glow) + ")"); g.addColorStop(1, "rgba(255,226,140,0)"); ctx.fillStyle = g; ctx.fillRect(cx - w, by - h * 1.4, w * 2, h * 1.6); }
    if (burn) { const g = ctx.createRadialGradient(cx, by - h * 0.4, 20, cx, by - h * 0.4, w * 0.9); g.addColorStop(0, "rgba(220,60,30,.55)"); g.addColorStop(1, "rgba(220,60,30,0)"); ctx.fillStyle = g; ctx.fillRect(cx - w, by - h * 1.4, w * 2, h * 1.6); }
    ctx.lineJoin = "round"; ctx.lineWidth = 2.5; ctx.strokeStyle = line;
    for (let i = 0; i < 3; i++) { const sw = w * (1 - i * 0.045), sy = by - 13 * (i + 1); ctx.fillStyle = i % 2 ? shade : stone; ctx.fillRect(cx - sw / 2, sy, sw, 13); ctx.strokeRect(cx - sw / 2, sy, sw, 13); }
    const n = 6, cw = w * 0.052, px = (i) => x0 + w * 0.075 + i * (w * 0.85 / (n - 1));
    for (let i = 0; i < n; i++) {
      const xx = px(i), broken = burn && (i === 1 || i === 4), hh = broken ? colH * (i === 1 ? 0.55 : 0.7) : colH;
      if (frame) { if (i % 2 === 1 && !o.posts) continue; ctx.fillStyle = "#B98B4E"; ctx.fillRect(xx - cw * 0.45, by - stepsH - hh, cw * 0.9, hh); ctx.strokeStyle = "#5b4126"; ctx.strokeRect(xx - cw * 0.45, by - stepsH - hh, cw * 0.9, hh); continue; }
      ctx.fillStyle = stone; ctx.fillRect(xx - cw / 2, by - stepsH - hh, cw, hh); ctx.fillStyle = shade; ctx.fillRect(xx + cw * 0.12, by - stepsH - hh, cw * 0.38, hh); ctx.strokeStyle = line; ctx.strokeRect(xx - cw / 2, by - stepsH - hh, cw, hh);
      ctx.fillStyle = stone; ctx.fillRect(xx - cw * 0.72, by - stepsH - hh - 7, cw * 1.44, 8); ctx.strokeRect(xx - cw * 0.72, by - stepsH - hh - 7, cw * 1.44, 8);
      if (broken) { ctx.fillStyle = "#1c1618"; ctx.beginPath(); ctx.moveTo(xx - cw / 2, by - stepsH - hh); ctx.lineTo(xx - cw * 0.1, by - stepsH - hh - 12); ctx.lineTo(xx + cw * 0.2, by - stepsH - hh + 4); ctx.lineTo(xx + cw / 2, by - stepsH - hh - 8); ctx.lineTo(xx + cw / 2, by - stepsH - hh + 10); ctx.lineTo(xx - cw / 2, by - stepsH - hh + 10); ctx.fill(); }
    }
    if (frame) { // 들보: 이음새(gapX) 부분만 비어 있다가 설치하면 채워짐
      const gx = o.gapX != null ? o.gapX : cx + w * 0.12, gw = w * 0.2; ctx.fillStyle = "#B98B4E"; ctx.strokeStyle = "#5b4126"; ctx.lineWidth = 3;
      ctx.fillRect(x0 + w * 0.04, topCol - 2, gx - (x0 + w * 0.04), 16); ctx.strokeRect(x0 + w * 0.04, topCol - 2, gx - (x0 + w * 0.04), 16);
      const e2 = gx + gw; ctx.fillRect(e2, topCol - 2, x0 + w * 0.96 - e2, 16); ctx.strokeRect(e2, topCol - 2, x0 + w * 0.96 - e2, 16);
      if (o.joint) { ctx.fillStyle = "#D2A869"; ctx.fillRect(gx, topCol - 2, gw, 16); ctx.strokeRect(gx, topCol - 2, gw, 16); if (o.joint < 1) { ctx.strokeStyle = "rgba(255,240,200,.9)"; ctx.lineWidth = 3; ctx.strokeRect(gx - 2, topCol - 4, gw + 4, 20); } }
      ctx.strokeStyle = "#7A5530"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0 + w * 0.05, topCol - 2); ctx.lineTo(cx, topEnt - pedH * 0.9); ctx.lineTo(x0 + w * 0.95, topCol - 2); ctx.stroke(); ctx.restore(); return;
    }
    ctx.fillStyle = stone; ctx.strokeStyle = line; ctx.lineWidth = 2.5; ctx.fillRect(x0 + w * 0.02, topEnt, w * 0.96, entH); ctx.strokeRect(x0 + w * 0.02, topEnt, w * 0.96, entH);
    ctx.fillStyle = gold; ctx.fillRect(x0 + w * 0.02, topEnt + entH * 0.38, w * 0.96, entH * 0.22);
    ctx.fillStyle = stone; ctx.beginPath(); ctx.moveTo(x0 - w * 0.005, topEnt); ctx.lineTo(cx, topEnt - pedH);
    if (burn) { ctx.lineTo(cx + w * 0.16, topEnt - pedH * 0.55); ctx.lineTo(cx + w * 0.1, topEnt - pedH * 0.62); ctx.lineTo(cx + w * 0.26, topEnt - pedH * 0.2); ctx.lineTo(cx + w * 0.32, topEnt - pedH * 0.32); ctx.lineTo(x0 + w * 1.005 - w * 0.04, topEnt); } else ctx.lineTo(x0 + w * 1.005, topEnt);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade; ctx.beginPath(); ctx.moveTo(x0 + w * 0.1, topEnt - 4); ctx.lineTo(cx, topEnt - pedH * 0.82); ctx.lineTo(x0 + w * (burn ? 0.58 : 0.9), topEnt - 4); ctx.closePath(); ctx.globalAlpha *= 0.55; ctx.fill(); ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    const ex = cx - w * 0.06, ey = topEnt - pedH * 0.36, er = pedH * 0.24; // 빛의 문양(해)
    ctx.strokeStyle = gold; ctx.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * er * 1.2, ey + Math.sin(a) * er * 1.2); ctx.lineTo(ex + Math.cos(a) * er * 1.75, ey + Math.sin(a) * er * 1.75); ctx.stroke(); }
    ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  };

  /* ---------- 습격자: 흑철 갑옷 실루엣(소속 표시 없음). y=발 ---------- */
  A.raider = function (ctx, x, y, s, t, dir) {
    const sw = Math.sin(t * 5 + x * 0.1) * 5; ctx.save(); ctx.translate(x, y); ctx.scale(dir < 0 ? -s : s, s); ctx.lineJoin = "round";
    const body = "#15121a", edge = "#4d4757";
    ctx.fillStyle = body; ctx.strokeStyle = edge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-26, -92); ctx.lineTo(-44, 0 + sw * 0.3); ctx.lineTo(10, 0); ctx.lineTo(24, -92); ctx.closePath(); ctx.fill(); // 망토
    ctx.fillRect(-14, -52, 11, 52 - sw); ctx.fillRect(4, -52, 11, 52 + sw); ctx.strokeRect(-14, -52, 11, 52 - sw); ctx.strokeRect(4, -52, 11, 52 + sw); // 다리
    rrect(ctx, -22, -112, 44, 64, 9); ctx.fill(); ctx.stroke(); // 몸통
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 24, -106, 15, 11, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    rrect(ctx, -14, -140, 28, 32, 12); ctx.fill(); ctx.stroke(); // 투구
    ctx.fillStyle = "rgba(255,70,50,.85)"; ctx.fillRect(-9, -128, 18, 3.5); // 시야 틈
    ctx.strokeStyle = "#2c2832"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(26, -60); ctx.lineTo(40, -176); ctx.stroke(); ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, -176); ctx.lineTo(38, -196); ctx.stroke(); // 창
    ctx.restore();
  };

  /* ---------- 의문의 금속 조각(요청서 외형: 손가락 세 개 크기, 은회색 흑철, 부러진 날카로운 단면, 핏빛 가루와 검은 결, 작은 검은 물결 흠집) ---------- */
  A.fragment = function (ctx, x, y, s, rot, t) {
    t = t || 0; ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s); ctx.lineJoin = "round";
    const P = [[-52, -10], [-30, -30], [-4, -25], [18, -34], [46, -12], [54, 6], [30, 28], [8, 22], [-16, 30], [-44, 20]];
    const g = ctx.createLinearGradient(-52, -30, 40, 30); g.addColorStop(0, "#D0D4DA"); g.addColorStop(0.45, "#8E939C"); g.addColorStop(1, "#40434B");
    ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "#1c1e24"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-44, -6); ctx.lineTo(-24, -24); ctx.lineTo(-2, -20); ctx.stroke(); // 표면 광택
    ctx.beginPath(); [[18, -34], [46, -12], [54, 6], [30, 28], [8, 22], [26, -2], [12, -14]].forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = "#1a0e12"; ctx.fill(); ctx.strokeStyle = "#07050a"; ctx.lineWidth = 2; ctx.stroke(); // 부러진 단면
    ctx.lineCap = "round"; for (const [a, b, c, d, w] of [[22, -26, 34, -6, 3], [34, -8, 46, 6, 2.4], [14, 12, 28, 4, 2.4], [30, 20, 44, 8, 2], [20, -10, 30, 6, 1.8]]) { ctx.strokeStyle = "#3b0d14"; ctx.lineWidth = w + 1.5; ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2 + 4, (b + d) / 2 - 3, c, d); ctx.stroke(); ctx.strokeStyle = "#b8222c"; ctx.lineWidth = w * 0.5; ctx.stroke(); } // 검붉은 힘줄 결
    for (let i = 0; i < 9; i++) { const px = 16 + (i * 37 % 34), py = -26 + (i * 23 % 50), k = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.1); ctx.fillStyle = "rgba(235,60,60," + (0.5 + 0.5 * k) + ")"; ctx.beginPath(); ctx.arc(px, py, 1.4 + k, 0, TAU); ctx.fill(); } // 핏빛 마석 가루
    ctx.strokeStyle = "#08080b"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12, px = 4 + u * 24, py = -22 + Math.sin(u * TAU * 1.5) * 3.2 + u * 6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); // 검은 물결 흠집
    ctx.restore();
  };

  /* ---------- 작은 소품 ---------- */
  A.hammer = function (ctx, x, y, ang, s) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s || 1, s || 1); ctx.fillStyle = "#8a5a33"; rrect(ctx, -4, -6, 8, 62, 3); ctx.fill(); ctx.strokeStyle = "#4a2f18"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#7d828b"; rrect(ctx, -16, -20, 32, 18, 3); ctx.fill(); ctx.strokeStyle = "#2f3238"; ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(-13, -18, 26, 4); ctx.restore(); };
  A.plank = function (ctx, x, y, len, ang) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0); ctx.fillStyle = "#D2A869"; ctx.strokeStyle = "#6e4a25"; ctx.lineWidth = 2.5; rrect(ctx, -len / 2, -8, len, 16, 3); ctx.fill(); ctx.stroke(); ctx.strokeStyle = "rgba(110,74,37,.45)"; ctx.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-len / 2 + 8, i * 4); ctx.lineTo(len / 2 - 8, i * 4 + 1); ctx.stroke(); } ctx.fillStyle = "#EBCB93"; ctx.fillRect(len / 2 - 5, -7, 4, 14); ctx.restore(); };
  A.bag = function (ctx, x, y, s, ang) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0); ctx.scale(s || 1, s || 1); ctx.fillStyle = "#8a5a33"; ctx.strokeStyle = "#3f2812"; ctx.lineWidth = 2.5; rrect(ctx, -26, -34, 52, 38, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#a06b3d"; ctx.beginPath(); ctx.moveTo(-26, -34); ctx.lineTo(26, -34); ctx.lineTo(24, -16); ctx.lineTo(0, -10); ctx.lineTo(-24, -16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#E1B35A"; ctx.fillRect(-4, -18, 8, 10); ctx.strokeRect(-4, -18, 8, 10);
    ctx.fillStyle = "#6d4a2a"; ctx.fillRect(-18, -52, 7, 20); ctx.fillStyle = "#7d828b"; ctx.fillRect(-23, -60, 17, 9); ctx.strokeStyle = "#8a5a33"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-14, -34); ctx.quadraticCurveTo(0, -62, 14, -34); ctx.stroke(); ctx.restore(); };

  /* ---------- 축제 깃발 줄 ---------- */
  A.pennants = function (ctx, x1, x2, y, sag, t, o) {
    o = o || {}; const n = Math.max(4, Math.round((x2 - x1) / 46)), C = ["#E4A63C", "#D9695F", "#F2E3B3", "#6BA6A0", "#B98B45"], r = rand(o.seed || 7);
    ctx.save(); ctx.strokeStyle = o.burn ? "#2b2020" : "#6f5a3a"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const u = i / 24, px = x1 + (x2 - x1) * u, py = y + sag * 4 * u * (1 - u); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    for (let i = 0; i < n; i++) {
      if (o.burn && r() < 0.35) continue; const u = (i + 0.5) / n, px = x1 + (x2 - x1) * u, py = y + sag * 4 * u * (1 - u) + Math.sin(t * 2 + i) * 1.5, sw = Math.sin(t * 2.4 + i * 0.8) * 3;
      ctx.fillStyle = o.burn ? (r() < 0.5 ? "#3a2a2a" : "#7a3a22") : C[i % C.length]; ctx.beginPath(); ctx.moveTo(px - 11, py); ctx.lineTo(px + 11, py); ctx.lineTo(px + sw, py + 24); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  /* ---------- 멀리 모여 있는 주민들(성능을 위해 도형 몇 개로) ---------- */
  A.crowd = function (ctx, x0, x1, y, t, seed, n, o) {
    o = o || {}; const r = rand(seed || 3), C = ["#8C6A52", "#6E7F8C", "#A5775A", "#7C8A66", "#9A6F7A", "#C0A06C"];
    for (let i = 0; i < n; i++) {
      const px = x0 + (x1 - x0) * (i + r() * 0.8) / n, sc = 0.52 + r() * 0.22, ph = r() * 6, hop = o.cheer ? Math.abs(Math.sin(t * 5 + ph)) * 7 * o.cheer : Math.sin(t * 1.5 + ph) * 1.2, col = C[(r() * C.length) | 0];
      const py = y - hop; ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc);
      ctx.fillStyle = col; rrect(ctx, -14, -92, 28, 62, 11); ctx.fill(); ctx.fillRect(-12, -34, 10, 34); ctx.fillRect(2, -34, 10, 34);
      ctx.fillStyle = "#EBC9A4"; ctx.beginPath(); ctx.arc(0, -108, 15, 0, TAU); ctx.fill(); ctx.fillStyle = "#5a4636"; ctx.beginPath(); ctx.arc(0, -114, 15, Math.PI, 0); ctx.fill();
      if (o.cheer) { ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.lineCap = "round"; const sw = Math.sin(t * 6 + ph) * 8; ctx.beginPath(); ctx.moveTo(-14, -82); ctx.lineTo(-24 + sw, -118); ctx.moveTo(14, -82); ctx.lineTo(24 - sw, -118); ctx.stroke(); }
      ctx.restore();
    }
  };

  /* ---------- 쓰러진 노점 ---------- */
  A.stall = function (ctx, x, by, w, t) {
    ctx.save(); ctx.translate(x, by); ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "#4a2f18";
    ctx.fillStyle = "#B98B4E"; ctx.save(); ctx.rotate(-0.1); rrect(ctx, 4, -46, w - 8, 18, 3); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "#8a5a33"; ctx.save(); ctx.translate(w * 0.2, -4); ctx.rotate(-1.2); rrect(ctx, 0, -5, 54, 10, 2); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(w * 0.78, -6); ctx.rotate(0.35); rrect(ctx, 0, -5, 50, 10, 2); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "#8f3a32"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(w * 0.25, -52, w * 0.55, -30); ctx.lineTo(w * 0.9, -8); ctx.lineTo(w * 0.7, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); // 찢어진 천막
    ctx.fillStyle = "rgba(20,10,10,.45)"; ctx.beginPath(); ctx.moveTo(w * 0.35, -14); ctx.lineTo(w * 0.55, -30); ctx.lineTo(w * 0.62, -10); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? "#C9893C" : "#B33A32"; ctx.beginPath(); ctx.arc(-10 + i * (w + 20) / 7, -6 - (i % 3) * 3, 7, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  /* ---------- 탈출로 장애물(플랫폼 사각형을 그림으로 채움) ---------- */
  A.obstacle = function (ctx, pl, kind, t) {
    const x = pl.x, y = pl.y, w = pl.w, h = pl.h || 40; ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = 3;
    if (kind === "rock") { ctx.fillStyle = "#6c6a66"; ctx.strokeStyle = "#2c2a29"; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.08, y + h * 0.35); ctx.lineTo(x + w * 0.35, y); ctx.lineTo(x + w * 0.7, y + h * 0.12); ctx.lineTo(x + w * 0.95, y + h * 0.5); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.4); ctx.lineTo(x + w * 0.38, y + 6); ctx.lineTo(x + w * 0.6, y + h * 0.15); ctx.lineTo(x + w * 0.4, y + h * 0.5); ctx.fill(); }
    else if (kind === "log") { ctx.fillStyle = "#6e4a2a"; ctx.strokeStyle = "#2f1e10"; rrect(ctx, x, y + h * 0.15, w, h * 0.85, h * 0.4); ctx.fill(); ctx.stroke(); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 8, y + h * (0.3 + i * 0.16)); ctx.lineTo(x + w - 8, y + h * (0.3 + i * 0.16)); ctx.stroke(); } ctx.fillStyle = "#C79A5E"; ctx.beginPath(); ctx.ellipse(x + 6, y + h * 0.58, h * 0.16, h * 0.4, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = "#2a2322"; ctx.strokeStyle = "#0e0b0b"; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(x + w * (0.2 + i * 0.3), y + h); ctx.rotate(-0.5 + i * 0.5); rrect(ctx, -8, -h * 1.05, 16, h * 1.05, 3); ctx.fill(); ctx.stroke(); ctx.restore(); } ctx.fillStyle = "#3a2f2c"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 4, w * 0.5, 10, 0, 0, TAU); ctx.fill(); const k = 0.5 + 0.5 * Math.sin(t * 6 + x); ctx.fillStyle = "rgba(255,110,40," + (0.35 + 0.35 * k) + ")"; ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h - 6, w * 0.3, 6, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  /* ---------- 마지막 조망: 멀리 불타는 아르케아(전체 화면 한 컷) ---------- */
  A.vista = function (ctx, t, W, H, o) {
    o = o || {}; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#080b20"); g.addColorStop(0.45, "#251a3a"); g.addColorStop(0.7, "#6b2a2e"); g.addColorStop(0.82, "#c4562a"); g.addColorStop(1, "#1a1016"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = rand(11); ctx.fillStyle = "#fff"; for (let i = 0; i < 70; i++) { const sx = r() * W, sy = r() * H * 0.5, k = 0.4 + 0.6 * Math.sin(t * 2 + i); ctx.globalAlpha = 0.25 + 0.35 * k; ctx.fillRect(sx, sy, 2, 2); } ctx.globalAlpha = 1;
    const ridge = (col, base, amp, seed) => { const rr = rand(seed); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); let yy = base; for (let x = 0; x <= W; x += 40) { yy = base + Math.sin(x * 0.006 + seed) * amp + (rr() - 0.5) * amp * 0.5; ctx.lineTo(x, yy); } ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); };
    ridge("#2c1d33", 470, 34, 3); ridge("#1d1426", 505, 26, 8);
    const vx = 700, vy = 520; const glow = ctx.createRadialGradient(vx, vy - 30, 10, vx, vy - 30, 330); glow.addColorStop(0, "rgba(255,130,50,.75)"); glow.addColorStop(1, "rgba(255,90,30,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 160, W, 520);
    for (let i = 0; i < 9; i++) { const hx = vx - 200 + i * 52 + (i % 2) * 10, hh = 20 + (i * 13 % 14); ctx.fillStyle = "#17111c"; ctx.fillRect(hx, vy - hh, 30, hh); ctx.beginPath(); ctx.moveTo(hx - 4, vy - hh); ctx.lineTo(hx + 15, vy - hh - 16); ctx.lineTo(hx + 34, vy - hh); ctx.fill(); ctx.fillStyle = "rgba(255,170,70,.9)"; ctx.fillRect(hx + 10, vy - hh + 6, 7, 6); A.flame(ctx, hx + 15, vy - hh - 8, 0.45, t + i, i % 3 === 0); }
    A.temple(ctx, vx + 40, vy, 170, 120, { state: "burn", t }); A.flame(ctx, vx + 10, vy - 100, 0.8, t, true); A.flame(ctx, vx + 70, vy - 90, 0.7, t + 1, true);
    for (let k = 0; k < 6; k++) { const px = vx + 20 + Math.sin(t * 0.3 + k) * 40 + k * 26, py = vy - 120 - k * 70, rad = 40 + k * 16; const sg = ctx.createRadialGradient(px, py, 4, px, py, rad); sg.addColorStop(0, "rgba(20,14,20,.55)"); sg.addColorStop(1, "rgba(20,14,20,0)"); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#ff9a40"; for (let i = 0; i < 30; i++) { const ex = vx - 120 + (i * 53 % 300) + Math.sin(t + i) * 12, ey = vy - ((t * 40 + i * 37) % 260) - 30; ctx.globalAlpha = 0.8 * (1 - (vy - ey) / 300); ctx.fillRect(ex, ey, 2, 2); } ctx.globalAlpha = 1;
    ctx.fillStyle = "#0b0810"; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 600); ctx.quadraticCurveTo(300, 560, 520, 640); ctx.lineTo(620, H); ctx.closePath(); ctx.fill();
    const hx = 250, hy = 604, bob = Math.sin(t * 1.4) * 1.5; ctx.fillStyle = "#090709"; ctx.save(); ctx.translate(hx, hy + bob); ctx.beginPath(); ctx.arc(0, -134, 17, 0, TAU); ctx.fill(); rrect(ctx, -23, -120, 46, 72, 16); ctx.fill(); ctx.fillRect(-18, -52, 15, 52); ctx.fillRect(3, -52, 15, 52); ctx.fillStyle = "#1c120b"; rrect(ctx, -34, -112, 20, 38, 6); ctx.fill(); ctx.strokeStyle = "rgba(255,150,70,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -134, 17, -1.2, 0.4); ctx.stroke(); ctx.restore();
  };

  /* ---------- 항구 도시 원경(성벽·탑·등대·건물 실루엣). reveal 0..1 ---------- */
  A.city = function (ctx, x0, x1, by, t, reveal) {
    ctx.save(); ctx.globalAlpha = reveal; const r = rand(21), col = "#5b4a5e", col2 = "#7a6070";
    ctx.fillStyle = col2; for (let x = x0; x < x1; x += 34) { const hh = 26 + r() * 44; ctx.fillRect(x, by - 52 - hh, 28, hh + 6); if (r() < 0.45) { ctx.beginPath(); ctx.moveTo(x - 3, by - 52 - hh); ctx.lineTo(x + 14, by - 70 - hh); ctx.lineTo(x + 31, by - 52 - hh); ctx.fill(); } ctx.fillStyle = "rgba(255,214,140,.8)"; ctx.fillRect(x + 8, by - 40 - hh * 0.5, 5, 6); ctx.fillStyle = col2; }
    ctx.fillStyle = col; ctx.fillRect(x0, by - 52, x1 - x0, 54); for (let x = x0; x < x1; x += 22) ctx.fillRect(x, by - 62, 12, 11);
    for (let i = 0; i < 5; i++) { const tx = x0 + (x1 - x0) * (i + 0.5) / 5, th = 88 + (i % 2) * 34; ctx.fillStyle = col; ctx.fillRect(tx - 18, by - 52 - th, 36, th + 52); for (let k = -1; k <= 1; k++) ctx.fillRect(tx + k * 14 - 5, by - 62 - th, 10, 11); ctx.beginPath(); ctx.moveTo(tx - 24, by - 52 - th); ctx.lineTo(tx, by - 92 - th); ctx.lineTo(tx + 24, by - 52 - th); ctx.fill(); ctx.fillStyle = "rgba(255,200,120,.85)"; ctx.fillRect(tx - 3, by - 40 - th * 0.6, 6, 10); }
    ctx.restore();
  };
  A.gull = function (ctx, x, y, s, t) { const f = Math.sin(t * 7 + x) * 7 * s; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - 16 * s, y - f); ctx.quadraticCurveTo(x - 7 * s, y - 9 * s, x, y); ctx.quadraticCurveTo(x + 7 * s, y - 9 * s, x + 16 * s, y - f); ctx.stroke(); };
})();
