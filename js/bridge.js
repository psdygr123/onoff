/* 게임 실행 연결부.
   게임 파일은 iframe으로 열리고, 플랫폼과 게임은 postMessage로만 대화합니다.
   플랫폼 → 게임: { source:"onoff-platform", type:"init", version:1, gameId, saveKey, locale, savedProgress }
   게임 → 플랫폼: { source:"onoff-game", type:"ready" | "progress" | "exit", payload }
   - saveKey는 사용자·게임별로 분리된 불투명 값이며 이름·이메일 같은 개인정보는 보내지 않습니다.
   - 게임 안의 상세 기록(PSS, PERMA 등)을 어디에 저장할지는 정해지지 않았으며, 서버 연동 때 정합니다. */
window.OnOff = window.OnOff || {};
OnOff.Bridge = (function () {
  const { esc } = OnOff.UI;

  const SPEC = `// 게임 쪽 (games/<게임 id>/index.html 안에서)
parent.postMessage({ source: "onoff-game", type: "ready" }, "*");
window.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.source !== "onoff-platform" || m.type !== "init") return;
  // m.gameId, m.saveKey, m.savedProgress 로 저장 위치와 이어하기 상태를 받습니다.
});
parent.postMessage({ source: "onoff-game", type: "progress", payload: { label: "프롤로그", percent: 10 } }, "*");
parent.postMessage({ source: "onoff-game", type: "exit" }, "*"); // 플랫폼으로 복귀`;

  async function mount(stage, game, opts) {
    const entry = opts.entryOverride || game.entry;
    let iframe = null, handler = null;

    const placeholder = (why) => {
      stage.innerHTML = `<div class="stage-empty">
        <h2>게임 파일이 아직 연결되지 않았습니다</h2>
        <p>${esc(why)}</p>
        <p>연결 위치: <code>${esc(game.entry || "(없음)")}</code></p>
        <div><button class="btn ghost sm" type="button" data-action="stub-open">연결 시험 화면 열기</button></div>
      </div>`;
    };

    if (!entry) { placeholder("이 게임은 아직 실행 파일이 없습니다."); return () => {}; }

    let ok = false;
    try { const r = await fetch(entry, { method: "HEAD", cache: "no-store" }); ok = r.ok; } catch (e) { ok = false; }
    if (!ok) { placeholder("실행 파일을 찾지 못했습니다. 게임이 완성되면 위 위치에 파일을 넣고 이 화면에서 바로 열 수 있습니다."); return () => {}; }

    stage.innerHTML = "";
    iframe = document.createElement("iframe");
    iframe.title = game.title + " 실행 화면";
    iframe.src = entry;
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    stage.appendChild(iframe);

    handler = (ev) => {
      if (!iframe || ev.source !== iframe.contentWindow) return;
      const m = ev.data;
      if (!m || m.source !== "onoff-game") return;
      if (m.type === "ready") {
        const save = OnOff.State.getSave(game.id);
        iframe.contentWindow.postMessage({ source: "onoff-platform", type: "init", version: 1, gameId: game.id, saveKey: OnOff.State.saveKey(game.id), locale: "ko", savedProgress: save }, "*");
        opts.onLog("게임이 준비되었습니다. 플랫폼이 시작 정보를 보냈습니다.");
      } else if (m.type === "progress" && m.payload) {
        const p = m.payload;
        OnOff.State.setSave(game.id, { label: String(p.label || "진행 중").slice(0, 40), percent: Math.max(0, Math.min(100, Number(p.percent) || 0)), test: !!opts.entryOverride });
        opts.onLog("진행 상태를 받았습니다: " + String(p.label || "진행 중"));
      } else if (m.type === "exit") {
        opts.onExit();
      }
    };
    window.addEventListener("message", handler);
    return () => { window.removeEventListener("message", handler); };
  }

  return { mount, SPEC };
})();
