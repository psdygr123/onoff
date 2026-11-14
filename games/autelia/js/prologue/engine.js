/* 프롤로그 엔진: 장면 상태·저장 체크포인트, 실시간 컷신 실행기(카메라·이동·페이드·자막·대사·건너뛰기),
   입자·소리·목표 안내. 장면 내용은 scenes.js, 데이터는 data.js, 임시 그림은 art.js.
   기존 시스템(전투·성장·퀘스트 등)은 건드리지 않고, 프롤로그가 켜져 있는 동안만 world.js/ui.js가 이 엔진에 일을 넘깁니다. */
window.AU = window.AU || {};
(function () {
  const C = AU.CONFIG, W = C.W, H = C.H, GROUND = C.GROUND;
  const CANCEL = { cancelled: true };
  window.addEventListener("unhandledrejection", (e) => { if (e.reason === CANCEL) e.preventDefault(); }); // 장면 전환으로 취소된 연출 약속은 오류가 아님
  const ORDER = ["SCENE_00_MORNING", "SCENE_01_TEMPLE", "SCENE_01B_BANNERS", "SCENE_02_FESTIVAL", "SCENE_03_ATTACK", "SCENE_04_FATHER", "SCENE_05_ESCAPE", "SCENE_06_PORT_VIEW"];
  // 장면이 '소유'하는 플래그·아이템: 장면에 (다시) 들어갈 때 비워서, 재진입해도 중복 지급·중복 진행이 생기지 않게 함
  const OWN = [
    { flags: ["stele_read"], items: [] },
    { flags: ["temple_work_complete", "father_final_conversation_complete"], items: [] },
    { flags: ["banners_done"], items: [] },
    { flags: ["festival_interaction_complete"], items: [] },
    { flags: ["attack_triggered"], items: [] },
    { flags: ["father_final_words_seen", "metal_fragment_acquired", "carpenter_bag_acquired"], items: ["metal_fragment", "carpenter_bag"] },
    { flags: ["arkea_escape_complete"], items: [] },
    { flags: ["porto_nova_reached", "prologue_completed"], items: [] }
  ];
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sign = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  /* ---------- 소리: 외부 음원 없이 직접 합성(저작권 문제 없음). 소리가 없어도 진행은 멈추지 않음 ---------- */
  const Au = {
    ctx: null, loops: {},
    ensure() {
      if (AU.UI.settings.mute) return null;
      try {
        if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination); this.nb = this.noiseBuf(); }
        if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
        return this.ctx;
      } catch (e) { return null; }
    },
    noiseBuf() { const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; },
    tone(f, dur, type, vol, to) { const c = this.ensure(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05); },
    noise(dur, vol, lp, hp) { const c = this.ensure(); if (!c) return; const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(), t = c.currentTime; s.buffer = this.nb; f.type = hp ? "highpass" : "lowpass"; f.frequency.value = hp || lp || 1000; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05); },
    play(n) {
      if (AU.Sfx && AU.Sfx.play(n)) return; // 새 합성기(sfx.js)가 있으면 그쪽 소리를 씀. 없을 때만 아래 옛 소리
      try {
        if (n === "hammer") { this.tone(190, 0.09, "square", 0.22, 90); this.noise(0.07, 0.35, 3000); }
        else if (n === "thud") { this.tone(95, 0.3, "sine", 0.5, 38); this.noise(0.2, 0.25, 500); }
        else if (n === "boom") { this.noise(1.6, 0.9, 380); this.tone(70, 1.2, "sawtooth", 0.35, 28); }
        else if (n === "temple_glow") { this.tone(147, 5, "sine", 0.1); setTimeout(() => this.tone(220, 4.5, "sine", 0.08), 150); setTimeout(() => this.tone(294, 4, "sine", 0.06), 300); } // 새 합성기가 없을 때만 쓰는 예비 소리
        else if (n === "gull") { this.tone(1500, 0.22, "sine", 0.07, 950); setTimeout(() => this.tone(1350, 0.3, "sine", 0.06, 800), 260); }
        else if (n === "pick") { this.tone(420, 0.08, "triangle", 0.2, 620); }
        else if (n === "item") { this.tone(660, 0.12, "triangle", 0.2); setTimeout(() => this.tone(990, 0.2, "triangle", 0.18), 100); }
        else if (n === "step") { this.noise(0.05, 0.12, 900); }
      } catch (e) { /* 소리 실패는 무시 */ }
    },
    loop(n, on) {
      if (AU.Sfx && AU.Sfx.loop(n, on)) return;
      try {
        const old = this.loops[n]; if (old) { old.g.gain.cancelScheduledValues(this.ctx.currentTime); old.g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6); setTimeout(() => { try { old.s.stop(); } catch (e) { /* 무시 */ } }, 700); delete this.loops[n]; }
        if (!on) return; const c = this.ensure(); if (!c) return;
        const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); s.buffer = this.nb; s.loop = true;
        const cfg = { fire: ["bandpass", 700, 0.2], wind: ["bandpass", 420, 0.18], waves: ["lowpass", 520, 0.22], hush: ["lowpass", 200, 0.1] }[n] || ["lowpass", 500, 0.1];
        f.type = cfg[0]; f.frequency.value = cfg[1]; g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(cfg[2], c.currentTime + 1.2);
        if (n === "waves" || n === "wind") { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = n === "waves" ? 0.18 : 0.12; lg.gain.value = cfg[2] * 0.6; l.connect(lg); lg.connect(g.gain); l.start(); }
        s.connect(f); f.connect(g); g.connect(this.master); s.start(); this.loops[n] = { s, g };
      } catch (e) { /* 무시 */ }
    },
    stopAll() { for (const k of Object.keys(this.loops)) this.loop(k, false); if (AU.Sfx) AU.Sfx.stopAll(); }
  };

  const P = AU.Prologue = {
    ORDER, OWN, Au, on: false, replay: false, rs: null, ret: null, time: 0, gen: 0, sceneIdx: -1,
    cs: null, skipping: false, frozen: false, holdFade: false,
    ents: [], triggers: [], emitters: [], parts: [], tweens: [], timers: [], rejects: new Set(), v: {}, limits: null,
    cam: { mode: "follow", x: 0 }, zoom: { z: 1, x: W / 2, y: H / 2 }, shk: { amp: 0, t: 0, dur: 1 }, flashS: { a: 0, color: "#fff" }, fadeS: { a: 0, color: "#000" }, barsS: { a: 0 },
    tint: null, vig: 0.35, overlayFn: null, closeup: null, shotFn: null, nearEnt: null, walk: null, dialogOpen: false, variant: "peace",

    /* ================= 상태 접근 ================= */
    st() { return this.replay ? this.rs : AU.G.S.prologue; },
    state() { return this.st().state; },
    flag(n) { return !!this.st().flags[n]; },
    setFlag(n, v) { this.st().flags[n] = v === undefined ? true : !!v; },
    isDone() { const s = AU.G.S.prologue; return !!s && s.state === "COMPLETED"; },
    sceneNo(state) { return ORDER.indexOf(state) + 1; },
    locked() { return !!this.cs || this.frozen; },
    // 아이템은 한 번만 지급: 이미 있으면 다시 주지 않음(재진입·건너뛰기 중복 방지). 다시 보기 중에는 지급하지 않음
    give(id) { if (this.replay) return false; if (AU.G.count(id) > 0) return false; AU.G.giveItem(id, 1); Au.play("item"); return true; },

    /* ================= 시작·불러오기·이어하기 ================= */
    init() {
      this.normalize();
      const R = AU.UI.root; const mk = (tag, cls, html) => { const e = document.createElement(tag); e.className = cls; if (html != null) e.innerHTML = html; return e; };
      this.objEl = mk("div", "panel objective hidden"); this.hintEl = mk("div", "prohint"); this.capEl = mk("div", "procap"); this.cardsEl = mk("div", "procards"); this.cardsEl.onclick = () => this.nextCard(); this.recallEl = mk("div", "prorecall");
      this.skipEl = mk("button", "btn skipbtn hidden", "건너뛰기 <em>Enter</em>"); this.skipEl.type = "button"; this.skipEl.onclick = () => this.skip();
      this.muteEl = mk("button", "btn mutebtn hidden"); this.muteEl.type = "button"; this.muteEl.onclick = () => { AU.UI.settings.mute = !AU.UI.settings.mute; if (AU.UI.settings.mute) Au.stopAll(); AU.main.saveSettings(); this.syncMute(); };
      this.endEl = mk("div", "endscreen hidden"); R.append(this.objEl, this.hintEl, this.capEl, this.cardsEl, this.recallEl, this.skipEl, this.muteEl, this.endEl);
      this.syncMute();
      AU.Input.rawHandlers.push((e) => {
        if (!this.on) return false;
        if (!this.endEl.classList.contains("hidden") && ["Enter", "Space", "NumpadEnter"].includes(e.code)) { if (!e.repeat) { const b = this.endEl.querySelector("button"); if (b) b.click(); } return true; }
        if (this.cardRes && ["Space", "Enter", "NumpadEnter"].includes(e.code) && !(this.cs && this.cs.skip && e.code === "Enter")) { if (!e.repeat) this.nextCard(); return true; }
        if (this.cs && this.cs.skip && e.code === "Enter") { if (!e.repeat) this.skip(); return true; }
        return false;
      });
    },
    syncMute() { this.muteEl.textContent = AU.UI.settings.mute ? "소리 꺼짐" : "소리 켜짐"; },
    // 저장 데이터가 비정상이어도 게임이 멈추지 않도록 보정
    normalize() {
      const S = AU.G.S; let p = S.prologue;
      const progressed = S.level > 1 || S.exp > 0 || Object.keys(S.quests || {}).length > 0 || (S.visited && Object.keys(S.visited).some((k) => !/^pro_/.test(k) && k !== "arche"));
      if (!p || typeof p !== "object") p = S.prologue = { state: progressed ? "COMPLETED" : "NOT_STARTED", flags: {}, seen: {} };
      if (p.state !== "NOT_STARTED" && p.state !== "COMPLETED" && ORDER.indexOf(p.state) < 0) p.state = progressed ? "COMPLETED" : "SCENE_01_TEMPLE";
      p.flags = p.flags && typeof p.flags === "object" ? p.flags : {}; p.seen = p.seen && typeof p.seen === "object" ? p.seen : {};
      if (p.state === "COMPLETED" && AU.MAPS[S.map] && AU.MAPS[S.map].prologue) { S.map = "porto"; S.x = AU.MAPS.porto.start; } // 완료 뒤 프롤로그 맵에 남아 있으면 본편으로
    },
    inProgress() { const s = AU.G.S.prologue; return !!s && s.state !== "COMPLETED"; },
    titleLabel() { const s = AU.G.S.prologue; return s.state === "NOT_STARTED" ? "모험 시작" : "프롤로그 이어하기 (장면 " + this.sceneNo(s.state) + " / " + ORDER.length + ")"; },
    onGameStart() { // 제목 화면에서 시작/이어하기를 누른 순간
      Au.ensure(); this.normalize(); const s = AU.G.S.prologue;
      if (s.state === "COMPLETED") return false;
      if (s.state === "NOT_STARTED") s.state = ORDER[0];
      this.beginScene(ORDER.indexOf(s.state)); return true;
    },
    startReplay() { Au.ensure(); const S = AU.G.S; this.replay = true; this.rs = { state: "NOT_STARTED", flags: {}, seen: {} }; this.ret = { map: S.map, x: S.x }; this.beginScene(0); },
    setHud(on) { document.getElementById("stage").classList.toggle("pro", !!on); this.objEl.classList.toggle("hidden", !on || !this.objEl.textContent); this.muteEl.classList.toggle("hidden", !on); },

    /* ================= 장면 진행 ================= */
    resetMapRuntime() {
      this.ents = []; this.triggers = []; this.emitters = []; this.parts = []; this.v = {}; this.limits = null; this.tint = null; this.overlayFn = null; this.closeup = null; this.shotFn = null; this.nearEnt = null; this.variant = "peace";
      this.cam = { mode: "follow", x: 0 }; this.zoom = { z: 1, x: W / 2, y: H / 2 }; this.shk = { amp: 0, t: 0, dur: 1 }; this.flashS = { a: 0, color: "#fff" }; this.barsS = { a: 0 }; this.vig = 0.35;
      this.hint(""); this.capEl.classList.remove("show"); this.recallEl.classList.remove("show");
      const w = AU.World; if (w) { w.virt = null; if (w.player) { w.player.pose = null; } }
    },
    cancelAll() {
      for (const r of Array.from(this.rejects)) { try { r.rej(CANCEL); } catch (e) { /* 무시 */ } } this.rejects.clear(); this.timers = []; this.tweens = []; this.walk = null;
      if (this.dialogOpen) { const U = AU.UI; U.dialog = null; U.dlgEl.classList.add("hidden"); U.dlgEl.innerHTML = ""; this.dialogOpen = false; }
      this.cardRes = null; this.cardsEl.classList.remove("on", "show"); this.cardsEl.innerHTML = "";
      this.cs = null; this.skipping = false; this.frozen = false;
    },
    beginScene(i) {
      this.cancelAll(); this.gen++; const S = AU.G.S, st = this.st(), sc = AU.PRO_SCENES[ORDER[i]];
      this.on = true; this.sceneIdx = i; this.setHud(true); this.holdFade = false; this.endEl.classList.add("hidden"); this.endEl.innerHTML = "";
      this.resetMapRuntime(); this.fadeS = { a: 1, color: "#000" }; Au.stopAll(); this.v.carry = false;
      for (let j = i; j < OWN.length; j++) { for (const f of OWN[j].flags) delete st.flags[f]; if (!this.replay) for (const it of OWN[j].items) delete S.inv[it]; }
      st.state = ORDER[i]; this.obj("");
      if (!this.replay) AU.G.save("checkpoint");
      AU.G.changed(); AU.World.player.invuln = 0;
      // 프롤로그 그림이 다 불러와진 뒤에 장면을 시작(최대 12초). 느린 접속에서 옛 주민 그림(성별이 다른 대체 그림)으로 만들어지는 것을 막음
      const g0 = this.gen;
      Promise.resolve().then(() => AU.Img.whenSettled((k) => /^(pc_|pt_pro|pb_|po_|fx_)/.test(k), 12000)).then(() => { if (g0 !== this.gen) throw CANCEL; return sc.enter(this); }).catch((e) => { if (e !== CANCEL) { console.error("[프롤로그] 장면 시작 오류:", e); this.recover(); } });
    },
    // 장면 안에서 맵을 바꿀 때(또는 장면의 첫 맵): 맵별 임시 상태를 비우고 맵에 들어감
    room(mapId, x, setup) {
      this.resetMapRuntime(); const m = AU.MAPS[mapId]; m.platforms = m.basePlatforms.slice(); AU.World.enterMap(mapId, x, true); AU.World.player.dir = 1; AU.World.player.pose = null;
      AU.World.camX = clamp(x - W / 2, 0, m.width - W); if (setup) setup(this);
    },
    // 현재 장면에서 다음 장면으로: 검은 화면으로 전환하고 체크포인트를 저장
    async advance(color) {
      const i = this.sceneIdx; this.frozen = true;
      try { await this.fade(1, 0.9, color || "#000"); } catch (e) { if (e === CANCEL) return; throw e; }
      if (i >= ORDER.length - 1) { this.finish(); return; }
      this.beginScene(i + 1);
    },
    finish() {
      const S = AU.G.S, st = this.st(); this.setFlag("porto_nova_reached"); this.setFlag("prologue_completed");
      if (!this.replay) { st.state = "COMPLETED"; S.map = "porto"; S.x = AU.MAPS.porto.start; S.visited.porto = true; AU.G.save("prologue-complete"); }
      this.frozen = true; this.holdFade = true; Au.stopAll(); this.showEnd();
    },
    showEnd() {
      const el = this.endEl; el.innerHTML = '<div class="eb"><div class="e1">PROLOGUE COMPLETE</div><div class="e2">빛의 축제, 그리고 잿더미</div><div class="e3">이어서</div><div class="e4">제1장 — 포르투 노바</div></div>';
      const b = document.createElement("button"); b.type = "button"; b.className = "btn primary big"; b.id = "btn-main"; b.textContent = this.replay ? "프롤로그 다시 보기를 마치기" : "본편 시작"; b.onclick = () => this.completeToMain(); el.querySelector(".eb").append(b);
      el.classList.remove("hidden"); el.classList.add("show"); setTimeout(() => b.focus(), 50);
    },
    completeToMain() {
      const S = AU.G.S, w = AU.World; this.cancelAll(); this.endEl.classList.add("hidden"); this.endEl.innerHTML = ""; Au.stopAll();
      if (this.replay) {
        this.replay = false; this.rs = null; this.on = false; this.setHud(false); this.resetMapRuntime(); this.fadeS = { a: 0, color: "#000" }; const r = this.ret; w.enterMap(r.map, r.x, true); AU.UI.mapBanner(AU.MAPS[r.map].name); return;
      }
      this.on = false; this.setHud(false); this.resetMapRuntime(); this.fadeS = { a: 0, color: "#000" }; this.holdFade = false;
      if (!S.inv.potion) AU.G.giveItem("potion", 2, true); // 기존 시제품의 시작 소지품과 동일(본편 시작 시 지급)
      S.visited.porto = true; w.enterMap("porto", AU.MAPS.porto.start, true); AU.G.log("아르케아를 떠나 포르투 노바에 도착했습니다."); AU.UI.mapBanner(AU.MAPS.porto.name);
      AU.G.save("start"); if (AU.main && AU.main.reportProgress) AU.main.reportProgress(); AU.G.changed();
    },
    recover() { // 장면 코드에 예외가 났을 때 게임이 멈추지 않도록 조작을 돌려줌
      this.cs = null; this.skipping = false; this.frozen = false; this.fadeS.a = 0; this.barsS.a = 0; if (AU.World) AU.World.virt = null; this.skipEl.classList.add("hidden");
    },
    // 개발·시험 전용
    devIdx(i) { return typeof i === "string" ? ORDER.indexOf(i) : i; },
    devPrepare(i) { i = this.devIdx(i); const st = this.st(); for (let j = 0; j < i; j++) for (const f of OWN[j].flags) st.flags[f] = true; if (i > ORDER.indexOf("SCENE_04_FATHER") && !this.replay) { AU.G.S.inv.metal_fragment = 1; AU.G.S.inv.carpenter_bag = 1; } },
    devJump(i) { i = this.devIdx(i); if (this.isDone() && !this.replay) { const S = AU.G.S; this.replay = true; this.rs = { state: "NOT_STARTED", flags: {}, seen: {} }; this.ret = { map: S.map, x: S.x }; } this.devPrepare(i); this.on = true; this.beginScene(i); },
    debugComplete(mapId) {
      const S = AU.G.S; this.cancelAll(); this.replay = false; this.rs = null; this.on = false; this.setHud(false); this.resetMapRuntime(); this.fadeS = { a: 0, color: "#000" }; this.holdFade = false; this.endEl.classList.add("hidden"); Au.stopAll();
      const st = S.prologue; st.state = "COMPLETED"; for (const o of OWN) for (const f of o.flags) st.flags[f] = true;
      if (!S.inv.potion) S.inv.potion = 2; const id = mapId || "porto"; S.visited[id] = true; AU.World.enterMap(id, AU.MAPS[id].start || 200, true); AU.UI.dialog = null; AU.UI.dlgEl.classList.add("hidden"); AU.G.changed(); return true;
    },

    /* ================= 컷신 실행기 ================= */
    _pend(setup) { return new Promise((res, rej) => { const r = { rej }; this.rejects.add(r); setup(() => { this.rejects.delete(r); res(); }); }); },
    // fn(비동기 함수)을 실행하는 동안 조작을 잠금. opt.id가 있으면 건너뛰기 버튼 표시. 건너뛰어도 fn 안의 set/give/이동은 모두 실행됨
    async cutscene(fn, opt) {
      opt = opt || {}; if (this.cs) return fn();
      const g = this.gen; this.cs = { id: opt.id || null, skip: !!opt.skip && this.canSkip() }; this.skipping = false; this.nearEnt = null; AU.World.prompt = "";
      if (opt.bars) this.tweenNow(this.barsS, { a: 1 }, 0.5);
      try { await fn(); if (this.gen === g && opt.id && !this.replay) this.st().seen[opt.id] = true; }
      catch (e) { if (e !== CANCEL) { console.error("[프롤로그] 컷신 오류:", e); this.recover(); } }
      finally { if (this.gen === g) { this.cs = null; this.skipping = false; AU.World.virt = null; this.walk = null; if (opt.bars) this.tweenNow(this.barsS, { a: 0 }, 0.5); this.capEl.classList.remove("show"); } }
    },
    canSkip() { return !!this.replay || !!(AU.UI && AU.UI.devVisible); }, // 컷신 건너뛰기: 처음 하는 사람에게는 주지 않고, '프롤로그 다시 보기'(개발 모드 포함)에서만 허용
    skip() {
      if (!this.cs || !this.cs.skip || this.skipping) return; this.skipping = true;
      for (const t of this.timers.splice(0)) t.res();
      for (const tw of this.tweens.splice(0)) { Object.assign(tw.obj, tw.to); tw.res(); }
      if (this.walk) { AU.World.player.x = this.walk.x; AU.World.player.vx = 0; AU.World.virt = null; const r = this.walk.res; this.walk = null; r(); }
      this.capEl.classList.remove("show"); this.nextCard(true);
      if (this.dialogOpen) AU.UI.finishDialog(null);
    },
    wait(s) { if (this.skipping || s <= 0) return Promise.resolve(); return this._pend((res) => this.timers.push({ t: s, res })); },
    tween(obj, to, dur, easeFn) {
      if (this.skipping || dur <= 0) { Object.assign(obj, to); return Promise.resolve(); }
      return this._pend((res) => { const from = {}; for (const k of Object.keys(to)) from[k] = obj[k]; this.tweens.push({ obj, to, from, dur, t: 0, ease: easeFn || ease, res }); });
    },
    tweenNow(obj, to, dur) { const from = {}; for (const k of Object.keys(to)) from[k] = obj[k]; this.tweens.push({ obj, to, from, dur, t: 0, ease, res: () => {} }); },
    fade(a, dur, color) { if (color) this.fadeS.color = color; return this.tween(this.fadeS, { a }, dur === undefined ? 0.8 : dur); },
    flash(color, dur) { this.flashS.color = color || "#fff"; this.flashS.a = AU.UI.settings.reduceFx ? 0.55 : 1; return this.tween(this.flashS, { a: 0 }, dur || 0.8); },
    shake(amp, dur) { this.shk = { amp, t: dur, dur }; },
    camPan(x, dur) { // 카메라를 x(화면 가운데 기준)로 옮김
      const cur = this.cam.mode === "fixed" ? this.cam.x : AU.World.camX + W / 2; this.cam = { mode: "fixed", x: cur }; return this.tween(this.cam, { x }, dur === undefined ? 1.6 : dur);
    },
    camFollow() { this.cam = { mode: "follow", x: 0 }; },
    zoomTo(z, dur, x, y) { if (x != null) { this.zoom.x = x; this.zoom.y = y; } return this.tween(this.zoom, { z }, dur === undefined ? 1.2 : dur); },
    async caption(lines, hold) {
      if (this.skipping) return; this.capEl.innerHTML = lines.map((l, i) => '<div class="l' + i + '">' + esc(l) + "</div>").join(""); this.capEl.classList.remove("show"); void this.capEl.offsetWidth; this.capEl.classList.add("show");
      await this.wait(hold || 3.6); this.capEl.classList.remove("show"); await this.wait(0.7);
    },
    /* 시작 글 카드: 검은 화면 위에 줄 목록을 한 장씩 보여 줌. 읽을 시간(최소 1.4초) 뒤 Space/Enter/클릭으로 넘김. force=true면 즉시 닫음(건너뛰기) */
    nextCard(force) { if (!this.cardRes || (!force && !this.cardReady)) return; const r = this.cardRes; this.cardRes = null; this.cardReady = false; r(); },
    async cards(list) {
      if (this.skipping) return; const el = this.cardsEl; el.classList.add("on");
      for (const lines of list) {
        if (this.skipping) break; const k = AU.keyLabel(AU.Input.bindings.interact);
        el.innerHTML = '<div class="cd">' + lines.map((l, i) => '<p class="l' + i + '">' + esc(l) + "</p>").join("") + '</div><div class="cn">' + esc(k) + " · Enter 또는 클릭으로 넘기기</div>"; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
        this.cardReady = false; await this.wait(1.4); if (this.skipping) break;
        this.cardReady = true; await this._pend((res) => { this.cardRes = res; });
        el.classList.remove("show"); await this.wait(0.7);
      }
      this.cardReady = false; el.classList.remove("on", "show"); el.innerHTML = "";
    },
    /* 도입 영상(신화 10컷, 무음) + 자막. 처음 보는 사람은 건너뛸 수 없고, 같은 브라우저에서 한 번 끝까지 본 사람에게는 오른쪽 위에 건너뛰기 버튼이 나옵니다.
       영상을 못 불러오거나 재생이 안 되면(주소에 ?intro=cards 포함) 기존 글 카드로 대신합니다. */
    async introVideo(cards) {
      if (this.skipping) return;
      const ok = /[?&]intro=cards/.test(location.search) ? false : await this._playIntro();
      if (!ok) await this.cards(cards);
    },
    _playIntro() {
      return new Promise((resolve) => {
        const seen = !!AU.Store.get("autelia.introSeen"), I = AU.INTRO; if (!I || !I.cuts) return resolve(false);
        const R = AU.UI.root, box = document.createElement("div"); box.className = "introv";
        const v = document.createElement("video"); v.playsInline = true; v.preload = "auto"; v.muted = true; v.disablePictureInPicture = true;
        const sub = document.createElement("div"); sub.className = "introsub"; box.append(v, sub);
        let skipBtn = null; if (seen) { skipBtn = document.createElement("button"); skipBtn.type = "button"; skipBtn.className = "btn introskip"; skipBtn.innerHTML = "건너뛰기 <em>Enter</em>"; box.append(skipBtn); }
        const mkSrc = (src, type) => { const s = document.createElement("source"); s.src = src; s.type = type; return s; };
        v.append(mkSrc("assets/video/intro.webm", 'video/webm; codecs="vp9"'), mkSrc("assets/video/intro.mp4", 'video/mp4; codecs="avc1.42E01E"'));
        let done = false, started = false, raf = 0, lastKey = -1;
        const finish = (played, completed) => {
          if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(guard); document.removeEventListener("keydown", onKey, true);
          if (completed) AU.Store.set("autelia.introSeen", 1);
          try { v.pause(); } catch (e) { /* 무시 */ } box.classList.remove("on");
          setTimeout(() => { box.remove(); resolve(played); }, 450);
        };
        const onKey = (e) => { if (seen && !e.repeat && (e.code === "Enter" || e.code === "NumpadEnter")) { e.preventDefault(); e.stopPropagation(); finish(true, true); } };
        const tick = () => {
          if (done) return;
          if (this.skipping) { finish(true, false); return; }
          const t = v.currentTime; let k = -1; for (let i = 0; i < I.cuts.length; i++) if (t >= I.cuts[i].start && t <= I.cuts[i].end) { k = i; break; }
          if (k !== lastKey) { lastKey = k; sub.classList.remove("show"); if (k >= 0) { sub.innerHTML = I.cuts[k].lines.map((l) => "<p>" + esc(l) + "</p>").join(""); void sub.offsetWidth; sub.classList.add("show"); } }
          raf = requestAnimationFrame(tick);
        };
        // 4초 안에 재생이 시작되지 않으면 카드로 대신함
        const guard = setTimeout(() => { if (!started) finish(false, false); }, 4000);
        v.addEventListener("error", () => { if (!started) finish(false, false); }, true);
        v.addEventListener("playing", () => { started = true; clearTimeout(guard); box.classList.add("on"); raf = requestAnimationFrame(tick); });
        v.addEventListener("ended", () => finish(true, true));
        v.addEventListener("stalled", () => { /* 느린 연결: 대기 */ });
        if (skipBtn) skipBtn.onclick = () => finish(true, true);
        document.addEventListener("keydown", onKey, true);
        R.append(box); const pr = v.play(); if (pr && pr.catch) pr.catch(() => { if (!started) finish(false, false); });
      });
    },
    recall(text, sec) { this.recallEl.textContent = text; this.recallEl.classList.add("show"); clearTimeout(this._rt); this._rt = setTimeout(() => this.recallEl.classList.remove("show"), (sec || 5) * 1000); },
    // 대사: [[화자키, 문장], …]. 화자는 data.js의 AU.PRO_SPEAKERS
    say(lines) {
      if (this.skipping) return Promise.resolve();
      const arr = lines.map(([k, t]) => ({ npc: AU.PRO_SPEAKERS[k] || { name: "", portrait: "" }, t }));
      return this._pend((res) => { this.dialogOpen = true; AU.UI.say(arr[0].npc, arr, { noCancel: true, end: () => { this.dialogOpen = false; res(); } }); });
    },
    walkTo(x, k) {
      const p = AU.World.player; if (this.skipping || Math.abs(p.x - x) < 6) { p.x = x; p.vx = 0; return Promise.resolve(); }
      return this._pend((res) => { this.walk = { x, t: 0, res }; AU.World.virt = { dir: sign(x - p.x), k: k || 1 }; });
    },
    face(dir) { AU.World.player.dir = dir; },
    pose(name) { AU.World.player.pose = name ? { name, t: 0 } : null; },
    sfx(n) { Au.play(n); }, amb(n, on) { Au.loop(n, on !== false); },
    obj(text) { this.objEl.textContent = text || ""; this.objEl.classList.toggle("hidden", !text || !this.on); if (text) { this.objEl.classList.remove("flash"); void this.objEl.offsetWidth; this.objEl.classList.add("flash"); } },
    hint(text, sec) { this.hintEl.textContent = text || ""; this.hintEl.classList.toggle("show", !!text); clearTimeout(this._ht); if (text && sec) this._ht = setTimeout(() => this.hintEl.classList.remove("show"), sec * 1000); },
    hintOnce(text) { const now = performance.now(); if (now - (this._hl || 0) > 2500) { this._hl = now; this.hint(text, 2.6); } },
    keys() { const K = AU.keyLabel, b = AU.Input.bindings; return { move: K(b.left) + "·" + K(b.right), jump: K(b.jump), act: K(b.interact) }; },

    /* ================= 개체·트리거·입자 ================= */
    addEnt(def) { const e = Object.assign({ x: 0, h: 150, face: 1, range: 100, layer: "mid" }, def); this.ents.push(e); return e; },
    ent(id) { return this.ents.find((e) => e.id === id); },
    removeEnt(id) { this.ents = this.ents.filter((e) => e.id !== id); },
    moveEnt(e, x, speed) { const d = Math.abs(x - e.x); if (this.skipping || d < 1) { e.x = x; return Promise.resolve(); } e.face = sign(x - e.x) || e.face; e.walking = true; return this.tween(e, { x }, d / (speed || 90), (k) => k).then(() => { e.walking = false; }); },
    trigger(def) { const t = Object.assign({ once: true, dead: false }, def); this.triggers.push(t); return t; },
    setPlatforms(extra) { const m = AU.World.map; m.platforms = m.basePlatforms.concat(extra || []); },
    emitter(def) { const e = Object.assign({ rate: 10, acc: 0, x0: 0, x1: W, y0: 0, y1: 0, kind: "ember" }, def); this.emitters.push(e); return e; },
    emit(kind, x, y, o) {
      if (this.parts.length >= 220) return; o = o || {};
      const p = { k: kind, x, y, t: 0, life: o.life || 2, vx: o.vx || 0, vy: o.vy || 0, s: o.s || 4, ph: Math.random() * 6, col: o.col, layer: o.layer || "front" };
      if (kind === "ember") { p.vx = rnd(-20, 30); p.vy = rnd(-70, -30); p.life = rnd(1.6, 3.2); p.s = rnd(1.5, 3.2); }
      else if (kind === "smoke") { p.vx = rnd(8, 30); p.vy = rnd(-34, -16); p.life = rnd(3.5, 6); p.s = rnd(28, 54); }
      else if (kind === "ash") { p.vx = rnd(-30, 20); p.vy = rnd(14, 40); p.life = rnd(3, 5); p.s = rnd(1.5, 3); }
      else if (kind === "dust") { p.vx = rnd(-26, 26); p.vy = rnd(-40, -10); p.life = rnd(0.5, 0.9); p.s = rnd(6, 12); }
      else if (kind === "spark") { p.vx = rnd(-120, 120); p.vy = rnd(-190, -60); p.life = rnd(0.25, 0.5); p.s = rnd(1.5, 3); }
      else if (kind === "chip") { p.vx = rnd(-110, 110); p.vy = rnd(-170, -70); p.life = rnd(0.5, 0.9); p.s = rnd(3, 6); }
      else if (kind === "glow") { p.vx = rnd(-10, 10); p.vy = rnd(-60, -20); p.life = rnd(1.5, 3); p.s = rnd(2, 4); }
      Object.assign(p, o.override || {}); this.parts.push(p);
    },
    burst(kind, x, y, n, o) { for (let i = 0; i < n; i++) this.emit(kind, x + rnd(-8, 8), y + rnd(-6, 6), o); },

    /* ================= 매 프레임 갱신(대화 중에도 호출됨) ================= */
    update(dt, paused) {
      if (!this.on) return; this.time += dt; const w = AU.World, p = w.player;
      for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.res(); } }
      for (const tw of this.tweens.slice()) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur), e = tw.ease(k); for (const key of Object.keys(tw.to)) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e; if (k >= 1) { const i = this.tweens.indexOf(tw); if (i >= 0) this.tweens.splice(i, 1); tw.res(); } }
      if (this.walk) { this.walk.t += dt; const dx = this.walk.x - p.x; if (Math.abs(dx) <= 6 || this.walk.t > 12) { if (this.walk.t > 12) p.x = this.walk.x; p.vx = 0; w.virt = null; const r = this.walk.res; this.walk = null; r(); } else if (w.virt) w.virt.dir = sign(dx); }
      if (this.shk.t > 0) this.shk.t -= dt;
      if (p.pose) p.pose.t += dt;
      for (const e of this.ents) { if (e.faceP && !e.hidden) e.face = p.x < e.x ? -1 : 1; if (e.update) e.update(e, dt, this); }
      // 입자·방출기
      const cx = w.camX;
      for (const em of this.emitters) { if (em.off) continue; em.acc += em.rate * dt; while (em.acc >= 1) { em.acc -= 1; const x = em.x0 + Math.random() * (em.x1 - em.x0); if (x < cx - 120 || x > cx + W + 120) continue; this.emit(em.kind, x, em.y0 + Math.random() * (em.y1 - em.y0), em.o); } }
      for (let i = this.parts.length - 1; i >= 0; i--) { const q = this.parts[i]; q.t += dt; if (q.t >= q.life) { this.parts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; if (q.k === "ember" || q.k === "glow") q.x += Math.sin(this.time * 3 + q.ph) * 12 * dt; if (q.k === "spark" || q.k === "chip") q.vy += 520 * dt; if (q.k === "smoke") q.s += 6 * dt; }
      if (!paused && !this.locked()) {
        for (const tr of this.triggers) { if (tr.dead) continue; let hit = false; try { hit = tr.test(p); } catch (e) { /* 무시 */ } if (hit) { if (tr.once) tr.dead = true; try { const r = tr.fn(); if (r && r.catch) r.catch((e) => { if (e !== CANCEL) console.error(e); }); } catch (e) { console.error(e); } } }
      }
      // 안전장치: 컷신이 없는데 화면이 검게 남아 있으면 천천히 풀어 줌
      if (!this.cs && !this.holdFade && !this.frozen && this.fadeS.a > 0.001 && !this.tweens.some((t) => t.obj === this.fadeS)) this.tweenNow(this.fadeS, { a: 0 }, 0.6);
      // 건너뛰기 버튼 표시
      const showSkip = !!(this.cs && this.cs.skip); if (showSkip !== this._skipShown) { this._skipShown = showSkip; this.skipEl.classList.toggle("hidden", !showSkip); }
    },

    /* ================= 월드 연동: 근처 개체·상호작용·이동 제한 ================= */
    scan(world) {
      const p = world.player; this.nearEnt = null; if (this.locked()) { world.prompt = ""; return; }
      let best = 1e9;
      for (const e of this.ents) { if (e.hidden || !e.interact || e.interact.off) continue; const d = Math.abs(p.x - e.x); if (d < (e.range || 100) && d < best) { best = d; this.nearEnt = e; } }
      world.prompt = this.nearEnt ? "Space " + this.nearEnt.interact.label : "";
    },
    /* 목표 방향 안내: 표시(mark)가 켜진 개체 또는 goal(x)이 있는 출구 트리거 중 가장 가까운 곳의 방향을 화면 가장자리 화살표로 알려 줌 */
    guideTarget() {
      if (this.locked() || this.dialogOpen) return null; const p = AU.World.player, cx = AU.World.camX; let best = null, bd = 1e9;
      for (const e of this.ents) { if (e.hidden || !e.mark) continue; const sx = e.x - cx; if (sx > 40 && sx < W - 40) continue; const d = Math.abs(e.x - p.x); if (d < bd) { bd = d; best = e.x; } }
      for (const t of this.triggers) { if (t.dead || t.goal == null) continue; const d = Math.abs(t.goal - p.x); if (d < 250) continue; if (d < bd) { bd = d; best = t.goal; } }
      return best == null ? null : { x: best, dir: best > p.x ? 1 : -1 };
    },
    drawGuide(ctx) {
      const g = this.guideTarget(); if (!g) { this._guideA = 0; return; } this._guideA = Math.min(1, (this._guideA || 0) + 0.06); const a = this._guideA; if (a <= 0.01) return;
      const r = AU.UI.settings.reduceFx ? 0 : Math.sin(this.time * 5) * 7, x = g.dir > 0 ? W - 64 + r : 64 - r, y = 300;
      ctx.save(); ctx.globalAlpha = 0.92 * a; ctx.translate(x, y); ctx.scale(g.dir, 1);
      ctx.fillStyle = "rgba(40,28,14,.55)"; ctx.beginPath(); ctx.arc(0, 0, 38, 0, 7); ctx.fill();
      ctx.fillStyle = "#E8B94E"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(10, -20); ctx.lineTo(24, 0); ctx.lineTo(10, 20); ctx.lineTo(-14, 20); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.9 * a; ctx.font = "600 15px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 6; ctx.fillText("목표", x, y + 58); ctx.restore();
    },
    interactNear() { if (this.locked()) return; this.scan(AU.World); const e = this.nearEnt; if (e && e.interact && e.interact.fn) { try { const r = e.interact.fn(e); if (r && r.catch) r.catch((er) => { if (er !== CANCEL) console.error(er); }); } catch (er) { console.error(er); } } },
    clampLimits(p) {
      const L = this.limits; if (!L) return; let hit = false;
      if (L.max != null && p.x > L.max) { p.x = L.max; p.vx = 0; hit = true; } if (L.min != null && p.x < L.min) { p.x = L.min; p.vx = 0; hit = true; }
      if (hit && L.msg) this.hintOnce(L.msg);
    },
    allowWin(name) { return name === "inventory" || name === "keysettings"; },
    heroKey(sheet) { return "pc_player_" + (AU.PRO_GENDER || "m") + "_" + sheet; },
    heroArt() { return AU.Img.has(this.heroKey("actions")) && AU.Img.has(this.heroKey("locomotion")); },
    /* 주인공 정식 그림: 동작 시트(대기·망치·무릎·으쓱·뒤돌아보기) + 이동 시트(걷기 4·점프 2). 프레임 이름은 artmeta.js 기준 */
    drawHero(ctx, p, pose, moving) {
      if (!this.heroArt()) return false;
      const A = AU.PArt, nm = p.pose && p.pose.name; let sheet = "actions", fr = "idle";
      if (nm === "hammer") fr = (this.v.swing || 0) > 0.5 ? "hammer2" : "hammer1";
      else if (nm === "kneel") fr = "kneel"; else if (nm === "shrug") fr = "shrug"; else if (nm === "lookback") fr = "lookback";
      else if (!p.onGround) { sheet = "locomotion"; fr = p.vy < 0 ? "jump_up" : "jump_down"; }
      else if (moving) { sheet = "locomotion"; fr = "walk" + (1 + (Math.floor(AU.World.time * 9) % 4)); }
      return A.spr(ctx, this.heroKey(sheet), fr, p.x, p.y, p.dir);
    },
    poseOf(p) {
      const q = p.pose; if (!q) return null; const t = q.t;
      if (this.heroArt()) return q.name === "stagger" ? { sx: 1, sy: 1, rot: 0.1 * p.dir, dx: 0 } : { sx: 1, sy: 1, rot: 0, dx: 0, hammer: q.name === "hammer", art: true };
      if (q.name === "kneel") return { sx: 1.06, sy: 0.78, rot: 0, dx: p.dir * 4 };
      if (q.name === "hammer") return { sx: 1, sy: 1, rot: 0, dx: 0, hammer: true };
      if (q.name === "shrug") return { sx: 1, sy: 1 - Math.sin(Math.min(1, t) * Math.PI) * 0.05, rot: Math.sin(Math.min(1, t) * Math.PI) * 0.05 * p.dir, dx: 0 };
      if (q.name === "stagger") return { sx: 1, sy: 1, rot: 0.1 * p.dir, dx: 0 };
      return { sx: 1, sy: 1, rot: 0, dx: 0 };
    },

    /* ================= 그리기 ================= */
    shakeAmt() { if (this.shk.t <= 0) return 0; return this.shk.amp * (this.shk.t / this.shk.dur) * (AU.UI.settings.reduceFx ? 0.25 : 1); },
    beginFrame(ctx) {
      let z = this.zoom.z, ox = 0, oy = 0; const sh = this.shakeAmt();
      if (sh > 0.2) { ox = (Math.random() - 0.5) * 2 * sh; oy = (Math.random() - 0.5) * 2 * sh; z *= 1 + sh / 260; }
      if (z !== 1 || ox || oy) { ctx.translate(this.zoom.x + ox, this.zoom.y + oy); ctx.scale(z, z); ctx.translate(-this.zoom.x, -this.zoom.y); }
    },
    drawLayer(ctx, layer) {
      const d = AU.PRO_DRAW && AU.PRO_DRAW[AU.World.mapId]; if (d && d[layer]) d[layer](ctx, this);
      if (layer === "mid") for (const e of this.ents) this.drawEnt(ctx, e);
      if (layer === "front") this.drawParts(ctx);
    },
    drawEnt(ctx, e) {
      if (e.hidden) return; if (e.draw) { e.draw(ctx, e, this); return; }
      const w = AU.World, bob = e.walking ? Math.abs(Math.sin(this.time * 9 + e.x)) * 4 : 0, y = (e.y || GROUND) - bob;
      if (e.sprite) { if (!w.sprite(ctx, e.sprite, e.x, y, e.h, e.face, e.idle ? (Math.floor(this.time * 0.7 + e.x * 0.013) % 2) : (e.frame || 0))) { ctx.fillStyle = "#C9B8A0"; w.rr(ctx, e.x - 28, y - e.h, 56, e.h, 18); ctx.fill(); } }
      if (e.name) w.nameTag(ctx, e.name, e.x, y - e.h - 10);
      if (e.mark && !this.locked()) { const by = y - e.h - 44 + Math.sin(this.time * 4) * 4; ctx.fillStyle = "#E8B94E"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(e.x - 11, by - 12); ctx.lineTo(e.x + 11, by - 12); ctx.lineTo(e.x, by + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    },
    drawParts(ctx) {
      for (const q of this.parts) {
        const k = q.t / q.life;
        if (q.k === "smoke") { ctx.globalAlpha = 0.36 * (1 - k) * Math.min(1, q.t * 2); ctx.fillStyle = q.col || "#2a2326"; ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, 7); ctx.fill(); }
        else if (q.k === "ember" || q.k === "glow" || q.k === "spark") { ctx.globalAlpha = 1 - k; ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = q.col || (q.k === "glow" ? "#FFE9A0" : "#FF9A3C"); ctx.fillRect(q.x, q.y, q.s, q.s); ctx.globalCompositeOperation = "source-over"; }
        else if (q.k === "ash") { ctx.globalAlpha = 0.7 * (1 - k); ctx.fillStyle = "#cfc6c0"; ctx.fillRect(q.x, q.y, q.s, q.s * 0.7); }
        else if (q.k === "dust") { ctx.globalAlpha = 0.4 * (1 - k); ctx.fillStyle = q.col || "#D8C7A5"; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (0.6 + k), 0, 7); ctx.fill(); }
        else if (q.k === "chip") { ctx.globalAlpha = 1 - k; ctx.fillStyle = "#D2A869"; ctx.fillRect(q.x, q.y, q.s, q.s * 0.6); }
      }
      ctx.globalAlpha = 1;
    },
    /* 등에 멘 가방의 움직임: 달릴 때 위아래로 출렁이고 기울며, 점프 때는 늦게 따라오고, 무릎 꿇을 때는 내려가며 흔들림이 서서히 가라앉음(스프링) */
    bagKick(v) { const S = this.bagS || (this.bagS = { y: 0, vy: 0, r: 0, vr: 0, t: this.time || 0 }); S.vy += v; },
    bagDyn(p) {
      const S = this.bagS || (this.bagS = { y: 0, vy: 0, r: 0, vr: 0, t: this.time || 0 }), t = this.time || 0, dt = Math.min(0.05, Math.max(0, t - S.t)); S.t = t;
      const moving = Math.abs(p.vx) > 20 && p.onGround, kn = !!(p.pose && p.pose.name === "kneel"), sh = !!(p.pose && p.pose.name === "shrug");
      const air = p.onGround ? 0 : Math.max(-9, Math.min(9, -(p.vy || 0) * 0.012));
      const ty = (kn ? 26 : 0) + air + (moving ? Math.sin(t * 17) * 2.2 : 0) + (sh ? -2 : 0);
      const tr = (kn ? 0.28 * p.dir : 0) - Math.max(-1, Math.min(1, (p.vx || 0) / 260)) * 0.11 + (moving ? Math.sin(t * 17 + 1) * 0.035 : 0);
      for (let i = 0; i < Math.max(1, Math.round(dt / 0.008)); i++) { const h = dt / Math.max(1, Math.round(dt / 0.008)); S.vy += (130 * (ty - S.y) - 15 * S.vy) * h; S.y += S.vy * h; S.vr += (110 * (tr - S.r) - 13 * S.vr) * h; S.r += S.vr * h; }
      if (!isFinite(S.y) || !isFinite(S.r)) { S.y = 0; S.vy = 0; S.r = 0; S.vr = 0; }
      return S;
    },
    drawPlayerExtras(ctx, p, pose) {
      const A = AU.PArt, d = p.dir, art = this.heroArt();
      if (this.v.bag || this.flag("carpenter_bag_acquired")) { const b = this.bagDyn(p); if (!A.bagBack(ctx, p.x - d * 20, p.y - 74 + b.y, 58, d, b.r)) A.bag(ctx, p.x - d * 22, p.y - 70 + b.y, 0.62, d * 0.1 + b.r); }
      if (this.v.carry) A.plank(ctx, p.x + d * 4, p.y - (art ? 96 : 126), 120, -0.06 * d);
      if (art) return; // 정식 그림은 망치를 손에 든 모습으로 그려져 있음
      if (pose && pose.hammer) { const sw = this.v.swing || 0; A.hammer(ctx, p.x + d * 30, p.y - 82, d * (0.6 + sw * 1.5), 1); }
      else if (this.v.tool) A.hammer(ctx, p.x + d * 26, p.y - 62, d * 0.3, 0.8);
    },
    drawOverlay(ctx) {
      if (this.tint && this.tint.a > 0) { ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = this.tint.a; ctx.fillStyle = this.tint.color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      if (this.overlayFn) this.overlayFn(ctx, this);
      if (this.vig > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(10,5,5," + this.vig + ")"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      this.drawGuide(ctx);
      if (this.closeup && this.closeup.a > 0.01) {
        const c = this.closeup; ctx.save(); ctx.globalAlpha = c.a; ctx.fillStyle = "rgba(8,5,6,.82)"; ctx.fillRect(0, 0, W, H);
        const g = ctx.createRadialGradient(W / 2, 320, 20, W / 2, 320, 360); g.addColorStop(0, "rgba(160,50,40,.35)"); g.addColorStop(1, "rgba(160,50,40,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        AU.PArt.fragment(ctx, W / 2, 322, AU.Img.has("po_metal_fragment_big") ? 2.7 : 3.7, -0.28 + Math.sin(this.time * 0.8) * 0.02, this.time);
        ctx.font = "500 22px 'Noto Sans KR', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText("의문의 금속 조각", W / 2, 560); ctx.restore();
      }
      if (this.barsS.a > 0.01) { ctx.fillStyle = "#000"; const b = 56 * this.barsS.a; ctx.fillRect(0, 0, W, b); ctx.fillRect(0, H - b, W, b); }
      if (this.flashS.a > 0.01) { ctx.globalAlpha = this.flashS.a; ctx.fillStyle = this.flashS.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      if (this.fadeS.a > 0.001) { ctx.globalAlpha = Math.min(1, this.fadeS.a); ctx.fillStyle = this.fadeS.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    }
  };
})();
