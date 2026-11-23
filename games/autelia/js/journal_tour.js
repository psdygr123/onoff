/* 모험일지 단계별 안내(투어): 화면을 어둡게 하고 설명할 부분만 밝게 비추며 8단계로 천천히 알려 줍니다.
   - 신전 완성 직후 "모험일지를 열어 볼까요?"로 한 번 제안하고, 현실 활동 화면의 '안내 다시 보기'로 언제든 다시 봅니다.
   - 투어 중에는 게임 입력을 막습니다(←/→ 이동, Enter/Space 다음, Esc 건너뛰기). 일지 창이 닫히면 투어도 끝납니다.
   - 완료하면 flags.journalTourSeen·gdw_journal을 저장합니다(건너뛰면 저장하지 않음). */
window.AU = window.AU || {};
(function () {
  "use strict";
  const AU = window.AU;
  const h = (t, a, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a || {})) { if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else e.setAttribute(k, v); } for (const x of c.flat(Infinity)) if (x != null) e.append(x.nodeType ? x : document.createTextNode(x)); return e; };
  const keyJ = () => { try { return AU.keyLabel(AU.Input.bindings.journal); } catch (e) { return "J"; } };
  const mission = () => (AU.G && AU.G.mission && AU.G.mission("m_a3")) || null;
  const find = (sel, root) => (root || document).querySelector(sel);
  const win = () => find(".window.win-journal");
  const tabBtn = (label) => [...document.querySelectorAll(".window.win-journal .real-tabs .btn")].find((b) => b.textContent.trim() === label) || null;

  /* 단계 정의: setup=그 단계에서 보여 줄 일지 화면, target=비출 요소, title/lines=설명, extra=카드 안 추가 그림 */
  const STEPS = [
    { setup: { jg: "game", j: "a1" }, target: () => find(".window.win-journal .wtitle"), title: "모험일지는 [J] 키로 열어요",
      lines: () => ["모험일지는 [" + keyJ() + "] 키로 열고 닫을 수 있어요.", "지금은 안내를 위해 미리 열어 두었어요. 천천히 하나씩 알려 드릴게요."] },
    { setup: { jg: "game", j: "a1" }, target: () => find(".window.win-journal .jgroup"), title: "위쪽은 두 갈래예요",
      lines: () => ["'모험 이야기'에는 지나온 장면이 정리돼요.", "'현실 활동'에서는 현실에서 해 볼 수 있는 작은 활동을 볼 수 있어요."] },
    { setup: { jg: "game", j: "a1" }, target: () => find(".window.win-journal .tabs") || find(".window.win-journal .wbody"), title: "모험 이야기는 지나온 길이에요",
      lines: () => ["프롤로그와 1막에서 겪은 중요한 장면이 카드로 하나씩 쌓여요.", "카드마다 그때의 기분을 한두 줄로 적어 둘 수 있고, '전체 기록'에서는 지나온 일을 시간 순서로 볼 수 있어요."] },
    { setup: { jg: "real", j: "today" }, target: () => find(".window.win-journal .realband"), title: "현실 활동은 선택이에요",
      lines: () => ["게임 속 이야기와는 별개예요.", "하지 않아도 모험은 그대로 이어지고, 하지 않았다고 불이익도 없어요."] },
    { setup: { jg: "real", j: "today" }, target: () => find(".window.win-journal .real-tabs"), title: "처음엔 '오늘의 활동'만 봐요",
      lines: () => ["탭이 여러 개지만, 처음에는 '오늘의 활동'만 보면 충분해요.", "나머지는 익숙해진 뒤에 천천히 둘러보세요."] },
    { setup: { jg: "real", j: "today" }, target: () => find('.window.win-journal [data-real-bridge="suggestions"]') || find(".window.win-journal .wbody"), title: "방금 지은 신전과 이어진 활동이에요",
      lines: () => { const m = mission(); return ["신전을 완성한 일에서 이어진 첫 활동이 나왔어요.", m ? "**" + m.title + "** — 약 " + m.minutes + "분이면 돼요." : "1분 안에 할 수 있는 가벼운 활동이에요."]; } },
    { setup: { jg: "real", j: "today" }, target: () => find('.window.win-journal [data-real-bridge="suggestions"] .macts') || find(".window.win-journal .wbody"), title: "활동은 두 걸음으로 기록해요",
      lines: () => ["하고 나면 '완료했어요'를 눌러 남기면 돼요.", "'건너뛰기'를 눌러도 괜찮고, 나중에 다시 해도 돼요."],
      extra: () => h("div", { class: "jt-steps", "aria-label": "수락, 완료했어요" },
        [["1", "수락"], ["2", "완료했어요"]].map(([n, t], i) => [i ? h("span", { class: "jt-arrow", text: "→" }) : null, h("span", { class: "jt-step" }, h("i", { text: n }), h("b", { text: t }))])) },
    { setup: { jg: "real", j: "today" }, target: () => tabBtn("마음 기록") || find(".window.win-journal .real-tabs"), title: "기록은 '마음 기록'에 남아요",
      lines: () => ["활동을 완료하면 '마음 기록'에 기록이 남아요.", "이 탭에서 언제든 지나온 기록을 볼 수 있어요."],
      extra: () => h("div", { class: "jt-recap" }, h("b", { text: "기억할 것 3가지" }),
        h("ol", null, h("li", { text: "[" + keyJ() + "] 키로 모험일지를 연다" }), h("li", { text: "현실 활동은 선택이다" }), h("li", { text: "수락 → 완료했어요" }))) }
  ];

  const T = AU.JournalTour = {
    active: false,
    /* 신전 완성 직후 제안: "모험일지를 열어 볼까요?" → 수락하면 투어, 아니면 그대로 진행 */
    async offer() {
      const P = AU.Prologue, RB = AU.RealBridge, S = AU.G && AU.G.S;
      if (!P || !P.on || P.replay || !RB || !S || this.active) return "skip";
      if (S.flags.journalTourSeen || !RB.visibleInDev()) return "skip";
      const g = P.gen;
      const ans = await RB.prompt("모험일지를 열어 볼까요?",
        "방금 신전을 완성한 일이 모험일지에 기록됐어요. 일지는 지나온 이야기와, 현실에서 해 볼 수 있는 작은 활동을 모아 두는 곳이에요.\n\n1분쯤 걸리고, 한 단계씩 천천히 알려 드릴게요.",
        [{ text: "천천히 알려 주세요", value: "tour", primary: true }, { text: "나중에", value: "later" }]);
      if (ans !== "tour" || !P.on || P.gen !== g) return "later";
      return this.start({ closeAfter: true });
    },
    /* 투어 실행. opts.closeAfter: 끝나면 일지 창도 닫기(프롤로그 흐름용). 결과: "done" | "skip" | "closed" */
    start(opts) {
      opts = opts || {};
      const UI = AU.UI, root = document.getElementById("ui"), P = AU.Prologue;
      if (this.active || !UI || !root) return Promise.resolve("skip");
      return new Promise((resolve) => {
        this.active = true;
        const oldFrozen = P && P.frozen, prev = { jg: UI.tab.jg, j: UI.tab.j };
        if (P && P.on) P.frozen = true;
        if (UI.curName !== "journal") { UI.open("journal"); }
        AU.Input.held.clear();
        const shade = h("div", { class: "jt-shade" }), spot = h("div", { class: "jt-spot" });
        const prog = h("span", { class: "jt-prog" }), title = h("b", { class: "jt-title" }), body = h("div", { class: "jt-body" }), extra = h("div", { class: "jt-extra" });
        const bPrev = h("button", { type: "button", class: "btn", text: "◀ 이전" }), bNext = h("button", { type: "button", class: "btn primary" }), bSkip = h("button", { type: "button", class: "btn jt-skip", text: "건너뛰기 (Esc)" });
        const card = h("div", { class: "panel jt-card", role: "dialog", "aria-modal": "true" }, h("div", { class: "jt-head" }, prog, bSkip), title, body, extra, h("div", { class: "jt-nav" }, bPrev, bNext));
        root.append(shade, spot, card);
        let i = 0, ended = false, timer = null;

        const stageBox = () => { const st = document.getElementById("stage"), r = st.getBoundingClientRect(); return { r, k: r.width / 1280 || 1 }; };
        const place = () => {
          if (ended) return;
          if (AU.UI.curName !== "journal") return finish("closed");
          const S = STEPS[i], el = S.target(), { r: sr, k } = stageBox();
          if (el) {
            const er = el.getBoundingClientRect(), pad = 6;
            const x = (er.left - sr.left) / k - pad, y = (er.top - sr.top) / k - pad, w = er.width / k + pad * 2, hh = er.height / k + pad * 2;
            Object.assign(spot.style, { display: "block", left: x + "px", top: y + "px", width: w + "px", height: hh + "px" });
            const cw = card.offsetWidth, ch = card.offsetHeight, gap = 16;
            let cx = x + w / 2 - cw / 2, cy = y + hh + gap;
            if (cy + ch > 712) cy = y - ch - gap;                       // 아래에 자리가 없으면 위로
            if (cy < 8) { cy = Math.min(712 - ch, Math.max(8, y + hh / 2 - ch / 2)); cx = x + w + gap; if (cx + cw > 1272) cx = x - cw - gap; } // 위도 없으면 옆으로
            card.style.left = Math.round(Math.max(8, Math.min(1272 - cw, cx))) + "px"; card.style.top = Math.round(Math.max(8, Math.min(712 - ch, cy))) + "px";
          } else { spot.style.display = "none"; card.style.left = Math.round((1280 - card.offsetWidth) / 2) + "px"; card.style.top = "300px"; }
        };
        const show = () => {
          const S = STEPS[i];
          UI.tab.jg = S.setup.jg; UI.tab.j = S.setup.j; UI.renderWin();
          prog.textContent = (i + 1) + " / " + STEPS.length; title.textContent = S.title;
          body.replaceChildren(...S.lines().map((t) => h("p", null, t.split(/\*\*(.+?)\*\*/).map((part, k) => (k % 2 ? h("b", { class: "rb-em", text: part }) : part)))));   // **강조**: 현실 활동 이름
          extra.replaceChildren(); const ex = S.extra && S.extra(); if (ex) extra.append(ex);
          bPrev.style.visibility = i ? "visible" : "hidden"; bNext.textContent = i === STEPS.length - 1 ? "이해했어요" : "다음 ▶";
          const el = S.target(); if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
          card.style.left = "-9999px"; requestAnimationFrame(() => { place(); });
        };
        const finish = (why) => {
          if (ended) return; ended = true; clearInterval(timer);
          AU.Input.rawHandlers = AU.Input.rawHandlers.filter((f) => f !== onKey);
          shade.remove(); spot.remove(); card.remove();
          if (why === "done") { const F = AU.G.S.flags; F.journalTourSeen = true; F.gdw_journal = true; AU.G.save("journal-tour"); }
          if (why !== "closed") {
            if (opts.closeAfter) UI.close(); else { UI.tab.jg = prev.jg || "real"; UI.tab.j = prev.j || "today"; if (UI.curName === "journal") UI.renderWin(); }
          }
          if (P && P.on) P.frozen = oldFrozen;
          AU.Input.held.clear(); this.active = false; resolve(why);
        };
        const next = () => { if (i >= STEPS.length - 1) return finish("done"); i++; show(); };
        const back = () => { if (i > 0) { i--; show(); } };
        const onKey = (e) => {
          if (e.type !== "keydown") return false;
          if (e.code === "Escape") finish("skip");
          else if (e.code === "ArrowRight" || e.code === "Enter" || e.code === "Space" || e.code === "NumpadEnter") { if (!e.repeat) next(); }
          else if (e.code === "ArrowLeft") { if (!e.repeat) back(); }
          return true;                                                   // 투어 중에는 다른 입력을 모두 막음
        };
        AU.Input.rawHandlers.push(onKey);
        bNext.onclick = () => { bNext.blur(); next(); }; bPrev.onclick = () => { bPrev.blur(); back(); }; bSkip.onclick = () => { bSkip.blur(); finish("skip"); };
        timer = setInterval(place, 200);
        show();
      });
    }
  };
})();
