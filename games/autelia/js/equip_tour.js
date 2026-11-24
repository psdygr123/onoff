/* 장비 장착 단계별 안내(투어): 모험일지 안내와 같은 방식으로 화면을 어둡게 하고 설명할 부분만 밝게 비춥니다.
   - 첫 장비를 얻으면 "장비를 장착해 볼까요?"로 한 번 제안하고, 무기 없이 공격하려 할 때도 다시 제안합니다.
   - 규칙: 무기를 장착하지 않으면 기본 공격·스킬을 쓸 수 없습니다.
   - 투어 중에는 게임 입력을 막습니다(←/→ 이동, Enter/Space 다음, Esc 건너뛰기). 완료하면 flags.equipTourSeen을 저장합니다. */
window.AU = window.AU || {};
(function () {
  "use strict";
  const AU = window.AU;
  const h = (t, a, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a || {})) { if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else e.setAttribute(k, v); } for (const x of c.flat(Infinity)) if (x != null) e.append(x.nodeType ? x : document.createTextNode(x)); return e; };
  const keyE = () => { try { return AU.keyLabel(AU.Input.bindings.equipment); } catch (e) { return "E"; } };
  const find = (sel) => document.querySelector(sel);
  const weaponOn = () => !!(AU.G && AU.G.S && AU.G.S.equip && AU.G.S.equip.weapon);

  const STEPS = [
    { target: () => find(".window.win-equipment .wtitle"), title: "장비창은 [" + "E" + "] 키로 열어요",
      lines: () => ["장비창은 [" + keyE() + "] 키로 열고 닫을 수 있어요.", "지금은 안내를 위해 미리 열어 두었어요.", "천천히 하나씩 알려 드릴게요."] },
    { target: () => find(".window.win-equipment .eqslots"), title: "위쪽 칸이 지금 끼고 있는 장비예요",
      lines: () => ["무기·방어구·장신구 칸이 있어요.", ...(weaponOn() ? ["지금은 무기를 {{+끼고 있어요}}.", "잘하셨어요."] : ["지금은 무기 칸이 {{비어 있음}}이에요.", "이 상태로는 {{공격할 수 없어요}}."])] },
    { target: () => find(".window.win-equipment .itemgrid"), title: "가방 속 장비를 골라요",
      lines: () => ["가방에 있는 장비가 이 목록에 나와요.", "하나를 누르면 오른쪽에 변화를 확인할 수 있어요."] },
    { target: () => find(".window.win-equipment .split .detail") || find(".window.win-equipment .wbody"), title: "[장착] 버튼을 눌러 끼워요",
      lines: () => ["공격력이 얼마나 오르는지 확인했다면 [장착] 버튼을 누르세요.", "장착한 장비는 가방에서 장비 칸으로 옮겨져요. 바꾸고 싶으면 [해제]로 다시 뺄 수 있어요."] },
    { target: () => find(".window.win-equipment .eqslots"), title: "무기가 없으면 공격할 수 없어요",
      lines: () => ["무기를 장착하지 않으면 기본 공격도 스킬도 쓸 수 없어요.", "전투 전에 무기 칸이 채워져 있는지 확인해 보세요."],
      extra: () => h("div", { class: "jt-recap" }, h("b", { text: "기억할 것 3가지" }),
        h("ol", null, h("li", { text: "[" + keyE() + "] 키로 장비창을 연다" }), h("li", { text: "장비를 고르고 [장착]을 누른다" }), h("li", { text: "무기를 장착해야 공격할 수 있다" }))) }
  ];

  const T = AU.EquipTour = {
    active: false, pending: false, nagT: 0,
    seen() { return !!(AU.G && AU.G.S && AU.G.S.flags.equipTourSeen); },
    busy() { const UI = AU.UI, P = AU.Prologue; return !UI || UI.dialog || UI.cur || UI.modal || (P && P.on) || this.active; },
    /* 지금 바로 제안(바쁘면 한가해질 때까지 기다렸다가 한 번만) */
    offerSoon() {
      if (this.seen() || this.pending || this.active || !AU.G || !AU.G.S) return;
      this.pending = true;
      const iv = setInterval(() => {
        if (this.seen() || weaponOn()) { clearInterval(iv); this.pending = false; return; }
        if (this.busy()) return;
        clearInterval(iv); this.offer().finally(() => { this.pending = false; });
      }, 400);
    },
    async offer() {
      const RB = AU.RealBridge;
      if (this.seen() || this.active || !RB || !RB.prompt) return "skip";
      const ans = await RB.prompt("장비를 장착해 볼까요?",
        "장비는 가방에 있기만 해서는 효과가 없어요. 장비창에서 직접 끼워야 해요. 그리고 무기를 장착해야 공격할 수 있어요.\n\n1분쯤 걸리고, 한 단계씩 천천히 알려 드릴게요.",
        [{ text: "천천히 알려 주세요", value: "tour", primary: true }, { text: "나중에", value: "later" }]);
      if (ans !== "tour") return "later";
      return this.start();
    },
    /* 무기 없이 공격하려 할 때: 안내 문구 + (아직 안 봤으면) 투어 제안. 너무 자주 뜨지 않게 간격을 둠 */
    blocked() {
      const now = performance.now();
      if (now - this.nagT < 2500) return; this.nagT = now;
      AU.G.toast("무기를 장착해야 공격할 수 있어요. [" + keyE() + "] 키로 장비창을 열어 보세요.", "warn");
      if (!this.seen()) this.offerSoon();
    },
    start() {
      const UI = AU.UI, root = document.getElementById("ui"), P = AU.Prologue;
      if (this.active || !UI || !root) return Promise.resolve("skip");
      return new Promise((resolve) => {
        this.active = true;
        const oldFrozen = P && P.frozen;
        if (P && P.on) P.frozen = true;
        if (UI.curName !== "equipment") UI.open("equipment");
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
          if (AU.UI.curName !== "equipment") return finish("closed");
          const S = STEPS[i], el = S.target(), { r: sr, k } = stageBox();
          if (el) {
            const er = el.getBoundingClientRect(), pad = 6;
            const x = (er.left - sr.left) / k - pad, y = (er.top - sr.top) / k - pad, w = er.width / k + pad * 2, hh = er.height / k + pad * 2;
            Object.assign(spot.style, { display: "block", left: x + "px", top: y + "px", width: w + "px", height: hh + "px" });
            const cw = card.offsetWidth, ch = card.offsetHeight, gap = 16;
            let cx = x + w / 2 - cw / 2, cy = y + hh + gap;
            if (cy + ch > 712) cy = y - ch - gap;
            if (cy < 8) { cy = Math.min(712 - ch, Math.max(8, y + hh / 2 - ch / 2)); cx = x + w + gap; if (cx + cw > 1272) cx = x - cw - gap; }
            card.style.left = Math.round(Math.max(8, Math.min(1272 - cw, cx))) + "px"; card.style.top = Math.round(Math.max(8, Math.min(712 - ch, cy))) + "px";
          } else { spot.style.display = "none"; card.style.left = Math.round((1280 - card.offsetWidth) / 2) + "px"; card.style.top = "300px"; }
        };
        const show = () => {
          const S = STEPS[i];
          UI.renderWin();
          prog.textContent = (i + 1) + " / " + STEPS.length; title.replaceChildren(...AU.keyRich(i === 0 ? "장비창은 [" + keyE() + "] 키로 열어요" : S.title));
          body.replaceChildren(...S.lines().map((t) => h("p", null, AU.keyRich(t))));
          extra.replaceChildren(); const ex = S.extra && S.extra(); if (ex) extra.append(ex);
          bPrev.style.visibility = i ? "visible" : "hidden"; bNext.textContent = i === STEPS.length - 1 ? "이해했어요" : "다음 ▶";
          card.style.left = "-9999px"; requestAnimationFrame(() => { place(); });
        };
        const finish = (why) => {
          if (ended) return; ended = true; clearInterval(timer);
          AU.Input.rawHandlers = AU.Input.rawHandlers.filter((f) => f !== onKey);
          shade.remove(); spot.remove(); card.remove();
          if (why === "done") { const F = AU.G.S.flags; F.equipTourSeen = true; F.gdw_equipment = true; AU.G.save("equip-tour"); }
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
          return true;
        };
        AU.Input.rawHandlers.push(onKey);
        bNext.onclick = () => { bNext.blur(); next(); }; bPrev.onclick = () => { bPrev.blur(); back(); }; bSkip.onclick = () => { bSkip.blur(); finish("skip"); };
        timer = setInterval(place, 200);
        show();
      });
    }
  };
})();
