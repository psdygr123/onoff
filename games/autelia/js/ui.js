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
      R.append(this.hud.keyhint, panel, topleft, this.hud.menuBtn, h("div", { class: "slots" }, [...this.hud.quick, ...this.hud.slots]), this.hud.prompt, this.hud.mapName, this.hud.toasts, this.hud.save, this.hud.banner, this.hud.warn, this.hud.devBtn);
      this.hud.cache = {};
      this.winEl = h("div", { class: "winwrap hidden" }); this.dlgEl = h("div", { class: "dialog hidden" }); this.modalEl = h("div", { class: "modalwrap hidden" });
      R.append(this.winEl, this.dlgEl, this.modalEl);
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
      for (const n of m.npcs || []) dot(n.x, C.GROUND - 40, "#FFD978", 6);
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
        return "이 지역에서 진행하세요";
      }
      const hop = this.route(W.mapId, targetMap); if (!hop) return "";
      const pt = (m.portals || []).find((x) => x.to === hop); if (!pt) return "";
      return this.areaName(targetMap) + " 방향: " + (pt.x > p.x ? "▶ 오른쪽" : "◀ 왼쪽") + " 끝의 '" + pt.label + "' 쪽으로";
    },
    questGuide(id) {
      const q = AU.QUESTS[id], rec = AU.G.S.quests[id]; if (!q || !rec) return "";
      if (rec.state === "ready") { const tn = q.turnIn || q.giver, mp = this.npcMap(tn); return mp ? this.dirText(mp, tn) : ""; }
      const o = q.objectives.find((x, i) => !AU.G.objectiveDone(q, rec, i)); if (!o) return "";
      if (o.kind === "talk" || o.kind === "deliver" || o.kind === "choice") { const mp = this.npcMap(o.target); return this.dirText(mp, o.target); }
      return q.area ? this.dirText(q.area, null) : "";
    },
    nextGoals() { // 진행 중인 퀘스트가 모자랄 때 알려 주는 다음 목표(최대 2줄)
      const S = AU.G.S, out = [];
      for (const id of Object.keys(AU.QUESTS)) { if (AU.G.questStatus(id) === "available") { const q = AU.QUESTS[id], mp = this.npcMap(q.giver); out.push("새 의뢰: " + q.title.replace(" (임시)", "") + " — " + AU.NPCS[q.giver].name.replace(" (임시)", "") + (mp ? " (" + this.areaName(mp) + ")" : "")); break; } }
      if (out.length < 2) { const lockedLv = Object.keys(AU.QUESTS).map((id) => [id, AU.QUESTS[id]]).filter(([id, q]) => !S.quests[id] && q.pre.every((x) => AU.G.questStatus(x) === "done") && S.level < q.minLevel && id !== "q_job").sort((a, b) => a[1].minLevel - b[1].minLevel)[0];
        if (lockedLv) out.push("Lv." + lockedLv[1].minLevel + "이 되면 새 의뢰: " + lockedLv[1].title.replace(" (임시)", "")); }
      if (out.length < 2 && !AU.G.awakened() && S.level < 10) out.push("Lv.10까지 레벨을 올리세요 (지금 Lv." + S.level + ") — 사냥터: 항구 길·선창 외곽");
      return out.slice(0, 2);
    },
    updateTracker() {
      const S = AU.G.S, T = this.hud.tracker, t = this.hud.trackBody, PR = AU.Prologue;
      const list = Object.entries(S.quests).filter(([, r]) => r.state === "active" || r.state === "ready").sort((a, b) => (AU.QUESTS[a[0]].type === "main" ? 0 : 1) - (AU.QUESTS[b[0]].type === "main" ? 0 : 1));
      const picks = this.anyOpen() || (PR && PR.on) ? [] : list.slice(0, 3);
      const goals = picks.length < 2 && !this.anyOpen() && !(PR && PR.on) ? this.nextGoals() : [];
      if (!picks.length && !goals.length) { T.style.display = "none"; this.hud.cache.trk = null; this._trkDirs = []; return; }
      const key = picks.map(([id, r]) => id + r.state + JSON.stringify(r.prog)).join("|") + "|" + AU.G.count("fur") + "|" + goals.join("/");
      if (this.hud.cache.trk !== key) {
        this.hud.cache.trk = key; t.innerHTML = ""; this._trkDirs = []; for (const k of Object.keys(this.hud.cache)) if (k.indexOf("trkd") === 0) delete this.hud.cache[k];
        picks.forEach(([id, rec]) => {
          const q = AU.QUESTS[id]; const box = h("div", { class: "tq" }); box.append(h("div", { class: "tt" }, q.title.replace(" (임시)", "")));
          if (rec.state === "ready") box.append(h("div", { class: "to ok" }, ((q.turnIn && q.turnIn !== q.giver) ? "보고하러 가기: " : "의뢰인에게 돌아가기: ") + AU.NPCS[q.turnIn || q.giver].name.replace(" (임시)", "")));
          else q.objectives.forEach((o, i) => box.append(h("div", { class: "to" + (AU.G.objectiveDone(q, rec, i) ? " ok" : "") }, this.objText(o, rec, i))));
          const dir = h("div", { class: "td" }); box.append(dir); this._trkDirs.push({ el: dir, id }); t.append(box);
        });
        if (goals.length) { const box = h("div", { class: "tq tnext" }, h("div", { class: "tt" }, "다음 목표")); goals.forEach((g) => box.append(h("div", { class: "to" }, g))); t.append(box); }
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
      const prog = rec ? (o.kind === "collect" ? Math.min(AU.G.count(o.item), o.count) : (rec.prog[i] || 0)) : 0;
      if (o.kind === "kill") return AU.MONSTERS[o.target].name.replace(" (임시)", "") + " 처치 (" + prog + "/" + o.count + ")";
      if (o.kind === "collect") return AU.ITEMS[o.item].name + " 수집 (" + prog + "/" + o.count + ")";
      if (o.kind === "repair" || o.kind === "investigate") { const n = rec && rec.spots ? o.targets.filter((t) => rec.spots[t]).length : 0; return (o.kind === "repair" ? "방책 수리 " : "흔적 조사 ") + "(" + n + "/" + o.targets.length + ")"; }
      if (o.kind === "deliver") return AU.ITEMS[o.item].name.replace(" (임시)", "") + "을(를) " + AU.NPCS[o.target].name.replace(" (임시)", "") + "에게 전하기 (" + (rec ? (rec.prog[i] || 0) : 0) + "/1)";
      if (o.kind === "choice") return AU.NPCS[o.target].name.replace(" (임시)", "") + "에게 결과를 알리기 (" + (rec ? (rec.prog[i] || 0) : 0) + "/1)";
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
    openHelpOnce() { const F = AU.G.S.flags; if (AU.Tutorial) return; if (F.helpShown || /[?&]dev=1/.test(location.search) || (AU.Prologue && AU.Prologue.on)) return; F.helpShown = true; setTimeout(() => { if (!this.cur && !this.dialog && !(AU.Prologue && AU.Prologue.on)) this.open("help"); }, 900); },
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
      this.winEl.innerHTML = ""; this.winEl.append(box); body.scrollTop = prevScroll;
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
    renderDialog() {
      const d = this.dialog; if (!d) return;
      const last = d.i >= d.lines.length - 1, cur = d.lines[d.i], isObj = cur && typeof cur === "object", np = isObj ? cur.npc : d.npc, text = AU.Profile.fmt(isObj ? cur.t : cur).replace(/\{(attack|jump|interact)\}/g, (m, k) => keyOf(k));
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
      this.dialog = null; AU.G.S.flags.tipDlg = true; this.dlgEl.classList.add("hidden"); this.dlgEl.innerHTML = ""; AU.Input.held.clear();
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
    const galleryRaster = { memory_P: "painting_01", memory_E: "painting_02" };
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
    const left = panel("room-left", "오늘의 활동",
      galleryArt("mission", "gallery-panel-head-art", ""), h("div", { class: "room-date", text: dateLabel }),
      h("p", { class: "room-greeting", text: "오늘의 작은 시도도 소중한 경험으로 남습니다." }),
      h("h4", { text: "현실 미션" }),
      h("div", { class: "roomactivities" }, ...missionList),
      btn("전체 활동 보기", "mini", openJournal),
      h("p", { class: "room-affirmation", text: "끝내지 못한 경험도 이 공간에 남길 수 있습니다." }));
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
        h("div", { class: "roomfloor" }, h("div", { class: "roomrug", text: "나의 이야기" }))),
      h("div", { class: "room-recent" }, h("h3", null, galleryArt("journal", "gallery-inline-art", ""), " 최근 기록"),
        h("p", { class: "note", text: "시도한 경험도, 완료한 경험도 함께 남습니다." }),
        h("div", { class: "room-recent-grid" }, ...[0,1,2].map(i => card(lastThree[i],i)))));
    const makeChart = () => {
      const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 240 205"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "현실 미션 실천 기록에 따른 PERMA 영역별 성장치");
      const xy = (i, pct) => { const angle = -Math.PI/2 + i*2*Math.PI/5; return [120 + Math.cos(angle)*86*pct, 98 + Math.sin(angle)*83*pct]; };
      const poly = (points, fill, stroke, opacity) => { const p = document.createElementNS(ns,"polygon"); p.setAttribute("points",points.map(v=>v.join(",")).join(" "));p.setAttribute("fill",fill);p.setAttribute("stroke",stroke);p.setAttribute("stroke-width","1.5");if(opacity)p.setAttribute("opacity",opacity);svg.appendChild(p); };
      for (const t of [.25,.5,.75,1]) poly(dailyRows.map((_,i)=>xy(i,t)),"none","#baaf8e","0.7");
      dailyRows.forEach((d,i)=>{const line=document.createElementNS(ns,"line");const [x,y]=xy(i,1);line.setAttribute("x1","120");line.setAttribute("y1","98");line.setAttribute("x2",x);line.setAttribute("y2",y);line.setAttribute("stroke","#c8baa0");svg.appendChild(line);});
      poly(dailyRows.map((d,i)=>xy(i,Math.max(0,Math.min(1,d.pct/100)))),"#d8b66b","#a87b32","0.85");
      dailyRows.forEach((d,i)=>{const [x,y]=xy(i,1.16);const label=document.createElementNS(ns,"text");label.setAttribute("x",x);label.setAttribute("y",y+4);label.setAttribute("text-anchor","middle");label.setAttribute("font-size","15");label.setAttribute("font-weight","700");label.setAttribute("fill","#70552d");label.textContent=d.key;svg.appendChild(label);});
      return svg;
    };
    const radar = h("div", { class: "room-radar" }, makeChart(),
      h("div", { class: "room-perma-legend" }, ...dailyRows.map(d => h("div", { class: "room-perma-row" },
        h("strong", { text: d.key }), h("span", { text: d.label }), h("b", { text: d.value + "점" })))));
    const right = h("aside", { class: "room-right" },
      panel("room-growth", "마음 성장",
        h("p", { class: "note", text: "현실 활동의 누적 실천 점수입니다. 심리검사 결과나 행복 수준을 뜻하지 않습니다." }),
        galleryArt("memory", "gallery-panel-head-art", ""), radar,
        h("div", { class: "room-perma-bars" }, ...dailyRows.map(d => h("div", { class: "room-perma-meter" },
          h("span", { text: d.key }), h("div", { class: "room-meter-track" }, h("i", { style: "width:" + d.pct + "%" })), h("small", { text: d.pct + "%" }))))),
      h("div", { class: "room-counter-grid" },
        panel("room-token-panel", "갤러리 토큰", galleryArt("token", "gallery-counter-icon", ""), h("b", { class: "room-big-number", text: g.tokens + "개" })),
        panel("room-visit-panel", "오늘 방문 기록", galleryArt("rest", "gallery-counter-icon", ""), h("b", { class: "room-big-number", text: attended ? "방문 완료" : "미기록" }),
          h("small", { text: "누적 " + g.attendance.length + "일" }))),
      btn(attended ? "오늘 방문 기록 완료" : "오늘 방문 기록하기 (+1)", "primary room-visit-btn", () => AU.G.galleryCheckin(), { disabled: attended ? "" : null }),
      panel("room-decor-panel", "공간 꾸미기",
        h("div", { class: "room-decor-icons" }, ...items.slice(0,3).map(item => h("span", { title: item.name }, galleryArt(item.id, "gallery-decor-preview", item.name)))),
        btn("장식 관리 " + (UI.tab.galleryShop ? "접기" : "열기"), "mini", toggleShop)));
    b.append(h("div", { class: "room-a-layout" },
      h("div", { class: "room-a-heading" }, galleryArt("frame", "gallery-heading-art", ""), h("div", null,
        h("h2", { text: "나만의 공간" }), h("p", { text: "오늘의 경험이 쌓여 만들어지는 나만의 기억 갤러리" })),
        h("span", { class: "room-a-tag", text: "아우텔리아 · 성장 기록" })),
      slots,
      h("div", { class: "room-a-columns" }, left, center, right),
      UI.tab.galleryShop ? panel("room-shop-panel", "꾸미기 상점 · 전시 설정",
        h("div", { class: "roomshop" }, ...items.map(item => h("div", { class: "roomshopitem" },
          galleryArt(item.id, "roomicon", item.name), h("b", { text: item.name }), h("p", { class: "note", text: item.desc }),
          btn(unlocked.has(item.id) ? (selected.has(item.id) ? "전시 중 · 숨기기" : "전시하기") : "토큰 " + item.cost + "개로 획득",
            "mini", () => unlocked.has(item.id) ? AU.G.galleryToggle(item.id) : AU.G.galleryBuy(item.id),
            { disabled: !unlocked.has(item.id) && g.tokens < item.cost ? "" : null }))))) : null,
      h("div", { class: "room-a-actions" },
        btn("공간 꾸미기", "primary", toggleShop),
        btn("기록 보기", "", openJournal),
        btn("방문 기록", "", () => { if (!attended) AU.G.galleryCheckin(); }),
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
  const HAS_ART = new Set(["sword_a", "cloth_a", "charm_a", "fox_scarf", "snake_ring", "crab_vest", "fur", "fox_tail", "snake_skin", "snake_fang", "rat_tooth", "crab_claw", "crab_shell", "iron_scrap", "wolf_pelt", "potion", "guild_token", "guild_parcel", "barsha_map", "jepeto_blueprint", "metal_fragment", "carpenter_bag"]);
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
    const top = h("div", { class: "tabs" }, [["bag", "가방"], ["craft", "제작법"]].map(([k, l]) => btn(l, (UI.tab.inv || "bag") === k ? "on" : "", () => { UI.tab.inv = k; UI.renderWin(); })));
    if ((UI.tab.inv || "bag") === "craft") { b.append(top); UI.craftPanel(b); b.append(h("div", { class: "silver", text: "은화 " + S.silver })); return; }
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
    let svg = '<svg viewBox="0 0 260 250" role="img" aria-label="마음 능력치 레이더: 현재와 이전 비교">';
    for (const r of [0.25, 0.5, 0.75, 1]) svg += '<polygon points="' + poly(() => r) + '" fill="none" stroke="#d9e0d8" stroke-width="' + (r === 1 ? 1.6 : 1) + '"/>';
    keys.forEach((k, i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.2); svg += '<line x1="' + CX + '" y1="' + CY + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#d9e0d8"/><text x="' + lx.toFixed(1) + '" y="' + (ly + 5).toFixed(1) + '" text-anchor="middle" class="rl">' + k + '</text>'; });
    svg += '<polygon points="' + poly((k) => tr[k].prevPct / 100) + '" fill="rgba(140,148,156,.10)" stroke="#8c949c" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>';
    svg += '<polygon class="rcur" points="' + poly((k) => tr[k].curPct / 100) + '" fill="rgba(79,125,110,.38)" stroke="#4F7D6E" stroke-width="2.5" stroke-linejoin="round"/>';
    keys.forEach((k, i) => { const [x, y] = pt(i, tr[k].curPct / 100); svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.6" fill="#4F7D6E" stroke="#fff" stroke-width="1.5"/>'; });
    svg += "</svg>";
    const chart = h("div", { class: "mrad" }), holder = h("div", { class: "mradsvg", "data-radar": "1" }); holder.innerHTML = svg;
    chart.append(holder, h("div", { class: "mleg" }, h("span", { class: "lg cur", text: "현재" }), h("span", { class: "lg prev", text: "이전" })));
    const rows = h("div", { class: "mrows" });
    for (const k of keys) {
      const t = tr[k], fresh = last && last.k === k;
      rows.append(h("div", { class: "mrow" + (fresh ? " fresh" : ""), "data-perma": k },
        h("b", { text: k }), h("span", { class: "mn", text: AU.PERMA[k] }),
        h("div", { class: "mbar" }, h("i", { style: "width:" + t.curPct + "%" }), h("s", { class: "mprev", style: "left:" + t.prevPct + "%", title: "이전 " + t.prev })),
        h("em", { class: "mv", text: t.cur + " / " + t.mx }), h("span", { class: "mcmp", text: "이전 " + t.prev + (t.diff ? " · " + (t.diff > 0 ? "+" : "") + t.diff : "") }),
        h("span", { class: "mup", text: fresh ? "방금 +" + last.n : "" })));
    }
    box.append(h("div", { class: "mtrend" }, chart, rows));
    box.append(h("p", { class: "note", text: "현실 활동 완료 시 기본 점수가 오르고, 자기평가 3항목을 기록하면 추가 1점이 쌓입니다. 점선·세로선의 '이전'은 이번 주가 시작될 때의 기록입니다." }));
    box.append(h("p", { class: "note", text: "이것은 게임 속 활동 점수이며 행복이나 건강 상태를 재는 검사 점수가 아닙니다. 전투에는 영향을 주지 않습니다." }));
    if (AU.G.rollMindWeek()) AU.G.save("mind");
    return box;
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

  /* 짧은 자기평가: 점수는 응답의 긍정성 자체가 아니라 평가 참여 여부만 반영합니다. */
  UI.missionReview = function (m, next, onSubmit) {
    const wrap = UI.modalEl; UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
    const ratings = {}, labels = [["challenge", "얼마나 도전적이었나요?"], ["meaning", "나에게 얼마나 의미 있었나요?"], ["satisfaction", "활동 후 얼마나 만족스러웠나요?"]];
    const fields = labels.map(([key, label]) => {
      const sel = h("select", { "aria-label": label });
      sel.append(h("option", { value: "", text: "선택해 주세요" }));
      for (let i = 1; i <= 5; i++) sel.append(h("option", { value: String(i), text: i + " / 5" }));
      ratings[key] = sel; return h("label", { class: "note" }, label, sel);
    });
    const ta = h("textarea", { class: "memo", maxlength: "200", rows: "3", placeholder: "선택: 어떤 경험이었는지 자유롭게 적어 주세요." });
    const close = () => { UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; };
    const submit = () => {
      const review = Object.fromEntries(labels.map(([key]) => [key, Number(ratings[key].value)]));
      review.note = ta.value;
      if (!AU.G.validMissionFeedback(review)) return;
      close(); onSubmit(review);
    };
    const yes = btn(next === "partial" ? "시도 기록하기" : "평가하고 완료하기", "primary", submit, { disabled: "" });
    const upd = () => { if (labels.every(([key]) => ratings[key].value)) yes.removeAttribute("disabled"); else yes.setAttribute("disabled", ""); };
    for (const s of Object.values(ratings)) s.addEventListener("change", upd);
    wrap.append(h("div", { class: "panel modal restnote" }, h("h3", { text: m.title + " · 활동 돌아보기" }),
      h("p", { class: "note", text: "세 항목은 정답이 없습니다. 어려움·낮은 만족도도 그대로 기록해 주세요. 소감 글쓰기는 선택입니다." }),
      ...fields, ta, h("div", { class: "choices" }, yes, btn("평가 없이 계속", "", () => { close(); onSubmit(null); }), btn("취소", "", close))));
    upd();
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
    const dest = new Set();
    for (const [id, rec] of Object.entries(S.quests)) {
      if (rec.state === "done") continue; const q = AU.QUESTS[id];
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
        h("i", { text: seen ? (id === cur ? "●" : "○") : "?" }), h("span", { text: seen ? m.name.replace(" (임시 명칭)", "") : "미발견" }), dest.has(id) ? h("u", { text: "★" }) : null));
    }
    const m = AU.MAPS[sel], seen = !!S.visited[sel];
    const mons = [...new Set((m.spawns || []).map((s) => s.type))].map((t) => AU.MONSTERS[t]);
    const info = h("div", { class: "detail" }, h("h3", { text: seen ? m.name : "아직 발견하지 못한 지역" }),
      h("div", { class: "tags" }, h("span", { class: "tag", text: sel === cur ? "현재 위치" : seen ? "방문함" : "미발견" }), dest.has(sel) ? h("span", { class: "tag star", text: "★ 퀘스트 목적지" }) : null, seen ? h("span", { class: "tag", text: m.safe ? "안전 지역" : "전투 지역" }) : null),
      h("p", { text: seen ? m.area.desc : "이 지역은 아직 가 보지 않았습니다. 길을 따라 이동하면 발견됩니다." }),
      seen && mons.length ? h("p", { class: "note", text: "출현: " + mons.map((x) => x.name + " Lv." + x.lv).join(", ") }) : null,
      ...(seen ? mons.map((x) => h("p", { class: "note", text: x.name + " 처치 시 드롭: " + [...(x.silver ? ["은화 " + Math.round((x.silverRate == null ? 0.5 : x.silverRate) * 100) + "%"] : []), ...(x.drops || []).map(([id, rate]) => (AU.ITEMS[id] ? AU.ITEMS[id].name.replace(" (임시)", "") : id) + " " + (rate * 100).toFixed(rate * 100 % 1 ? 1 : 0) + "%")].join(" · ") })) : []));
    b.append(h("div", { class: "split map" }, map, info), h("p", { class: "note", text: "● 현재 위치 · ○ 방문한 지역 · ? 미발견 · ★ 진행 중인 퀘스트 목적지" }));
  };

  R.quests = function (b) {
    const S = AU.G.S, tab = UI.tab.q || "active"; const TYPE = { main: "메인", sub: "서브", real: "현실" };
    const rows = [];
    for (const [id, rec] of Object.entries(S.quests)) { const q = AU.QUESTS[id]; rows.push({ key: id, title: q.title, type: q.type, done: rec.state === "done", q, rec }); }
    if (S.flags.missionsUnlocked && S.flags.guideMet) for (const m of AU.MISSIONS) { const r = S.missions.states[m.id]; if (r && ["accepted", "attempted", "partial", "done"].includes(r.state)) rows.push({ key: m.id, title: m.title, type: "real", done: r.state === "done", m, r }); }
    const list = rows.filter((r) => (tab === "done") === r.done);
    const sel = list.find((r) => r.key === UI.selected.q) || list[0];
    const tabs = h("div", { class: "tabs" }, btn("진행 중 (" + rows.filter((r) => !r.done).length + ")", tab === "active" ? "on" : "", () => { UI.tab.q = "active"; UI.renderWin(); }), btn("완료 (" + rows.filter((r) => r.done).length + ")", tab === "done" ? "on" : "", () => { UI.tab.q = "done"; UI.renderWin(); }));
    const ul = h("div", { class: "qlist" }); if (!list.length) ul.append(h("p", { class: "empty", text: tab === "done" ? "완료한 퀘스트가 아직 없습니다." : "진행 중인 퀘스트가 없습니다. NPC에게 말을 걸어 보세요." }));
    list.forEach((r) => ul.append(h("button", { type: "button", class: "qitem" + (sel && sel.key === r.key ? " sel" : ""), onclick: () => { UI.selected.q = r.key; UI.renderWin(); } }, h("span", { class: "tag t-" + r.type, text: TYPE[r.type] }), h("span", { text: r.title.replace(" (임시)", "") }), r.rec && r.rec.state === "ready" ? h("em", { text: "완료 가능" }) : null)));
    const det = h("div", { class: "detail" });
    if (sel && sel.q) {
      const q = sel.q, rec = sel.rec;
      det.append(h("h3", { text: q.title }), h("div", { class: "tags" }, h("span", { class: "tag", text: TYPE[q.type] }), h("span", { class: "tag", text: rec.state === "done" ? "완료" : rec.state === "ready" ? "의뢰인에게 돌아가기" : "진행 중" })), h("p", { text: q.desc }),
        h("h4", { text: "수행 조건" }), ...q.objectives.map((o, i) => h("div", { class: "obj" + (AU.G.objectiveDone(q, rec, i) ? " ok" : "") }, (AU.G.objectiveDone(q, rec, i) ? "✔ " : "□ ") + UI.objText(o, rec, i))),
        h("h4", { text: "보상" }), h("p", { text: rewardText(q.reward) }), h("p", { class: "note", text: "의뢰인: " + AU.NPCS[q.giver].name }));
    } else if (sel && sel.m) {
      det.append(h("h3", { text: sel.m.title }), h("div", { class: "tags" }, h("span", { class: "tag", text: "현실" }), h("span", { class: "tag", text: AU.PERMA[sel.m.perma] }), h("span", { class: "tag", text: AU.MISSION_STATES[sel.r.state] })), h("p", { text: sel.m.desc }), h("p", { class: "note", text: "상태 변경은 모험일지(" + keyOf("journal") + ")에서 합니다." }));
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
    b.append(h("h4", { text: "단축 슬롯" }), slots, h("h4", { text: "배운 스킬" }), list, h("p", { class: "note", text: "단축키 자체는 키보드 설정(" + keyOf("keysettings") + ")에서 바꿀 수 있습니다. 새로운 직업 스킬은 이 목록에 추가되는 구조입니다." }));
  };

  const PRO_CARDS = [["stele_read", "마을길 끝의 기념비", "축제를 앞둔 아침, 마을길 끝 기념비에서 다섯 용사의 이야기를 읽었다.", "road"], ["temple_work_complete", "신전을 짓는 아버지 곁에서", "신전 건축 현장에서 목수인 아버지를 도왔다. 평범하고 따뜻한 하루였다.", "temple"], ["banners_done", "축제 깃발", "축제 깃대에 깃발을 달아 마을을 꾸몄다.", "road"], ["festival_interaction_complete", "빛의 축제", "축제 광장에서 이웃들과 이야기를 나눴다.", "plaza"], ["attack_triggered", "갑작스러운 습격", "축제가 열리던 광장에 검은 무리가 들이닥쳤다.", "plaza_atk"], ["father_final_words_seen", "아버지의 마지막 말", "아버지는 낯선 금속 조각과 도구 가방을 맡기고 도망치라고 했다.", "house_atk"], ["arkea_escape_complete", "아르케아를 떠나며", "불타는 마을을 뒤로하고 길을 달렸다.", "escape"], ["porto_nova_reached", "포르투 노바 도착", "낯선 항구도시에 닿았다. 이곳에서 새로운 모험이 시작된다.", "port"]];
  const ACT1_CARDS = []; // 1막 핵심 장면은 본편 구현에 맞춰 추가
  const PRO_STEPS = [["stele_read", "마을길 끝의 기념비를 읽었다"], ["banners_done", "축제 깃발을 깃대에 달았다"], ["temple_work_complete", "신전 건축 현장에서 아버지를 도왔다"], ["festival_interaction_complete", "축제 광장에서 주민들과 이야기를 나눴다"], ["father_final_conversation_complete", "아버지와 마지막 이야기를 나눴다"], ["metal_fragment_acquired", "의문의 금속 조각을 손에 넣었다"], ["carpenter_bag_acquired", "목수 도구 가방을 챙겼다"], ["arkea_escape_complete", "아르케아를 탈출했다"], ["porto_nova_reached", "포르투 노바에 도착했다"]];
  R.journal = function (b) {
    const S = AU.G.S, un = S.flags.missionsUnlocked;
    const grp = UI.tab.jg || "game";   // 현실 활동은 Lv.10 전직 전에도 탭이 보이고(잠금), 내용은 미리 볼 수 있지만 기능은 쓸 수 없음
    b.append(h("div", { class: "jgroup" }, [["game", "모험 이야기"], ["real", un ? "현실 활동" : "🔒 현실 활동"]].map(([k, l]) => h("button", { type: "button", class: "jg " + k + (grp === k ? " on" : ""), onclick: () => { UI.tab.jg = k; UI.renderWin(); } }, l))));
    let tab;
    if (grp === "game") {
      tab = ["pro", "a1", "log"].includes(UI.tab.j) ? UI.tab.j : "a1";
      b.append(h("div", { class: "tabs" }, [["pro", "프롤로그"], ["a1", "1막 · 항구도시"], ["log", "전체 기록"]].map(([k, l]) => btn(l, tab === k ? "on" : "", () => { UI.tab.j = k; UI.renderWin(); }))));
    } else {
      tab = ["missions", "rest", "record"].includes(UI.tab.j) ? UI.tab.j : "missions";
      if (!un) b.append(h("div", { class: "lockbox lockband" }, h("b", { text: "🔒 아직 열리지 않았습니다" }), h("p", { text: "프롤로그를 마치면 열립니다." })));
      b.append(h("div", { class: "realband", text: "게임 속 이야기와는 별개인 현실 활동입니다. 하지 않아도 모험은 계속되고, 직접 해 보고 기록하는 방식입니다." }),
        h("div", { class: "tabs" }, [["missions", "현실 미션"], ["rest", "쉼"], ["record", "마음 기록"]].map(([k, l]) => btn(l, tab === k ? "on" : "", () => { UI.tab.j = k; UI.renderWin(); }))));
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
    } else if (tab === "missions") {
      if (!un) { b.append(h("div", { class: "missions preview" }, AU.MISSIONS.map((m) => h("div", { class: "mission st-locked" }, h("div", { class: "mh" }, h("span", { class: "tag perma", text: m.perma + " · " + AU.PERMA[m.perma] }), h("span", { class: "tag", text: "🔒 잠김" }), h("span", { class: "pts", text: "갤러리 토큰 +1" })), h("b", { text: m.title }), h("p", { text: m.desc }))))); return; }
      if (!S.flags.guideMet) { b.append(h("div", { class: "lockbox" }, h("h3", { text: "새로운 이야기를 기다리고 있어요" }), h("p", { text: "포르투 노바의 알렉시오스과 이야기를 나누면 이곳에 내용이 나타납니다." }))); return; }
      const M = S.missions;
      b.append(h("div", { class: "msummary" }, h("span", { text: "갤러리 토큰 " }), h("b", { text: AU.G.galleryState().tokens }), h("span", { text: " · 마음 성장과 개인 공간 꾸미기에 사용합니다." }), btn("나만의 공간 보기", "mini", () => UI.open("gallery"))),
        h("p", { class: "note", text: "현실 미션은 선택 사항입니다. 하지 않아도 모험을 계속할 수 있고, 수행 여부는 직접 기록하는 방식입니다." }));
      const grid = h("div", { class: "missions" });
      for (const m of AU.MISSIONS) {
        const r = M.states[m.id]; if (!r || r.state === "locked") continue;
        const acts = { available: [["수락", "primary", "accept"], ["건너뛰기", "", "skip"]], accepted: [["해 봤어요", "primary", "attempt"], ["건너뛰기", "", "skip"]], attempted: [["완료했어요", "primary", "done"], ["일부만 했어요", "", "partial"], ["건너뛰기", "", "skip"]],
          partial: [["완료했어요", "primary", "done"], ["다시 도전", "", "retry"], ["건너뛰기", "", "skip"]], skipped: [["다시 도전", "", "retry"]], done: [] }[r.state] || [];
        grid.append(h("div", { class: "mission st-" + r.state }, h("div", { class: "mh" }, h("span", { class: "tag perma", text: m.perma + " · " + AU.PERMA[m.perma] }), h("span", { class: "tag", text: AU.MISSION_STATES[r.state] }), h("span", { class: "pts", text: r.rewarded ? "지급 완료" : "갤러리 토큰 +1" })),
          h("b", { text: m.title }), h("p", { text: m.desc }), acts.length ? h("div", { class: "macts" }, acts.map(([l, c, a]) => btn(l, c, () => ((a === "done" || a === "partial") ? UI.missionReview(m, a, (feedback) => AU.G.setMissionState(m.id, a, feedback)) : (m.guide && a === "attempt" ? UI.guided(m.title, m.guide, () => AU.G.setMissionState(m.id, a)) : AU.G.setMissionState(m.id, a)))))) : null));
      }
      b.append(grid);
    } else if (tab === "rest" && !un) {
      b.append(h("p", { class: "note", text: "쉼 미션은 피로도를 줄여 주는 선택 활동입니다. 스킬을 배우는 Lv.10부터 안내됩니다." }), h("div", { class: "missions preview" }, AU.REST_MISSIONS.map((m) => h("div", { class: "mission st-locked" }, h("div", { class: "mh" }, h("span", { class: "tag", text: "쉼 · 피로도 −" + m.recover }), h("span", { class: "tag", text: "🔒 잠김" })), h("b", { text: m.title }), h("p", { text: m.desc })))));
    } else if (tab === "rest" && !S.skills.unlocked.length) {
      b.append(h("div", { class: "lockbox lockband" }, h("b", { text: "🔒 스킬을 배우면 열립니다 (Lv.10)" }), h("p", { text: "피로도는 스킬을 쓸 때 쌓이는 수치입니다. 스킬을 배우는 시점에 설명과 회복 방법을 알려 드립니다." })));
    } else if (tab === "rest") {
      b.append(h("p", { class: "note", text: "쉼 미션은 선택입니다. 같은 미션은 하루 한 번 가능하며, 실천 후 느낀 상태만 선택하면 됩니다. 자유 소감은 선택입니다." }), UI.fatigueMeter(S, false));
      const grid = h("div", { class: "missions" });
      for (const m of AU.REST_MISSIONS) { const ok = AU.G.restMissionAvailable(m.id);
        grid.append(h("div", { class: "mission st-" + (ok ? "available" : "done") }, h("div", { class: "mh" }, h("span", { class: "tag", text: "쉼 · 피로도 −" + m.recover }), h("span", { class: "tag", text: ok ? "오늘 가능" : "오늘 완료" })), h("b", { text: m.title }), h("p", { text: m.desc }),
          ok ? h("div", { class: "macts" }, btn(m.guide ? "시작하기 (" + Math.round(m.guide.secs / 60 * 10) / 10 + "분)" : "해 봤어요", "primary", () => (m.guide ? UI.guided(m.title, m.guide, () => UI.restNote(m, (t) => AU.G.doRestMission(m.id, t))) : UI.restNote(m, (t) => AU.G.doRestMission(m.id, t))))) : null)); }
      b.append(grid);
    } else if (tab === "record") {
      const cnt = AU.G.permaCounts();
      b.append(UI.mindBlock());
      if (AU.Survey && AU.Survey.enabled() && UI.surveyPanel) b.append(UI.surveyPanel());
      b.append(h("div", { class: "permabar" }, Object.entries(AU.PERMA).map(([k, n]) => h("div", { class: "pc" }, h("b", { text: k }), h("span", { text: n }), h("em", { text: cnt[k] + "회" })))));
      const rows = S.missions.log.slice().reverse();
      b.append(h("p", { class: "note", text: "인증 방식은 아직 정해지지 않아 모두 ‘직접 기록’입니다." }));
      if (!rows.length) b.append(h("p", { class: "empty", text: "아직 기록이 없습니다." }));
      else b.append(h("div", { class: "logs" }, rows.map((e) => { const m = AU.G.mission(e.id); return h("div", { class: "logrow" }, h("span", { text: e.t }), h("span", { class: "tag perma", text: e.perma }), h("b", { text: (m ? m.title : e.id) }), h("span", { class: "tag", text: AU.MISSION_STATES[e.state] }), e.state === "done" ? h("span", { class: "pts", text: e.points ? "+" + e.points + "P" : (e.capped ? "주간 한도" : "") }) : null); })));
    }
  };

  R.help = function (b) {
    const K = (a) => keyOf(a), sec = (t, rows) => h("div", { class: "helpsec" }, h("h3", { text: t }), h("ul", null, rows.map(([k, d]) => h("li", null, h("b", { text: k }), h("span", { text: " " + d })))));
    b.append(h("div", { class: "helpwrap" },
      h("p", { class: "helpintro", text: "처음 마을에 오면 낯선 화면이 많습니다. 아래를 한 번 읽어 두면 편합니다. 이 안내는 언제든 " + K("help") + " 키나 메뉴에서 다시 볼 수 있습니다." }),
      sec("기본 조작", [[K("left") + "·" + K("right"), "이동"], [K("jump"), "점프"], [K("attack"), "기본 공격(피로도가 쌓이지 않음)"], [K("interact"), "NPC와 대화, 물건 줍기, 포털 이동 확인"], [K("up") + "/" + K("down"), "밧줄·사다리 오르내리기, 포털 들어가기"], ["1·2·3", "스킬 슬롯(전직 후 사용)"]]),
      sec("화면 구성", [["왼쪽 위 미니맵", "내 위치(파란 점)와 NPC·몬스터·출구. 누르면 월드맵"], ["목표", "진행 중인 퀘스트와 다음에 할 일. ▾로 접고, 끌어서 옮길 수 있음(더블클릭으로 원위치)"], ["아래 가운데", "레벨, HP(체력), 피로도(스킬을 쓸수록 쌓임), EXP(경험치)"], ["이름표", "발 밑에 이름이 표시됩니다. 몬스터는 머리 위에 레벨과 이름"], ["느낌표 !", "받을 수 있는 퀘스트"], ["물음표 ?", "완료해서 보고할 수 있는 퀘스트"]]),
      sec("창 열기", [[K("inventory"), "인벤토리: 가진 물건, 사용·장착"], [K("equipment"), "장비창: 장착한 장비와 능력치 비교"], [K("stats"), "스탯창: 능력치 보기, 포인트 분배"], [K("skills"), "스킬창: 스킬 확인·배치, 휴식으로 피로도 줄이기"], [K("quests"), "퀘스트창: 진행 중·완료 퀘스트 자세히"], [K("worldmap"), "월드맵: 갈 수 있는 지역"], [K("journal"), "모험일지: 현실 활동 미션, 마음 기록"], [K("keysettings"), "설정: 소리, 키 바꾸기"], ["Esc", "메뉴 / 열린 창 닫기"]]),
      sec("알아 두기", [["쓰러지면", "마을에서 일어나며 경험치를 5% 잃습니다. 문장을 하나 골라 마음을 가다듬는 시간이 있습니다."], ["마을(안전 지역)", "몬스터가 나오지 않는 곳입니다. 체력은 저절로 차지 않으니 회복약을 챙기세요."], ["상점", "상인 NPC와 대화해서 물건을 사고팝니다."], ["레벨 10", "전직 시험을 보기 전까지는 10레벨에서 멈춥니다."]]),
      h("div", { class: "choices" }, btn("알겠습니다", "primary", () => UI.close()))));
  };

  R.jobcard = function (b) {
    const S = AU.G.S;
    b.append(h("div", { class: "jobcard" }, h("h2", { text: "전사로 전직했습니다!" }), h("p", { text: "견습 모험가에서 전사가 되었습니다. 다음 기능이 열렸어요." }),
      h("ul", null, h("li", { text: "스탯 분배: 포인트 " + S.freePoints + "점이 지급되었습니다. 스탯창(" + keyOf("stats") + ")에서 직접 나눠 보세요." }), h("li", { text: "전사 스킬: 1·2·3 슬롯에 배치되어 있습니다. 스킬창(" + keyOf("skills") + ")에서 바꿀 수 있습니다." }), h("li", { text: "피로도: 스킬을 쓸 때마다 쌓이며, 가득 차면 스킬을 쓸 수 없습니다(기본 공격은 가능). 휴식이나 쉼 미션으로 줄일 수 있고, 매주 월요일에 풀립니다." }),
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
        h("div", null, h("h4", { text: "기타" }), btn("HP 전부 회복", "mini", () => { S.hp = AU.G.d().maxHp; AU.G.changed(); }), btn("은화 +100", "mini", () => { AU.G.gainSilver(100); AU.G.changed(); }), btn("훈련 포인트 +3 (지급 경로 우회)", "mini", () => { S.trainingPoints += 3; AU.G.changed(); }),
          btn("전직 시험 퀘스트 바로 완료 준비", "mini", () => { if (!S.jobChanged && S.level >= 10) { S.quests.q_job = { state: "ready", prog: [1] }; AU.G.changed(); AU.G.toast("전직 담당에게 가면 전직합니다.", "info"); } else AU.G.toast("10레벨 이상 · 미전직 상태에서만 가능합니다.", "warn"); })),
        h("div", null, h("h4", { text: "설문 기록(PSS·PERMA)" }), btn(AU.Survey && AU.Survey.enabled() ? "설문 기능 끄기" : "설문 기능 켜기", "mini", () => { AU.Survey.setEnabled(!AU.Survey.enabled()); UI.renderWin(); }, { "data-dev": "survey-toggle" }), btn("PSS CSV", "mini", () => AU.Survey.download("pss"), { "data-dev": "survey-csv-pss" }), btn("PERMA CSV", "mini", () => AU.Survey.download("perma"), { "data-dev": "survey-csv-perma" }), btn("설문 기록 모두 지우기", "mini danger", () => { if (confirm("이 기기의 설문 응답을 모두 지웁니다.")) { AU.Survey.resetAll(); UI.renderWin(); } }, { "data-dev": "survey-reset" }), h("p", { class: "note", text: "기본은 꺼짐. 주소 끝에 ?survey=1 로도 켤 수 있습니다. 사용 허가·연구 승인 전에는 이용자에게 켜지 않습니다." })),
        h("div", null, h("h4", { text: "마음 기록 인터페이스 시험" }), btn("PSS 샘플 기록 추가", "mini", () => AU.G.addCheckin({ scale: "PSS", score: 12, items: null, source: "dev-sample" })), h("p", { class: "note", text: "기록 " + S.mind.checkins.length + "건. 게임 자원과 별도 저장되며, 점수→" + C.fatigue.name + " 환산은 하지 않습니다." }))));
    const PR = AU.Prologue, grid = b.querySelector(".devgrid");
    if (PR && grid) grid.append(h("div", null, h("h4", { text: "프롤로그" }), h("div", { class: "devrow" }, PR.ORDER.map((_, n) => btn("장면 " + (n + 1), "mini", () => { UI.close(); PR.devJump(n); }))),
      btn("즉시 완료 → 포르투 노바", "mini", () => { UI.close(); PR.debugComplete("porto"); }), btn("컷신 건너뛰기", "mini", () => { UI.close(); PR.skip(); }),
      h("p", { class: "note", text: "상태 " + PR.st().state + " · 깃발 " + Object.keys(PR.st().flags).filter((k) => PR.st().flags[k]).length + "개" + (PR.replay ? " (다시 보기 중: 저장 기록은 바뀌지 않음)" : "") })));
  };
  UI.settings = { confirmUnload: true, reduceFx: false, mute: false, volBgm: 1, volSfx: 1, volCombat: 1 }; UI.devVisible = false;
})();
