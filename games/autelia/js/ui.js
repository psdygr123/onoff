/* 화면(UI): HUD, 알림, 대화창, 메뉴 창(인벤토리·장비·스탯·월드맵·퀘스트·스킬·일지·키 설정), 일시정지 메뉴, 개발 테스트 패널.
   규칙 계산은 AU.G(systems.js)가 하고, 여기서는 보여 주고 버튼 입력만 전달합니다. */
window.AU = window.AU || {};
(function () {
  const C = AU.CONFIG;
  const $ = (s, r) => (r || document).querySelector(s);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v; else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
    return el;
  }
  const btn = (label, cls, fn, extra) => h("button", Object.assign({ type: "button", class: "btn " + (cls || ""), onclick: fn }, extra || {}), label);
  const WIN_KEYS = { inventory: "inventory", equipment: "equipment", stats: "stats", worldmap: "worldmap", quests: "quests", skills: "skills", journal: "journal", help: "help", keysettings: "keysettings" };
  const WIN_TITLE = { inventory: "인벤토리", equipment: "장비", stats: "스탯", worldmap: "월드맵", quests: "퀘스트", skills: "스킬", journal: "모험일지", gallery: "나만의 공간", help: "기능 안내", keysettings: "설정 (소리·키보드)", menu: "메뉴", jobcard: "전직", shop: "상점", dev: "개발 테스트" };

  /* ---------- 키 이름 표시 ---------- */
  AU.keyLabel = function (code) {
    const m = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Space: "Space", AltLeft: "Alt", AltRight: "Alt(우)", ControlLeft: "Ctrl", ControlRight: "Ctrl(우)", ShiftLeft: "Shift", ShiftRight: "Shift(우)",
      Backslash: "₩ / \\", IntlYen: "₩", Enter: "Enter", Backspace: "Backspace", Tab: "Tab", Escape: "Esc", Minus: "-", Equal: "=", Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'", BracketLeft: "[", BracketRight: "]", Backquote: "`" };
    if (m[code]) return m[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad\d$/.test(code)) return "숫자패드 " + code.slice(6);
    return code;
  };
  const FATIGUE_TIP = "피로도: 스킬을 쓸 때마다 쌓이는 수치입니다(마나와 반대로 0에서 시작해 늘어납니다). 가득 차면 스킬을 쓸 수 없지만 기본 공격은 언제나 쓸 수 있습니다. 쉼 현실 미션이나 은화로 휴식하면 줄어들고, 매주 월요일에 풀립니다.";
  const proofLabel = (e) => (e && e.supplementary ? "인증 완료" : "자기보고 완료");   // 완료 기록의 인증 등급(인증하면 보상 전액)
  const keyOf = (actionId) => AU.keyLabel(AU.Input.bindings[actionId]);

  const UI = AU.UI = {
    h, btn,
    cur: null, curName: null, dialog: null, pending: { STR: 0, VIT: 0, AGI: 0, DEX: 0, WIL: 0 }, afterDialog: [], listening: null, tab: {}, selected: {},
    anyOpen() { return !!(this.cur || this.dialog || this.modal); },

    /* ============ 기본 틀 ============ */
    init() {
      this.root = $("#ui"); this.hud = {};
      this.buildHud();
      AU.Ev.on("toast", (t) => this.toast(t.text, t.kind));
      AU.Ev.on("fatigue", (e) => this.fatigueDelta(e)); // 피로도가 바뀔 때 막대 옆에 +N / −N 표시
      AU.Ev.on("changed", () => { this.updateHud(true); if (this.cur && this.curName !== "keysettings" && this.curName !== "dev") this.renderWin(); });
      AU.Ev.on("levelup", (d) => this.levelBanner(d.level));
      AU.Ev.on("jobchange", () => { this.afterDialog.push("jobcard"); if (!this.dialog) this.flushAfter(); });
      AU.Ev.on("saved", (d) => this.savedFlash(d.reason));
      AU.Ev.on("mapchange", (d) => { if (!AU.MAPS[d.id].prologue) this.mapBanner(AU.MAPS[d.id].name); });
      AU.Ev.on("dead", () => this.toast("쓰러졌습니다…", "warn"));
    },
    el(sel) { return $(sel, this.root); },

    /* ============ HUD ============ */
    buildHud() {
      const R = this.root;
      R.innerHTML = "";
      // 하단 중앙: 캐릭터 상태(레벨·직업·HP·피로도·경험치)
      const hp = h("div", { class: "bar hp" }, h("i"), h("b")), rs = h("div", { class: "bar rs" }, h("i"), h("b")), ex = h("div", { class: "bar ex" }, h("i"), h("b"));
      this.hud.lv = h("div", { class: "lvbadge" }); this.hud.job = h("div", { class: "jobname" });
      const panel = h("div", { id: "hudpanel", class: "panel hudpanel" }, h("div", { class: "hudmain" }, h("div", { class: "hudhead" }, this.hud.lv, this.hud.job), h("div", { class: "hudbars" }, hp, rs)), ex);
      this.hud.hp = hp; this.hud.rs = rs; this.hud.ex = ex;
      rs.title = FATIGUE_TIP; rs.style.cursor = "help"; this.hud.rsDelta = h("span", { class: "fdelta" }); rs.append(this.hud.rsDelta);
      // 좌측 상단: 미니맵 + 현재 퀘스트
      this.hud.mapLabel = h("div", { class: "minilabel" });
      this.hud.mini = h("canvas", { class: "minicv", width: 428, height: 150, title: "클릭하면 월드맵" });
      this.hud.miniBox = h("div", { class: "panel minimap", onclick: () => this.toggleWin("worldmap") }, this.hud.mapLabel, this.hud.mini);
      this.hud.trackBody = h("div", { class: "tbody" });
      this.hud.trackFold = h("button", { class: "tfold", type: "button", title: "접기/펴기", onclick: (e) => { e.stopPropagation(); this.setTrackFold(!this.hud.tracker.classList.contains("fold")); } }, "▾");
      this.hud.trackHead = h("div", { class: "thead", title: "끌어서 위치를 옮길 수 있어요" }, h("span", { class: "tgrip" }, "⋮⋮"), h("span", { class: "tname" }, "목표"), this.hud.trackFold);
      this.hud.tracker = h("div", { class: "tracker panel" }, this.hud.trackHead, this.hud.trackBody);
      this.initTrackerDrag();
      this.hud.keyhint = h("div", { class: "keyhint" });
      const topleft = h("div", { class: "topleft" }, this.hud.miniBox, this.hud.tracker);
      this.hud.menuBtn = btn("메뉴", "menubtn", () => this.toggleMenu(), { title: "메뉴 (Esc)" });
      this.hud.menuBtn.append(h("span", { class: "dot", id: "menudot" }));
      // 우측 하단: 스킬 슬롯
      this.hud.quick = [["potion", "물약"], ["scroll", "귀환"]].map(([k, n]) => h("div", { class: "slot quick", onclick: () => AU.World.onAction(k) }, h("div", { class: "sk", text: n }), h("div", { class: "skey" }), h("div", { class: "scost" })));
      this.hud.slots = [0, 1, 2].map((i) => h("div", { class: "slot", onclick: () => AU.World.onAction("skill" + (i + 1)) }, h("div", { class: "sk" }), h("div", { class: "sc" }), h("div", { class: "skey" }), h("div", { class: "scost" })));
      this.hud.prompt = h("div", { class: "prompt" });
      this.hud.mapName = h("div", { class: "mapname" });
      this.hud.toasts = h("div", { class: "toasts" });
      this.hud.save = h("div", { class: "savedflash" });
      this.hud.banner = h("div", { class: "banner" });
      this.hud.warn = h("div", { class: "storewarn" });
      this.hud.devBtn = btn("개발", "devbtn", () => this.toggleWin("dev"), { title: "개발 테스트 (F2)" });
      this.hud.dashEl = h("div", { class: "slot quick", title: "이동기: 최대 3번 충전, 10초마다 1번 충전", onclick: () => AU.World.onAction("dash") }, h("div", { class: "sk", text: "이동기" }), h("div", { class: "skey" }), h("div", { class: "scost" }));
      R.append(this.hud.keyhint, panel, topleft, this.hud.menuBtn, h("div", { class: "slots" }, [...this.hud.quick, this.hud.dashEl, ...this.hud.slots]), this.hud.prompt, this.hud.mapName, this.hud.toasts, this.hud.save, this.hud.banner, this.hud.warn, this.hud.devBtn);
      this.hud.cache = {};
      this.winEl = h("div", { class: "winwrap hidden" }); this.dlgEl = h("div", { class: "dialog hidden" }); this.modalEl = h("div", { class: "modalwrap hidden" });
      this.cutEl = h("div", { class: "cutlayer" });   // 조사 장면용 전체 화면 컷 그림(대화창 바로 아래)
      R.append(this.winEl, this.cutEl, this.dlgEl, this.modalEl);
    },
    // 미니맵: 지형·포털·NPC·몬스터·플레이어와 현재 화면 범위를 작게 그림
    drawMini() {
      const cv = this.hud.mini, c = cv.getContext("2d"), W = AU.World, m = W.map, p = W.player; if (!m) return;
      const cw = cv.width, ch = cv.height, sx = cw / m.width, s = ch / C.H, mw = cw, mh = ch, ox = 0, oy = 0; // 지도는 상자 전체를 채우도록 가로·세로를 따로 맞춤
      const X = (x) => x * sx, Y = (y) => y * s;
      c.clearRect(0, 0, cw, ch);
      // 일러스트 지도: 이 지역의 배경 그림을 작게 줄여 바탕으로 쓰고, 그 위에 출입구·NPC·몬스터·내 위치를 표시
      c.save(); c.beginPath(); c.rect(ox, oy, mw, mh); c.clip();
      const bg = this.miniBg(m); if (bg) { c.drawImage(bg, ox, oy, mw, mh); c.fillStyle = "rgba(15,22,34,.22)"; c.fillRect(ox, oy, mw, mh); }
      else { c.fillStyle = m.safe ? "rgba(79,125,110,.55)" : "rgba(185,139,69,.5)"; c.fillRect(ox, oy, mw, mh); }
      c.restore();
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.5; c.strokeRect(X(W.camX), oy + .75, C.W * sx, mh - 1.5); // 지금 화면에 보이는 범위
      const dot = (x, y, col, r) => { c.fillStyle = col; c.strokeStyle = "rgba(20,28,40,.85)"; c.lineWidth = 1.5; c.beginPath(); c.arc(X(x), Y(y), r, 0, 7); c.fill(); c.stroke(); };
      for (const pt of m.portals || []) { c.fillStyle = "#FFFFFF"; c.strokeStyle = "rgba(20,28,40,.85)"; c.lineWidth = 1.5; const px = X(pt.x), py = Y(C.GROUND - 40); c.beginPath(); c.moveTo(px, py - 12); c.lineTo(px + 9, py + 4); c.lineTo(px - 9, py + 4); c.closePath(); c.fill(); c.stroke(); }
      for (const n of m.npcs || []) { // 의뢰가 있는 NPC는 종류별로: 메인 금색 ★ / 서브 파란 !
        const qm = AU.npcQuestMark(n.id);
        if (!qm) { dot(n.x, C.GROUND - 40, "#E9E4D6", 5); continue; }
        dot(n.x, C.GROUND - 40, AU.QKIND[qm.kind].color, 9);
        c.font = "700 12px 'Noto Sans KR', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#FFFFFF"; c.fillText(qm.mark, X(n.x), Y(C.GROUND - 40) + 1); c.textBaseline = "alphabetic";
      }
      for (const q of W.monsters) if (q.alive) dot(q.x, q.y - 20, q.d.boss ? "#B070E8" : "#E9776D", q.d.boss ? 8 : 5);
      c.strokeStyle = "#fff"; c.lineWidth = 3; c.fillStyle = "#4AA3FF"; c.beginPath(); c.arc(X(p.x), Y(p.y - 40), 7, 0, 7); c.fill(); c.stroke();
    },
    miniBg(m) { // 배경 그림을 지도 크기로 한 번만 줄여 둠(프레임마다 큰 그림을 줄이지 않도록)
      const k = m.bg; if (!k || !AU.Img.has(k)) return null; this._miniBg = this._miniBg || {};
      if (!this._miniBg[k]) { const im = AU.Img.get(k), cv = document.createElement("canvas"); cv.width = 428; cv.height = 150; cv.getContext("2d").drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, 0, 0, 428, 150); this._miniBg[k] = cv; }
      return this._miniBg[k];
    },
    setText(el, key, v) { if (this.hud.cache[key] !== v) { this.hud.cache[key] = v; el.textContent = v; } },
    setStyle(el, key, prop, v) { const k = key + prop; if (this.hud.cache[k] !== v) { this.hud.cache[k] = v; el.style[prop] = v; } },
    fatigueDelta(e) {
      const el = this.hud && this.hud.rsDelta; if (!el || !e || !e.delta) return;
      el.textContent = (e.delta > 0 ? "+" : "−") + Math.abs(e.delta); el.className = "fdelta show " + (e.delta > 0 ? "up" : "down");
      clearTimeout(this._fdT); this._fdT = setTimeout(() => { el.className = "fdelta"; }, 1800);
    },
    updateHud() {
      const S = AU.G.S, d = AU.G.d(), W = AU.World, p = W.player;
      this.setText(this.hud.lv, "lv", "Lv." + S.level); this.setText(this.hud.job, "job", AU.jobName(S));
      const hpv = Math.max(0, Math.ceil(S.hp));
      this.setStyle(this.hud.hp.firstChild, "hp", "width", Math.max(0, Math.min(100, S.hp / d.maxHp * 100)).toFixed(1) + "%"); this.setText(this.hud.hp.lastChild, "hpt", "HP " + hpv + " / " + d.maxHp);
      this.setStyle(this.hud.rs.firstChild, "rs", "width", (S.fatigue / S.fatigueMax * 100).toFixed(1) + "%"); this.setText(this.hud.rs.children[1], "rst", C.fatigue.name + " " + (+S.fatigue.toFixed(1)) + " / " + S.fatigueMax);
      this.hud.rs.classList.toggle("full", S.fatigue >= S.fatigueMax - 1e-6); { const pc = S.fatigue / S.fatigueMax; this.hud.rs.classList.toggle("mid", pc >= 0.5 && pc < 0.8); this.hud.rs.classList.toggle("hot", pc >= 0.8); }
      const need = AU.expToNext(S.level), atCap = S.level >= AU.levelCap(S);
      this.setStyle(this.hud.ex.firstChild, "ex", "width", (atCap && !S.jobChanged ? 100 : Math.min(100, S.exp / need * 100)).toFixed(1) + "%");
      this.setText(this.hud.ex.lastChild, "ext", atCap && !S.jobChanged ? "EXP 최대 레벨" : "EXP " + S.exp + " / " + need + " (" + (S.exp / need * 100).toFixed(1) + "%)");
      this.hud.quick.forEach((el, i) => { const k = i ? "scroll" : "potion", n = i ? AU.G.count("town_scroll") : Object.keys(S.inv).filter((x) => AU.ITEMS[x] && AU.ITEMS[x].type === "use" && AU.ITEMS[x].heal).reduce((a, x) => a + S.inv[x], 0);
        this.setText(el.querySelector(".skey"), "qkey" + i, keyOf(k)); this.setText(el.querySelector(".scost"), "qn" + i, "×" + n); el.classList.toggle("empty", n < 1); });
      { const D = AU.CONFIG.dash, el = this.hud.dashEl, un = S.level >= D.level;
        this.setText(el.querySelector(".skey"), "dkey", keyOf("dash"));
        this.setText(el.querySelector(".scost"), "dn", un ? "●".repeat(p.dashN) + "○".repeat(D.max - p.dashN) + (p.dashN < D.max ? " " + Math.ceil(D.recharge - p.dashRt) + "s" : "") : "Lv." + D.level);
        el.classList.toggle("empty", !un || p.dashN < 1); }
      // 스킬 슬롯
      this.hud.slots.forEach((el, i) => {
        const id = S.skills.slots[i], sk = id && AU.SKILLS[id], cd = id ? (p.cd[id] || 0) : 0;
        this.setText(el.querySelector(".sk"), "sk" + i, sk ? sk.name.replace(" (임시)", "") : (AU.G.awakened() ? "빈 슬롯" : "잠김"));
        this.setText(el.querySelector(".skey"), "skey" + i, keyOf("skill" + (i + 1)));
        this.setText(el.querySelector(".scost"), "scost" + i, sk ? String(AU.G.skillCost(id)) : "");
        this.setText(el.querySelector(".sc"), "sc" + i, cd > 0.05 ? cd.toFixed(1) : "");
        el.classList.toggle("empty", !sk); el.classList.toggle("cool", cd > 0.05); el.classList.toggle("low", !!sk && !AU.G.canSpend(id));
      });
      // 메뉴 버튼 알림점(분배 가능 포인트)
      const dot = $("#menudot"); if (dot) dot.style.display = AU.G.pool() > 0 ? "block" : "none";
      this.hud.devBtn.style.display = this.devVisible ? "" : "none";
      this.updateTracker(); this.updateKeyHint(); this.drawMini(); this.setText(this.hud.mapLabel, "ml", W.map ? W.map.name.replace(" (임시 명칭)", "") : "");
      const pr = this.anyOpen() ? "" : W.prompt;
      this.setText(this.hud.prompt, "prompt", pr.replace(/^Space/, keyOf("interact")).replace("↑ 이동", AU.keyLabel(AU.Input.bindings.up) + " 이동")); this.hud.prompt.style.display = pr ? "block" : "none";
      this.hud.warn.style.display = AU.Store.persistent ? "none" : "block";
      if (!AU.Store.persistent) this.hud.warn.textContent = "브라우저 저장이 막혀 있습니다. 이번 접속 동안만 기록이 유지됩니다.";
    },
    /* ---- 퀘스트 추적창: 진행 중인 퀘스트 최대 3개 + 각 퀘스트의 이동 안내, 퀘스트가 없을 때는 '다음 목표' ---- */
    areaName(id) { return AU.MAPS[id] ? AU.MAPS[id].name.replace(" (임시 명칭)", "") : ""; },
    npcMap(npcId) { return Object.keys(AU.MAPS).find((k) => !AU.MAPS[k].hidden && (AU.MAPS[k].npcs || []).some((n) => n.id === npcId)) || null; },
    route(from, to) { // 지역 연결(AREA_LINKS)을 따라 가는 다음 지역(없으면 null)
      if (from === to) return null; const prev = { [from]: null }, qu = [from];
      while (qu.length) { const c = qu.shift(); for (const [a, b] of AU.AREA_LINKS) { const n = a === c ? b : (b === c ? a : null); if (n && !(n in prev)) { prev[n] = c; qu.push(n); } } }
      if (!(to in prev)) return null; let n = to; while (prev[n] !== from) n = prev[n]; return n;
    },
    // 현재 위치에서 목표 지역·NPC까지의 방향 한 줄. 반환: 문장(없으면 "")
    dirText(targetMap, npcId) {
      const W = AU.World, m = W.map, p = W.player; if (!m || !p || !targetMap) return "";
      if (targetMap === W.mapId) {
        if (npcId) { const n = (m.npcs || []).find((x) => x.id === npcId); if (n) { const d = n.x - p.x; return Math.abs(d) < 160 ? "바로 근처에 있어요" : (d > 0 ? "▶ 오른쪽으로 가세요" : "◀ 왼쪽으로 가세요"); } }
        return m.hint || "이 지역에서 진행하세요";
      }
      const hop = this.route(W.mapId, targetMap); if (!hop) return "";
      const pt = (m.portals || []).find((x) => x.to === hop); if (!pt) return "";
      return this.areaName(targetMap) + " 방향: " + (pt.x > p.x ? "▶ 오른쪽" : "◀ 왼쪽") + ((pt.x < 300 || pt.x > m.width - 300) ? " 끝의 '" : "의 '") + pt.label + "' 쪽으로";
    },
    questGuide(id) {
      const q = AU.QUESTS[id], rec = AU.G.S.quests[id]; if (!q || !rec) return "";
      if (rec.state === "ready") { const tn = q.turnIn || q.giver, mp = this.npcMap(tn); return mp ? this.dirText(mp, tn) : ""; }
      const o = q.objectives.find((x, i) => !AU.G.objectiveDone(q, rec, i)); if (!o) return "";
      if (o.kind === "talk" || o.kind === "deliver" || o.kind === "choice") { const mp = this.npcMap(o.target); return this.dirText(mp, o.target); }
      return q.area ? this.dirText(q.area, null) : "";
    },
    /* 지금 가야 할 지역(메인 우선): 보고 대기 > 진행 중 목표 지역 > 새 의뢰 NPC가 있는 지역. 포털 강조에 사용 */
    guideMap() {
      const S = AU.G.S, rank = (id) => (AU.questKind(id) === "main" ? 0 : 1);
      const act = Object.entries(S.quests).filter(([, r]) => r.state === "active" || r.state === "ready").sort((a, b) => rank(a[0]) - rank(b[0]))[0];
      if (act) { const q = AU.QUESTS[act[0]]; if (!q) return null; if (act[1].state === "ready") return this.npcMap(q.turnIn || q.giver);
        const o = q.objectives.find((x, i) => !AU.G.objectiveDone(q, act[1], i)); if (o && (o.kind === "talk" || o.kind === "deliver" || o.kind === "choice")) return this.npcMap(o.target); return q.area || null; }
      const av = Object.keys(AU.QUESTS).filter((id) => AU.G.questStatus(id) === "available").sort((x, y) => rank(x) - rank(y))[0];
      return av ? this.npcMap(AU.QUESTS[av].giver) : null;
    },
    guidePortal() { // 이 맵에서 안내 대상 지역으로 가는 다음 포털(없으면 null). 0.4초마다만 다시 계산
      const W = AU.World, t = performance.now(); if (this._gp && this._gp.k === W.mapId + "|" + AU.G.S.level && t - this._gp.t < 400) return this._gp.v;
      let v = null; const to = AU.Prologue && AU.Prologue.on ? null : this.guideMap();
      if (to && W.map && to !== W.mapId) { const hop = this.route(W.mapId, to); v = hop ? (W.map.portals || []).find((x) => x.to === hop && !x.lock) || null : null; }
      this._gp = { k: W.mapId + "|" + AU.G.S.level, t, v }; return v;
    },
    nextGoals() { // 진행 중인 퀘스트가 모자랄 때 알려 주는 다음 목표(최대 2줄)
      const S = AU.G.S, out = [];
      { const av = Object.keys(AU.QUESTS).filter((id) => AU.G.questStatus(id) === "available").sort((x, y) => (AU.questKind(x) === "main" ? 0 : 1) - (AU.questKind(y) === "main" ? 0 : 1))[0];
        if (av) { const q = AU.QUESTS[av], mp = this.npcMap(q.giver), dir = mp ? this.dirText(mp, q.giver) : "";
          out.push(AU.QKIND[AU.questKind(av)].icon + " 새 의뢰: " + q.title.replace(" (임시)", "") + " — " + AU.NPCS[q.giver].name.replace(" (임시)", "") + (mp ? " (" + this.areaName(mp) + ")" : "") + (dir ? "\n" + dir : "")); } }
      if (out.length < 2) { const lockedLv = Object.keys(AU.QUESTS).map((id) => [id, AU.QUESTS[id]]).filter(([id, q]) => !S.quests[id] && q.pre.every((x) => AU.G.questStatus(x) === "done") && S.level < q.minLevel && id !== "q_job").sort((a, b) => a[1].minLevel - b[1].minLevel)[0];
        if (lockedLv) out.push("Lv." + lockedLv[1].minLevel + "이 되면 새 의뢰: " + lockedLv[1].title.replace(" (임시)", "")); }
      if (out.length < 2 && !AU.G.awakened() && S.level < 10) out.push("Lv.10까지 레벨을 올리세요 (지금 Lv." + S.level + ") — 사냥터: 뱀길·멧돼지 숲·선창 외곽");
      return out.slice(0, 2);
    },
    updateTracker() {
      const S = AU.G.S, T = this.hud.tracker, t = this.hud.trackBody, PR = AU.Prologue;
      const list = Object.entries(S.quests).filter(([, r]) => r.state === "active" || r.state === "ready").sort((a, b) => (AU.QUESTS[a[0]].type === "main" ? 0 : 1) - (AU.QUESTS[b[0]].type === "main" ? 0 : 1));
      const picks = this.anyOpen() || (PR && PR.on) ? [] : list.slice(0, 3);
      const goals = picks.length < 1 && !this.anyOpen() && !(PR && PR.on) ? this.nextGoals() : [];
      const reals = !this.anyOpen() && !(PR && PR.on) && S.flags.missionsUnlocked ? AU.G.activeMissionsByDue() : [];
      if (!picks.length && !goals.length && !reals.length) { T.style.display = "none"; this.hud.cache.trk = null; this._trkDirs = []; return; }
      const key = picks.map(([id, r]) => id + AU.questKind(id) + r.state + JSON.stringify(r.prog)).join("|") + "|" + AU.G.count("fur") + "|" + goals.join("/") + "|" + reals.map((m) => m.id + AU.G.ms(m.id).dueDate + AU.G.ms(m.id).state).join(",") + AU.dateStr();
      if (this.hud.cache.trk !== key) {
        this.hud.cache.trk = key; t.innerHTML = ""; this._trkDirs = []; for (const k of Object.keys(this.hud.cache)) if (k.indexOf("trkd") === 0) delete this.hud.cache[k];
        picks.forEach(([id, rec]) => {
          const q = AU.QUESTS[id], qk = AU.questKind(id); const box = h("div", { class: "tq qk-" + qk }); box.append(h("div", { class: "tt" }, h("span", { class: "qki", text: AU.QKIND[qk].icon }), h("span", { class: "qkl", text: AU.QKIND[qk].label }), q.title.replace(" (임시)", "")));
          if (rec.state === "ready") box.append(h("div", { class: "to ok" }, ((q.turnIn && q.turnIn !== q.giver) ? "보고하러 가기: " : "의뢰인에게 돌아가기: ") + AU.NPCS[q.turnIn || q.giver].name.replace(" (임시)", "")));
          else q.objectives.forEach((o, i) => box.append(h("div", { class: "to" + (AU.G.objectiveDone(q, rec, i) ? " ok" : "") }, this.objText(o, rec, i))));
          const dir = h("div", { class: "td" }); box.append(dir); this._trkDirs.push({ el: dir, id }); t.append(box);
        });
        if (reals.length) {
          const box = h("div", { class: "tq qk-real treal" }, h("div", { class: "tt" }, h("span", { class: "qki", text: AU.QKIND.real.icon }), h("span", { class: "qkl", text: "현실 미션" }), "진행 중 " + reals.length + "개 · 마감순"));
          reals.forEach((m) => { const pg = AU.G.missionProgress(m.id), ov = pg && pg.overdue; const when = !pg ? "" : ov ? "기한 지남" : pg.left === 0 ? "오늘까지" : "D-" + pg.left;
            box.append(h("button", { type: "button", class: "to treal-item" + (ov ? " overdue" : ""), title: "눌러서 모험일지에서 확인", onclick: (e) => { e.stopPropagation(); UI.tab.jg = "real"; UI.tab.j = "missions"; UI.tab.missionStatus = "active"; UI.open("journal"); } }, h("b", { text: when }), " " + m.title)); });
          t.append(box);
        }
        if (goals.length) { const box = h("div", { class: "tq tnext" }, h("div", { class: "tt" }, "지금 할 일")); goals.forEach((g) => box.append(h("div", { class: "to", style: "white-space:pre-line" }, g))); t.append(box); }
      }
      for (const d of this._trkDirs || []) { const txt = this.questGuide(d.id); this.setText(d.el, "trkd" + d.id, txt); d.el.style.display = txt ? "block" : "none"; }
      T.style.display = "block";
    },
    /* 목표창: 접기와 끌어서 옮기기(위치·접힘은 이 브라우저에 기억) */
    setTrackFold(on) { this.hud.tracker.classList.toggle("fold", !!on); this.hud.trackFold.textContent = on ? "▸" : "▾"; try { localStorage.setItem("au_trk_fold", on ? "1" : "0"); } catch (e) {} },
    initTrackerDrag() {
      const T = this.hud.tracker, H = this.hud.trackHead; let pos = null;
      try { pos = JSON.parse(localStorage.getItem("au_trk_pos") || "null"); if (localStorage.getItem("au_trk_fold") === "1") this.setTrackFold(true); } catch (e) {}
      const put = (x, y) => { T.classList.add("moved"); T.style.left = x + "px"; T.style.top = y + "px"; };
      if (pos && isFinite(pos.x) && isFinite(pos.y)) put(pos.x, pos.y);
      let st = null;
      H.addEventListener("pointerdown", (e) => { if (e.target === this.hud.trackFold) return; const st0 = document.getElementById("stage"), sc = st0 ? st0.getBoundingClientRect().width / 1280 : 1, r = T.getBoundingClientRect(), s0 = st0.getBoundingClientRect(); st = { sc, dx: (e.clientX - r.left) / sc, dy: (e.clientY - r.top) / sc, ox: s0.left, oy: s0.top }; H.setPointerCapture(e.pointerId); e.preventDefault(); });
      H.addEventListener("pointermove", (e) => { if (!st) return; const x = Math.max(0, Math.min(1280 - T.offsetWidth, (e.clientX - st.ox) / st.sc - st.dx)), y = Math.max(0, Math.min(720 - 40, (e.clientY - st.oy) / st.sc - st.dy)); put(x, y); pos = { x, y }; });
      const end = () => { if (st && pos) { try { localStorage.setItem("au_trk_pos", JSON.stringify(pos)); } catch (e) {} } st = null; };
      H.addEventListener("pointerup", end); H.addEventListener("pointercancel", end);
      H.addEventListener("dblclick", () => { T.classList.remove("moved"); T.style.left = T.style.top = ""; pos = null; try { localStorage.removeItem("au_trk_pos"); } catch (e) {} });
    },
    updateKeyHint() { // 초반(Lv.5 미만)에는 기본 조작을 화면 왼쪽 아래에 계속 보여 줌
      const S = AU.G.S, PR = AU.Prologue, on = false, el = this.hud.keyhint; if (!el) return;
      const B = AU.Input.bindings, K = AU.keyLabel, txt = "이동 " + K(B.left) + "·" + K(B.right) + "   점프 " + K(B.jump) + "   공격 " + K(B.attack) + "   말 걸기 " + K(B.interact);
      this.setText(el, "kh", on ? txt : ""); el.style.display = on ? "block" : "none";
    },
    objText(o, rec, i) {
      const q0done = (r) => !!(r && r.spots && Object.keys(r.spots).length >= 2); // 조사·수리 지점을 모두 마친 뒤의 안내용
      const prog = rec ? (o.kind === "collect" ? Math.min(AU.G.count(o.item), o.count) : (rec.prog[i] || 0)) : 0;
      if (o.kind === "kill") return AU.MONSTERS[o.target].name.replace(" (임시)", "") + " 처치 (" + prog + "/" + o.count + ")";
      if (o.kind === "collect") return AU.ITEMS[o.item].name + " 수집 (" + prog + "/" + o.count + ")";
      if (o.kind === "repair" || o.kind === "investigate") { const n = rec && rec.spots ? o.targets.filter((t) => rec.spots[t]).length : 0; return (o.kind === "repair" ? "방책 수리 " : "흔적 조사 ") + "(" + n + "/" + o.targets.length + ")" + (n >= o.targets.length ? " ✔ 완료" : ""); }
      if (o.kind === "deliver") return ((w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 ? (c % 28 ? "을" : "를") : "을(를)"); })(AU.ITEMS[o.item].name.replace(" (임시)", "")) + " " + AU.NPCS[o.target].name.replace(" (임시)", "") + "에게 전하기 (" + (rec ? (rec.prog[i] || 0) : 0) + "/1)";
      if (o.kind === "choice") return (rec && q0done(rec) ? "▶ 이제 " : "") + AU.NPCS[o.target].name.replace(" (임시)", "") + "에게 결과를 알리기 (" + (rec ? (rec.prog[i] || 0) : 0) + "/1)";
      return AU.NPCS[o.target].name.replace(" (임시)", "") + "에게 말 걸기 (" + prog + "/1)";
    },
    toast(text, kind) {
      const t = h("div", { class: "toast " + (kind || "info") }, text);
      this.hud.toasts.append(t); while (this.hud.toasts.children.length > 5) this.hud.toasts.firstChild.remove();
      setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 3600);
    },
    levelBanner(lv) {
      const b = this.hud.banner; b.className = "banner show lv"; b.innerHTML = "";
      b.append(h("div", { class: "big" }, "LEVEL UP!"), h("div", { class: "sub" }, "Lv." + lv + " 달성 · HP 전부 회복"));
      clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove("show"), 2200);
    },
    mapBanner(name) {
      const m = this.hud.mapName; m.textContent = name; m.classList.remove("show"); void m.offsetWidth; m.classList.add("show");
    },
    savedFlash(reason) {
      if (reason === "autosave") return;
      const s = this.hud.save; s.textContent = reason === "checkpoint" ? "자동 저장됨" : "저장됨"; s.classList.add("show"); clearTimeout(this._st); this._st = setTimeout(() => s.classList.remove("show"), 1200);
    },

    /* ============ 창 열고 닫기 ============ */
    openHelpOnce() { const F = AU.G.S.flags; return; // 단계별 안내(guide.js)가 대신함
       if (F.helpShown || /[?&]dev=1/.test(location.search) || (AU.Prologue && AU.Prologue.on)) return; F.helpShown = true; setTimeout(() => { if (!this.cur && !this.dialog && !(AU.Prologue && AU.Prologue.on)) this.open("help"); }, 900); },
    toggleWin(name) { if (this.dialog) return; if (this.curName === name) this.close(); else this.open(name); },
    toggleMenu() { if (this.dialog) return; if (this.curName === "menu") this.close(); else this.open("menu"); },
    open(name) {
      if (this.dialog || this.modal) return;
      if (this.curName === "stats" && name !== "stats") this.resetPending();
      this.cur = true; this.curName = name; this.winEl.classList.remove("hidden"); this.renderWin(); if (AU.Guide) AU.Guide.opened(name);
      AU.Input.held.clear();
    },
    close() {
      if (AU.main && AU.main.galleryOnly && this.curName === "gallery") { AU.main.exitGame(); return; }
      this.resetPending(); this.cur = null; this.curName = null; this.listening = null; AU.G.shop = null; this.winEl.classList.add("hidden"); this.winEl.innerHTML = ""; if (AU.Guide) AU.Guide.closed();
      AU.Input.held.clear(); AU.G.save("menu-close");
    },
    resetPending() { for (const k of Object.keys(this.pending)) this.pending[k] = 0; },
    renderWin() {
      const name = this.curName, R = this.renders[name]; if (!R) return;
      const prevScroll = this.winEl.querySelector(".wbody") ? this.winEl.querySelector(".wbody").scrollTop : 0;
      const title = h("div", { class: "wtitle" }, h("span", { text: WIN_TITLE[name] }), name !== "menu" ? h("span", { class: "whint", text: this.winKeyHint(name) }) : null, btn("✕", "close", () => this.close(), { "aria-label": "닫기" }));
      const body = h("div", { class: "wbody" });
      R.call(this, body);
      { const gb = AU.Guide && AU.Guide.winBox(name); if (gb) body.prepend(gb); }
      const box = h("div", { class: "window panel win-" + name }, title, body);
      this.winEl.innerHTML = ""; this.winEl.append(box); body.scrollTop = prevScroll; this.makeDraggable(box, title, name);
    },
    /* 창 제목 줄을 끌어서 위치 조정. 창 종류별로 마지막 위치를 기억(이 브라우저), 제목 줄 더블클릭 = 가운데로 되돌리기. 제목 줄이 화면 밖으로 나가지 않게 제한 */
    makeDraggable(box, title, name) {
      const store = () => AU.Store.get("autelia.winPos") || {}; const W0 = 1280, H0 = 720;
      const clamp = (dx, dy) => { const w = box.offsetWidth, hh = box.offsetHeight, bl = (W0 - w) / 2, bt = (H0 - hh) / 2;
        return { x: Math.round(Math.max(-(w - 120) - bl, Math.min(W0 - 120 - bl, dx))), y: Math.round(Math.max(-bt, Math.min(H0 - 44 - bt, dy))) }; };
      const set = (o) => { box.style.transform = o.x || o.y ? "translate(" + o.x + "px," + o.y + "px)" : ""; };
      const saved = store()[name]; let cur = saved ? clamp(saved.x, saved.y) : { x: 0, y: 0 }; set(cur);
      title.style.cursor = "move"; title.style.touchAction = "none"; title.title = "끌어서 위치 이동 · 더블클릭: 가운데로";
      let d = null;
      title.addEventListener("pointerdown", (e) => { if (e.target.closest("button") || e.button > 0) return; const sc = box.getBoundingClientRect().width / box.offsetWidth || 1; d = { sx: e.clientX, sy: e.clientY, ox: cur.x, oy: cur.y, sc }; title.setPointerCapture(e.pointerId); e.preventDefault(); });
      title.addEventListener("pointermove", (e) => { if (!d) return; cur = clamp(d.ox + (e.clientX - d.sx) / d.sc, d.oy + (e.clientY - d.sy) / d.sc); set(cur); });
      const end = () => { if (!d) return; d = null; const o = store(); o[name] = cur; AU.Store.set("autelia.winPos", o); };
      title.addEventListener("pointerup", end); title.addEventListener("pointercancel", end);
      title.addEventListener("dblclick", (e) => { if (e.target.closest("button")) return; cur = { x: 0, y: 0 }; set(cur); const o = store(); delete o[name]; AU.Store.set("autelia.winPos", o); });
    },
    winKeyHint(name) { const id = WIN_KEYS[name]; return id ? "[" + keyOf(id) + "]" : ""; },

    /* ============ 대화 ============ */
    talkNpc(npcId) {
      const npc = AU.NPCS[npcId], S = AU.G.S; AU.G.onTalk(npcId);
      const dl = AU.G.tryDeliver(npcId); if (dl) return this.say(npc, dl);                       // 전달 퀘스트: 물건을 내미는 대화
      const pc = AU.G.pendingChoice(npcId);                                                        // 선택 퀘스트: 정답 없는 갈림길
      if (pc) return this.say(npc, pc.o.prompt || pc.q.choice.prompt, { choices: pc.q.choice.options.map((op) => ({ label: op.label, key: null, fn: () => { AU.G.applyChoice(pc.qid, pc.i, op); this.say(npc, op.reply, { end: () => { if (AU.QUESTS[pc.qid].giver === npcId && AU.G.questStatus(pc.qid) === "ready") this.say(npc, AU.QUESTS[pc.qid].done, { end: () => AU.G.turnIn(pc.qid) }); } }); } })), noCancel: true });
      let qid = (npc.quests || []).find((id) => AU.G.questStatus(id) === "ready" && (AU.QUESTS[id].turnIn || AU.QUESTS[id].giver) === npcId);
      if (!qid) { // 의뢰인과 보고할 사람이 다른 퀘스트: 의뢰인이 어디로 가야 하는지 알려 줌
        const rid = Object.keys(AU.QUESTS).find((id) => AU.G.questStatus(id) === "ready" && AU.QUESTS[id].giver === npcId && AU.QUESTS[id].turnIn && AU.QUESTS[id].turnIn !== npcId);
        if (rid) { const tn = AU.QUESTS[rid].turnIn, mp = this.npcMap(tn); return this.say(npc, ["일은 끝났나? 그럼 보고는 " + AU.NPCS[tn].name.replace(" (임시)", "") + "에게 하게." + (mp ? " " + this.dirText(mp, tn) : "")]); }
      }
      if (qid) {
        const q = AU.QUESTS[qid];
        return this.say(npc, q.done, { end: () => { AU.G.turnIn(qid); } });
      }
      qid = (npc.quests || []).find((id) => AU.G.questStatus(id) === "available" && AU.QUESTS[id].giver === npcId);
      if (qid) {
        const q = AU.QUESTS[qid];
        if (q.fee && S.silver < q.fee) { this.toast("은화가 필요합니다. (" + q.fee + ")", "warn"); return this.say(npc, q.feeShort || ["은화가 모자랍니다."]); }
        return this.say(npc, q.offer, { choices: [{ label: "수락", key: "interact", fn: () => AU.G.startQuest(qid) }, { label: "나중에", key: "menu", fn: () => {} }] });
      }
      const act = (npc.quests || []).find((id) => AU.G.questStatus(id) === "active" && AU.QUESTS[id].giver === npcId);
      if (act) return this.say(npc, ["아직 진행 중이에요. (" + AU.QUESTS[act].title.replace(" (임시)", "") + ")"].concat(AU.QUESTS[act].reminder || []));
      if (npc.shop) {
        const gen = npc.shop === "general", lines = [npc.idle[Math.floor(Math.random() * npc.idle.length)]];
        return this.say(npc, lines, { choices: [{ label: gen ? "사고 팔기" : npc.shop === "weapon" ? "장비 사기" : "장비 만들기", key: "interact", fn: () => { AU.G.openShop(npc.shop); UI.tab.shop = gen ? "sell" : npc.shop === "weapon" ? "buy" : "craft"; this.open("shop"); } }, { label: "그만두기", key: "menu", fn: () => {} }] });
      }
      if (npc.special === "missionGuide") {
        if (S.flags.missionsUnlocked && !S.flags.guideMet) {
          return this.say(npc, ["처음 뵙겠어요. 이 도시에서는 모험가들이 마음을 돌보는 작은 활동도 함께 해요.", "모험일지(" + keyOf("journal") + ")의 '현실 활동'에 있어요. 걷기, 물 마시기, 기록하기처럼 오늘 바로 해 볼 수 있는 것들이에요.", "게임 속 능력치와는 별개지만, 직접 해 보면 현실의 나도 조금씩 자라요. 천천히, 하나만 해 봐도 좋아요."], { end: () => { AU.G.discoverMissions(); } });
        }
        if (S.flags.guideMet) return this.say(npc, ["일상 속 작은 활동은 모험일지(" + keyOf("journal") + ")에서 볼 수 있어요. 편할 때 천천히 하세요."]);
      }
      const lines = npc.idle || ["..."]; this.say(npc, [lines[Math.floor(Math.random() * lines.length)]]);
    },
    say(npc, lines, opt) {
      opt = opt || {};
      this.dialog = { npc, lines, i: 0, opt }; AU.Input.held.clear();
      this.dlgEl.classList.remove("hidden"); this.renderDialog();
    },
    /* 전체 화면 컷 그림: say(..., { cuts: [{ at: 줄 번호, src }] })로 줄이 바뀔 때 그림을 바꿔 보여 줌(프롤로그 컷과 같은 연출). 그림이 없으면 조용히 건너뜀 */
    setCut(src) {
      if (this.cutSrc === src) return; this.cutSrc = src;
      const old = [...this.cutEl.children];
      if (!src) { old.forEach((e) => { e.classList.remove("on"); setTimeout(() => e.remove(), 800); }); return; }
      const im = h("img", { class: "cutimg", alt: "", src });
      im.onload = () => { requestAnimationFrame(() => im.classList.add("on")); old.forEach((e) => { e.classList.remove("on"); setTimeout(() => e.remove(), 800); }); };
      im.onerror = () => { im.remove(); };
      this.cutEl.append(im);
    },
    applyCut(d) {
      const cs = d.opt && d.opt.cuts; if (!cs) { if (this.cutSrc) this.setCut(null); return; }
      let src = null; for (const c of cs) if (c.at <= d.i) src = c.src; this.setCut(src);
    },
    renderDialog() {
      const d = this.dialog; if (!d) return;
      this.applyCut(d);
      const last = d.i >= d.lines.length - 1, cur = d.lines[d.i], isObj = cur && typeof cur === "object", np = isObj ? cur.npc : d.npc, text = AU.Profile.fmt(isObj ? cur.t : cur).replace(/\{(attack|jump|interact|skills)\}/g, (m, k) => keyOf(k));
      const ppk = AU.Img.has(np.portrait) ? np.portrait : (np.alt && AU.Img.has(np.alt) ? np.alt : np.portrait), pt = AU.Img.has(ppk) ? h("img", { src: AU.ASSETS[ppk].path, alt: "" }) : h("div", { class: "ptfallback", text: np.name.slice(0, 1) });
      const back = d.i > 0 ? btn("◀ 이전 (" + AU.keyLabel(AU.Input.bindings.left) + ")", "dback", () => this.backDialog()) : null;
      const choices = last && d.opt.choices ? h("div", { class: "choices" }, back, d.opt.choices.map((c) => btn(c.label + (keyOf(c.key) ? "  (" + keyOf(c.key) + ")" : ""), c.key === "interact" ? "primary" : "", () => this.finishDialog(c)))) : null;
      this.dlgEl.innerHTML = ""; this.dlgEl.append(h("div", { class: "panel dlgbox" }, h("div", { class: "pt" }, pt), h("div", { class: "dtext" }, h("div", { class: "dname", text: AU.Profile.fmt(np.name) }), h("div", { class: "dline", text: text }), AU.G.S.flags.tipDlg ? null : h("div", { class: "dtip", text: keyOf("interact") + " : 다음 대사 · " + AU.keyLabel(AU.Input.bindings.left) + " : 이전 대사 (아래 버튼을 눌러도 됩니다)" }),
        choices || h("div", { class: "dnext" }, back, btn(last ? "닫기 (" + keyOf("interact") + ")" : "다음 ▶ (" + keyOf("interact") + ")", "", () => this.advanceDialog())))));
    },
    backDialog() { const d = this.dialog; if (!d || d.i <= 0) return; d.i--; this.renderDialog(); },
    advanceDialog() {
      const d = this.dialog; if (!d) return;
      if (d.i < d.lines.length - 1) { d.i++; this.renderDialog(); return; }
      if (d.opt.choices) { this.finishDialog(d.opt.choices[0]); return; }
      this.finishDialog(null);
    },
    finishDialog(choice) {
      const d = this.dialog; if (!d) return;
      this.dialog = null; AU.G.S.flags.tipDlg = true; this.dlgEl.classList.add("hidden"); this.dlgEl.innerHTML = ""; AU.Input.held.clear(); if (this.cutSrc) this.setCut(null);
      if (choice && choice.fn) choice.fn(); if (!choice && d.opt.end) d.opt.end();
      this.flushAfter();
    },
    cancelDialog() { // Esc: 선택지가 있으면 '거절'로 처리
      const d = this.dialog; if (!d) return;
      if (d.opt.noCancel) return;
      if (d.opt.choices) { const c = d.opt.choices.find((x) => x.key === "menu"); this.finishDialog(c || null); }
      else this.finishDialog(null);
    },
    flushAfter() { while (this.afterDialog.length) { const n = this.afterDialog.shift(); this.open(n); } },

    /* ============ 확인 창 ============ */
    confirm(text, yes, fn) {
      this.modal = true; this.modalEl.classList.remove("hidden"); this.modalEl.innerHTML = "";
      const close = () => { this.modal = false; this.modalEl.classList.add("hidden"); this.modalEl.innerHTML = ""; };
      this.modalEl.append(h("div", { class: "panel modal" }, h("p", { text: text }), h("div", { class: "choices" }, btn(yes, "primary", () => { close(); fn(); }), btn("취소", "", close))));
    },

    /* ============ 키 처리(입력 → UI) ============ */
    onAction(id) {
      if (this.modal) { if (id === "menu") { this.modal = false; this.modalEl.classList.add("hidden"); this.modalEl.innerHTML = ""; } return true; }
      if (this.listening) return true;
      if (this.dialog) {
        if (id === "interact") this.advanceDialog(); else if (id === "left") this.backDialog(); else if (id === "menu") this.cancelDialog();
        return true;
      }
      const PR = AU.Prologue;
      if (PR && PR.on) { if (PR.locked()) return true; if (WIN_KEYS[id] && !PR.allowWin(WIN_KEYS[id])) return true; } // 프롤로그: 컷신 중 메뉴 금지, 인벤토리·키 설정만 허용
      if (id === "menu") { if (this.cur) this.close(); else this.open("menu"); return true; }
      if (WIN_KEYS[id]) { this.toggleWin(WIN_KEYS[id]); return true; }
      return !!this.cur; // 창이 열려 있으면 게임 입력 차단
    }
  };

  /* ============ 창 내용 ============ */
  const R = UI.renders = {};

  /* 나만의 공간 — 선택된 시안 A: 따뜻한 기억 갤러리, 실제 저장 데이터를 사용 */
  R.gallery = function (b) {
    const S = AU.G.S, g = AU.G.galleryState(), items = AU.G.galleryItems();
    const galleryRaster = { memory_P: "painting_01", memory_E: "painting_02", memory_R: "painting_03", memory_M: "painting_04", memory_A: "painting_05", frame: "frame", plant: "plant", lamp: "lamp", banner: "banner", mission: "mission", journal: "journal", memory: "memory", token: "token", rest: "rest", attempt: "attempt" };
    const galleryArt = (name, cls, label) => h("img", { class: cls || "gallery-asset", src: "assets/gallery/" + (galleryRaster[name] || name) + (galleryRaster[name] ? ".webp" : ".svg"), alt: label || "", loading: "lazy", draggable: "false" });
    const permaArt = (k, cls) => galleryArt("memory_" + (["P","E","R","M","A"].includes(k) ? k : "P"), cls || "gallery-memory-landscape", "");
    const unlocked = new Set(g.unlocked), selected = new Set(g.selected);
    const today = AU.dateStr(), attended = g.attendance.includes(today);
    const mission = (e) => AU.G.mission(e.id);
    const shown = S.missions.log.filter(e => ["done", "attempted", "partial"].includes(e.state)).slice().reverse();
    const memories = shown.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i).slice(0, 30);
    const lastThree = memories.slice(0, 3);
    const active = AU.MISSIONS.filter(m => {
      const state = AU.G.ms(m.id).state;
      return ["available", "accepted", "attempted", "partial"].includes(state);
    }).slice(0, 3);
    const statusName = (e) => e.state === "done" ? "완료" : e.state === "partial" ? "조금 해봤어요" : "시도함";
    const statusClass = (e) => e.state === "done" ? "done" : "attempt";
    const dailyRows = ["P", "E", "R", "M", "A"].map(k => {
      const value = S.mindStats[k] || 0, max = Math.max(1, AU.G.mindMax(k));
      return { key: k, label: AU.PERMA[k], value, pct: Math.round(value / max * 100) };
    });
    const openJournal = () => { UI.tab.j = "missions"; UI.tab.jg = "real"; UI.open("journal"); };
    const toggleShop = () => { UI.tab.galleryShop = !UI.tab.galleryShop; UI.renderWin(); };
    const card = (entry, i) => {
      if (!entry) return h("div", { class: "roommemory empty-memory" }, h("div", { class: "roommemory-art" }, galleryArt("memory", "gallery-placeholder", "")), h("small", { text: "새 경험을 기다리는 액자" }));
      const m = mission(entry), k = entry.perma || "P";
      return h("div", { class: "roommemory " + statusClass(entry) },
        h("div", { class: "roommemory-art perma-" + k }, permaArt(k)),
        h("span", { class: "roommemory-state", text: statusName(entry) }),
        h("strong", { text: m ? m.title : "나의 경험" }),
        h("small", { text: entry.t }));
    };
    const panel = (cls, title, ...contents) => h("section", { class: "room-panel " + cls }, h("h3", { class: "room-section-title", text: title }), ...contents);
    const dateLabel = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
    const missionList = active.length ? active.map(m => {
      const state = AU.G.ms(m.id).state;
      return h("div", { class: "roomactivity " + (state === "attempted" || state === "partial" ? "is-attempted" : "") },
        h("span", { class: "roomactivity-icon" }, galleryArt("mission", "gallery-mission-img", "")),
        h("div", { class: "roomactivity-text" },
          h("strong", { text: m.title }),
          h("small", { text: state === "attempted" ? "시도 중 · 이어서 해볼 수 있어요" : state === "partial" ? "조금 해봤어요 · 경험이 남았어요" : state === "accepted" ? "선택한 활동" : "언제든 선택할 수 있어요" })),
        h("span", { class: "roomactivity-label", text: state === "attempted" || state === "partial" ? "시도함" : state === "accepted" ? "선택" : "제안" }));
    }) : [h("p", { class: "note", text: S.flags.missionsUnlocked ? "표시할 새 미션이 없습니다. 모험일지에서 전체 기록을 확인하세요." : "현실 미션은 게임에서 안내를 받은 뒤 열립니다. 그 전에도 공간을 꾸미고 방문 기록을 남길 수 있습니다." })];
    const slots = AU.main && AU.main.galleryOnly ? h("div", { class: "roomstandalone" },
      h("p", { class: "note", text: "RPG를 시작하지 않고 이용 중입니다. 캐릭터별 저장 공간은 서로 독립적입니다." }),
      h("div", { class: "choices" },
        ...AU.main.SLOTS.map(n => { const info = AU.main.slotInfo(n); return btn(n + "번 " + (info ? info.name : "새 캐릭터") + (n === AU.main.slot ? " ✓" : ""), n === AU.main.slot ? "on" : "mini", () => { if (n !== AU.main.slot) AU.main.setSlot(n); }, { disabled: n === AU.main.slot ? "" : null }); }),
        btn("공간에서 나가기", "", () => AU.main.exitGame()))) : null;
    const frames = h("div", { class: "roomframes" },
      ...[0,1,2].map(i => { const entry = lastThree[i], m = entry && mission(entry);
        return h("div", { class: "roomframe" },
          h("div", { class: "roomframein" },
            entry ? permaArt(entry.perma, "gallery-frame-landscape") : galleryArt("memory", "gallery-frame-placeholder", ""),
            h("strong", { text: entry ? (m ? m.title : "나의 활동") : "새 경험을 기다리는 액자" }),
            h("small", { text: entry ? statusName(entry) : "나의 추억" })));
      }));
    const center = h("section", { class: "room-center" },
      h("div", { class: "personalroom" },
        h("div", { class: "roomwall" },
          h("div", { class: "roomwindow" }, h("span", { text: "☀" })),
          h("div", { class: "roomcrest", text: "✦" }),
          frames,
          h("div", { class: "roomdecors" }, ...items.filter(item => selected.has(item.id)).map(item => h("span", { class: "room-decor-set", title: item.name }, galleryArt(item.id, "gallery-decor-img", item.name))))),
        h("div", { class: "roomfloor" }, h("div", { class: "roomrug", text: "나의 이야기" }))));
    const gal = ["room", "rec", "change"].includes(UI.tab.gal) ? UI.tab.gal : "room";
    const goTab = (k) => { UI.tab.gal = k; UI.renderWin(); };
    // 내 기록: 완료·시도한 현실 미션을 PERMA 영역별로 정리(미션마다 가장 최근 1건)
    const recPanel = () => {
      const box = h("div", { class: "room-rec" }), latest = new Map();
      for (const e of S.missions.log.filter(x => ["done", "partial", "attempted"].includes(x.state) && !x.repeat)) latest.set(e.id, e);
      let total = 0;
      for (const k of ["P", "E", "R", "M", "A"]) {
        const rows = [...latest.values()].filter(e => (e.perma || (mission(e) || {}).perma) === k).reverse(); total += rows.length;
        box.append(h("section", { class: "rec-perma perma-" + k, "data-perma": k },
          h("h4", null, h("b", { text: k }), " " + AU.PERMA[k] + " ", h("span", { class: "rec-n", text: rows.length + "개" })),
          rows.length ? rows.map(e => {
            const m = mission(e), st = S.missions.states[e.id], rw = st && st.reward;
            return h("div", { class: "rec-row" },
              h("div", { class: "rec-main" }, h("strong", { text: m ? m.title : "나의 경험" }), h("small", { text: e.t + " · " + statusName(e) + (e.state === "done" && m ? " · " + AU.G.missionReward(m).name : "") })),
              e.state === "done" ? h("span", { class: "tag proof", text: proofLabel(e) }) : null,
              e.state === "done" && rw && !rw.verified ? btn("인증하기", "mini", () => UI.missionVerify(m)) : null);
          }) : h("p", { class: "note", text: "아직 이 영역의 기록이 없어요." })));
      }
      if (!total) box.prepend(h("p", { class: "empty", text: "아직 현실 미션 기록이 없어요. 첫 활동을 마치면 여기에 영역별로 쌓여요." }));
      return box;
    };
    const tabs = h("div", { class: "tabs room-tabs", role: "tablist" },
      ...[["room", "내 방"], ["rec", "내 기록"], ["change", "내 변화"]].map(([k, l]) => h("button", { type: "button", role: "tab", "aria-selected": String(gal === k), class: "btn" + (gal === k ? " on" : ""), "data-gtab": k, onclick: () => goTab(k) }, l)),
      h("span", { class: "room-token", text: "토큰 " + g.tokens + "개" }),
      gal === "room" ? btn(attended ? "방문 기록 완료" : "오늘 방문 +1", "mini", () => AU.G.galleryCheckin(), { disabled: attended ? "" : null, title: "누적 " + g.attendance.length + "일 · 하루 한 번 토큰 +1" }) : null);
    let body;
    if (gal === "rec") body = recPanel();
    else if (gal === "change") body = h("div", { class: "room-change" }, UI.mindBlock());
    else body = h("div", { class: "room-home" }, center,
      panel("room-shop-panel", "꾸미기 · 토큰으로 장식 얻기",
        h("div", { class: "roomshop" }, ...items.map(item => h("div", { class: "roomshopitem" },
          galleryArt(item.id, "roomicon", item.name), h("b", { text: item.name }), h("p", { class: "note", text: item.desc }),
          btn(unlocked.has(item.id) ? (selected.has(item.id) ? "전시 중 · 숨기기" : "전시하기") : "토큰 " + item.cost + "개로 획득",
            "mini", () => unlocked.has(item.id) ? AU.G.galleryToggle(item.id) : AU.G.galleryBuy(item.id),
            { disabled: !unlocked.has(item.id) && g.tokens < item.cost ? "" : null }))))));
    b.append(h("div", { class: "room-a-layout" },
      h("div", { class: "room-a-heading" }, galleryArt("frame", "gallery-heading-art", ""), h("div", null,
        h("h2", { text: "나만의 공간" }), h("p", { text: "지금까지의 활동을 돌아보고, 보상으로 공간을 꾸며요" }))),
      slots, tabs, body,
      h("div", { class: "room-a-actions" },
        btn("사용법 보기", "", () => AU.FirstMissionGuide && AU.FirstMissionGuide.start()),
        btn("나가기", "", () => AU.main && AU.main.galleryOnly ? AU.main.exitGame() : UI.close()))));
  };

  R.menu = function (b) {
    const S = AU.G.S;
    let items = [["인벤토리", "inventory"], ["장비", "equipment"], ["스탯", "stats"], ["월드맵", "worldmap"], ["퀘스트", "quests"], ["스킬", "skills"], ["모험일지", "journal"], ["나만의 공간", "gallery"], ["기능 안내", "help"], ["키보드 설정", "keysettings"]];
    if (AU.Prologue && AU.Prologue.on) items = items.filter(([, n]) => AU.Prologue.allowWin(n)); // 프롤로그 중에는 필요한 메뉴만
    b.append(h("div", { class: "menugrid" }, items.map(([label, name]) => btn(h("span", null, label, h("em", { text: WIN_KEYS[name] ? "[" + keyOf(WIN_KEYS[name]) + "]" : "" })), "menuitem", () => this.open(name)))));
    const row = h("div", { class: "menurow" },
      btn("게임으로 돌아가기", "primary", () => this.close()),
      btn("게임 종료하기", "", () => this.confirm("정말로 종료하겠습니까?\n현재까지 게임을 저장합니다.", "저장하고 종료", () => AU.main.exitGame())));
    b.append(row);
    b.append(h("p", { class: "note", text: "저장 위치: 이 브라우저(" + (AU.Store.persistent ? "로컬 저장소" : "저장 공간을 쓸 수 없어 접속을 종료하면 사라집니다") + ") · 마지막 저장: " + (S.savedAt ? new Date(S.savedAt).toLocaleTimeString("ko-KR") : "없음") + " · 버전 " + AU.VERSION }));
  };

  // 제작 탭: 재료와 은화로 장비를 만듦(마을에서만)
  UI.craftPanel = function (b) {
    const S = AU.G.S, safe = AU.G.shop === "smith";
    b.append(h("p", { class: "note", text: safe ? "재료와 은화로 희귀 장비를 만들 수 있습니다. 몬스터가 아주 드물게 떨어뜨리기도 합니다." : "제작법입니다. 포르투 노바의 무기상인에게 재료를 가져가면 만들어 줍니다." }));
    const list = h("div", { class: "recipes" }), known = AU.RECIPES.filter((r) => AU.G.knowsRecipe(r.id));
    if (!known.length) b.append(h("p", { class: "note", text: "아직 배운 제작법이 없습니다. 의뢰 보상으로 받는 ‘제작서’를 인벤토리에서 사용하면 제작법을 배웁니다." }));
    for (const r of known) {
      const out = AU.ITEMS[r.out], ok = AU.G.canCraft(r.id);
      list.append(h("div", { class: "recipe" + (ok ? " ok" : "") }, h("div", { class: "rh" }, h("b", { text: out.name.replace(" (임시)", "") }), h("span", { class: "tag", text: (AU.RARITY[out.rarity] || {}).label || "" }), h("span", { class: "tag", text: AU.SLOT_LABEL[out.slot] })),
        h("div", { class: "stat", text: Object.entries(out.stats).map(([k, v]) => statName(k) + " +" + v).join(" · ") }),
        h("ul", { class: "mats" }, r.mats.map(([m, n]) => h("li", { class: AU.G.count(m) >= n ? "have" : "lack", text: AU.ITEMS[m].name.replace(" (임시)", "") + " " + AU.G.count(m) + " / " + n })), h("li", { class: S.silver >= r.silver ? "have" : "lack", text: "은화 " + S.silver + " / " + r.silver })),
        btn("만들기", ok && safe ? "primary" : "", () => AU.G.craft(r.id), { disabled: ok && safe ? null : "" })));
    }
    b.append(list);
  };
  // 상점 창: 잡화상인(사고팔기) / 무기상인(기본 장비 사기) / 대장장이(제작)
  R.shop = function (b) {
    const S = AU.G.S, kind = AU.G.shop;
    if (!kind) { b.append(h("p", { class: "empty", text: "상인에게 말을 걸어 주세요." })); return; }
    if (kind === "smith") { UI.craftPanel(b); b.append(h("div", { class: "silver", text: "은화 " + S.silver })); return; }
    const weapon = kind === "weapon";
    const wrap = h("div", { class: "shopsplit" }), left = h("div", { class: "shopleft" });   // 왼쪽: 살 물건 / 오른쪽: 내 가방(물건마다 판매 버튼, 1117)
    left.append(h("h4", { text: weapon ? "무기·방어구" : "판매 중인 물건" }), h("div", { class: "silver", text: "은화 " + S.silver }));
    const list = h("div", { class: "shoplist" });
    for (const id of AU.SHOP[kind].buy) { const it = AU.ITEMS[id], max = it.type === "equip" ? 1 : Math.max(1, Math.min(99, Math.floor(S.silver / it.buy))), q = UI.shopQtyGet("buy:" + id, max);
      list.append(h("div", { class: "shoprow" }, UI.itemIcon(id, 34), h("span", { class: "iname", text: it.name.replace(" (임시)", "") }), h("span", { class: "tag", text: "보유 " + AU.G.count(id) }), h("span", { class: "price", text: "개당 " + it.buy }),
        max > 1 ? UI.qtyStepper("buy:" + id, q, max) : null, btn("사기 (" + it.buy * q + ")", "mini", () => { if (AU.G.buyItem(id, q)) UI.shopQty["buy:" + id] = 1; }, { disabled: S.silver >= it.buy * q ? null : "" }))); }
    left.append(list); wrap.append(left, UI.shopBag(weapon)); b.append(wrap);
  };
  // 수량 고르기(−  n  +  최대): 사고팔 때 개수를 정함
  UI.shopQty = {};
  UI.shopQtyGet = (key, max) => Math.max(1, Math.min(max, UI.shopQty[key] || 1));
  UI.qtyStepper = function (key, q, max) {
    const set = (v) => { UI.shopQty[key] = Math.max(1, Math.min(max, v)); UI.renderWin(); };
    return h("span", { class: "qty" }, btn("−", "mini", () => set(q - 1), { "aria-label": "하나 줄이기" }), h("b", { text: String(q) }), btn("+", "mini", () => set(q + 1), { "aria-label": "하나 늘리기" }), btn("최대", "mini", () => set(max)));
  };
  // 상점 옆 내 가방: 물건마다 판매 버튼(재료만 판매 가능, 무기점은 사기 전용)
  UI.shopBag = function (weapon) {
    const S = AU.G.S, TY = { equip: "장비", use: "소비", etc: "재료", quest: "퀘스트", story: "중요" }, box = h("div", { class: "shopbag" }, h("h4", { text: "내 가방" }));
    const ids = Object.keys(S.inv).filter((id) => AU.ITEMS[id] && S.inv[id] > 0), list = h("div", { class: "shoplist bag" });
    if (!ids.length) list.append(h("p", { class: "empty", text: "가방이 비어 있습니다." }));
    for (const id of ids) { const it = AU.ITEMS[id], n = S.inv[id], can = !weapon && it.type === "etc" && it.sell > 0;
      list.append(h("div", { class: "shoprow" }, UI.itemIcon(id, 30), h("span", { class: "iname", text: it.name.replace(" (임시)", "") }), h("span", { class: "tag", text: (TY[it.type] || "") + " ×" + n }),
        can ? h("span", { class: "price", text: "개당 " + it.sell }) : null, can && n > 1 ? UI.qtyStepper("sell:" + id, UI.shopQtyGet("sell:" + id, n), n) : null,
        can ? btn("팔기 (" + it.sell * UI.shopQtyGet("sell:" + id, n) + ")", "mini", () => { const q = UI.shopQtyGet("sell:" + id, n); if (AU.G.sellItem(id, q)) UI.shopQty["sell:" + id] = 1; }) : null)); }
    box.append(list); return box;
  };
  /* ---------- 아이템 아이콘: assets/item/<id>.webp 가 있으면 그림, 없으면 종류별 도형 ---------- */
  const GL = {
    sword: '<path d="M20 3l1 1-9 9-2-2z"/><path d="M7 12l5 5-2 2-5-5z"/><path d="M4 17l3 3-2 2-3-3z"/>',
    tunic: '<path d="M8 3L3 7l2 4 2-1v11h10V10l2 1 2-4-5-4c-1.5 2-6.5 2-8 0z"/>',
    charm: '<path d="M12 3l3 5-3 8-3-8z"/><path d="M12 16v5" stroke="currentColor" stroke-width="2" fill="none"/>',
    ring: '<circle cx="12" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="3"/><path d="M9 6h6l-3 4z"/>',
    scarf: '<path d="M4 6c5 3 11 3 16 0v5c-5 3-11 3-16 0zM15 12l4 9h-4z"/>',
    scroll: '<path d="M8 3h9a2 2 0 012 2v11a3 3 0 01-3 3H7a3 3 0 01-3-3v-2h2v2a1 1 0 001 1h7.2a3 3 0 01-.2-1V5H8a2 2 0 00-2 2v1H4V7a4 4 0 014-4z"/><path d="M9 8h6v1.6H9zm0 3.5h6v1.6H9z"/>',
    potion: '<path d="M9 2h6v2h-1v5l4.5 9a2 2 0 01-1.8 3H7.3a2 2 0 01-1.8-3L10 9V4H9z"/>',
    fur: '<path d="M5 15a4 4 0 014-6 4 4 0 017 0 4 4 0 013 6 4 4 0 01-5 3 4 4 0 01-8-1 3 3 0 01-1-2z"/>',
    tail: '<path d="M4 20C4 9 11 4 20 4c0 9-5 16-16 16z"/>',
    skin: '<path d="M3 9c4-4 6 4 10 0s6 4 8 0v6c-4 4-6-4-10 0s-6-4-8 0z"/>',
    fang: '<path d="M7 3h10c0 8-3 13-5 18-2-5-5-10-5-18z"/>',
    tooth: '<path d="M8 5h8l-1 8-3 6-3-6z"/>',
    claw: '<path d="M4 20c-2-8 3-15 10-16-3 2-3 5-1 7 2 1 5 0 7-2 0 6-4 11-16 11z"/>',
    shell: '<path d="M3 17c0-8 5-13 9-13s9 5 9 13zM12 4v13M7 6l3 11M17 6l-3 11" />',
    scrap: '<path d="M12 2l8 4.5v9L12 22l-8-6.5v-9z"/><circle cx="12" cy="12" r="3" fill="#fff" opacity=".6"/>',
    pelt: '<path d="M5 5l4 2h6l4-2 2 6-3 2v7H6v-7l-3-2z"/>',
    token: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" fill="#fff" opacity=".55"/>',
    parcel: '<path d="M3 8l9-5 9 5v10l-9 4-9-4z"/><path d="M12 3v19M3 8l9 5 9-5" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7"/>',
    map: '<path d="M4 4h13a3 3 0 013 3v13H7a3 3 0 01-3-3z"/><path d="M8 9h8M8 13h8" stroke="#fff" stroke-width="1.6" opacity=".7"/>',
    shard: '<path d="M12 2l6 8-3 12-8-9z"/>',
    bag: '<path d="M8 3h8l1 4c3 3 4 7 3 12a2 2 0 01-2 2H6a2 2 0 01-2-2c-1-5 0-9 3-12z"/><path d="M8 8h8" stroke="#fff" stroke-width="1.6" opacity=".7"/>',
    sheet: '<path d="M5 3h10l4 4v14H5z"/><path d="M8 11h8M8 15h8" stroke="#fff" stroke-width="1.6" opacity=".7"/>',
    box: '<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/>'
  };
  const ICON_OF = { town_scroll: "scroll", sword_a: "sword", cloth_a: "tunic", charm_a: "charm", potion: "potion", fur: "fur", fox_tail: "tail", snake_skin: "skin", snake_fang: "fang", rat_tooth: "tooth", crab_claw: "claw", crab_shell: "shell", fox_scarf: "scarf", snake_ring: "ring", crab_vest: "tunic", guild_token: "token", guild_parcel: "parcel", barsha_map: "map", jepeto_blueprint: "sheet", iron_scrap: "scrap", wolf_pelt: "pelt", metal_fragment: "shard", carpenter_bag: "bag" };
  const HAS_ART = new Set(["black_crystal", "sword_a", "cloth_a", "charm_a", "fox_scarf", "snake_ring", "crab_vest", "fur", "fox_tail", "snake_skin", "snake_fang", "rat_tooth", "crab_claw", "crab_shell", "iron_scrap", "wolf_pelt", "potion", "guild_token", "guild_parcel", "barsha_map", "jepeto_blueprint", "metal_fragment", "carpenter_bag", "boar_tusk"]);
  UI.itemIcon = function (id, px) {
    const it = AU.ITEMS[id] || {}, size = px || 40, box = h("span", { class: "iicon r-" + (it.rarity || it.type), style: "width:" + size + "px;height:" + size + "px" });
    const art = it.img || (HAS_ART.has(id) ? "assets/item/" + id + ".webp" : null);
    if (art) { box.append(h("img", { src: art, alt: "", draggable: "false" })); return box; }
    const g = GL[ICON_OF[id]] || (it.type === "equip" ? GL.sword : it.type === "use" ? GL.potion : GL.box);
    box.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + g + "</svg>";
    return box;
  };
  const INV_CATS = [["all", "전체", () => true], ["equip", "장비", (it) => it.type === "equip"], ["use", "소비", (it) => it.type === "use"], ["etc", "재료·기타", (it) => it.type === "etc"], ["quest", "퀘스트·중요", (it) => it.type === "quest" || it.type === "story"]];
  R.inventory = function (b) {
    const S = AU.G.S;
    const top = h("div", { class: "tabs" }, [["bag", "가방"]].map(([k, l]) => btn(l, "on", () => {})));
    b.append(top);
    const TYPE = { equip: "장비", use: "소비", etc: "기타", quest: "퀘스트", story: "중요 물품" };
    const ids = Object.keys(S.inv), cat = UI.tab.invcat || "all", catDef = INV_CATS.find((c) => c[0] === cat) || INV_CATS[0];
    b.append(h("div", { class: "catbar" }, INV_CATS.map(([k, l, f]) => { const n = ids.filter((id) => f(AU.ITEMS[id])).length; return h("button", { type: "button", class: "cat" + (k === cat ? " on" : ""), onclick: () => { UI.tab.invcat = k; UI.renderWin(); } }, h("span", { text: l }), h("em", { text: n })); })));
    const shown = ids.filter((id) => catDef[2](AU.ITEMS[id]));
    const sel = UI.selected.inv && shown.includes(UI.selected.inv) ? UI.selected.inv : shown[0];
    UI.selected.inv = sel;
    const grid = h("div", { class: "tilegrid" });
    if (!shown.length) grid.append(h("p", { class: "empty", text: ids.length ? "이 분류에 해당하는 아이템이 없습니다." : "가방이 비어 있습니다." }));
    shown.forEach((id) => { const it = AU.ITEMS[id]; grid.append(h("button", { type: "button", class: "tile" + (id === sel ? " sel" : ""), title: it.name, onclick: () => { UI.selected.inv = id; UI.renderWin(); } }, UI.itemIcon(id, 44), h("span", { class: "tname", text: it.name.replace(" (임시)", "") }), h("span", { class: "tcount", text: "×" + S.inv[id] }))); });
    const det = h("div", { class: "detail" });
    if (sel) {
      const it = AU.ITEMS[sel]; det.append(h("div", { class: "dhead" }, UI.itemIcon(sel, 56), h("h3", { text: it.name })), h("div", { class: "tags" }, h("span", { class: "tag", text: TYPE[it.type] }), it.slot ? h("span", { class: "tag", text: AU.SLOT_LABEL[it.slot] }) : null, it.rarity ? h("span", { class: "tag", text: (AU.RARITY[it.rarity] || {}).label }) : null, h("span", { class: "tag", text: "보유 " + S.inv[sel] })), h("p", { text: it.desc }));
      if (it.stats) det.append(h("p", { class: "stat", text: Object.entries(it.stats).map(([k, v]) => statName(k) + " +" + v).join(" · ") }));
      if (it.type === "use") det.append(btn("사용", "primary", () => AU.G.useItem(sel)));
      if (it.type === "etc" && it.sell > 0) det.append(h("p", { class: "stat", text: "판매가 은화 " + it.sell }), h("p", { class: "note", text: "포르투 노바의 잡화상인에게 팔 수 있습니다." }));
      if (it.type === "equip") det.append(btn("장착", "primary", () => AU.G.equip(sel)), btn("장비창에서 비교", "", () => { UI.selected.eq = sel; UI.open("equipment"); }));
      if (it.type === "quest") det.append(h("p", { class: "note", text: "퀘스트용 아이템입니다. 사용하거나 장착할 수 없습니다." }));
      if (it.type === "story") det.append(h("p", { class: "note", text: "이야기와 관련된 중요한 물건입니다. 사용하거나 버릴 수 없고, 본편에서도 계속 간직합니다." }));
    } else det.append(h("p", { class: "empty", text: "아이템을 선택하면 설명이 표시됩니다." }));
    b.append(h("div", { class: "silver", text: "은화 " + S.silver }), h("div", { class: "split inv" }, grid, det));
  };
  const statName = (k) => ({ atk: "공격력", hp: "최대 HP", dodge: "회피율", crit: "치명타율" }[k] || k);

  R.equipment = function (b) {
    const S = AU.G.S, d0 = AU.G.d();
    const slots = h("div", { class: "eqslots" });
    for (const slot of Object.keys(S.equip)) {
      const id = S.equip[slot], it = id && AU.ITEMS[id];
      slots.append(h("div", { class: "eqslot" }, h("div", { class: "eqlabel", text: AU.SLOT_LABEL[slot] }), it ? UI.itemIcon(id, 40) : null, h("div", { class: "eqname", text: it ? it.name.replace(" (임시)", "") : "비어 있음" }),
        it ? h("div", { class: "stat", text: Object.entries(it.stats).map(([k, v]) => statName(k) + " +" + v).join(" · ") }) : null,
        it ? btn("해제", "", () => AU.G.unequip(slot)) : null));
    }
    const cands = Object.keys(S.inv).filter((id) => AU.ITEMS[id].type === "equip");
    const sel = UI.selected.eq && S.inv[UI.selected.eq] ? UI.selected.eq : cands[0]; UI.selected.eq = sel;
    const list = h("div", { class: "itemgrid small" }); if (!cands.length) list.append(h("p", { class: "empty", text: "가방에 장착할 수 있는 장비가 없습니다." }));
    cands.forEach((id) => list.append(h("button", { type: "button", class: "item" + (id === sel ? " sel" : ""), onclick: () => { UI.selected.eq = id; UI.renderWin(); } }, UI.itemIcon(id, 30), h("span", { class: "iname", text: AU.ITEMS[id].name.replace(" (임시)", "") }), h("span", { class: "itype t-equip", text: AU.SLOT_LABEL[AU.ITEMS[id].slot] }))));
    const pv = h("div", { class: "detail" }, h("h3", { text: "능력치 변화 미리보기" }));
    if (sel) {
      const it = AU.ITEMS[sel], d1 = AU.derive(S, { equip: { [it.slot]: sel } });
      pv.append(h("p", { class: "note", text: AU.SLOT_LABEL[it.slot] + " 칸에 [" + it.name.replace(" (임시)", "") + "]을 장착하면:" }));
      [["공격력", "atk", ""], ["최대 HP", "maxHp", ""], ["회피율", "dodge", "%"], ["치명타율", "crit", "%"]].forEach(([n, k, u]) => {
        const diff = +(d1[k] - d0[k]).toFixed(2); pv.append(h("div", { class: "cmp" }, h("span", { text: n }), h("span", { text: d0[k] + u + " → " }), h("b", { class: diff > 0 ? "up" : diff < 0 ? "down" : "", text: d1[k] + u }), h("span", { class: "diff", text: diff ? (diff > 0 ? "+" : "") + diff : "변화 없음" })));
      });
      pv.append(btn("장착", "primary", () => AU.G.equip(sel)));
    } else pv.append(h("p", { class: "empty", text: "장비를 고르면 장착 전 변화를 볼 수 있습니다." }));
    b.append(slots, h("div", { class: "split" }, list, pv));
  };

  /* 마음 능력치(PERMA 5) 표시: 수치·막대·방금 오른 양. 스탯 창과 수행 기록 탭에서 같이 씀 */
  UI.mindBlock = function () {
    const S = AU.G.S, last = S.mind && S.mind.last, tr = AU.G.mindTrend(), keys = Object.keys(AU.PERMA);
    const box = h("div", { class: "mindbox" }, h("h3", { text: "마음 성장 · 실천 경험" }));
    // 오각형 레이더: 바깥쪽이 영역별 만점(해당 영역 미션 점수 합). 현재(초록 면) vs 이전(회색 점선)
    const CX = 130, CY = 124, R0 = 92, pt = (i, f) => { const a = -Math.PI / 2 + i * 2 * Math.PI / keys.length; return [CX + Math.cos(a) * R0 * f, CY + Math.sin(a) * R0 * f]; };
    const poly = (f) => keys.map((k, i) => pt(i, f(k)).map((n) => n.toFixed(1)).join(",")).join(" ");
    let svg = '<svg viewBox="0 0 260 250" role="img" aria-label="마음 능력치 레이더: 이번 주와 지난주 비교">';
    for (const r of [0.25, 0.5, 0.75, 1]) svg += '<polygon points="' + poly(() => r) + '" fill="none" stroke="#d9e0d8" stroke-width="' + (r === 1 ? 1.6 : 1) + '"/>';
    keys.forEach((k, i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.2); svg += '<line x1="' + CX + '" y1="' + CY + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#d9e0d8"/><text x="' + lx.toFixed(1) + '" y="' + (ly + 5).toFixed(1) + '" text-anchor="middle" class="rl">' + k + '</text>'; });
    svg += '<polygon points="' + poly((k) => tr[k].prevPct / 100) + '" fill="none" stroke="#7a828a" stroke-width="2.2" stroke-dasharray="2 4" stroke-linecap="round" stroke-linejoin="round"/>';
    svg += '<polygon class="rcur" points="' + poly((k) => tr[k].curPct / 100) + '" fill="rgba(79,125,110,.16)" stroke="#2f6b57" stroke-width="2.6" stroke-linejoin="round"/>';
    keys.forEach((k, i) => { const [x, y] = pt(i, tr[k].curPct / 100); svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.6" fill="#4F7D6E" stroke="#fff" stroke-width="1.5"/>'; });
    svg += "</svg>";
    const chart = h("div", { class: "mrad" }), holder = h("div", { class: "mradsvg", "data-radar": "1" }); holder.innerHTML = svg;
    chart.append(holder, h("div", { class: "mleg" }, h("span", { class: "lg cur", text: "이번 주 (실선)" }), h("span", { class: "lg prev", text: "지난주 (점선)" })));
    const rows = h("div", { class: "mrows" });
    for (const k of keys) {
      const t = tr[k], fresh = last && last.k === k;
      rows.append(h("div", { class: "mrow" + (fresh ? " fresh" : ""), "data-perma": k },
        h("b", { text: k }), h("span", { class: "mn", text: AU.PERMA[k] }),
        h("div", { class: "mbar" }, h("i", { style: "width:" + t.curPct + "%" }), h("s", { class: "mprev", style: "left:" + t.prevPct + "%", title: "이전 " + t.prev })),
        h("em", { class: "mv", text: t.cur + " / " + t.mx }), h("span", { class: "mcmp", text: "지난주 " + t.prev + " → 이번 주 " + t.cur + (t.diff ? " (" + (t.diff > 0 ? "+" : "") + t.diff + ")" : "") }),
        h("span", { class: "mup", text: fresh ? "방금 +" + last.n : "" })));
    }
    box.append(h("div", { class: "mtrend" }, chart, rows));
    box.append(h("p", { class: "note", text: "현실 활동을 완료하면 활동 등급에 따라 점수가 오르고, 인증하면 더 크게 쌓입니다. 점선은 이번 주가 시작될 때(지난주까지)의 기록입니다." }));
    box.append(h("p", { class: "note", text: "이것은 게임 속 활동 점수이며 행복이나 건강 상태를 재는 검사 점수가 아닙니다. 전투에는 영향을 주지 않습니다." }));
    if (AU.G.rollMindWeek()) AU.G.save("mind");
    return box;
  };

  /* 모험일지에서 보이는 '내 방' 연동 카드: 나만의 공간의 세 칸(내 방·내 기록·내 변화)으로 바로 가는 입구 */
  UI.roomLink = function () {
    const g = AU.G.galleryState(), S = AU.G.S, done = new Set(S.missions.log.filter(e => e.state === "done" && !e.repeat).map(e => e.id)).size, tr = AU.G.mindTrend();
    const up = Object.keys(AU.PERMA).reduce((n, k) => n + Math.max(0, tr[k].diff || 0), 0), go = (k) => { UI.tab.gal = k; UI.open("gallery"); };
    return h("div", { class: "roomlink mindbox" }, h("h3", { text: "내 방" }),
      h("p", { class: "note", text: "완료한 현실 미션이 모이고, 받은 토큰으로 꾸미는 나만의 공간이에요." }),
      h("div", { class: "roomlink-stats" },
        h("span", { text: "완료한 활동 " + done + "개" }), h("span", { text: "토큰 " + g.tokens + "개" }), h("span", { text: "이번 주 마음 +" + up })),
      h("div", { class: "macts" }, btn("내 방 열기", "primary", () => go("room")), btn("내 기록 (영역별)", "", () => go("rec")), btn("내 변화 (오각형)", "", () => go("change"))));
  };

  UI.heroPreview = function (fallback) { // 설정한 외형(성별·머리·조끼·바지 색) 그대로의 전신 모습. 그림이 안 그려지면 초상화로 대체
    try {
      const cv = h("canvas", { width: 170, height: 210, class: "herocv", "aria-label": "내 캐릭터 외형" }), ctx = cv.getContext("2d");
      const pl = { x: 85, y: 200, dir: 1, onGround: true, vy: 0, flash: 0, atkT: 0, rope: false, dead: false };
      const draw = () => { try { ctx.clearRect(0, 0, 170, 210); ctx.save(); AU.World.drawHeroArt(ctx, pl, 0, false); ctx.restore(); } catch (e) { /* 무시 */ } };
      draw(); setTimeout(draw, 250); setTimeout(draw, 800);
      return cv;
    } catch (e) { return fallback; }
  };

  /* 시간이 필요한 현실·쉼 미션: 게임 안에서 안내와 타이머를 보여 주고, 시간이 지난 뒤에만 ‘해 봤어요’를 누를 수 있게 함 */
  UI.guided = function (title, g, onDone) {
    const wrap = UI.modalEl; UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
    const end = Date.now() + g.secs * 1000, fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    const circle = h("div", { class: "gcircle" }), phase = h("div", { class: "gphase" }), clock = h("div", { class: "gclock" }), tip = h("div", { class: "gtip" });
    const done = btn("해 봤어요", "primary", () => { close(); onDone(); }, { disabled: "" }), quit = btn("그만두기", "", () => close());
    const intro = g.intro ? h("ul", { class: "gintro" }, g.intro.map((t) => h("li", { text: t }))) : null;
    wrap.append(h("div", { class: "panel modal guided" }, h("h3", { text: title }), g.kind === "timer" ? null : circle, phase, clock, intro, g.kind === "steps" ? tip : null, h("div", { class: "choices" }, done, quit)));
    let iv = null;
    try { if (AU.Sfx) { AU.Sfx.play("timer_start"); if (g.kind === "breath") AU.Sfx.loopFile("breath_wave", true); } } catch (e) { /* 소리 실패는 무시 */ }   // 시작 종소리 + 호흡이면 물결 소리 반복
    const close = () => { clearInterval(iv); try { if (AU.Sfx) AU.Sfx.loopFile("breath_wave", false); } catch (e) { /* 무시 */ } UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; };
    const tick = () => {
      if (wrap.classList.contains("hidden")) { clearInterval(iv); return; }
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)), el = g.secs - left;
      clock.textContent = left > 0 ? "남은 시간 " + fmt(left) : "시간이 되었습니다. 수고하셨어요.";
      if (g.kind === "breath") { const t = el % 10, inh = t < 4; phase.textContent = left > 0 ? (inh ? "들이쉬세요… " + (4 - t) : "내쉬세요… " + (10 - t)) : ""; const f = inh ? t / 4 : 1 - (t - 4) / 6; circle.style.transform = "scale(" + (0.55 + 0.45 * f).toFixed(3) + ")"; }
      else if (g.kind === "steps") { const i = Math.min(g.steps.length - 1, Math.floor(el / (g.secs / g.steps.length))); phase.textContent = left > 0 ? (i + 1) + " / " + g.steps.length : ""; tip.textContent = left > 0 ? g.steps[i] : ""; }
      else phase.textContent = "";
      if (left <= 0) { done.removeAttribute("disabled"); done.classList.add("ready"); clearInterval(iv); try { if (AU.Sfx) AU.Sfx.loopFile("breath_wave", false); } catch (e) { /* 무시 */ } }
    };
    iv = setInterval(tick, 250); tick();
  };

  /* 짧은 자기평가: 답변 여부에 따른 가산점 없음. */
  UI.missionPlanLabel = function(p) {
    if(!p)return "자유 수행";
    if(p.mode==="weekly_count")return "주 "+p.count+"회";
    if(p.mode==="weekdays")return "요일 "+p.days.map(d=>["일","월","화","수","목","금","토"][d]).join("·");
    if(p.mode==="interval")return p.interval+"일마다";
    return ({free:"자유 수행",daily:"매일",paused:"일시 중지"})[p.mode]||"자유 수행";
  };
  UI.missionPlanEditor = function(m) {
    const wrap=UI.modalEl;UI.modal=true;wrap.classList.remove("hidden");wrap.innerHTML="";
    const p=AU.G.missionPlan(m.id),mode=h("select",{"aria-label":"수행 주기"}),details=h("div");
    for(const [v,label] of [["free","자유 수행"],["daily","매일"],["weekly_count","주간 횟수"],["weekdays","요일 지정"],["interval","일정 간격"],["paused","일시 중지"]])mode.append(h("option",{value:v,text:label}));
    mode.value=p.mode;
    const count=h("select",{"aria-label":"주간 횟수"}),interval=h("select",{"aria-label":"일정 간격"});
    for(let i=1;i<=7;i++)count.append(h("option",{value:String(i),text:i+"회"}));
    for(let i=2;i<=30;i++)interval.append(h("option",{value:String(i),text:i+"일"}));
    count.value=String(p.count||3);interval.value=String(p.interval||3);
    const days=["일","월","화","수","목","금","토"].map((name,i)=>h("label",{class:"note"},h("input",{type:"checkbox",value:String(i)}),name));
    days.forEach(x=>x.querySelector("input").checked=(p.days||[1,3,5]).includes(Number(x.querySelector("input").value)));
    const remind=h("input",{type:"checkbox"});remind.checked=!!p.remind;
    const show=()=>{details.replaceChildren();
      if(mode.value==="weekly_count")details.append(h("label",{class:"note"},"일주일에 ",count));
      if(mode.value==="weekdays")details.append(h("div",{class:"choices"},...days));
      if(mode.value==="interval")details.append(h("label",{class:"note"},"며칠마다 ",interval));
      if(!["free","paused"].includes(mode.value))details.append(h("label",{class:"note"},remind,"게임 내 오늘의 활동 표시 (푸시 알림 아님)"));
    };
    mode.addEventListener("change",show);show();
    const close=()=>{UI.modal=false;wrap.classList.add("hidden");wrap.innerHTML="";};
    const save=()=>{const x={mode:mode.value,count:Number(count.value),interval:Number(interval.value),days:days.filter(x=>x.querySelector("input").checked).map(x=>Number(x.querySelector("input").value)),remind:remind.checked};if(AU.G.setMissionPlan(m.id,x))close();else AU.G.toast("요일을 한 개 이상 선택해 주세요.","warn")};
    wrap.append(h("div",{class:"panel modal restnote"},h("h3",{text:m.title+" · 나의 수행 주기"}),h("p",{class:"note",text:"계획 변경은 자유롭습니다. 미수행 불이익과 출석 연속 기록은 없습니다."}),mode,details,h("div",{class:"choices"},btn("저장","primary",save),btn("취소","",close))));
  };
  UI.missionReview = function (m, next, onSubmit, ropts) {
    ropts = ropts || {};
    const wrap = UI.modalEl; UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
    const evidencePanel = AU.MissionEvidence.panel(m);
    // 리커트 5점 척도: 진술문에 대한 동의 정도
    const LIKERT = ["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"];
    const Q = [
      { key: "challenge", text: "이 활동은 나에게 도전적이었다.", hint: "어렵게 느껴졌다면 높게, 쉬웠다면 낮게 골라 주세요." },
      { key: "meaning", text: "이 활동은 나에게 의미가 있었다.", hint: "정답은 없습니다. 느낀 그대로 골라 주세요." },
      { key: "satisfaction", text: "활동을 마친 지금, 만족스럽다.", hint: "낮은 만족도도 그대로 기록해 주세요." },
    ];
    const ans = { challenge: null, meaning: null, satisfaction: null };
    let step = 0, busy = false;
    let feelText = ""; const steps = (ropts.feeling ? [{ feeling: true }] : []).concat(Q.map((q) => ({ q })));
    const close = () => { evidencePanel.dispose(); UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; };
    const finish = async (review) => { if (busy) return; busy = true; try { const evidence = await evidencePanel.value(); close(); const ok = onSubmit(review, evidence); if (ok === false) { if (evidence && evidence.photoId && AU.MissionEvidence) AU.MissionEvidence.remove(evidence.photoId).catch(() => {}); AU.G.toast("지금은 이 활동을 기록할 수 없습니다. 상태가 바뀌었을 수 있어 목록을 새로 불러왔습니다. 첨부한 사진은 저장하지 않았습니다.", "info"); UI.renderWin && UI.renderWin(); } else if (next === "done" && AU.FirstMissionGuide) setTimeout(() => AU.FirstMissionGuide.maybeOffer(), 350); } catch (e) { busy = false; AU.G.toast(e.message || "보조 기록 저장 실패. 첨부를 제거하고 다시 시도하세요.", "info"); } };
    const submit = () => {
      const review = { ...ans, efficacy: null, mood: null, note: feelText.trim().slice(0, 200) };
      if (!AU.G.validMissionFeedback(review)) return;
      finish(review);
    };
    const go = (n) => { step = Math.max(0, Math.min(steps.length - 1, n)); draw(); };
    const likertRow = (q) => {
      const row = h("div", { class: "likert", role: "radiogroup", "aria-label": q.text });
      LIKERT.forEach((label, i) => {
        const v = i + 1;
        const b = h("button", { type: "button", class: "likert-btn" + (ans[q.key] === v ? " selected" : ""), role: "radio", "aria-checked": String(ans[q.key] === v), "aria-label": v + " " + label },
          h("b", { text: String(v) }), h("span", { text: label }));
        b.addEventListener("click", () => { ans[q.key] = v; draw(); setTimeout(() => { if (step < steps.length - 1 && steps[step].q.key === q.key) go(step + 1); }, 220); });
        row.append(b);
      });
      return row;
    };
    function draw() {
      wrap.innerHTML = "";
      const s = steps[step], total = steps.length;
      const dots = h("div", { class: "rv-dots", "aria-hidden": "true" }, steps.map((_, i) => h("i", { class: i < step ? "done" : i === step ? "cur" : "" })));
      const head = [h("h3", { text: m.title + " · 활동 돌아보기" }), h("div", { class: "rv-prog" }, dots, h("span", { text: (step + 1) + " / " + total }))];
      const last = step === total - 1, body = [], acts = [];
      if (s.feeling) {
        const sp = AU.SPAN_LABEL[m.span || 1] || (m.span + "일"), ta = h("textarea", { class: "memo", maxlength: "200", rows: "3", placeholder: "예: 처음엔 귀찮았는데 하고 나니 가벼워졌어요." });
        ta.value = feelText; const nb = btn("다음", "primary", () => go(step + 1), feelText.trim() ? {} : { disabled: "" });
        ta.addEventListener("input", () => { feelText = ta.value; if (feelText.trim()) nb.removeAttribute("disabled"); else nb.setAttribute("disabled", ""); });
        body.push(h("p", { class: "rv-q", text: sp + " 동안 수행하면서 기분이 어떠했나요?" }), h("p", { class: "note rv-hint", text: "좋았던 점, 힘들었던 점 모두 괜찮아요. 느낀 그대로 적어 주세요." }), ta);
        acts.push(nb);
        const foot0 = h("div", { class: "rv-foot" }, btn("취소", "", close));
        wrap.append(h("div", { class: "panel modal restnote review-step" }, h("h3", { text: m.title + " · 활동 돌아보기" }), h("div", { class: "rv-prog" }, dots, h("span", { text: (step + 1) + " / " + total })), ...body, h("div", { class: "choices" }, ...acts), foot0));
        return;
      }
      const q = s.q;
      body.push(h("p", { class: "rv-q", text: q.text }), h("p", { class: "note rv-hint", text: q.hint }), likertRow(q));
      if (step > 0) acts.push(btn("이전", "", () => go(step - 1)));
      if (last) {
        // 사진·시간 기록은 질문이 아닌 첨부이므로 선택 사항으로 마지막 화면에만 둔다.
        body.push(evidencePanel.root);
        const ready = ["challenge", "meaning", "satisfaction"].every((k) => ans[k]);
        acts.push(btn(next === "partial" ? "시도 기록하기" : "평가하고 완료하기", "primary", submit, ready ? {} : { disabled: "" }));
      } else if (ans[q.key]) acts.push(btn("다음", "primary", () => go(step + 1)));
      const foot = h("div", { class: "rv-foot" }, btn("평가 없이 계속", "", () => finish(null)), btn("취소", "", close));
      wrap.append(h("div", { class: "panel modal restnote review-step" }, ...head, ...body, h("div", { class: "choices" }, ...acts), foot));
    }
    draw();
  };

  /* 한 줄 글 입력 창: 격려 문구 + 질문 + 입력칸. 기간형 활동의 중간 확인·수행 못함·재제시에서 같이 씀 */
  UI.askText = function (o) {
    const wrap = UI.modalEl; UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
    const ta = h("textarea", { class: "memo", maxlength: "300", rows: "3", placeholder: o.placeholder || "" }); let busy = false;
    const close = () => { UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; UI.renderWin(); };
    const ok = btn(o.ok || "저장", "primary", () => { const v = ta.value.trim(); if (o.required && !v) return; if (busy) return; busy = true; close(); o.onSubmit(v); }, o.required ? { disabled: "" } : {});
    ta.addEventListener("input", () => { if (!o.required || ta.value.trim()) ok.removeAttribute("disabled"); else ok.setAttribute("disabled", ""); });
    wrap.append(h("div", { class: "panel modal restnote review-step" }, h("h3", { text: o.title }),
      o.lead ? h("p", { class: "note", text: o.lead }) : null, h("p", { class: "rv-q", text: o.question }), ta,
      h("div", { class: "choices" }, ok, ...(o.extra || []), btn(o.cancel || "닫기", "", close))));
  };
  /* 중간 확인(7일형): 수행하면서 어려운 점 */
  UI.missionMidCheck = function (m) {
    UI.askText({ title: m.title + " · 중간 확인", lead: "지금까지 해 보신 것만으로도 충분해요. 잠깐 돌아봐요.", question: "수행하면서 어려운 부분이 있나요? 있다면 무엇인가요?",
      placeholder: "없으면 비워 두셔도 돼요.", ok: "확인 기록하기", onSubmit: (v) => AU.G.midCheck(m.id, v) });
  };
  /* 중도 포기: 격려 + 다시 도전 의향 */
  UI.missionQuit = function (m) {
    const wrap = UI.modalEl; UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
    const close = () => { UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; UI.renderWin(); };
    const go = (retry) => { close(); AU.G.resolveMission(m.id, "quit", { retry }); AU.G.toast(retry ? "다시 시작해요. 오늘부터 새로 기간이 시작됩니다." : "괜찮아요. 다른 활동을 먼저 준비했어요. 이 활동은 보관함에 있어요.", "info"); };
    wrap.append(h("div", { class: "panel modal restnote review-step" }, h("h3", { text: m.title + " · 여기까지 해도 괜찮아요" }),
      h("p", { class: "note", text: "여기까지 해 본 것만으로도 의미 있는 경험이에요. 그만두는 것도 선택이에요." }),
      h("p", { class: "rv-q", text: "다시 도전해볼 의향이 있나요?" }),
      h("div", { class: "choices" }, btn("네, 다시 도전할게요", "primary", () => go(true)), btn("아니요, 다른 활동을 볼게요", "", () => go(false)), btn("닫기", "", close))));
  };
  /* 기한이 지난 활동: 상태를 골라 정리 */
  /* 완료 방법: 어디서 무엇을 하고 어디에 기록하는지 한 줄로 */
  UI.missionHow = function (m) {
    const k = AU.MissionEvidence ? AU.MissionEvidence.kind(m) : "record";
    const how = { timer: "③ 앱 안의 타이머를 켜고 해 보세요. 시간이 쌓이면 인증돼요.", photo: "③ 결과물 사진을 올릴 수 있어요(선택). 사진은 이 기기에만 저장되고, 올리지 않아도 완료할 수 있어요.", record: "③ 무엇을 했는지 한 줄을 이 게임 안에 적어요(선택). 적은 글은 이 기기에만 저장돼요." }[k] || "";
    return "이렇게 해요 · ① 현실에서 직접 해 봅니다. ② 모험일지 ▸ 현실 활동 ▸ 내 활동에서 '완료했어요'를 누릅니다. " + how;
  };
  /* 접속 안내: 기한이 지난 현실미션이 있으면 한 번 알려 줌 */
  UI.missionNotice = function () {
    const n = AU.G.overdueMissions().length; if (!n || UI.modal) return false;
    const wrap = UI.modalEl; UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
    const close = () => { UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; };
    wrap.append(h("div", { class: "panel modal restnote review-step missionnotice" }, h("h3", { text: "현실 미션이 있습니다" }),
      h("p", { class: "rv-q", text: "현실 미션을 확인해 보세요." }), h("p", { class: "note", text: "기한이 지난 미션 " + n + "개가 기다리고 있어요. 부담 없이 지금 상태를 알려 주세요." }),
      h("div", { class: "choices" }, btn("확인하러 가기", "primary", () => { close(); UI.tab.jg = "real"; UI.tab.j = "missions"; UI.tab.missionStatus = "active"; UI.open("journal"); }), btn("나중에", "", close))));
    return true;
  };
  UI.missionOverdue = function (m) {
    const wrap = UI.modalEl; UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
    const close = () => { UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; UI.renderWin(); };
    wrap.append(h("div", { class: "panel modal restnote review-step" }, h("h3", { text: m.title + " · 기한이 지났어요" }),
      h("p", { class: "note", text: "괜찮아요. 일이 바쁘거나 마음이 안 따라 줄 때도 있어요. 지금 어떤 상태인지 골라 주세요." }),
      h("div", { class: "choices", style: "flex-direction:column;align-items:stretch" },
        btn("아직 하고 있어요 (기한 늘리기)", "primary", () => { close(); AU.G.resolveMission(m.id, "extend"); AU.G.toast("기한을 늘렸어요.", "info"); }),
        btn("끝냈어요", "", () => { close(); UI.missionReview(m, "done", (f, e) => AU.G.setMissionState(m.id, "done", f, e), { feeling: (m.span || 1) > 1 }); }),
        btn("하다가 그만뒀어요", "", () => { close(); UI.missionQuit(m); }),
        btn("수행하지 못했어요", "", () => { close(); UI.missionNotDone(m); }),
        btn("닫기", "", close))));
  };
  /* 수행하지 못함: 격려 + 필요한 것 → 더 쉬운 활동 제시 */
  UI.missionNotDone = function (m) {
    UI.askText({ title: m.title + " · 시작하지 못했어도 괜찮아요", lead: "시작이 가장 어려운 법이에요. 이번엔 조금 더 가벼운 활동부터 다시 제안해 드릴게요.",
      question: "미션을 수행하기 위해서 필요한 것이 있다면 무엇인가요?", placeholder: "예: 시간이 더 있으면, 같이 할 사람이 있으면…", ok: "기록하고 마치기", required: true,
      onSubmit: (v) => { AU.G.resolveMission(m.id, "notdone", { text: v }); AU.G.toast("기록했어요. 더 가벼운 활동을 준비했고, 이 활동은 보관함에서 나중에 다시 만나요.", "info"); } });
  };
  /* 다시 제시된 활동 수락 전: 성공하려면 필요한 것 */
  UI.missionReoffer = function (m) {
    const r = AU.G.ms(m.id);
    UI.askText({ title: m.title + " · 다시 만났네요", lead: r.need ? "지난번에 적어 주신 필요한 것: " + r.need : "전에 보관해 둔 활동이에요. 이번에는 어떻게 하면 해 볼 수 있을지 생각해 봐요.",
      question: "이 활동을 성공하기 위해서 필요한 것이 무엇이라고 생각하나요?", placeholder: "예: 저녁 먹고 바로 시작하기", ok: "적고 수락하기", required: true,
      onSubmit: (v) => { AU.G.setReofferNote(m.id, v); AU.G.setMissionState(m.id, "accept"); } });
  };

  /* 완료한 활동을 나중에 인증하면 남은 보상을 받는 창 */
  UI.missionVerify = function (m) {
    const wrap = UI.modalEl; UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
    const panel = AU.MissionEvidence.panel(m), rw = AU.G.missionReward(m); let busy = false;
    const close = () => { panel.dispose(); UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; UI.renderWin(); };
    const ok = btn("인증하고 보상 받기", "primary", async () => {
      if (busy) return; busy = true;
      try { const ev = await panel.value(); if (!ev) { AU.G.toast("인증 내용을 입력하거나 기록해 주세요.", "info"); busy = false; return; } const done = AU.G.verifyMission(m.id, ev); if (done === false && ev.photoId) AU.MissionEvidence.remove(ev.photoId).catch(() => {}); close(); }
      catch (e) { AU.G.toast(String(e && e.message || e), "info"); busy = false; }
    });
    wrap.append(h("div", { class: "panel modal restnote review-step" }, h("h3", { text: m.title + " · 인증하기" }),
      h("p", { class: "note", text: "인증하면 남은 보상(토큰 +" + rw.extra.tokens + (rw.extra.mind ? " · 마음 +" + rw.extra.mind : "") + ")을 받습니다. 인증 내용은 이 기기에만 보관됩니다." }),
      panel.root, h("div", { class: "choices" }, ok, btn("닫기", "", close))));
  };

  UI.restNote = function (m, onSubmit) {
    const wrap = UI.modalEl; UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
    const feeling = h("select", { "aria-label": "활동 후 느낀 상태" });
    feeling.append(h("option", { value: "", text: "느낀 상태를 선택해 주세요" }));
    for (const [value, label] of [["calm","조금 편안해졌어요"],["same","별다른 변화가 없었어요"],["mixed","여러 감정이 섞여 있어요"],["tense","아직 긴장되거나 불편해요"],["other","그 밖의 느낌이에요"]]) feeling.append(h("option", { value, text: label }));
    const ta = h("textarea", { class: "memo", maxlength: String(C.fatigue.restNoteMax), rows: "3", placeholder: "선택: 경험을 자유롭게 적어 주세요." });
    const close = () => { UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; };
    const ok = btn("쉼 기록하고 마치기", "primary", () => { if (!feeling.value) return; close(); onSubmit({ feeling: feeling.value, note: ta.value }); }, { disabled: "" });
    feeling.addEventListener("change", () => { if (feeling.value) ok.removeAttribute("disabled"); else ok.setAttribute("disabled", ""); });
    wrap.append(h("div", { class: "panel modal restnote" }, h("h3", { text: m.title + " · 쉰 뒤 어떤 느낌이었나요?" }),
      h("p", { class: "note", text: "느낀 상태를 선택하면 기록할 수 있습니다. 편안해지지 않았더라도 보상은 같습니다. 글쓰기는 선택입니다." }),
      feeling, ta, h("div", { class: "choices" }, ok, btn("취소", "", close))));
  };

  R.stats = function (b) {
    const S = AU.G.S, P = UI.pending, pend = Object.values(P).reduce((a, c) => a + c, 0), pool = AU.G.pool(), left = pool - pend;
    const tot = {}; for (const k of Object.keys(S.stats)) tot[k] = AU.statTotal(S, k) + P[k];
    const d0 = AU.G.d(), d1 = AU.derive(S, { stats: tot });
    const NAMES = { STR: ["근력", "공격력"], VIT: ["체력", "최대 HP"], AGI: ["민첩", "회피"], DEX: ["기교", "치명타"], WIL: ["의지", "스킬 피로 효율"] };
    const pk = AU.Profile.portraitKey(), pt = AU.Img.has(pk) ? h("img", { src: AU.ASSETS[pk].path, alt: "" }) : h("div", { class: "ptfallback", text: "나" });
    const left1 = h("div", { class: "statchar" }, h("div", { class: "pt hero" }, UI.heroPreview(pt)), h("div", { class: "cname", text: AU.Profile.name() || "모험가" }), h("div", { class: "clv", text: "Lv." + S.level + " · " + AU.jobName(S) }),
      h("div", { class: "ptbox" }, h("div", { class: "ptrow" }, h("span", { text: "레벨 포인트" }), h("b", { text: S.freePoints + (S.freePoints > 0 && !AU.G.gateOpen() ? " 🔒" : "") })), h("div", { class: "ptrow" }, h("span", { text: "훈련 포인트" }), h("b", { text: S.trainingPoints })), h("div", { class: "ptrow big" }, h("span", { text: "분배 가능" }), h("b", { text: left }))),
      h("div", { class: "tiers" }, AU.JOB_TIERS.map((t) => h("div", { class: "tier" + (S.level >= t.level ? " reach" : "") }, h("b", { text: "Lv." + t.level }), h("span", { text: t.name })))));
    const rows = h("div", { class: "statrows" });
    for (const k of Object.keys(S.stats)) {
      const base = S.stats[k], al = S.alloc[k], pd = P[k];
      rows.append(h("div", { class: "statrow" }, h("div", { class: "sn" }, h("b", { text: k }), h("span", { text: NAMES[k][0] })), h("div", { class: "sv" }, h("b", { text: base + al + pd }), pd ? h("em", { class: "pp", text: "(+" + pd + ")" }) : (al ? h("em", { text: "(분배 +" + al + ")" }) : null)),
        h("div", { class: "sdesc", text: NAMES[k][1] }), h("div", { class: "sbtns" }, btn("−", "mini", () => { if (P[k] > 0) { P[k]--; UI.renderWin(); } }, { disabled: pd <= 0 ? "" : null, "aria-label": NAMES[k][0] + " 줄이기" }), btn("+", "mini plus", () => { if (left > 0) { P[k]++; UI.renderWin(); } }, { disabled: left <= 0 ? "" : null, "aria-label": NAMES[k][0] + " 늘리기" }))));
    }
    const eq = AU.equipBonus(S);
    const cmp = (label, k, u, bonus) => h("div", { class: "cmp" }, h("span", { text: label }), h("b", { text: d0[k] + u }), d1[k] !== d0[k] ? h("span", { text: "→ " }) : null, d1[k] !== d0[k] ? h("b", { class: "up", text: d1[k] + u }) : null, bonus ? h("em", { text: "장비 +" + bonus + u }) : null);
    const derived = h("div", { class: "derived" }, h("h3", { text: "전투 능력치" }), cmp("공격력", "atk", "", eq.atk), cmp("최대 HP", "maxHp", "", eq.hp), cmp("회피율", "dodge", "%", eq.dodge), cmp("치명타율", "crit", "%", eq.crit), cmp("스킬 피로 감소", "eff", "%", 0));
    const actions = h("div", { class: "statactions" }, btn("초기화", "", () => { UI.resetPending(); UI.renderWin(); }, { disabled: pend ? null : "" }), btn("적용 (" + pend + "점)", "primary", () => { const a = {}; for (const k of Object.keys(P)) if (P[k]) a[k] = P[k]; if (AU.G.applyAllocation(a)) UI.resetPending(); UI.renderWin(); }, { disabled: pend ? null : "" }));
    const locked = false, hint = pool > 0 ? "레벨 포인트는 현실 미션을 하지 않아도 사용할 수 있습니다. 기존에 획득한 훈련 포인트도 사용할 수 있습니다. ＋ 버튼으로 배분한 뒤 [적용]을 눌러 확정하세요." : (AU.G.awakened() ? "남은 포인트가 없습니다. 레벨업하면 전투 스탯을 얻으며, 현실 미션은 갤러리 토큰과 마음 성장을 제공합니다." : "1~9레벨은 능력치가 자동으로 성장합니다. 10레벨 힘의 각성 이후 직접 분배할 수 있습니다.");
    b.append(h("div", { class: "statlayout" }, left1, h("div", { class: "statmid" }, rows, h("p", { class: "note", text: hint }), locked ? btn("현실 미션 보기", "primary", () => { UI.tab.jg = "real"; UI.tab.j = "missions"; UI.open("journal"); }) : null, actions), derived));
  };

  R.worldContinent = function (b) {
    const S = AU.G.S, cur = AU.World.mapId, RG = AU.WORLD_REGIONS, here = (RG.find((r) => r.open && r.maps.includes(cur)) || RG[0]).id;
    const sel = RG.find((r) => r.id === UI.selected.region) || RG.find((r) => r.id === here); UI.selected.region = sel.id;
    const map = h("div", { class: "mapbox continent" }, UI.mapToggle());
    for (const r of RG) {
      const seen = r.open && r.maps.some((m) => S.visited[m]);
      map.append(h("button", { type: "button", class: "node" + (r.id === here ? " here" : "") + (seen ? "" : " unseen") + (r.id === sel.id ? " sel" : ""), style: "left:" + r.x + "%;top:" + r.y + "%", onclick: () => { UI.selected.region = r.id; UI.renderWin(); } }, h("i", { text: r.id === here ? "●" : seen ? "○" : "?" }), h("span", { text: seen ? r.name : r.open ? r.name : r.name + " · 미발견" })));
    }
    const seen = sel.open && sel.maps.some((m) => S.visited[m]);
    const info = h("div", { class: "detail" }, h("h3", { text: sel.open ? sel.name : "아직 가 보지 않은 땅 (" + sel.name + ")" }), h("div", { class: "tags" }, h("span", { class: "tag", text: sel.id === here ? "현재 권역" : seen ? "방문함" : "미발견" })), h("p", { text: sel.desc }));
    if (sel.open) { const ms = sel.maps.filter((m) => AU.MAPS[m] && !AU.MAPS[m].prologue); const vis = ms.filter((m) => S.visited[m]); info.append(h("p", { class: "note", text: "방문한 지역 " + vis.length + " / " + ms.filter((m) => !AU.MAPS[m].hidden || S.visited[m]).length }), h("p", { class: "note", text: vis.map((m) => AU.MAPS[m].name.replace(" (임시 명칭)", "")).join(" · ") }), btn("이 권역의 지역 지도 보기", "primary", () => { UI.tab.wm = "area"; UI.renderWin(); })); }
    b.append(h("div", { class: "split map" }, map, info), h("p", { class: "note", text: "● 현재 권역 · ○ 방문한 권역 · ? 미발견 · 대륙 이름과 다른 권역은 이야기가 진행되면 알게 됩니다." }));
  };
  UI.mapToggle = function () { const c = UI.tab.wm === "continent"; return h("button", { type: "button", class: "maptoggle", onclick: () => { UI.tab.wm = c ? "area" : "continent"; UI.renderWin(); } }, c ? "◀ 지역 지도" : "대륙 전체 보기"); };
  R.worldmap = function (b) {
    if (UI.tab.wm === "continent") return R.worldContinent(b);
    const S = AU.G.S, cur0 = AU.World.mapId, cur = (AU.MAPS[cur0] && AU.MAPS[cur0].parent) || cur0, sel = UI.selected.map || cur; UI.selected.map = sel;
    const destKind = {}; let curKind = "sub"; // 월드맵 목적지 표시: 메인(금색 ★)이 서브(파란 !)보다 우선
    const dest = { add: (m) => { if (m && destKind[m] !== "main") destKind[m] = curKind; }, has: (m) => !!destKind[m] };
    for (const [id, rec] of Object.entries(S.quests)) {
      if (rec.state === "done") continue; const q = AU.QUESTS[id]; curKind = AU.questKind(id);
      const mapOfNpc = (nid) => { const f = Object.keys(AU.MAPS).find((m) => !AU.MAPS[m].prologue && (!AU.MAPS[m].hidden || S.visited[m]) && (AU.MAPS[m].npcs || []).some((n) => n.id === nid)); return f && AU.MAPS[f].parent ? AU.MAPS[f].parent : f; };
      if (rec.state === "ready") { dest.add(mapOfNpc(q.turnIn || q.giver)); continue; }
      q.objectives.forEach((o, i) => { if (AU.G.objectiveDone(q, rec, i)) return;
        if (o.kind === "kill") for (const m of Object.keys(AU.MAPS)) { const mp = AU.MAPS[m]; if ((mp.spawns || []).some((s) => s.type === o.target) || (mp.boss && mp.boss.type === o.target)) dest.add(m); }
        if (o.kind === "talk" || o.kind === "deliver" || o.kind === "choice") dest.add(mapOfNpc(o.target));
        if (o.targets) for (const m of Object.keys(AU.MAPS)) if ((AU.MAPS[m].spots || []).some((s2) => o.targets.includes(s2.id))) dest.add(m); });
    }
    const map = h("div", { class: "mapbox" }, UI.mapToggle());
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("class", "maplines");
    for (const [a, c] of AU.AREA_LINKS) {
      if (AU.MAPS[a].interior || AU.MAPS[c].interior) continue;
      const A = AU.MAPS[a].area, B = AU.MAPS[c].area, both = S.visited[a] && S.visited[c];
      const ln = document.createElementNS("http://www.w3.org/2000/svg", "line"); ln.setAttribute("x1", A.x); ln.setAttribute("y1", A.y); ln.setAttribute("x2", B.x); ln.setAttribute("y2", B.y); ln.setAttribute("class", both ? "on" : "off"); svg.append(ln);
    }
    map.append(svg);
    for (const [id, m] of Object.entries(AU.MAPS)) {
      if (m.prologue || m.interior || (m.hidden && !S.visited[id])) continue; // 프롤로그 맵과 가지 못하는 지역은 월드맵에 표시하지 않음
      const seen = !!S.visited[id];
      map.append(h("button", { type: "button", class: "node" + (id === cur ? " here" : "") + (seen ? "" : " unseen") + (id === sel ? " sel" : ""), style: "left:" + m.area.x + "%;top:" + m.area.y + "%", onclick: () => { UI.selected.map = id; UI.renderWin(); } },
        h("i", { text: seen ? (id === cur ? "●" : "○") : "?" }), h("span", { text: seen ? m.name.replace(" (임시 명칭)", "") : "미발견" }), dest.has(id) ? h("u", { class: "dk-" + destKind[id], text: AU.QKIND[destKind[id]].icon, title: AU.QKIND[destKind[id]].label + " 퀘스트 목적지" }) : null));
    }
    const m = AU.MAPS[sel], seen = !!S.visited[sel];
    const mons = [...new Set((m.spawns || []).map((s) => s.type))].map((t) => AU.MONSTERS[t]);
    const info = h("div", { class: "detail" }, h("h3", { text: seen ? m.name : "아직 발견하지 못한 지역" }),
      h("div", { class: "tags" }, h("span", { class: "tag", text: sel === cur ? "현재 위치" : seen ? "방문함" : "미발견" }), dest.has(sel) ? h("span", { class: "tag dk-" + destKind[sel], text: AU.QKIND[destKind[sel]].icon + " " + AU.QKIND[destKind[sel]].label + " 퀘스트 목적지" }) : null, seen ? h("span", { class: "tag", text: m.safe ? "안전 지역" : "전투 지역" }) : null),
      h("p", { text: seen ? m.area.desc : "이 지역은 아직 가 보지 않았습니다. 길을 따라 이동하면 발견됩니다." }),
      seen && mons.length ? h("p", { class: "note", text: "출현: " + mons.map((x) => x.name + " Lv." + x.lv).join(", ") }) : null,
      ...(seen ? mons.map((x) => h("p", { class: "note", text: x.name + " 처치 시 드롭: " + [...(x.silver ? ["은화 " + Math.round((x.silverRate == null ? 0.5 : x.silverRate) * 100) + "%"] : []), ...(x.drops || []).map(([id, rate]) => (AU.ITEMS[id] ? AU.ITEMS[id].name.replace(" (임시)", "") : id) + " " + (rate * 100).toFixed(rate * 100 % 1 ? 1 : 0) + "%")].join(" · ") })) : []));
    b.append(h("div", { class: "split map" }, map, info), h("p", { class: "note", text: "● 현재 위치 · ○ 방문한 지역 · ? 미발견 · ★ 메인 퀘스트 목적지 · ! 서브 퀘스트 목적지" }));
  };

  R.quests = function (b) {
    const S = AU.G.S, tab = UI.tab.q || "active"; const TYPE = { main: AU.QKIND.main.label, sub: AU.QKIND.sub.label, real: AU.QKIND.real.label }; const QORD = { main: 0, sub: 1, real: 2 }; const tagText = (t) => AU.QKIND[t].icon + " " + TYPE[t];
    const rows = [];
    for (const [id, rec] of Object.entries(S.quests)) { const q = AU.QUESTS[id]; rows.push({ key: id, title: q.title, type: q.type, done: rec.state === "done", q, rec }); }
    if (S.flags.missionsUnlocked && S.flags.guideMet) for (const m of AU.MISSIONS) { const r = S.missions.states[m.id]; if (r && ["accepted", "attempted", "partial", "done"].includes(r.state)) rows.push({ key: m.id, title: m.title, type: "real", done: r.state === "done", m, r }); }
    const list = rows.filter((r) => (tab === "done") === r.done).sort((a, b) => QORD[a.type] - QORD[b.type]); // 메인 → 서브 → 현실 순으로 묶어 보여 줌
    const sel = list.find((r) => r.key === UI.selected.q) || list[0];
    const tabs = h("div", { class: "tabs" }, btn("진행 중 (" + rows.filter((r) => !r.done).length + ")", tab === "active" ? "on" : "", () => { UI.tab.q = "active"; UI.renderWin(); }), btn("완료 (" + rows.filter((r) => r.done).length + ")", tab === "done" ? "on" : "", () => { UI.tab.q = "done"; UI.renderWin(); }));
    const ul = h("div", { class: "qlist" }); if (!list.length) ul.append(h("p", { class: "empty", text: tab === "done" ? "완료한 퀘스트가 아직 없습니다." : "진행 중인 퀘스트가 없습니다. NPC에게 말을 걸어 보세요." }));
    let lastType = null;
    list.forEach((r) => { if (r.type !== lastType) { lastType = r.type; ul.append(h("div", { class: "qsec qk-" + r.type }, h("span", { class: "qki", text: AU.QKIND[r.type].icon }), TYPE[r.type] + (r.type === "real" ? " 미션" : " 퀘스트") + " (" + list.filter((x) => x.type === r.type).length + ")")); }
    ul.append(h("button", { type: "button", class: "qitem qk-" + r.type + (sel && sel.key === r.key ? " sel" : ""), onclick: () => { UI.selected.q = r.key; UI.renderWin(); } }, h("span", { class: "tag t-" + r.type, text: tagText(r.type) }), h("span", { text: r.title.replace(" (임시)", "") }), r.rec && r.rec.state === "ready" ? h("em", { text: "완료 가능" }) : null)); });
    const det = h("div", { class: "detail" });
    if (sel && sel.q) {
      const q = sel.q, rec = sel.rec;
      det.append(h("h3", { text: q.title }), h("div", { class: "tags" }, h("span", { class: "tag t-" + q.type, text: tagText(q.type) }), h("span", { class: "tag", text: rec.state === "done" ? "완료" : rec.state === "ready" ? "의뢰인에게 돌아가기" : "진행 중" })), h("p", { text: q.desc }),
        h("h4", { text: "수행 조건" }), ...q.objectives.map((o, i) => h("div", { class: "obj" + (AU.G.objectiveDone(q, rec, i) ? " ok" : "") }, (AU.G.objectiveDone(q, rec, i) ? "✔ " : "□ ") + UI.objText(o, rec, i))),
        h("h4", { text: "보상" }), h("p", { text: rewardText(q.reward) }), h("p", { class: "note", text: "의뢰인: " + AU.NPCS[q.giver].name }));
    } else if (sel && sel.m) {
      det.append(h("h3", { text: sel.m.title }), h("div", { class: "tags" }, h("span", { class: "tag", text: "현실" }), h("span", { class: "tag", text: AU.PERMA[sel.m.perma] }), h("span", { class: "tag", text: AU.MISSION_STATES[sel.r.state] })), h("p", { text: sel.m.desc }), h("p", { class: "note", text: "상태 변경은 모험일지(" + keyOf("journal") + ")에서 합니다." }),
        (() => { const pg = AU.G.missionProgress(sel.m.id); return pg ? h("p", { class: "note span-progress" + (pg.overdue ? " overdue" : ""), text: pg.overdue ? "기한이 지났어요 (마감 " + pg.due.slice(5).replace("-", "/") + ") · 모험일지에서 확인해 주세요" : pg.span + "일 중 " + pg.day + "일차 · " + (pg.left ? "남은 " + pg.left + "일" : "오늘까지") + " · 마감 " + pg.due.slice(5).replace("-", "/") + (pg.needMid ? " · 중간 확인할 때예요" : "") }) : null; })(),
        h("h4", { text: "이렇게 하면 완료예요" }), h("p", { text: "현실에서 해 본 뒤, 모험일지(" + keyOf("journal") + ") ▸ 현실 활동에서 이 미션의 ‘완료’(해 보기만 했다면 ‘시도’)를 눌러 기록하면 됩니다. 못 했다면 ‘건너뛰기’도 괜찮아요." }),
        (() => { // 나의 목표 적기: 이 미션으로 내가 무엇을 해 볼지 직접 적어 두는 칸(이 브라우저에 저장)
          const box = h("div", { class: "mgoal" }), inp = h("textarea", { class: "mgoal-in", rows: "2", maxlength: "120", placeholder: "예) 오늘은 책상 정리 10분만 해 보기" }), st = h("span", { class: "note" });
          inp.value = sel.r.goal || ""; const save = btn("목표 저장", "mini", () => { sel.r.goal = inp.value.trim().slice(0, 120); AU.G.save("mission_goal"); st.textContent = sel.r.goal ? "저장했어요." : "비웠어요."; });
          box.append(h("h4", { text: "나의 목표 적기 (선택)" }), inp, save, st); return box; })());
    } else det.append(h("p", { class: "empty", text: "퀘스트를 선택하면 자세한 내용이 표시됩니다." }));
    b.append(tabs, h("div", { class: "split q" }, ul, det));
  };
  const rewardText = (r) => [r.exp ? "경험치 " + r.exp : null, r.silver ? "은화 " + r.silver : null, ...(r.items || []).map(([i, n]) => AU.ITEMS[i].name + " ×" + n)].filter(Boolean).join(" · ") || "없음";

  UI.fatigueMeter = function (S, withActions) { // 스킬창·쉼 탭에 쓰는 큰 피로도 표시
    const pc = S.fatigue / S.fatigueMax, full = S.fatigue >= S.fatigueMax - 1e-6, cls = full ? "full" : pc >= 0.8 ? "hot" : pc >= 0.5 ? "mid" : "ok";
    const state = full ? "가득 참 — 스킬을 쓸 수 없습니다" : pc >= 0.8 ? "많이 쌓였습니다 — 곧 스킬을 쓸 수 없어요" : pc >= 0.5 ? "절반을 넘었습니다" : "여유 있습니다";
    const box = h("div", { class: "fmeter " + cls }, h("div", { class: "ftop" }, h("span", { class: "fname", text: "🌀 " + C.fatigue.name }), h("span", { class: "fnum" }, h("b", { text: String(+S.fatigue.toFixed(1)) }), " / " + S.fatigueMax), h("span", { class: "fstate", text: state })),
      h("div", { class: "fbar" }, h("i", { style: "width:" + (pc * 100).toFixed(1) + "%" })));
    if (withActions) box.append(h("div", { class: "fact" }, h("span", { class: "fhint", text: "스킬을 쓸수록 쌓이고, 쉬면 줄어듭니다." }),
      btn("휴식하기 (은화 " + AU.G.restPrice() + " · 피로도 −" + C.fatigue.restSilverRecover + ")", "mini", () => AU.G.restWithSilver(), { title: "오늘 남은 횟수 " + AU.G.restSilverLeft() + "회" }),
      S.flags.missionsUnlocked ? btn("쉼 현실 미션 보기", "mini", () => { UI.tab.jg = "real"; UI.tab.j = "rest"; UI.open("journal"); }) : null));
    return box;
  };

  R.skills = function (b) {
    const S = AU.G.S;
    if (!AU.G.awakened()) { b.append(h("div", { class: "lockbox" }, h("h3", { text: "아직 스킬이 열리지 않았습니다" }), h("p", { text: "10레벨에 이야기 속에서 힘이 깨어나면 스킬이 열립니다. (현재 " + AU.jobName(S) + " · Lv." + S.level + ")" }), h("p", { class: "note", text: "기본 공격(" + keyOf("attack") + ")은 " + C.fatigue.name + "가 쌓이지 않습니다." }))); return; }
    b.append(UI.fatigueMeter(S, true));
    b.append(h("p", { class: "note vigor", text: FATIGUE_TIP.replace(/^피로도: /, "피로도란? ") }));
    const slots = h("div", { class: "skslots" }, [0, 1, 2].map((i) => { const id = S.skills.slots[i]; return h("div", { class: "skslot" }, h("div", { class: "skey", text: keyOf("skill" + (i + 1)) }), h("div", { class: "skname", text: id ? AU.SKILLS[id].name.replace(" (임시)", "") : "비어 있음" }), id ? btn("해제", "mini", () => { S.skills.slots[i] = null; AU.G.save("skill"); AU.G.changed(); }) : null); }));
    const list = h("div", { class: "sklist" });
    for (const id of S.skills.unlocked) {
      const sk = AU.SKILLS[id], inSlot = S.skills.slots.indexOf(id);
      list.append(h("div", { class: "skitem" }, h("div", { class: "skhead" }, h("b", { text: sk.name }), inSlot >= 0 ? h("span", { class: "tag", text: "슬롯 " + (inSlot + 1) }) : null), h("p", { text: sk.desc }),
        h("div", { class: "stat", text: "피로도 +" + AU.G.skillCost(id) + (AU.G.skillCost(id) !== sk.cost ? " (기본 " + sk.cost + ", 의지 효율 적용)" : "") + " · 재사용 대기 " + sk.cd + "초" }),
        h("div", { class: "assign" }, [0, 1, 2].map((i) => btn("슬롯 " + (i + 1) + " (" + keyOf("skill" + (i + 1)) + ")", S.skills.slots[i] === id ? "on" : "mini", () => { const prev = S.skills.slots.indexOf(id); if (prev >= 0) S.skills.slots[prev] = S.skills.slots[i]; S.skills.slots[i] = id; AU.G.save("skill"); AU.G.changed(); })))));
    }
    b.append(h("h4", { text: "단축 슬롯" }), slots, h("h4", { text: "배운 스킬" }), list, h("p", { class: "note", text: "단축키 자체는 키보드 설정(" + keyOf("keysettings") + ")에서 바꿀 수 있습니다. 스킬은 레벨에 따라 하나씩 열립니다(Lv." + AU.SKILL_UNLOCK_LV.strike + " 1번 · Lv." + AU.SKILL_UNLOCK_LV.spin + " 2번 · Lv." + AU.SKILL_UNLOCK_LV.focus + " 3번)." }));
  };

  const PRO_CARDS = [["stele_read", "마을길 끝의 기념비", "축제를 앞둔 아침, 마을길 끝 기념비에서 다섯 용사의 이야기를 읽었다.", "road"], ["temple_work_complete", "신전을 짓는 아버지 곁에서", "신전 건축 현장에서 목수인 아버지를 도왔다. 평범하고 따뜻한 하루였다.", "temple"], ["banners_done", "축제 깃발", "축제 깃대에 깃발을 달아 마을을 꾸몄다.", "road"], ["festival_interaction_complete", "빛의 축제", "축제 광장에서 이웃들과 이야기를 나눴다.", "plaza"], ["attack_triggered", "갑작스러운 습격", "축제가 열리던 광장에 검은 무리가 들이닥쳤다.", "plaza_atk"], ["father_final_words_seen", "아버지의 마지막 말", "아버지는 낯선 금속 조각과 도구 가방을 맡기고 도망치라고 했다.", "house_atk"], ["arkea_escape_complete", "아르케아를 떠나며", "불타는 마을을 뒤로하고 길을 달렸다.", "escape"], ["porto_nova_reached", "포르투 노바 도착", "낯선 항구도시에 닿았다. 이곳에서 새로운 모험이 시작된다.", "port"]];
  const ACT1_CARDS = []; // 1막 핵심 장면은 본편 구현에 맞춰 추가
  const PRO_STEPS = [["stele_read", "마을길 끝의 기념비를 읽었다"], ["banners_done", "축제 깃발을 깃대에 달았다"], ["temple_work_complete", "신전 건축 현장에서 아버지를 도왔다"], ["festival_interaction_complete", "축제 광장에서 주민들과 이야기를 나눴다"], ["father_final_conversation_complete", "아버지와 마지막 이야기를 나눴다"], ["metal_fragment_acquired", "의문의 금속 조각을 손에 넣었다"], ["carpenter_bag_acquired", "목수 도구 가방을 챙겼다"], ["arkea_escape_complete", "아르케아를 탈출했다"], ["porto_nova_reached", "포르투 노바에 도착했다"]];
  const REAL_TABS = [["missions", "내 활동"], ["record", "마음 기록"], ["rest", "쉼"]];
  const REAL_HIDDEN = { today: "missions", reco: "missions", fav: "missions", mlog: "record", plan: "record" }; // 옛 탭 이름(저장·다른 화면의 이동 버튼)은 새 탭으로 연결
  R.journal = function (b) {
    const S = AU.G.S, un = S.flags.missionsUnlocked;
    const grp = UI.tab.jg || "game";   // 현실 활동은 Lv.10 전직 전에도 탭이 보이고(잠금), 내용은 미리 볼 수 있지만 기능은 쓸 수 없음
    b.append(h("div", { class: "jgroup" }, [["game", "모험 이야기"], ["real", un ? "현실 활동" : "🔒 현실 활동"]].map(([k, l]) => h("button", { type: "button", class: "jg " + k + (grp === k ? " on" : ""), onclick: () => { UI.tab.jg = k; UI.renderWin(); } }, l))));
    let tab;
    if (grp === "game") {
      tab = ["pro", "a1", "log"].includes(UI.tab.j) ? UI.tab.j : "a1";
      b.append(h("div", { class: "tabs" }, [["pro", "프롤로그"], ["a1", "1막 · 항구도시"], ["log", "전체 기록"]].map(([k, l]) => btn(l, tab === k ? "on" : "", () => { UI.tab.j = k; UI.renderWin(); }))));
    } else {
      tab = REAL_TABS.some(([k]) => k === UI.tab.j) ? UI.tab.j : (REAL_HIDDEN[UI.tab.j] || "missions");
      if (!un) b.append(h("div", { class: "lockbox lockband" }, h("b", { text: "🔒 아직 열리지 않았습니다" }), h("p", { text: "프롤로그를 마치면 열립니다." })));
      b.append(h("div", { class: "realband", text: "직접 해 보고 기록하는 방식입니다." }),
        AU.JournalTour ? h("div", { class: "jt-again-row" }, btn("안내 다시 보기", "mini jt-again", () => AU.JournalTour.start({}))) : null,
        h("div", { class: "tabs real-tabs" }, REAL_TABS.map(([k, l]) => btn(l, tab === k ? "on" : "", () => { UI.tab.j = k; UI.renderWin(); }))));
    }
    const logOf = (act) => { const j = S.journal, arr = j.findIndex((e) => /포르투 노바에 도착/.test(e.text)); return j.map((e, i) => ({ e, a: e.a || (arr >= 0 && i <= arr ? "pro" : "a1") })).filter((x) => !act || x.a === act).map((x) => x.e).reverse(); };
    const logBox = (rows) => h("div", { class: "logs" }, rows.length ? rows.map((e) => h("div", { class: "logrow" }, h("span", { text: e.t }), h("b", { text: e.text }))) : h("p", { class: "empty", text: "아직 기록이 없습니다." }));
    const memo = (key) => { S.memos = S.memos || {}; const ta = h("textarea", { class: "memo", maxlength: "300", rows: "2", placeholder: "그때 어떤 기분이었나요? 한두 줄로 적어 두세요." }); ta.value = S.memos[key] || "";
      ta.oninput = () => { S.memos[key] = ta.value; }; ta.onchange = () => AU.G.save("memo"); return ta; };
    const cards = (list, F, legacy) => h("div", { class: "mcards" }, list.filter(([k]) => F[k] || legacy).map(([k, t, sum, img]) => h("div", { class: "mcard" }, h("img", { src: "assets/prologue/bg/" + img + ".webp", alt: "" }), h("div", { class: "mtxt" }, h("b", { text: t }), h("p", { text: sum }), memo("pro_" + k)))));
    if (tab === "pro") {
      const F = (S.prologue && S.prologue.flags) || {}, leg = !!(S.prologue && S.prologue.legacy), seen = PRO_CARDS.filter(([k]) => F[k] || leg).length;
      b.append(h("div", { class: "chaphead" }, h("b", { text: "프롤로그 · 아르케아" }), h("span", { class: "tag", text: seen + " / " + PRO_CARDS.length })), h("p", { class: "note", text: "마음에 남은 장면만 간추렸습니다. 아래 칸에 그때의 기분을 적어 두세요. 완료한 의뢰는 퀘스트창(" + keyOf("quests") + ")에서 볼 수 있습니다." }),
        seen ? cards(PRO_CARDS, F, leg) : h("p", { class: "empty", text: "아직 정리된 이야기가 없습니다." }));
    } else if (tab === "a1") {
      const F = S.flags, list = ACT1_CARDS.filter(([k]) => F[k]);
      b.append(h("div", { class: "chaphead" }, h("b", { text: "1막 · 항구도시 포르투 노바" })), h("p", { class: "note", text: "1막의 핵심 이야기는 진행하면서 이곳에 정리됩니다. 받은 의뢰는 퀘스트창(" + keyOf("quests") + ")에서 확인하세요." }),
        list.length ? h("div", { class: "mcards" }, list.map(([k, t, sum, img]) => h("div", { class: "mcard" }, img ? h("img", { src: "assets/bg/" + img + ".webp", alt: "" }) : null, h("div", { class: "mtxt" }, h("b", { text: t }), h("p", { text: sum }), memo("a1_" + k))))) : h("p", { class: "empty", text: "아직 정리된 이야기가 없습니다." }));
    } else if (tab === "log") {
      b.append(logBox(logOf(null)));
    } else if (tab === "missions" || tab === "record") {
      if (tab === "record") { // 마음 기록: 지금까지 완료한 현실 미션 + (선택) 설문·나만의 공간
        b.append(UI.roomLink());
        if (AU.Survey && AU.Survey.enabled() && UI.surveyPanel) b.append(UI.surveyPanel());
      }
      if (!un) {
        if (tab === "missions") { b.append(h("div", { class: "lockbox" }, h("h3", { text: "아직 열리지 않았어요" }), h("p", { text: "프롤로그를 진행하면 현실 활동이 열려요. 열리면 영역마다 활동이 하나씩 나타나고, 하나를 마치면 다음 활동이 열립니다." }))); }
        return;
      }
      if (!S.flags.guideMet) { b.append(h("div", { class: "lockbox" }, h("h3", { text: "현실 활동 안내" }), h("p", { text: "프롤로그에서 현실 활동의 기록 방법을 안내받으면 이곳의 미션을 선택할 수 있습니다." }))); return; }
      const M = S.missions, AREAS = AU.MISSION_FUNCTION_AREAS;
      // 활동 카드 하나: 전체·오늘·추천·즐겨찾기·계획 화면이 같은 카드를 씀(상태 버튼·반복 수행·주기 설정·즐겨찾기)
      const rewardLine = (m, r) => {
        const rw = AU.G.missionReward(m);
        if (r.state === "done") {
          if (!r.reward) return null;
          return h("p", { class: "note reward", text: "받은 보상 · [" + rw.name + "] 토큰 " + r.reward.tokens + " · 마음 +" + r.reward.mind + (r.reward.verified ? " (인증 완료)" : " (인증하면 토큰 +" + (rw.full.tokens - r.reward.tokens) + (rw.full.mind - r.reward.mind ? " · 마음 +" + (rw.full.mind - r.reward.mind) : "") + " 더)") });
        }
        if (r.state === "skipped") return null;
        return h("p", { class: "note reward", text: "예상 보상 · [" + rw.name + "] 인증하면 토큰 " + rw.full.tokens + " · 마음 +" + rw.full.mind + " / 인증 안 하면 토큰 " + rw.part.tokens + " · 마음 +" + rw.part.mind + " (나중에 인증하면 나머지를 받아요)" });
      };
      const missionCard = (m, opts) => {
        const r = M.states[m.id]; if (!r || r.state === "locked") return null; opts = opts || {};
        const hist = r.state === "done" ? AU.G.missionRepeatStats(m.id) : null, fav = AU.G.isFavorite(m.id);
        const pg = ["accepted", "attempted", "partial"].includes(r.state) ? AU.G.missionProgress(m.id) : null;
        const doneBtn = ["완료했어요", "primary", "done"], partBtn = ["일부만 했어요", "", "partial"], quitBtn = ["그만하기", "", "quit"];
        let acts;
        if (r.state === "available") acts = [[r.reoffer ? "수락 (필요한 것 적기)" : "수락", "primary", "accept"], ["건너뛰기", "", "skip"]];
        else if (pg && pg.overdue) acts = [["기한이 지났어요 · 확인하기", "primary", "overdue"]];
        else if (pg && !pg.finishable) acts = [...(pg.needMid ? [["중간 확인하기", "primary", "mid"]] : []), quitBtn];
        else if (pg) acts = [doneBtn, partBtn, quitBtn];
        else acts = { partial: [doneBtn, ["다시 도전", "", "retry"], ["건너뛰기", "", "skip"]], skipped: [["다시 도전", "", "retry"]], done: [] }[r.state] || [];
        const act = (a) => {
          if (a === "done" || a === "partial") return UI.missionReview(m, a, (feedback, evidence) => AU.G.setMissionState(m.id, a, feedback, evidence), { feeling: a === "done" && (m.span || 1) > 1 });
          if (a === "accept" && r.reoffer) return UI.missionReoffer(m);
          if (a === "mid") return UI.missionMidCheck(m);
          if (a === "overdue") return UI.missionOverdue(m);
          if (a === "quit") return UI.missionQuit(m);
          return AU.G.setMissionState(m.id, a);
        };
        const spanLine = pg ? h("p", { class: "note span-progress" + (pg.overdue ? " overdue" : ""), text: pg.overdue ? "기한이 지났어요 (마감 " + pg.due.slice(5).replace("-", "/") + ")" : (pg.span > 1 ? pg.span + "일 중 " + pg.day + "일차 · " : "오늘 안에 · ") + (pg.left ? "남은 " + pg.left + "일 · " : "오늘까지 · ") + "마감 " + pg.due.slice(5).replace("-", "/") + (r.mid ? " · 중간 확인 완료" : pg.needMid ? " · 중간 확인할 때예요" : "") }) : null;
        return h("div", { class: "mission st-" + r.state, "data-mid": m.id, "data-q": (m.title + " " + m.desc).toLowerCase() },
          h("div", { class: "mh" }, h("span", { class: "tag perma", text: m.perma + " · " + AU.PERMA[m.perma] }), h("span", { class: "tag", text: (AREAS[m.functionArea] || "일상 활동") + " · " + (["", "쉬움", "보통", "확장"][m.difficulty] || "선택") + " · " + (m.span > 1 ? "기간 " + m.span + "일 · 1회 약 " : "약 ") + m.minutes + "분" }), h("span", { class: "tag" + (r.state === "done" ? " proof" : ""), text: r.state === "done" ? proofLabel(M.log.find((x) => x.id === m.id && x.state === "done" && !x.repeat)) : AU.MISSION_STATES[r.state] }), h("span", { class: "pts", text: r.rewarded ? "지급 완료" : AU.G.missionReward(m).name + " · 토큰 " + AU.G.missionReward(m).part.tokens + "~" + AU.G.missionReward(m).full.tokens }),
            h("button", { type: "button", class: "favbtn" + (fav ? " on" : ""), "aria-pressed": fav ? "true" : "false", title: fav ? "즐겨찾기 해제" : "즐겨찾기에 추가", onclick: () => { AU.G.toggleFavorite(m.id); UI.renderWin(); } }, fav ? "★" : "☆")),
          h("b", { text: m.title }), h("p", { text: m.desc }), ["available", "accepted", "attempted", "partial"].includes(r.state) ? h("p", { class: "note how", text: UI.missionHow(m) }) : null, rewardLine(m, r),
          r.state === "done" && r.reward && !r.reward.verified ? h("div", { class: "macts" }, btn("인증하고 남은 보상 받기", "primary", () => UI.missionVerify(m))) : null,
          opts.reasons ? h("p", { class: "reco-why", text: "추천 이유 · " + opts.reasons.join(" · ") }) : null,
          hist ? h("p", { class: "note", text: "누적 " + hist.count + "회 · 최근 " + (hist.last || "—") + " · 평균 만족도 " + (hist.satisfaction == null ? "미평가" : hist.satisfaction + "/5") + " · 평균 의미 " + (hist.meaning == null ? "미평가" : hist.meaning + "/5") + " · 평균 도전 " + (hist.challenge == null ? "미평가" : hist.challenge + "/5") }) : null,
          hist ? h("p", { class: "note", text: "수행 주기: " + UI.missionPlanLabel(AU.G.missionPlan(m.id)) + (AU.G.missionPlanDue(m.id) ? " · 오늘의 계획" : "") }) : null,
          hist ? h("div", { class: "macts" }, btn("다시 수행 기록", "primary", () => UI.missionReview(m, "done", (f, e) => AU.G.repeatMission(m.id, f, e))), btn("주기 설정", "", () => UI.missionPlanEditor(m))) : null,
          spanLine,
          acts.length ? h("div", { class: "macts" }, acts.map(([l, c, a]) => btn(l, c, () => act(a)))) : null,
          opts.hideBtn ? h("div", { class: "macts" }, btn("추천에서 빼기", "mini", () => { AU.G.hideReco(m.id); UI.renderWin(); })) : null);
      };
      const cardGrid = (list, optsOf) => { const g = h("div", { class: "missions" }); for (const m of list) { const c = missionCard(m, optsOf ? optsOf(m) : null); if (c) g.append(c); } return g; };
      const empty = (t, jump) => h("div", { class: "msummary" }, h("p", { class: "empty", text: t }), jump ? h("div", { class: "macts" }, jump.map(([l, k]) => btn(l, "", () => { UI.tab.j = k; UI.renderWin(); }))) : null);
      // 메인 스토리에서 자연스럽게 소개된 일상 활동
      const linkedBlock = () => {
        const linked = AU.RealBridge ? Object.entries(AU.RealBridge.suggestions()) : []; if (!linked.length) return null;
        const rec = h("div", { class: "msummary", "data-real-bridge": "suggestions" }, h("h3", { text: "모험에서 이어진 현실 활동" }), h("p", { class: "note", text: "메인 스토리와 관련된 선택 활동입니다. 수행하지 않아도 게임을 계속할 수 있습니다." }));
        const cards = h("div", { class: "missions" });
        for (const [key, suggestion] of linked.slice().reverse()) {
          const m = AU.G.mission(suggestion.missionId); if (!m) continue; const state = AU.G.ms(m.id).state;
          cards.append(h("div", { class: "mission" },
            h("div", { class: "mh" }, h("span", { class: "tag", text: suggestion.moment || "스토리 연계" }), h("span", { class: "tag perma", text: m.perma + " · " + AU.PERMA[m.perma] }), h("span", { class: "tag", text: AU.MISSION_STATES[state] || state })),
            h("b", { text: m.title }), h("p", { text: suggestion.story || "" }), h("p", { class: "note", text: m.desc }), h("p", { class: "note how", text: UI.missionHow(m) }),
            state === "available" ? h("div", { class: "macts" }, btn("이 활동도 수락", "primary", () => { AU.RealBridge.acceptSuggested(key); UI.renderWin(); }), btn("나중에", "", () => { UI.tab.missionArea = "all"; UI.tab.j = "missions"; UI.renderWin(); })) : h("p", { class: "note", text: "기록과 완료는 '내 활동'에서 진행할 수 있습니다." })));
        }
        rec.append(cards); return rec;
      };
      const tokenBar = () => h("div", { class: "msummary" }, h("span", { text: "갤러리 토큰 " }), h("b", { text: AU.G.galleryState().tokens }), h("span", { text: " · 장식 조각 " + AU.G.galleryState().fragments + "/3 · 개인 공간 꾸미기에 사용합니다." }), btn("나만의 공간 보기", "mini", () => UI.open("gallery")));
      const chips = (opts, cur, onPick) => h("div", { class: "tabs mission-filter" }, opts.map(([k, l]) => btn(l, String(cur) === String(k) ? "on" : "", () => onPick(k))));

      if (tab === "missions") {
        // 내 활동: 지금 진행 중인 활동 + 아래에 추천 1~2개
        const linked = linkedBlock(); if (linked) b.append(linked);
        b.append(tokenBar());
        const going = AU.MISSIONS.filter((m) => { const r = M.states[m.id] || {}; return ["accepted", "attempted", "partial"].includes(r.state) || (r.state === "available" && r.reoffer); });   // 다시 제안된 활동(재수락 대기)도 여기서 이어서 함
        b.append(h("div", { class: "msummary", "data-mine": "going" }, h("b", { text: "진행 중인 활동 " + going.length + "개" }),
          going.length ? cardGrid(going) : h("p", { class: "empty", text: "지금 진행 중인 활동이 없어요. 아래 추천에서 하나 골라 보세요." })));
        const off = UI.tab.recoOff || 0, recos = AU.G.recommend(2, off);
        b.append(h("div", { class: "msummary", "data-reco": "list" }, h("b", { text: "이런 활동은 어때요?" }),
          recos.length ? cardGrid(recos.map((r) => r.m), (m) => ({ reasons: recos.find((r) => r.m.id === m.id).reasons })) : h("p", { class: "empty", text: "지금 추천할 활동이 없어요. 진행 중인 활동을 먼저 마무리해 보세요." }),
          recos.length ? h("div", { class: "macts" }, btn("다른 추천 보기", "", () => { UI.tab.recoOff = off + 1; UI.renderWin(); })) : null));
      } else {
        const when = {}; for (const e of M.log || []) if (e.state === "done") when[e.id] = e.t;   // 완료한 날짜(최근 것부터 보여 주기 위함)
        const done = AU.MISSIONS.filter((m) => (M.states[m.id] || {}).state === "done").sort((x, y) => ((when[y.id] || "") < (when[x.id] || "") ? -1 : 1));
        b.append(h("div", { class: "permabar" }, Object.entries(AU.PERMA).map(([k, n]) => h("div", { class: "pc" }, h("b", { text: k }), h("span", { text: n }), h("em", { text: AU.G.permaCounts()[k] + "회" })))));
        b.append(h("div", { class: "msummary", "data-record": "done" }, h("b", { text: "완료한 현실 미션 " + done.length + "개" }),
          done.length ? cardGrid(done) : h("p", { class: "empty", text: "아직 완료한 활동이 없어요. '내 활동'에서 하나 시작해 보세요." })));
      }
    } else if (tab === "rest" && !un) {
      b.append(h("p", { class: "note", text: "쉼 미션은 피로도를 줄여 주는 선택 활동입니다. 스킬을 배우는 Lv.10부터 안내됩니다." }), h("div", { class: "missions preview" }, AU.G.restDaily().map((m) => h("div", { class: "mission st-locked" }, h("div", { class: "mh" }, h("span", { class: "tag", text: AU.G.restRecoverLeft() ? "쉼 · 피로도 −" + m.recover : "쉼 · 피로도 회복은 오늘 완료" }), h("span", { class: "tag", text: "🔒 잠김" })), h("b", { text: m.title }), h("p", { text: m.desc })))));
    } else if (tab === "rest" && !S.skills.unlocked.length) {
      b.append(h("div", { class: "lockbox lockband" }, h("b", { text: "🔒 스킬을 배우면 열립니다 (Lv.10)" }), h("p", { text: "피로도는 스킬을 쓸 때 쌓이는 수치입니다. 스킬을 배우는 시점에 설명과 회복 방법을 알려 드립니다." })));
    } else if (tab === "rest") {
      b.append(h("p", { class: "note", text: "오늘 쉬어 가기 좋은 활동 5가지예요. 날마다 다르게 바뀌고, 선택은 자유예요. 같은 활동은 하루 한 번 할 수 있어요." }), UI.fatigueMeter(S, false));
      const grid = h("div", { class: "missions" });
      for (const m of AU.G.restDaily()) { const ok = AU.G.restMissionAvailable(m.id);
        grid.append(h("div", { class: "mission st-" + (ok ? "available" : "done") }, h("div", { class: "mh" }, h("span", { class: "tag", text: "쉼 · 피로도 −" + m.recover }), h("span", { class: "tag", text: AU.G.restDoneToday(m.id) ? "오늘 " + AU.G.restDoneToday(m.id) + "회 완료" : "오늘 가능" }), h("span",{class:"tag",text:(AU.REST_CATEGORIES[m.category]||"쉼")+" · 약 "+m.minutes+"분"})), h("b", { text: m.title }), h("p", { text: m.desc }),
          ok ? h("div", { class: "macts" }, btn(m.guide ? "시작하기 (" + Math.round(m.guide.secs / 60 * 10) / 10 + "분)" : "해 봤어요", "primary", () => (m.guide ? UI.guided(m.title, m.guide, () => UI.restNote(m, (t) => AU.G.doRestMission(m.id, t))) : UI.restNote(m, (t) => AU.G.doRestMission(m.id, t))))) : null)); }
      b.append(grid);
      const rl = ((S.rest && S.rest.log) || []).slice(-5).reverse();   // 최근 쉼 기록(마음 기록 탭에서 빠진 쉼 기록을 여기서 확인)
      if (rl.length) b.append(h("div", { class: "msummary" }, h("b", { text: "최근 쉼 기록" }), h("div", { class: "logs actlog" }, rl.map((e) => { const m = AU.G.restMission(e.id); return h("div", { class: "logrow" }, h("span", { text: e.t }), h("div", null, h("b", { text: m ? m.title : e.id }), h("span", { class: "note", text: "  피로도 −" + (e.recover || 0) }))); }))));
    }
  };

  R.help = function (b) {
    const K = (a) => keyOf(a), sec = (t, rows) => h("div", { class: "helpsec" }, h("h3", { text: t }), h("ul", null, rows.map(([k, d]) => h("li", null, h("b", { text: k }), h("span", { text: " " + d })))));
    b.append(h("div", { class: "helpwrap" },
      h("p", { class: "helpintro", text: "처음 마을에 오면 낯선 화면이 많습니다. 아래를 한 번 읽어 두면 편합니다. 이 안내는 언제든 " + K("help") + " 키나 메뉴에서 다시 볼 수 있습니다." }),
      sec("기본 조작", [[K("left") + "·" + K("right"), "이동"], [K("jump"), "점프"], [K("attack"), "기본 공격(피로도가 쌓이지 않음)"], [K("interact"), "NPC와 대화, 물건 줍기, 포털 이동 확인"], [K("up") + "/" + K("down"), "밧줄·사다리 오르내리기, 포털 들어가기"], ["1·2·3", "스킬 슬롯(전직 후 사용)"]]),
      sec("화면 구성", [["왼쪽 위 미니맵", "내 위치(파란 점)와 NPC·몬스터·출구. 누르면 월드맵"], ["목표", "진행 중인 퀘스트와 다음에 할 일. ▾로 접고, 끌어서 옮길 수 있음(더블클릭으로 원위치)"], ["아래 가운데", "레벨, HP(체력), 피로도(스킬을 쓸수록 쌓임), EXP(경험치)"], ["이름표", "발 밑에 이름이 표시됩니다. 몬스터는 머리 위에 레벨과 이름"], ["느낌표 !", "받을 수 있는 퀘스트"], ["물음표 ?", "완료해서 보고할 수 있는 퀘스트"]]),
      sec("창 열기", [[K("inventory"), "인벤토리: 가진 물건, 사용·장착"], [K("equipment"), "장비창: 장착한 장비와 능력치 비교"], [K("stats"), "스탯창: 능력치 보기, 포인트 분배"], [K("skills"), "스킬창: 스킬 확인·배치, 휴식으로 피로도 줄이기"], [K("quests"), "퀘스트창: 진행 중·완료 퀘스트 자세히"], [K("worldmap"), "월드맵: 갈 수 있는 지역"], [K("journal"), "모험일지: 현실 활동 미션, 마음 기록"], [K("keysettings"), "설정: 소리, 키 바꾸기"], ["Esc", "메뉴 / 열린 창 닫기"]]),
      sec("알아 두기", [["쓰러지면", "마을에서 일어나며 경험치를 5% 잃습니다. 문장을 하나 골라 마음을 가다듬는 시간이 있습니다."], ["마을(안전 지역)", "몬스터가 나오지 않는 곳입니다. 체력은 저절로 차지 않으니 회복약을 챙기세요."], ["상점", "상인 NPC와 대화해서 물건을 사고팝니다."], ["최대 레벨", "1막에서는 15레벨까지 오릅니다. 다음 이야기가 열리면 이어서 성장합니다."]]),
      h("div", { class: "choices" }, btn("알겠습니다", "primary", () => UI.close()))));
  };

  R.jobcard = function (b) {
    const S = AU.G.S;
    b.append(h("div", { class: "jobcard" }, h("h2", { text: "전사로 전직했습니다!" }), h("p", { text: "견습 모험가에서 전사가 되었습니다. 다음 기능이 열렸어요." }),
      h("ul", null, h("li", { text: "스탯 분배: 포인트 " + S.freePoints + "점이 지급되었습니다. 스탯창(" + keyOf("stats") + ")에서 직접 나눠 보세요." }), h("li", { text: "스킬: 지금은 1번 스킬(" + AU.SKILLS.strike.name + ")만 열렸고, 2번은 Lv." + AU.SKILL_UNLOCK_LV.spin + ", 3번은 Lv." + AU.SKILL_UNLOCK_LV.focus + "에 열립니다. 스킬창(" + keyOf("skills") + ")에서 바꿀 수 있습니다." }), h("li", { text: "피로도: 스킬을 쓸 때마다 쌓이며, 가득 차면 스킬을 쓸 수 없습니다(기본 공격은 가능). 휴식이나 쉼 미션으로 줄일 수 있고, 매주 월요일에 풀립니다." }),
        h("li", { text: "모험일지(" + keyOf("journal") + "): 현실 활동 미션이 열렸습니다. 선택 사항이며, 포르투 노바의 알렉시오스가 소개해 줍니다." }),
        h("li", { text: "다음 목표: " + AU.JOB_TIERS.slice(1).map((t) => "Lv." + t.level + " " + t.name).join(" / ") })),
      h("div", { class: "choices" }, btn("스탯 분배하러 가기", "primary", () => UI.open("stats")), btn("계속 모험하기", "", () => UI.close()))));
  };

  R.keysettings = function (b) {
    const I = AU.Input, st = UI.listening;
    const rows = h("div", { class: "keyrows" });
    for (const a of AU.ACTIONS) {
      const on = st && st.id === a.id, def = I.bindings[a.id] === a.code;
      rows.append(h("div", { class: "keyrow" + (on ? " on" : "") }, h("span", { class: "kl", text: a.label }),
        h("button", { type: "button", class: "keycap" + (on ? " listen" : ""), onclick: () => UI.listenKey(a.id) }, on ? "키를 누르세요…" : AU.keyLabel(I.bindings[a.id])), def ? null : h("em", { text: "기본: " + AU.keyLabel(a.code) })));
    }
    rows.append(h("div", { class: "keyrow fixed" }, h("span", { class: "kl", text: "메뉴 닫기·일시정지" }), h("span", { class: "keycap fixedcap", text: "Esc (고정)" })));
    const msg = h("div", { class: "keymsg" + (UI.keyMsg ? " show" : ""), text: UI.keyMsg || "" });
    const unl = UI.settings && UI.settings.confirmUnload !== false;
    b.append(h("div", { class: "volbox" }, h("b", { text: "소리 크기" }), UI.volRow("배경음", "volBgm"), UI.volRow("효과음·환경음", "volSfx", true), UI.volRow("전투음(공격·스킬·타격)", "volCombat", "swing")), h("p", { class: "note", text: "바꿀 키를 누른 뒤 새 키를 누르세요. 이미 쓰는 키면 교체 여부를 묻습니다. 변경은 바로 저장됩니다. 한글 입력 상태에서도 키 위치(물리 키) 기준으로 동작합니다." }), msg, rows,
      h("div", { class: "keyfoot" }, btn("기본값으로 복원", "", () => { I.reset(); AU.main.saveSettings(); UI.keyMsg = "기본 키로 복원했습니다."; UI.renderWin(); }),
        h("label", { class: "chk" }, h("input", { type: "checkbox", checked: unl ? "" : null, onchange: (e) => { UI.settings.confirmUnload = e.target.checked; AU.main.saveSettings(); } }), " 탭을 닫기 전에 확인 창 표시"),
        h("label", { class: "chk" }, h("input", { type: "checkbox", checked: UI.settings.reduceFx ? "" : null, onchange: (e) => { UI.settings.reduceFx = e.target.checked; AU.main.saveSettings(); } }), " 화면 흔들림·번쩍임 줄이기"),
        h("label", { class: "chk" }, h("input", { type: "checkbox", checked: UI.settings.mute ? "" : null, onchange: (e) => { UI.settings.mute = e.target.checked; if (UI.settings.mute && AU.Prologue) AU.Prologue.Au.stopAll(); AU.main.saveSettings(); if (AU.Prologue && AU.Prologue.muteEl) AU.Prologue.syncMute(); } }), " 소리 끄기")),
      h("p", { class: "note", text: "참고: 브라우저 단축키(Ctrl+W 탭 닫기 등)는 게임이 막을 수 없습니다. Ctrl을 공격에 쓰는 경우 W 키(월드맵)와 함께 누르지 않도록 주의하거나 키를 바꿔 주세요. 진행 상황은 자동 저장됩니다." }));
  };
  /* 소리 크기 막대. 움직이는 동안 바로 반영하고, 손을 뗄 때 효과음은 샘플 소리를 들려줍니다. */
  UI.volRow = function (label, key, sample) {
    const cur = Math.round((typeof UI.settings[key] === "number" ? UI.settings[key] : 1) * 100);
    const out = h("span", { class: "volnum", text: cur + "%" });
    const inp = h("input", { type: "range", min: "0", max: "100", step: "5", value: String(cur), "aria-label": label + " 크기" });
    inp.oninput = () => { const v = +inp.value / 100; UI.settings[key] = v; out.textContent = inp.value + "%"; if (AU.Sfx && AU.Sfx.applyVolume) AU.Sfx.applyVolume(); };
    inp.onchange = () => { AU.main.saveSettings(); if (sample && AU.Sfx) { AU.Sfx.applyVolume(); AU.Sfx.play(typeof sample === "string" ? sample : "item"); } };
    return h("label", { class: "volrow" }, h("span", { class: "vl", text: label }), inp, out);
  };
  UI.listenKey = function (id) {
    this.listening = { id }; this.keyMsg = ""; this.renderWin();
    const I = AU.Input, bad = (c) => /^(F\d+|Meta.*|ContextMenu|Tab|CapsLock|NumLock|ScrollLock|Pause|PrintScreen|OS.*)$/.test(c);
    const handler = (e) => {
      if (!this.listening) return true;
      if (e.code === "Escape") { this.listening = null; this.keyMsg = "변경을 취소했습니다."; this.renderWin(); return true; }
      if (e.repeat) return true;
      if (bad(e.code)) { this.keyMsg = "이 키는 쓸 수 없습니다: " + AU.keyLabel(e.code); this.renderWin(); return true; }
      const other = I.conflict(this.listening.id, e.code), me = this.listening.id, old = I.bindings[me];
      const apply = (swap) => { if (swap && other) I.bindings[other.id] = old; I.bindings[me] = e.code; I.rebuild(); AU.main.saveSettings(); this.keyMsg = AU.ACTIONS.find((a) => a.id === me).label + " → " + AU.keyLabel(e.code) + " 로 저장했습니다." + (swap && other ? " (" + other.label + "은 " + AU.keyLabel(old) + "로 교체)" : ""); this.listening = null; this.modal = false; this.modalEl.classList.add("hidden"); this.modalEl.innerHTML = ""; this.renderWin(); };
      if (other) {
        this.modal = true; this.modalEl.classList.remove("hidden"); this.modalEl.innerHTML = "";
        this.modalEl.append(h("div", { class: "panel modal" }, h("p", { text: "‘" + AU.keyLabel(e.code) + "’ 키는 이미 ‘" + other.label + "’에 쓰이고 있습니다. 서로 교체할까요?" }), h("div", { class: "choices" }, btn("교체", "primary", () => apply(true)), btn("취소", "", () => { this.listening = null; this.modal = false; this.modalEl.classList.add("hidden"); this.modalEl.innerHTML = ""; this.keyMsg = "변경을 취소했습니다."; this.renderWin(); }))));
        this.listening.pendingCode = e.code; return true;
      }
      apply(false); return true;
    };
    if (!this._rawInstalled) { this._rawInstalled = true; I.rawHandlers.push((e) => { if (UI.listening && !UI.modal) return handler(e); if (UI.listening && UI.modal) return true; return false; }); }
  };

  /* ============ 개발 테스트 패널 (임시) ============ */
  R.dev = function (b) {
    const S = AU.G.S;
    const num = (id, val) => h("input", { id, type: "number", value: val, class: "num" });
    b.append(h("p", { class: "note", text: "시제품 점검용 도구입니다. 정식 서비스에서는 제거합니다. (F2로 열고 닫기)" }),
      h("div", { class: "devgrid" },
        h("div", null, h("h4", { text: "레벨·경험치" }), num("dv-lv", S.level), btn("이 레벨까지 올리기", "mini", () => { const t = +$("#dv-lv", UI.winEl).value; let g = 0; while (AU.G.S.level < Math.min(t, AU.levelCap(AU.G.S)) && g++ < 100) AU.G.gainExp(AU.expToNext(AU.G.S.level) - AU.G.S.exp, "dev"); }),
          num("dv-exp", 100), btn("경험치 지급", "mini", () => AU.G.gainExp(+$("#dv-exp", UI.winEl).value, "dev"))),
        h("div", null, h("h4", { text: C.fatigue.name }), num("dv-rs", S.fatigue), btn("현재값 설정", "mini", () => AU.G.setFatigue(+$("#dv-rs", UI.winEl).value, "dev")),
          num("dv-rsmax", S.fatigueMax), btn("최대값 설정", "mini", () => AU.G.setFatigueMax(+$("#dv-rsmax", UI.winEl).value)), btn("주간 갱신 실행", "mini", () => AU.G.refreshWeekly(true))),
        h("div", null, h("h4", { text: "NPC 배치" }), btn(AU.World.npcEdit ? "배치 편집 끄기" : "NPC 배치 편집 켜기", "mini", () => { AU.World.npcEdit = !AU.World.npcEdit; UI.close(); AU.G.toast(AU.World.npcEdit ? "NPC를 끌어서 옮기세요(좌우·위아래). 놓으면 저장됩니다." : "배치 편집을 껐습니다.", "info"); }, { "data-dev": "npc-edit" }),
          btn("좌표 복사", "mini", () => { const t = AU.World.npcPosReport(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => AU.G.toast("바뀐 NPC 좌표를 복사했습니다.", "ok"), () => { window.prompt("복사해서 전달해 주세요", t); }); }),
          btn("저장된 위치 초기화", "mini", () => AU.World.resetNpcPos()), h("p", { class: "note", text: "편집 중에는 NPC가 걷지 않고 대화도 열리지 않습니다. 포르투 노바에서 끌어 옮기세요." })),
        h("div", null, h("h4", { text: "기타" }), btn("HP 전부 회복", "mini", () => { S.hp = AU.G.d().maxHp; AU.G.changed(); }), btn("은화 +100", "mini", () => { AU.G.gainSilver(100); AU.G.changed(); }), btn("훈련 포인트 +3 (지급 경로 우회)", "mini", () => { S.trainingPoints += 3; AU.G.changed(); })),
        h("div", null, h("h4", { text: "설문 기록(PSS·PERMA)" }), btn(AU.Survey && AU.Survey.enabled() ? "설문 기능 끄기" : "설문 기능 켜기", "mini", () => { AU.Survey.setEnabled(!AU.Survey.enabled()); UI.renderWin(); }, { "data-dev": "survey-toggle" }), btn("PSS CSV", "mini", () => AU.Survey.download("pss"), { "data-dev": "survey-csv-pss" }), btn("PERMA CSV", "mini", () => AU.Survey.download("perma"), { "data-dev": "survey-csv-perma" }), btn("설문 기록 모두 지우기", "mini danger", () => { if (confirm("이 기기의 설문 응답을 모두 지웁니다.")) { AU.Survey.resetAll(); UI.renderWin(); } }, { "data-dev": "survey-reset" }), h("p", { class: "note", text: "기본은 꺼짐. 주소 끝에 ?survey=1 로도 켤 수 있습니다. 사용 허가·연구 승인 전에는 이용자에게 켜지 않습니다." })),
        h("div", null, h("h4", { text: "마음 기록 인터페이스 시험" }), btn("PSS 샘플 기록 추가", "mini", () => AU.G.addCheckin({ scale: "PSS", score: 12, items: null, source: "dev-sample" })), h("p", { class: "note", text: "기록 " + S.mind.checkins.length + "건. 게임 자원과 별도 저장되며, 점수→" + C.fatigue.name + " 환산은 하지 않습니다." }))));
    const PR = AU.Prologue, grid = b.querySelector(".devgrid");
    if (PR && grid) grid.append(h("div", null, h("h4", { text: "프롤로그" }), h("div", { class: "devrow" }, PR.ORDER.map((_, n) => btn("장면 " + (n + 1), "mini", () => { UI.close(); PR.devJump(n); }))),
      btn("즉시 완료 → 포르투 노바", "mini", () => { UI.close(); PR.debugComplete("porto"); }), btn("컷신 건너뛰기", "mini", () => { UI.close(); PR.skip(); }),
      h("p", { class: "note", text: "상태 " + PR.st().state + " · 깃발 " + Object.keys(PR.st().flags).filter((k) => PR.st().flags[k]).length + "개" + (PR.replay ? " (다시 보기 중: 저장 기록은 바뀌지 않음)" : "") })));
  };
  UI.settings = { confirmUnload: true, reduceFx: false, mute: false, volBgm: 1, volSfx: 1, volCombat: 1 }; UI.devVisible = false;
})();
