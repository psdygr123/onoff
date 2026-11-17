/* 시작·반복 처리·저장·온앤오프 연결. 규칙은 systems.js, 화면은 ui.js, 월드는 world.js */
window.AU = window.AU || {};
(function () {
  const C = AU.CONFIG;
  const embedded = window.parent !== window;
  const main = AU.main = { embedded, resetting: false, running: false, platform: null, post(type, payload) { if (embedded) { try { parent.postMessage({ source: "onoff-game", type, payload }, "*"); } catch (e) { /* 무시 */ } } } };

  /* ---------- 설정(키 배치 등): 게임 저장과 분리 ---------- */
  main.saveSettings = function () { AU.Store.set(C.save.settingsKey, { v: 1, bindings: AU.Input.bindings, confirmUnload: AU.UI.settings.confirmUnload, reduceFx: !!AU.UI.settings.reduceFx, mute: !!AU.UI.settings.mute, volBgm: AU.UI.settings.volBgm, volSfx: AU.UI.settings.volSfx, volCombat: AU.UI.settings.volCombat }); };
  main.loadSettings = function () {
    const s = AU.Store.get(C.save.settingsKey);
    AU.Input.load(s && s.bindings);
    if (s && typeof s.confirmUnload === "boolean") AU.UI.settings.confirmUnload = s.confirmUnload;
    if (s && typeof s.reduceFx === "boolean") AU.UI.settings.reduceFx = s.reduceFx;
    if (s && typeof s.mute === "boolean") AU.UI.settings.mute = s.mute;
    const vol = (x) => (typeof x === "number" && isFinite(x)) ? Math.max(0, Math.min(1, x)) : 1;
    if (s) { AU.UI.settings.volBgm = vol(s.volBgm); AU.UI.settings.volSfx = vol(s.volSfx); AU.UI.settings.volCombat = vol(s.volCombat); }
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

  /* ---------- 캐릭터 슬롯(3칸): 1번 칸은 예전 저장 키를 그대로 씀 ---------- */
  main.SLOTS = [1, 2, 3];
  main.slotKey = (n) => n === 1 ? "autelia.save" : "autelia.save." + n;
  main.activeSlot = () => { const v = AU.Store.get("autelia.active"); return main.SLOTS.includes(v) ? v : 1; };
  main.setSlot = (n) => { AU.Store.set("autelia.active", n); location.reload(); };
  main.slotInfo = (n) => {
    const raw = AU.Store.get(main.slotKey(n)); if (!raw || typeof raw !== "object") return null;
    let job = "견습 모험가"; try { job = AU.JOBS[(raw.job || "apprentice")].name; } catch (e) {}
    const pro = raw.prologue && raw.prologue.state !== "COMPLETED" && !raw.prologue.legacy;
    return { name: (raw.profile && raw.profile.name) || "이름 없음", gender: raw.profile && raw.profile.gender, level: raw.level || 1, job, look: raw.profile && raw.profile.look,  pro, savedAt: raw.savedAt };
  };
  main.paintSlot = async function (cv, info) { // 설정한 성별·머리·조끼·바지 색으로 초상화를 그려 넣음(그림이 읽히는 동안 잠깐 기다림)
    const key = info.gender === "f" ? "pt_player_female" : "pt_player_male";
    for (let i = 0; i < 50 && !(AU.Img.map[key] && AU.Img.map[key].orig); i++) await new Promise((r) => setTimeout(r, 100));
    let src = null; try { src = await AU.Tint.paint(key, info.look || {}); } catch (e) { /* 아래에서 원본으로 */ }
    if (!src) src = AU.Img.get(key); if (!src) return;
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, sz = Math.min(w, h), x = cv.getContext("2d");
    x.drawImage(src, (w - sz) / 2, 0, sz, sz, 0, 0, cv.width, cv.height);
  };
  main.exitGame = function () {
    AU.G.save("exit");
    if (embedded) { AU.main.post("exit"); return; }
    main.running = false; main.resetting = true; location.reload();
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
    main.slot = main.activeSlot(); C.save.key = main.slotKey(main.slot);
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
    b1.onclick = needSetup ? () => openSetup("new", (name, gender, look, line) => { AU.Profile.set(name, gender, look, line); AU.G.save("profile"); start(); }) : start;
    const box = document.createElement("div"); box.className = "panel titlebox";
    box.innerHTML = '<div class="tlogo">아우텔리아</div><div class="tsub">시제품</div>';
    box.append(b1);
    if (hasSave && !inPro) { const bp = document.createElement("button"); bp.type = "button"; bp.className = "btn"; bp.id = "btn-replay"; bp.textContent = "프롤로그 다시 보기"; bp.onclick = () => { t.classList.add("hidden"); main.running = true; window.focus(); P.startReplay(); }; box.append(bp); }
    if (hasSave) { const bc = document.createElement("button"); bc.type = "button"; bc.className = "btn"; bc.id = "btn-profile"; bc.textContent = "캐릭터 설정 (" + AU.Profile.name() + ")"; bc.onclick = () => openSetup("edit", (name, gender, look) => { AU.Profile.set(name, gender, look); AU.G.save("profile"); buildTitle(hasSave); }); box.append(bc); }
    const strip = document.createElement("div"); strip.className = "slotstrip";
    for (const n of main.SLOTS) {
      const info = main.slotInfo(n), card = document.createElement("div"); card.className = "slotcard" + (n === main.slot ? " on" : "") + (info ? "" : " empty"); card.dataset.slot = n;
      const open = () => { if (n !== main.slot) main.setSlot(n); };
      if (info) {
        const when = info.savedAt ? new Date(info.savedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) + " 저장" : "";
        card.innerHTML = '<canvas class="sport" width="112" height="112"></canvas><b></b><span></span><em></em>'; card.children[1].textContent = info.name; card.children[2].textContent = info.pro ? "프롤로그 진행 중" : info.job + " Lv." + info.level; card.children[3].textContent = when;
        main.paintSlot(card.children[0], info);
        const del = document.createElement("button"); del.type = "button"; del.className = "sdel"; del.textContent = "삭제"; del.title = "이 캐릭터 삭제";
        del.onclick = (e) => { e.stopPropagation(); AU.UI.confirm("캐릭터 '" + info.name + "'의 기록을 삭제할까요? 되돌릴 수 없습니다.", "삭제", () => { AU.Store.remove(main.slotKey(n)); location.reload(); }); }; card.append(del);
      } else { card.innerHTML = '<b>＋ 새 캐릭터</b><span>비어 있는 칸</span>'; }
      card.onclick = open; strip.append(card);
    }
    box.insertBefore(strip, b1);
    t.append(box); t.classList.remove("hidden");
    b1.focus();
  }

  let last = 0;
  function loop(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts;
    try {
      if (main.running) { const paused = AU.UI.anyOpen(); AU.Prologue.update(dt, paused); if (!paused) AU.World.update(dt); else if (AU.Prologue.on) AU.World.updateCam(dt); }
      if (AU.Bgm) AU.Bgm.tick(dt);
      const ctx = document.getElementById("cv").getContext("2d");
      ctx.clearRect(0, 0, C.W, C.H); AU.World.draw(ctx); AU.UI.updateHud(); if (AU.Tutorial && main.running) AU.Tutorial.tick(dt); else if (AU.Tutorial) AU.Tutorial.render(null);
    } catch (err) { console.error("[아우텔리아] 오류(게임은 계속 실행):", err); AU.main.lastError = String(err && err.stack || err); }
    requestAnimationFrame(loop);
  }
  window.addEventListener("DOMContentLoaded", boot);
})();
