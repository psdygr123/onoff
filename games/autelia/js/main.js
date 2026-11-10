/* 시작·반복 처리·저장·온앤오프 연결. 규칙은 systems.js, 화면은 ui.js, 월드는 world.js */
window.AU = window.AU || {};
(function () {
  const C = AU.CONFIG;
  const embedded = window.parent !== window;
  const main = AU.main = { embedded, resetting: false, running: false, platform: null, post(type, payload) { if (embedded) { try { parent.postMessage({ source: "onoff-game", type, payload }, "*"); } catch (e) { /* 무시 */ } } } };

  /* ---------- 설정(키 배치 등): 게임 저장과 분리 ---------- */
  main.saveSettings = function () { AU.Store.set(C.save.settingsKey, { v: 1, bindings: AU.Input.bindings, confirmUnload: AU.UI.settings.confirmUnload, reduceFx: !!AU.UI.settings.reduceFx, mute: !!AU.UI.settings.mute }); };
  main.loadSettings = function () {
    const s = AU.Store.get(C.save.settingsKey);
    AU.Input.load(s && s.bindings);
    if (s && typeof s.confirmUnload === "boolean") AU.UI.settings.confirmUnload = s.confirmUnload;
    if (s && typeof s.reduceFx === "boolean") AU.UI.settings.reduceFx = s.reduceFx;
    if (s && typeof s.mute === "boolean") AU.UI.settings.mute = s.mute;
  };

  /* ---------- 화면 크기 맞추기: 1280×720 고정 무대를 창 크기에 맞춰 확대·축소 ---------- */
  function fit() {
    const st = document.getElementById("stage"), w = window.innerWidth, hh = window.innerHeight, k = Math.min(w / C.W, hh / C.H);
    st.style.transform = "translate(-50%,-50%) scale(" + k + ")"; main.scale = k;
  }

  /* ---------- 온앤오프 연결: 시작 정보(init)를 받으면 저장 칸 이름을 맞춤 ---------- */
  function handshake() {
    return new Promise((resolve) => {
      if (!embedded) return resolve();
      let done = false; const fin = () => { if (!done) { done = true; resolve(); } };
      window.addEventListener("message", (e) => {
        const m = e.data; if (!m || m.source !== "onoff-platform") return;
        if (m.type === "init") { main.platform = m; if (m.saveKey) AU.Store.ns = "onoff:" + String(m.saveKey).slice(0, 80); fin(); }
      });
      main.post("ready"); setTimeout(fin, 900);
    });
  }
  main.reportProgress = function () {
    if (!embedded || !AU.G.S) return;
    const S = AU.G.S; if (AU.Prologue && AU.Prologue.on) { main.post("progress", { label: "프롤로그 · 장면 " + Math.max(1, AU.Prologue.sceneIdx + 1) + "/" + AU.Prologue.ORDER.length, percent: 0 }); return; }
    main.post("progress", { label: AU.jobName(S) + " Lv." + S.level, percent: Math.min(100, Math.round(S.level / 10 * 100)) });
  };

  main.resetAll = function () {
    main.resetting = true; AU.Store.remove(C.save.key); location.reload();
  };

  /* ---------- 시작 ---------- */
  async function boot() {
    fit(); window.addEventListener("resize", fit);
    AU.Img.load();
    await handshake();
    AU.UI.devVisible = /[?&]dev=1/.test(location.search);
    const saved = AU.G.load(), state = saved || AU.newState();
    AU.G.init(state);
    if (!AU.MAPS[state.map]) { state.map = "porto"; state.x = AU.MAPS.porto.start; }
    AU.UI.root = document.getElementById("ui"); AU.UI.init(); main.loadSettings();
    AU.Prologue.normalize(); AU.World.init(); AU.World.blockedFn = () => AU.UI.anyOpen(); AU.Prologue.init();
    AU.G.S.hp = Math.min(AU.G.S.hp, AU.G.d().maxHp); if (AU.G.S.hp <= 0) AU.G.S.hp = AU.G.d().maxHp;

    AU.Input.attach();
    AU.Input.handlers.push((id) => { if (!main.running) return; if (AU.UI.onAction(id)) return; AU.World.onAction(id); });
    AU.Input.rawHandlers.push((e) => {
      if (e.code === "F2" && main.running) { AU.UI.devVisible = true; AU.UI.toggleWin("dev"); return true; }
      return false;
    });

    AU.Profile.apply();
    buildTitle(!!saved);
    main.saveTimer = setInterval(() => { if (main.running) AU.G.save("autosave"); }, C.save.autosaveSec * 1000);
    const flush = () => { if (main.running && !main.resetting) AU.G.save("autosave"); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => { if (document.hidden) { flush(); AU.Input.held.clear(); } });
    window.addEventListener("beforeunload", (e) => { flush(); if (main.running && !main.resetting && AU.UI.settings.confirmUnload && !embedded) { e.preventDefault(); e.returnValue = ""; } });
    AU.Ev.on("levelup", main.reportProgress); AU.Ev.on("jobchange", main.reportProgress);
    AU.Ev.on("saved", (d) => { if (d.reason !== "autosave") main.reportProgress(); });
    window.addEventListener("message", (e) => { const m = e.data; if (m && m.source === "onoff-platform" && m.type === "pause") AU.Input.held.clear(); });

    // 누락 이미지 경고: 멈추지 않고 대체 그래픽으로 표시
    setTimeout(() => { if (AU.Img.missing.size) AU.UI.toast("이미지 " + AU.Img.missing.size + "개를 불러오지 못해 대체 그래픽으로 표시 중입니다.", "warn"); }, 2500);
    requestAnimationFrame(loop);
    document.getElementById("boot").style.display = "none";
  }

  function buildTitle(hasSave) {
    const S = AU.G.S, t = document.getElementById("title"); t.innerHTML = "";
    const P = AU.Prologue, inPro = P.inProgress();
    const start = () => { t.classList.add("hidden"); main.running = true; window.focus(); if (P.onGameStart()) { main.reportProgress(); return; } AU.UI.mapBanner(AU.MAPS[AU.World.mapId].name); AU.G.save("start"); main.reportProgress(); };
    const b1 = document.createElement("button"); b1.type = "button"; b1.className = "btn primary big"; b1.id = "btn-start";
    b1.textContent = inPro ? P.titleLabel() : "이어하기 (" + AU.jobName(S) + " Lv." + S.level + " · " + AU.MAPS[S.map].name.replace(" (임시 명칭)", "") + ")";
    // 신규 시작(프롤로그 전, 캐릭터 설정이 없음)이면 먼저 캐릭터 설정 화면을 거침
    const needSetup = !AU.Profile.isSet() && S.prologue.state === "NOT_STARTED";
    const openSetup = (mode, onDone) => AU.Profile.openSetup(t, { mode, initial: AU.Profile.get(), onBack: () => buildTitle(hasSave), onDone });
    b1.onclick = needSetup ? () => openSetup("new", (name, gender) => { AU.Profile.set(name, gender); AU.G.save("profile"); start(); }) : start;
    const box = document.createElement("div"); box.className = "panel titlebox";
    box.innerHTML = '<div class="tlogo">아우텔리아</div><div class="tsub">시제품 · 프롤로그 + 1~10레벨 · 임시 콘텐츠 포함 (v' + AU.VERSION + ')</div>';
    box.append(b1);
    if (hasSave && !inPro) { const bp = document.createElement("button"); bp.type = "button"; bp.className = "btn"; bp.id = "btn-replay"; bp.textContent = "프롤로그 다시 보기"; bp.onclick = () => { t.classList.add("hidden"); main.running = true; window.focus(); P.startReplay(); }; box.append(bp); }
    if (hasSave) { const b2 = document.createElement("button"); b2.type = "button"; b2.className = "btn"; b2.id = "btn-new"; b2.textContent = "처음부터 시작"; b2.onclick = () => AU.UI.confirm("저장된 기록을 지우고 처음부터 시작할까요?", "지우고 시작", main.resetAll); box.append(b2); }
    if (hasSave) { const bc = document.createElement("button"); bc.type = "button"; bc.className = "btn"; bc.id = "btn-profile"; bc.textContent = "캐릭터 설정 (" + AU.Profile.name() + ")"; bc.onclick = () => openSetup("edit", (name, gender) => { AU.Profile.set(name, gender); AU.G.save("profile"); buildTitle(hasSave); }); box.append(bc); }
    const tip = document.createElement("p"); tip.className = "note"; tip.textContent = "방향키 이동 · Alt 점프 · Ctrl 공격 · Space 대화 · Esc 메뉴 (키보드 설정에서 변경 가능)";
    box.append(tip); t.append(box); t.classList.remove("hidden");
    b1.focus();
  }

  let last = 0;
  function loop(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts;
    try {
      if (main.running) { const paused = AU.UI.anyOpen(); AU.Prologue.update(dt, paused); if (!paused) AU.World.update(dt); else if (AU.Prologue.on) AU.World.updateCam(dt); }
      const ctx = document.getElementById("cv").getContext("2d");
      ctx.clearRect(0, 0, C.W, C.H); AU.World.draw(ctx); AU.UI.updateHud();
    } catch (err) { console.error("[아우텔리아] 오류(게임은 계속 실행):", err); AU.main.lastError = String(err && err.stack || err); }
    requestAnimationFrame(loop);
  }
  window.addEventListener("DOMContentLoaded", boot);
})();
