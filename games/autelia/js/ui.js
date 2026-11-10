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
  const WIN_KEYS = { inventory: "inventory", equipment: "equipment", stats: "stats", worldmap: "worldmap", quests: "quests", skills: "skills", journal: "journal", keysettings: "keysettings" };
  const WIN_TITLE = { inventory: "인벤토리", equipment: "장비", stats: "스탯", worldmap: "월드맵", quests: "퀘스트", skills: "스킬", journal: "모험일지", keysettings: "키보드 설정", menu: "메뉴", jobcard: "전직", dev: "개발 테스트 (임시)" };

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
  const keyOf = (actionId) => AU.keyLabel(AU.Input.bindings[actionId]);

  const UI = AU.UI = {
    cur: null, curName: null, dialog: null, pending: { STR: 0, VIT: 0, AGI: 0, DEX: 0, WIL: 0 }, afterDialog: [], listening: null, tab: {}, selected: {},
    anyOpen() { return !!(this.cur || this.dialog || this.modal); },

    /* ============ 기본 틀 ============ */
    init() {
      this.root = $("#ui"); this.hud = {};
      this.buildHud();
      AU.Ev.on("toast", (t) => this.toast(t.text, t.kind));
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
      // 하단 중앙: 캐릭터 상태(레벨·직업·HP·활력·경험치)
      const hp = h("div", { class: "bar hp" }, h("i"), h("b")), rs = h("div", { class: "bar rs" }, h("i"), h("b")), ex = h("div", { class: "bar ex" }, h("i"), h("b"));
      this.hud.lv = h("div", { class: "lvbadge" }); this.hud.job = h("div", { class: "jobname" });
      const panel = h("div", { id: "hudpanel", class: "panel hudpanel" }, h("div", { class: "hudmain" }, h("div", { class: "hudhead" }, this.hud.lv, this.hud.job), h("div", { class: "hudbars" }, hp, rs)), ex);
      this.hud.hp = hp; this.hud.rs = rs; this.hud.ex = ex;
      // 좌측 상단: 미니맵 + 현재 퀘스트
      this.hud.mapLabel = h("div", { class: "minilabel" });
      this.hud.mini = h("canvas", { class: "minicv", width: 428, height: 150, title: "클릭하면 월드맵" });
      this.hud.miniBox = h("div", { class: "panel minimap", onclick: () => this.toggleWin("worldmap") }, this.hud.mapLabel, this.hud.mini);
      this.hud.tracker = h("div", { class: "tracker panel" });
      const topleft = h("div", { class: "topleft" }, this.hud.miniBox, this.hud.tracker);
      this.hud.menuBtn = btn("메뉴", "menubtn", () => this.toggleMenu(), { title: "메뉴 (Esc)" });
      this.hud.menuBtn.append(h("span", { class: "dot", id: "menudot" }));
      // 우측 하단: 스킬 슬롯
      this.hud.slots = [0, 1, 2].map((i) => h("div", { class: "slot", onclick: () => AU.World.onAction("skill" + (i + 1)) }, h("div", { class: "sk" }), h("div", { class: "sc" }), h("div", { class: "skey" }), h("div", { class: "scost" })));
      this.hud.prompt = h("div", { class: "prompt" });
      this.hud.mapName = h("div", { class: "mapname" });
      this.hud.toasts = h("div", { class: "toasts" });
      this.hud.save = h("div", { class: "savedflash" });
      this.hud.banner = h("div", { class: "banner" });
      this.hud.warn = h("div", { class: "storewarn" });
      this.hud.devBtn = btn("개발", "devbtn", () => this.toggleWin("dev"), { title: "개발 테스트 (F2)" });
      R.append(panel, topleft, this.hud.menuBtn, h("div", { class: "slots" }, this.hud.slots), this.hud.prompt, this.hud.mapName, this.hud.toasts, this.hud.save, this.hud.banner, this.hud.warn, this.hud.devBtn);
      this.hud.cache = {};
      this.winEl = h("div", { class: "winwrap hidden" }); this.dlgEl = h("div", { class: "dialog hidden" }); this.modalEl = h("div", { class: "modalwrap hidden" });
      R.append(this.winEl, this.dlgEl, this.modalEl);
    },
    // 미니맵: 지형·포털·NPC·몬스터·플레이어와 현재 화면 범위를 작게 그림
    drawMini() {
      const cv = this.hud.mini, c = cv.getContext("2d"), W = AU.World, m = W.map, p = W.player; if (!m) return;
      const cw = cv.width, ch = cv.height, s = Math.min((cw - 16) / m.width, (ch - 16) / C.H), ox = (cw - m.width * s) / 2, oy = (ch - C.H * s) / 2;
      const X = (x) => ox + x * s, Y = (y) => oy + y * s;
      c.clearRect(0, 0, cw, ch);
      c.fillStyle = m.safe ? "rgba(79,125,110,.16)" : "rgba(185,139,69,.14)"; c.fillRect(ox, oy, m.width * s, C.H * s);
      c.strokeStyle = "rgba(60,45,30,.55)"; c.lineWidth = 2; c.beginPath(); c.moveTo(X(0), Y(C.GROUND)); c.lineTo(X(m.width), Y(C.GROUND)); c.stroke();
      c.lineWidth = 3; for (const pl of m.platforms) if (pl.y < C.GROUND) { c.beginPath(); c.moveTo(X(pl.x), Y(pl.y)); c.lineTo(X(pl.x + pl.w), Y(pl.y)); c.stroke(); }
      c.strokeStyle = "rgba(139,94,52,.7)"; c.lineWidth = 2; for (const r of m.ropes || []) { c.beginPath(); c.moveTo(X(r.x), Y(r.top)); c.lineTo(X(r.x), Y(r.bottom)); c.stroke(); }
      c.strokeStyle = "rgba(60,45,30,.45)"; c.lineWidth = 1.5; c.strokeRect(X(W.camX), oy, C.W * s, C.H * s); // 지금 화면에 보이는 범위
      const dot = (x, y, col, r) => { c.fillStyle = col; c.beginPath(); c.arc(X(x), Y(y), r, 0, 7); c.fill(); };
      for (const pt of m.portals || []) { c.fillStyle = "#4F7D6E"; const px = X(pt.x), py = Y(C.GROUND - 40); c.beginPath(); c.moveTo(px, py - 9); c.lineTo(px + 7, py + 3); c.lineTo(px - 7, py + 3); c.closePath(); c.fill(); }
      for (const n of m.npcs || []) dot(n.x, C.GROUND - 40, "#E0A83A", 5);
      for (const q of W.monsters) if (q.alive) dot(q.x, q.y - 20, q.d.boss ? "#8A3BC0" : "#D5695F", q.d.boss ? 7 : 4.5);
      c.strokeStyle = "#fff"; c.lineWidth = 2.5; dot(p.x, p.y - 40, "#2F6FB0", 6); c.beginPath(); c.arc(X(p.x), Y(p.y - 40), 6, 0, 7); c.stroke();
    },
    setText(el, key, v) { if (this.hud.cache[key] !== v) { this.hud.cache[key] = v; el.textContent = v; } },
    setStyle(el, key, prop, v) { const k = key + prop; if (this.hud.cache[k] !== v) { this.hud.cache[k] = v; el.style[prop] = v; } },
    updateHud() {
      const S = AU.G.S, d = AU.G.d(), W = AU.World, p = W.player;
      this.setText(this.hud.lv, "lv", "Lv." + S.level); this.setText(this.hud.job, "job", AU.jobName(S));
      const hpv = Math.max(0, Math.ceil(S.hp));
      this.setStyle(this.hud.hp.firstChild, "hp", "width", Math.max(0, Math.min(100, S.hp / d.maxHp * 100)).toFixed(1) + "%"); this.setText(this.hud.hp.lastChild, "hpt", "HP " + hpv + " / " + d.maxHp);
      this.setStyle(this.hud.rs.firstChild, "rs", "width", (S.resource / S.resourceMax * 100).toFixed(1) + "%"); this.setText(this.hud.rs.lastChild, "rst", C.resource.name + " " + (+S.resource.toFixed(1)) + " / " + S.resourceMax);
      const need = AU.expToNext(S.level), atCap = S.level >= AU.levelCap(S);
      this.setStyle(this.hud.ex.firstChild, "ex", "width", (atCap && !S.jobChanged ? 100 : Math.min(100, S.exp / need * 100)).toFixed(1) + "%");
      this.setText(this.hud.ex.lastChild, "ext", atCap && !S.jobChanged ? "EXP 전직 필요" : "EXP " + S.exp + " / " + need + " (" + (S.exp / need * 100).toFixed(1) + "%)");
      // 스킬 슬롯
      this.hud.slots.forEach((el, i) => {
        const id = S.skills.slots[i], sk = id && AU.SKILLS[id], cd = id ? (p.cd[id] || 0) : 0;
        this.setText(el.querySelector(".sk"), "sk" + i, sk ? sk.name.replace(" (임시)", "") : (S.jobChanged ? "빈 슬롯" : "잠김"));
        this.setText(el.querySelector(".skey"), "skey" + i, keyOf("skill" + (i + 1)));
        this.setText(el.querySelector(".scost"), "scost" + i, sk ? String(AU.G.skillCost(id)) : "");
        this.setText(el.querySelector(".sc"), "sc" + i, cd > 0.05 ? cd.toFixed(1) : "");
        el.classList.toggle("empty", !sk); el.classList.toggle("cool", cd > 0.05); el.classList.toggle("low", !!sk && !AU.G.canSpend(id));
      });
      // 메뉴 버튼 알림점(분배 가능 포인트)
      const dot = $("#menudot"); if (dot) dot.style.display = AU.G.pool() > 0 ? "block" : "none";
      this.hud.devBtn.style.display = this.devVisible ? "" : "none";
      this.updateTracker(); this.drawMini(); this.setText(this.hud.mapLabel, "ml", W.map ? W.map.name.replace(" (임시 명칭)", "") : "");
      const pr = this.anyOpen() ? "" : W.prompt;
      this.setText(this.hud.prompt, "prompt", pr.replace(/^Space/, keyOf("interact")).replace("↑ 이동", AU.keyLabel(AU.Input.bindings.up) + " 이동")); this.hud.prompt.style.display = pr ? "block" : "none";
      this.hud.warn.style.display = AU.Store.persistent ? "none" : "block";
      if (!AU.Store.persistent) this.hud.warn.textContent = "브라우저 저장이 막혀 있습니다. 이번 접속 동안만 기록이 유지됩니다.";
    },
    updateTracker() {
      const S = AU.G.S, t = this.hud.tracker; let shown = false;
      const order = Object.entries(S.quests).filter(([, r]) => r.state === "active" || r.state === "ready");
      const pick = order.find(([id]) => AU.QUESTS[id].type === "main") || order[0];
      if (pick && !this.anyOpen()) {
        const [id, rec] = pick, q = AU.QUESTS[id];
        const key = id + rec.state + JSON.stringify(rec.prog) + AU.G.count("fur");
        if (this.hud.cache.trk !== key) {
          this.hud.cache.trk = key; t.innerHTML = "";
          t.append(h("div", { class: "tt" }, q.title.replace(" (임시)", "")));
          if (rec.state === "ready") t.append(h("div", { class: "to ok" }, "의뢰인에게 돌아가기: " + AU.NPCS[q.giver].name.replace(" (임시)", "")));
          else q.objectives.forEach((o, i) => t.append(h("div", { class: "to" + (AU.G.objectiveDone(q, rec, i) ? " ok" : "") }, this.objText(o, rec, i))));
        }
        shown = true;
      }
      t.style.display = shown ? "block" : "none";
    },
    objText(o, rec, i) {
      const prog = rec ? (o.kind === "collect" ? Math.min(AU.G.count(o.item), o.count) : (rec.prog[i] || 0)) : 0;
      if (o.kind === "kill") return AU.MONSTERS[o.target].name.replace(" (임시)", "") + " 처치 (" + prog + "/" + o.count + ")";
      if (o.kind === "collect") return AU.ITEMS[o.item].name + " 수집 (" + prog + "/" + o.count + ")";
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
    toggleWin(name) { if (this.dialog) return; if (this.curName === name) this.close(); else this.open(name); },
    toggleMenu() { if (this.dialog) return; if (this.curName === "menu") this.close(); else this.open("menu"); },
    open(name) {
      if (this.dialog || this.modal) return;
      if (this.curName === "stats" && name !== "stats") this.resetPending();
      this.cur = true; this.curName = name; this.winEl.classList.remove("hidden"); this.renderWin();
      AU.Input.held.clear();
    },
    close() {
      this.resetPending(); this.cur = null; this.curName = null; this.listening = null; this.winEl.classList.add("hidden"); this.winEl.innerHTML = "";
      AU.Input.held.clear(); AU.G.save("menu-close");
    },
    resetPending() { for (const k of Object.keys(this.pending)) this.pending[k] = 0; },
    renderWin() {
      const name = this.curName, R = this.renders[name]; if (!R) return;
      const prevScroll = this.winEl.querySelector(".wbody") ? this.winEl.querySelector(".wbody").scrollTop : 0;
      const title = h("div", { class: "wtitle" }, h("span", { text: WIN_TITLE[name] }), name !== "menu" ? h("span", { class: "whint", text: this.winKeyHint(name) }) : null, btn("✕", "close", () => this.close(), { "aria-label": "닫기" }));
      const body = h("div", { class: "wbody" });
      R.call(this, body);
      const box = h("div", { class: "window panel win-" + name }, title, body);
      this.winEl.innerHTML = ""; this.winEl.append(box); body.scrollTop = prevScroll;
    },
    winKeyHint(name) { const id = WIN_KEYS[name]; return id ? "[" + keyOf(id) + "]" : ""; },

    /* ============ 대화 ============ */
    talkNpc(npcId) {
      const npc = AU.NPCS[npcId], S = AU.G.S; AU.G.onTalk(npcId);
      let qid = (npc.quests || []).find((id) => AU.G.questStatus(id) === "ready" && AU.QUESTS[id].giver === npcId);
      if (qid) {
        const q = AU.QUESTS[qid];
        return this.say(npc, q.done, { end: () => { AU.G.turnIn(qid); } });
      }
      qid = (npc.quests || []).find((id) => AU.G.questStatus(id) === "available" && AU.QUESTS[id].giver === npcId);
      if (qid) {
        const q = AU.QUESTS[qid];
        return this.say(npc, q.offer, { choices: [{ label: "수락", key: "interact", fn: () => AU.G.startQuest(qid) }, { label: "나중에", key: "menu", fn: () => {} }] });
      }
      const act = (npc.quests || []).find((id) => AU.G.questStatus(id) === "active" && AU.QUESTS[id].giver === npcId);
      if (act) return this.say(npc, ["아직 진행 중이에요. (" + AU.QUESTS[act].title.replace(" (임시)", "") + ")"]);
      if (npc.special === "missionGuide") {
        if (S.flags.missionsUnlocked && !S.flags.guideMet) {
          return this.say(npc, ["전사가 되셨군요! 모험을 하다 보면, 일상에서 해 볼 만한 작은 활동들도 만나게 돼요.", "해 볼지 말지는 전적으로 자유예요. 안 해도 모험은 이어갈 수 있어요.", "모험일지(" + keyOf("journal") + ")에서 확인해 보세요."], { end: () => { AU.G.discoverMissions(); } });
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
      const last = d.i >= d.lines.length - 1, cur = d.lines[d.i], isObj = cur && typeof cur === "object", np = isObj ? cur.npc : d.npc, text = AU.Profile.fmt(isObj ? cur.t : cur);
      const ppk = AU.Img.has(np.portrait) ? np.portrait : (np.alt && AU.Img.has(np.alt) ? np.alt : np.portrait), pt = AU.Img.has(ppk) ? h("img", { src: AU.ASSETS[ppk].path, alt: "" }) : h("div", { class: "ptfallback", text: np.name.slice(0, 1) });
      const choices = last && d.opt.choices ? h("div", { class: "choices" }, d.opt.choices.map((c) => btn(c.label + "  (" + keyOf(c.key) + ")", c.key === "interact" ? "primary" : "", () => this.finishDialog(c)))) : null;
      this.dlgEl.innerHTML = ""; this.dlgEl.append(h("div", { class: "panel dlgbox" }, h("div", { class: "pt" }, pt), h("div", { class: "dtext" }, h("div", { class: "dname", text: AU.Profile.fmt(np.name) }), h("div", { class: "dline", text: text }),
        choices || h("div", { class: "dnext" }, btn(last ? "닫기 (" + keyOf("interact") + ")" : "다음 ▶ (" + keyOf("interact") + ")", "", () => this.advanceDialog())))));
    },
    advanceDialog() {
      const d = this.dialog; if (!d) return;
      if (d.i < d.lines.length - 1) { d.i++; this.renderDialog(); return; }
      if (d.opt.choices) { this.finishDialog(d.opt.choices[0]); return; }
      this.finishDialog(null);
    },
    finishDialog(choice) {
      const d = this.dialog; if (!d) return;
      this.dialog = null; this.dlgEl.classList.add("hidden"); this.dlgEl.innerHTML = ""; AU.Input.held.clear();
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
        if (id === "interact") this.advanceDialog(); else if (id === "menu") this.cancelDialog();
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

  R.menu = function (b) {
    const S = AU.G.S;
    let items = [["인벤토리", "inventory"], ["장비", "equipment"], ["스탯", "stats"], ["월드맵", "worldmap"], ["퀘스트", "quests"], ["스킬", "skills"], ["모험일지", "journal"], ["키보드 설정", "keysettings"]];
    if (AU.Prologue && AU.Prologue.on) items = items.filter(([, n]) => AU.Prologue.allowWin(n)); // 프롤로그 중에는 필요한 메뉴만
    b.append(h("div", { class: "menugrid" }, items.map(([label, name]) => btn(h("span", null, label, h("em", { text: "[" + keyOf(WIN_KEYS[name]) + "]" })), "menuitem", () => this.open(name)))));
    const row = h("div", { class: "menurow" },
      btn("이어하기", "primary", () => this.close()), btn("지금 저장", "", () => { AU.G.save("manual"); AU.G.toast("저장했습니다.", "good"); }),
      btn("처음부터 다시", "danger", () => this.confirm("저장된 기록을 지우고 처음부터 시작할까요? 되돌릴 수 없습니다.", "지우고 시작", () => AU.main.resetAll())));
    if (AU.main && AU.main.embedded) row.append(btn("온앤오프로 돌아가기", "", () => { AU.G.save("exit"); AU.main.post("exit"); }));
    b.append(row);
    b.append(h("p", { class: "note", text: "저장 위치: 이 브라우저(" + (AU.Store.persistent ? "로컬 저장소" : "임시 메모리: 접속 종료 시 사라짐") + ") · 마지막 저장: " + (S.savedAt ? new Date(S.savedAt).toLocaleTimeString("ko-KR") : "없음") + " · 버전 " + AU.VERSION }));
  };

  R.inventory = function (b) {
    const S = AU.G.S, ids = Object.keys(S.inv), sel = UI.selected.inv && S.inv[UI.selected.inv] ? UI.selected.inv : ids[0];
    UI.selected.inv = sel;
    const TYPE = { equip: "장비", use: "소비", etc: "기타", quest: "퀘스트", story: "중요 물품" };
    const grid = h("div", { class: "itemgrid" });
    if (!ids.length) grid.append(h("p", { class: "empty", text: "가방이 비어 있습니다." }));
    ids.forEach((id) => { const it = AU.ITEMS[id]; grid.append(h("button", { type: "button", class: "item" + (id === sel ? " sel" : ""), onclick: () => { UI.selected.inv = id; UI.renderWin(); } }, h("span", { class: "iname", text: it.name.replace(" (임시)", "") }), h("span", { class: "itype t-" + it.type, text: TYPE[it.type] }), h("span", { class: "icount", text: "×" + S.inv[id] }))); });
    const det = h("div", { class: "detail" });
    if (sel) {
      const it = AU.ITEMS[sel]; det.append(h("h3", { text: it.name }), h("div", { class: "tags" }, h("span", { class: "tag", text: TYPE[it.type] }), it.slot ? h("span", { class: "tag", text: AU.SLOT_LABEL[it.slot] }) : null, h("span", { class: "tag", text: "보유 " + S.inv[sel] })), h("p", { text: it.desc }));
      if (it.stats) det.append(h("p", { class: "stat", text: Object.entries(it.stats).map(([k, v]) => statName(k) + " +" + v).join(" · ") }));
      if (it.type === "use") det.append(btn("사용", "primary", () => AU.G.useItem(sel)));
      if (it.type === "equip") det.append(btn("장착", "primary", () => AU.G.equip(sel)), btn("장비창에서 비교", "", () => { UI.selected.eq = sel; UI.open("equipment"); }));
      if (it.type === "quest") det.append(h("p", { class: "note", text: "퀘스트용 아이템입니다. 사용하거나 장착할 수 없습니다." }));
      if (it.type === "story") det.append(h("p", { class: "note", text: "이야기와 관련된 중요한 물건입니다. 사용하거나 버릴 수 없고, 본편에서도 계속 간직합니다." }));
    } else det.append(h("p", { class: "empty", text: "아이템을 선택하면 설명이 표시됩니다." }));
    b.append(h("div", { class: "silver", text: "은화 " + S.silver }), h("div", { class: "split" }, grid, det));
  };
  const statName = (k) => ({ atk: "공격력", hp: "최대 HP", dodge: "회피율", crit: "치명타율" }[k] || k);

  R.equipment = function (b) {
    const S = AU.G.S, d0 = AU.G.d();
    const slots = h("div", { class: "eqslots" });
    for (const slot of Object.keys(S.equip)) {
      const id = S.equip[slot], it = id && AU.ITEMS[id];
      slots.append(h("div", { class: "eqslot" }, h("div", { class: "eqlabel", text: AU.SLOT_LABEL[slot] }), h("div", { class: "eqname", text: it ? it.name.replace(" (임시)", "") : "비어 있음" }),
        it ? h("div", { class: "stat", text: Object.entries(it.stats).map(([k, v]) => statName(k) + " +" + v).join(" · ") }) : null,
        it ? btn("해제", "", () => AU.G.unequip(slot)) : null));
    }
    const cands = Object.keys(S.inv).filter((id) => AU.ITEMS[id].type === "equip");
    const sel = UI.selected.eq && S.inv[UI.selected.eq] ? UI.selected.eq : cands[0]; UI.selected.eq = sel;
    const list = h("div", { class: "itemgrid small" }); if (!cands.length) list.append(h("p", { class: "empty", text: "가방에 장착할 수 있는 장비가 없습니다." }));
    cands.forEach((id) => list.append(h("button", { type: "button", class: "item" + (id === sel ? " sel" : ""), onclick: () => { UI.selected.eq = id; UI.renderWin(); } }, h("span", { class: "iname", text: AU.ITEMS[id].name.replace(" (임시)", "") }), h("span", { class: "itype t-equip", text: AU.SLOT_LABEL[AU.ITEMS[id].slot] }))));
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

  R.stats = function (b) {
    const S = AU.G.S, P = UI.pending, pend = Object.values(P).reduce((a, c) => a + c, 0), pool = AU.G.pool(), left = pool - pend;
    const tot = {}; for (const k of Object.keys(S.stats)) tot[k] = AU.statTotal(S, k) + P[k];
    const d0 = AU.G.d(), d1 = AU.derive(S, { stats: tot });
    const NAMES = { STR: ["근력", "공격력"], VIT: ["체력", "최대 HP"], AGI: ["민첩", "회피"], DEX: ["기교", "치명타"], WIL: ["의지", C.resource.name + " 효율"] };
    const pk = AU.Profile.portraitKey(), pt = AU.Img.has(pk) ? h("img", { src: AU.ASSETS[pk].path, alt: "" }) : h("div", { class: "ptfallback", text: "나" });
    const left1 = h("div", { class: "statchar" }, h("div", { class: "pt" }, pt), h("div", { class: "cname", text: "모험가" }), h("div", { class: "clv", text: "Lv." + S.level + " · " + AU.jobName(S) }),
      h("div", { class: "ptbox" }, h("div", { class: "ptrow" }, h("span", { text: "레벨 포인트" }), h("b", { text: S.freePoints })), h("div", { class: "ptrow" }, h("span", { text: "훈련 포인트" }), h("b", { text: S.trainingPoints })), h("div", { class: "ptrow big" }, h("span", { text: "분배 가능" }), h("b", { text: left }))),
      h("div", { class: "tiers" }, AU.JOB_TIERS.map((t) => h("div", { class: "tier" + (S.level >= t.level ? " reach" : "") }, h("b", { text: "Lv." + t.level }), h("span", { text: t.name })))));
    const rows = h("div", { class: "statrows" });
    for (const k of Object.keys(S.stats)) {
      const base = S.stats[k], al = S.alloc[k], pd = P[k];
      rows.append(h("div", { class: "statrow" }, h("div", { class: "sn" }, h("b", { text: k }), h("span", { text: NAMES[k][0] })), h("div", { class: "sv" }, h("b", { text: base + al + pd }), pd ? h("em", { class: "pp", text: "(+" + pd + ")" }) : (al ? h("em", { text: "(분배 +" + al + ")" }) : null)),
        h("div", { class: "sdesc", text: NAMES[k][1] }), h("div", { class: "sbtns" }, btn("−", "mini", () => { if (P[k] > 0) { P[k]--; UI.renderWin(); } }, { disabled: pd <= 0 ? "" : null, "aria-label": NAMES[k][0] + " 줄이기" }), btn("+", "mini plus", () => { if (left > 0) { P[k]++; UI.renderWin(); } }, { disabled: left <= 0 ? "" : null, "aria-label": NAMES[k][0] + " 늘리기" }))));
    }
    const eq = AU.equipBonus(S);
    const cmp = (label, k, u, bonus) => h("div", { class: "cmp" }, h("span", { text: label }), h("b", { text: d0[k] + u }), d1[k] !== d0[k] ? h("span", { text: "→ " }) : null, d1[k] !== d0[k] ? h("b", { class: "up", text: d1[k] + u }) : null, bonus ? h("em", { text: "장비 +" + bonus + u }) : null);
    const derived = h("div", { class: "derived" }, h("h3", { text: "전투 능력치" }), cmp("공격력", "atk", "", eq.atk), cmp("최대 HP", "maxHp", "", eq.hp), cmp("회피율", "dodge", "%", eq.dodge), cmp("치명타율", "crit", "%", eq.crit), cmp(C.resource.name + " 효율", "eff", "%", 0));
    const actions = h("div", { class: "statactions" }, btn("초기화", "", () => { UI.resetPending(); UI.renderWin(); }, { disabled: pend ? null : "" }), btn("적용 (" + pend + "점)", "primary", () => { const a = {}; for (const k of Object.keys(P)) if (P[k]) a[k] = P[k]; if (AU.G.applyAllocation(a)) UI.resetPending(); UI.renderWin(); }, { disabled: pend ? null : "" }));
    const hint = pool > 0 ? "＋ 버튼으로 미리 배분한 뒤 [적용]을 눌러야 확정·저장됩니다. 창을 닫으면 미적용분은 취소됩니다." : (S.jobChanged ? "남은 포인트가 없습니다. 레벨업(11레벨부터)이나 현실 미션으로 포인트를 얻을 수 있습니다." : "1~9레벨은 능력치가 자동으로 성장합니다. 10레벨 전직 후부터 직접 분배합니다.");
    b.append(h("div", { class: "statlayout" }, left1, h("div", { class: "statmid" }, rows, h("p", { class: "note", text: hint }), actions), derived));
  };

  R.worldmap = function (b) {
    const S = AU.G.S, cur = AU.World.mapId, sel = UI.selected.map || cur; UI.selected.map = sel;
    const dest = new Set();
    for (const [id, rec] of Object.entries(S.quests)) {
      if (rec.state === "done") continue; const q = AU.QUESTS[id];
      const mapOfNpc = (nid) => Object.keys(AU.MAPS).find((m) => !AU.MAPS[m].prologue && (!AU.MAPS[m].hidden || S.visited[m]) && (AU.MAPS[m].npcs || []).some((n) => n.id === nid));
      if (rec.state === "ready") { dest.add(mapOfNpc(q.giver)); continue; }
      q.objectives.forEach((o, i) => { if (AU.G.objectiveDone(q, rec, i)) return;
        if (o.kind === "kill") for (const m of Object.keys(AU.MAPS)) { const mp = AU.MAPS[m]; if ((mp.spawns || []).some((s) => s.type === o.target) || (mp.boss && mp.boss.type === o.target)) dest.add(m); }
        if (o.kind === "talk") dest.add(mapOfNpc(o.target)); });
    }
    const map = h("div", { class: "mapbox" });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("class", "maplines");
    for (const [a, c] of AU.AREA_LINKS) {
      const A = AU.MAPS[a].area, B = AU.MAPS[c].area, both = S.visited[a] && S.visited[c];
      const ln = document.createElementNS("http://www.w3.org/2000/svg", "line"); ln.setAttribute("x1", A.x); ln.setAttribute("y1", A.y); ln.setAttribute("x2", B.x); ln.setAttribute("y2", B.y); ln.setAttribute("class", both ? "on" : "off"); svg.append(ln);
    }
    map.append(svg);
    for (const [id, m] of Object.entries(AU.MAPS)) {
      if (m.prologue || (m.hidden && !S.visited[id])) continue; // 프롤로그 맵과 가지 못하는 지역은 월드맵에 표시하지 않음
      const seen = !!S.visited[id];
      map.append(h("button", { type: "button", class: "node" + (id === cur ? " here" : "") + (seen ? "" : " unseen") + (id === sel ? " sel" : ""), style: "left:" + m.area.x + "%;top:" + m.area.y + "%", onclick: () => { UI.selected.map = id; UI.renderWin(); } },
        h("i", { text: seen ? (id === cur ? "●" : "○") : "?" }), h("span", { text: seen ? m.name.replace(" (임시 명칭)", "") : "미발견" }), dest.has(id) ? h("u", { text: "★" }) : null));
    }
    const m = AU.MAPS[sel], seen = !!S.visited[sel];
    const mons = [...new Set((m.spawns || []).map((s) => s.type))].map((t) => AU.MONSTERS[t]);
    const info = h("div", { class: "detail" }, h("h3", { text: seen ? m.name : "아직 발견하지 못한 지역" }),
      h("div", { class: "tags" }, h("span", { class: "tag", text: sel === cur ? "현재 위치" : seen ? "방문함" : "미발견" }), dest.has(sel) ? h("span", { class: "tag star", text: "★ 퀘스트 목적지" }) : null, seen ? h("span", { class: "tag", text: m.safe ? "안전 지역" : "전투 지역" }) : null),
      h("p", { text: seen ? m.area.desc : "이 지역은 아직 가 보지 않았습니다. 길을 따라 이동하면 발견됩니다." }),
      seen && mons.length ? h("p", { class: "note", text: "출현: " + mons.map((x) => x.name + " Lv." + x.lv).join(", ") }) : null);
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
        h("h4", { text: "수행 조건" }), q.objectives.map((o, i) => h("div", { class: "obj" + (AU.G.objectiveDone(q, rec, i) ? " ok" : "") }, (AU.G.objectiveDone(q, rec, i) ? "✔ " : "□ ") + UI.objText(o, rec, i))),
        h("h4", { text: "보상" }), h("p", { text: rewardText(q.reward) }), h("p", { class: "note", text: "의뢰인: " + AU.NPCS[q.giver].name }));
    } else if (sel && sel.m) {
      det.append(h("h3", { text: sel.m.title }), h("div", { class: "tags" }, h("span", { class: "tag", text: "현실" }), h("span", { class: "tag", text: AU.PERMA[sel.m.perma] }), h("span", { class: "tag", text: AU.MISSION_STATES[sel.r.state] })), h("p", { text: sel.m.desc }), h("p", { class: "note", text: "상태 변경은 모험일지(" + keyOf("journal") + ")에서 합니다." }));
    } else det.append(h("p", { class: "empty", text: "퀘스트를 선택하면 자세한 내용이 표시됩니다." }));
    b.append(tabs, h("div", { class: "split q" }, ul, det));
  };
  const rewardText = (r) => [r.exp ? "경험치 " + r.exp : null, r.silver ? "은화 " + r.silver : null, ...(r.items || []).map(([i, n]) => AU.ITEMS[i].name + " ×" + n)].filter(Boolean).join(" · ") || "없음";

  R.skills = function (b) {
    const S = AU.G.S;
    if (!S.jobChanged) { b.append(h("div", { class: "lockbox" }, h("h3", { text: "아직 배운 스킬이 없습니다" }), h("p", { text: "10레벨 전직 후 직업 스킬이 열립니다. (현재 " + AU.jobName(S) + " · Lv." + S.level + ")" }), h("p", { class: "note", text: "기본 공격(" + keyOf("attack") + ")은 " + C.resource.name + "을 쓰지 않습니다." }))); return; }
    const slots = h("div", { class: "skslots" }, [0, 1, 2].map((i) => { const id = S.skills.slots[i]; return h("div", { class: "skslot" }, h("div", { class: "skey", text: keyOf("skill" + (i + 1)) }), h("div", { class: "skname", text: id ? AU.SKILLS[id].name.replace(" (임시)", "") : "비어 있음" }), id ? btn("해제", "mini", () => { S.skills.slots[i] = null; AU.G.save("skill"); AU.G.changed(); }) : null); }));
    const list = h("div", { class: "sklist" });
    for (const id of S.skills.unlocked) {
      const sk = AU.SKILLS[id], inSlot = S.skills.slots.indexOf(id);
      list.append(h("div", { class: "skitem" }, h("div", { class: "skhead" }, h("b", { text: sk.name }), inSlot >= 0 ? h("span", { class: "tag", text: "슬롯 " + (inSlot + 1) }) : null), h("p", { text: sk.desc }),
        h("div", { class: "stat", text: C.resource.name + " 소모 " + AU.G.skillCost(id) + (AU.G.skillCost(id) !== sk.cost ? " (기본 " + sk.cost + ", 의지 효율 적용)" : "") + " · 재사용 대기 " + sk.cd + "초" }),
        h("div", { class: "assign" }, [0, 1, 2].map((i) => btn("슬롯 " + (i + 1) + " (" + keyOf("skill" + (i + 1)) + ")", S.skills.slots[i] === id ? "on" : "mini", () => { const prev = S.skills.slots.indexOf(id); if (prev >= 0) S.skills.slots[prev] = S.skills.slots[i]; S.skills.slots[i] = id; AU.G.save("skill"); AU.G.changed(); })))));
    }
    b.append(h("h4", { text: "단축 슬롯" }), slots, h("h4", { text: "배운 스킬" }), list, h("p", { class: "note", text: "단축키 자체는 키보드 설정(" + keyOf("keysettings") + ")에서 바꿀 수 있습니다. 새로운 직업 스킬은 이 목록에 추가되는 구조입니다." }));
  };

  R.journal = function (b) {
    const S = AU.G.S, un = S.flags.missionsUnlocked;
    const tab = !un ? "log" : (UI.tab.j || "missions");
    if (un) b.append(h("div", { class: "tabs" }, [["missions", "현실 미션"], ["record", "수행 기록"], ["log", "모험 기록"]].map(([k, l]) => btn(l, tab === k ? "on" : "", () => { UI.tab.j = k; UI.renderWin(); }))));
    if (tab === "log") {
      const rows = S.journal.slice().reverse(); b.append(h("div", { class: "logs" }, rows.map((e) => h("div", { class: "logrow" }, h("span", { text: e.t }), h("b", { text: e.text })))));
    } else if (tab === "missions") {
      if (!S.flags.guideMet) { b.append(h("div", { class: "lockbox" }, h("h3", { text: "새로운 이야기를 기다리고 있어요" }), h("p", { text: "포르투 노바의 모험 안내인(임시)과 이야기를 나누면 이곳에 내용이 나타납니다." }))); return; }
      const M = S.missions;
      b.append(h("div", { class: "msummary" }, h("span", { text: "훈련 포인트 보유 " }), h("b", { text: S.trainingPoints }), h("span", { text: "  ·  이번 주 획득 " }), h("b", { text: M.weekPoints + " / " + C.missions.weeklyPointCap }), h("span", { class: "note", text: "  (한도 값은 임시)" })),
        h("p", { class: "note", text: "현실 미션은 선택 사항입니다. 하지 않아도 모험을 계속할 수 있고, 수행 여부는 직접 기록하는 방식입니다." }));
      const grid = h("div", { class: "missions" });
      for (const m of AU.MISSIONS) {
        const r = M.states[m.id]; if (!r || r.state === "locked") continue;
        const acts = { available: [["수락", "primary", "accept"], ["건너뛰기", "", "skip"]], accepted: [["해 봤어요", "primary", "attempt"], ["건너뛰기", "", "skip"]], attempted: [["완료했어요", "primary", "done"], ["일부만 했어요", "", "partial"], ["건너뛰기", "", "skip"]],
          partial: [["완료했어요", "primary", "done"], ["다시 도전", "", "retry"], ["건너뛰기", "", "skip"]], skipped: [["다시 도전", "", "retry"]], done: [] }[r.state] || [];
        grid.append(h("div", { class: "mission st-" + r.state }, h("div", { class: "mh" }, h("span", { class: "tag perma", text: m.perma + " · " + AU.PERMA[m.perma] }), h("span", { class: "tag", text: AU.MISSION_STATES[r.state] }), h("span", { class: "pts", text: r.rewarded ? "지급 완료" : "훈련 포인트 +" + m.points })),
          h("b", { text: m.title }), h("p", { text: m.desc }), acts.length ? h("div", { class: "macts" }, acts.map(([l, c, a]) => btn(l, c, () => AU.G.setMissionState(m.id, a)))) : null));
      }
      b.append(grid);
    } else if (tab === "record") {
      const cnt = AU.G.permaCounts();
      b.append(h("div", { class: "permabar" }, Object.entries(AU.PERMA).map(([k, n]) => h("div", { class: "pc" }, h("b", { text: k }), h("span", { text: n }), h("em", { text: cnt[k] + "회" })))));
      const rows = S.missions.log.slice().reverse();
      b.append(h("p", { class: "note", text: "인증 방식은 아직 정해지지 않아 모두 ‘직접 기록’입니다." }));
      if (!rows.length) b.append(h("p", { class: "empty", text: "아직 기록이 없습니다." }));
      else b.append(h("div", { class: "logs" }, rows.map((e) => { const m = AU.G.mission(e.id); return h("div", { class: "logrow" }, h("span", { text: e.t }), h("span", { class: "tag perma", text: e.perma }), h("b", { text: (m ? m.title : e.id) }), h("span", { class: "tag", text: AU.MISSION_STATES[e.state] }), e.state === "done" ? h("span", { class: "pts", text: e.points ? "+" + e.points + "P" : (e.capped ? "주간 한도" : "") }) : null); })));
    }
  };

  R.jobcard = function (b) {
    const S = AU.G.S;
    b.append(h("div", { class: "jobcard" }, h("h2", { text: "전사로 전직했습니다!" }), h("p", { text: "견습 모험가에서 전사가 되었습니다. 다음 기능이 열렸어요." }),
      h("ul", null, h("li", { text: "스탯 분배: 포인트 " + S.freePoints + "점이 지급되었습니다. 스탯창(" + keyOf("stats") + ")에서 직접 나눠 보세요." }), h("li", { text: "전사 스킬: 1·2·3 슬롯에 배치되어 있습니다. 스킬창(" + keyOf("skills") + ")에서 바꿀 수 있습니다." }),
        h("li", { text: "모험일지(" + keyOf("journal") + "): 현실 활동 미션이 열렸습니다. 선택 사항이며, 포르투 노바의 모험 안내인이 소개해 줍니다." }),
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
    b.append(h("p", { class: "note", text: "바꿀 키를 누른 뒤 새 키를 누르세요. 이미 쓰는 키면 교체 여부를 묻습니다. 변경은 바로 저장됩니다. 한글 입력 상태에서도 키 위치(물리 키) 기준으로 동작합니다." }), msg, rows,
      h("div", { class: "keyfoot" }, btn("기본값으로 복원", "", () => { I.reset(); AU.main.saveSettings(); UI.keyMsg = "기본 키로 복원했습니다."; UI.renderWin(); }),
        h("label", { class: "chk" }, h("input", { type: "checkbox", checked: unl ? "" : null, onchange: (e) => { UI.settings.confirmUnload = e.target.checked; AU.main.saveSettings(); } }), " 탭을 닫기 전에 확인 창 표시"),
        h("label", { class: "chk" }, h("input", { type: "checkbox", checked: UI.settings.reduceFx ? "" : null, onchange: (e) => { UI.settings.reduceFx = e.target.checked; AU.main.saveSettings(); } }), " 화면 흔들림·번쩍임 줄이기"),
        h("label", { class: "chk" }, h("input", { type: "checkbox", checked: UI.settings.mute ? "" : null, onchange: (e) => { UI.settings.mute = e.target.checked; if (UI.settings.mute && AU.Prologue) AU.Prologue.Au.stopAll(); AU.main.saveSettings(); if (AU.Prologue && AU.Prologue.muteEl) AU.Prologue.syncMute(); } }), " 소리 끄기")),
      h("p", { class: "note", text: "참고: 브라우저 단축키(Ctrl+W 탭 닫기 등)는 게임이 막을 수 없습니다. Ctrl을 공격에 쓰는 경우 W 키(월드맵)와 함께 누르지 않도록 주의하거나 키를 바꿔 주세요. 진행 상황은 자동 저장됩니다." }));
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
        h("div", null, h("h4", { text: C.resource.name + " (자원)" }), num("dv-rs", S.resource), btn("현재값 설정", "mini", () => AU.G.setResource(+$("#dv-rs", UI.winEl).value)),
          num("dv-rsmax", S.resourceMax), btn("최대값 설정", "mini", () => AU.G.setResourceMax(+$("#dv-rsmax", UI.winEl).value)), btn("주간 갱신 실행", "mini", () => AU.G.refreshWeekly(true))),
        h("div", null, h("h4", { text: "기타" }), btn("HP 전부 회복", "mini", () => { S.hp = AU.G.d().maxHp; AU.G.changed(); }), btn("은화 +100", "mini", () => { AU.G.gainSilver(100); AU.G.changed(); }), btn("훈련 포인트 +3 (지급 경로 우회)", "mini", () => { S.trainingPoints += 3; AU.G.changed(); }),
          btn("전직 시험 퀘스트 바로 완료 준비", "mini", () => { if (!S.jobChanged && S.level >= 10) { S.quests.q_job = { state: "ready", prog: [1] }; AU.G.changed(); AU.G.toast("전직 담당에게 가면 전직합니다.", "info"); } else AU.G.toast("10레벨 이상 · 미전직 상태에서만 가능합니다.", "warn"); })),
        h("div", null, h("h4", { text: "마음 기록 인터페이스 시험" }), btn("PSS 샘플 기록 추가", "mini", () => AU.G.addCheckin({ scale: "PSS", score: 12, items: null, source: "dev-sample" })), h("p", { class: "note", text: "기록 " + S.mind.checkins.length + "건. 게임 자원과 별도 저장되며, 점수→" + C.resource.name + " 환산은 하지 않습니다." }))));
    const PR = AU.Prologue, grid = b.querySelector(".devgrid");
    if (PR && grid) grid.append(h("div", null, h("h4", { text: "프롤로그" }), h("div", { class: "devrow" }, [1, 2, 3, 4, 5, 6].map((n) => btn("장면 " + n, "mini", () => { UI.close(); PR.devJump(n - 1); }))),
      btn("즉시 완료 → 포르투 노바", "mini", () => { UI.close(); PR.debugComplete("porto"); }), btn("컷신 건너뛰기", "mini", () => { UI.close(); PR.skip(); }),
      h("p", { class: "note", text: "상태 " + PR.st().state + " · 깃발 " + Object.keys(PR.st().flags).filter((k) => PR.st().flags[k]).length + "개" + (PR.replay ? " (다시 보기 중: 저장 기록은 바뀌지 않음)" : "") })));
  };
  UI.settings = { confirmUnload: true, reduceFx: false, mute: false }; UI.devVisible = false;
})();
