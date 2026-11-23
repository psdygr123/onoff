/* 첫 현실 미션 완료 안내: 보상, 나만의 공간 진입·사용법, 오각형(마음 성장)과 변화 추이를 한 번에 설명합니다.
   - 첫 완료 직후 한 번 자동으로 열리고, 나만의 공간의 '사용법 보기'로 언제든 다시 볼 수 있습니다.
   - 건너뛰기·끝내기 모두 flags.firstDoneGuideSeen을 저장해 다시 자동으로 뜨지 않습니다. */
window.AU = window.AU || {};
(function () {
  "use strict";
  const AU = window.AU;
  const h = (t, a, ...c) => { const e = document.createElementNS(a && a.svg ? "http://www.w3.org/2000/svg" : "http://www.w3.org/1999/xhtml", t); for (const [k, v] of Object.entries(a || {})) { if (k === "svg") continue; if (k === "class") e.setAttribute("class", v); else if (k === "text") e.textContent = v; else if (k === "onclick") e.addEventListener("click", v); else e.setAttribute(k, v); } for (const x of c.flat(Infinity)) if (x != null) e.append(x.nodeType ? x : document.createTextNode(x)); return e; };
  const btn = (label, cls, fn) => h("button", { type: "button", class: "btn " + (cls || ""), onclick: fn }, label);
  const keyJ = () => { try { return AU.keyLabel(AU.Input.bindings.journal); } catch (e) { return "J"; } };

  // 오각형 그림(설명용 예시): 5개 영역 이름만 보여 주는 작은 도식
  const pentagon = () => {
    const keys = ["P", "E", "R", "M", "A"], names = ["긍정정서", "몰입", "긍정적 관계", "의미", "성취"], cx = 110, cy = 92, R = 64;
    const pt = (i, f) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
    const poly = (f) => keys.map((_, i) => pt(i, f(i)).map((n) => n.toFixed(1)).join(",")).join(" ");
    const svg = h("svg", { svg: 1, viewBox: "0 0 220 190", class: "fg-pent", role: "img", "aria-label": "마음 성장 오각형 예시" });
    for (const r of [0.5, 1]) svg.append(h("polygon", { svg: 1, points: poly(() => r), fill: "none", stroke: "#c8baa0", "stroke-width": "1.4" }));
    svg.append(h("polygon", { svg: 1, points: poly((i) => [0.7, 0.4, 0.55, 0.85, 0.5][i]), fill: "rgba(216,182,107,.8)", stroke: "#a87b32", "stroke-width": "2" }));
    keys.forEach((k, i) => { const [x, y] = pt(i, 1.32); svg.append(h("text", { svg: 1, x: x.toFixed(1), y: (y + 4).toFixed(1), "text-anchor": "middle", "font-size": "12", "font-weight": "700", fill: "#70552d" }, k + " " + names[i])); });
    return svg;
  };

  const STEPS = [
    { title: "첫 활동을 기록했어요", lines: () => ["하고 나서 남긴 기록이 '나만의 공간'에 쌓이기 시작해요.", "**갤러리 토큰 +1**은 공간을 꾸미는 데 쓰는 재화예요. 같은 활동은 처음 한 번만 받고, 사진이나 시간 기록이 없어도 똑같이 받아요.", "**마음 점수**는 그 활동이 속한 영역(P·E·R·M·A)에 쌓여요. 점수가 낮은 평가를 남겨도 보상은 같아요."] },
    { title: "나만의 공간은 이렇게 들어가요", lines: () => ["게임 화면에서 **[Esc]** 키로 메뉴를 열고, **나만의 공간**을 누르면 돼요.", "공간 오른쪽 아래 '나가기'를 누르면 게임으로 돌아와요."] },
    { title: "나만의 공간에서 할 수 있는 일", lines: () => ["**가운데**에는 최근에 한 활동이 액자로 걸려요. 해 본 활동이 늘수록 액자가 채워져요.", "**오른쪽**에서는 마음 성장 오각형, 갤러리 토큰, 오늘 방문 기록을 볼 수 있어요.", "**'공간 꾸미기'**에서 토큰으로 식물·등불 같은 장식을 얻어 전시해 보세요. **'방문 기록'**을 누르면 하루 한 번 토큰을 받아요."] },
    { title: "오각형은 마음 성장을 보여줘요", extra: pentagon, lines: () => ["활동을 완료할 때마다 그 활동의 영역 점수가 쌓이고, 오각형의 해당 꼭짓점이 바깥으로 넓어져요.", "영역은 긍정정서(P)·몰입(E)·긍정적 관계(R)·의미(M)·성취(A) 다섯 가지예요. 모양이 한쪽으로 치우쳐도 괜찮아요.", "이 점수는 게임 속 활동 기록이에요. 행복이나 건강을 재는 검사 점수가 아니고, 전투에도 영향을 주지 않아요."] },
    { title: "변화 추이는 '마음 기록'에서 봐요", lines: () => ["**모험일지[" + keyJ() + "] → 현실 활동 → 마음 기록** 탭에서 볼 수 있어요.", "**초록 면**은 지금, **회색 점선**은 이번 주를 시작할 때의 기록이에요. 영역별로 '이전 → 지금'이 얼마나 달라졌는지 함께 보여 줘요.", "한 주에 올릴 수 있는 점수에는 상한이 있어서 많이 해도 일정 점수까지만 올라요. 그래도 활동 기록은 그대로 남아요."] },
    { title: "마지막으로 기억할 것", lines: () => ["활동은 선택이에요. 안 해도 불이익이 없어요.", "한 번 완료한 활동도 다시 기록할 수 있어요. 이때는 점수와 토큰 없이 기록만 쌓여요.", "이 안내는 나만의 공간의 '사용법 보기'에서 다시 볼 수 있어요."] },
  ];

  AU.FirstMissionGuide = {
    open(opts) {
      opts = opts || {};
      const UI = AU.UI; if (!UI || !UI.modalEl || this.active) return;
      this.active = true;
      const wrap = UI.modalEl; let i = 0;
      const seen = () => { try { const F = AU.G.S.flags; if (!F.firstDoneGuideSeen) { F.firstDoneGuideSeen = true; AU.G.save("first-done-guide"); } } catch (e) { /* 저장 실패는 무시 */ } };
      const close = () => { seen(); this.active = false; UI.modal = false; wrap.classList.add("hidden"); wrap.innerHTML = ""; };
      const draw = () => {
        const S = STEPS[i], last = i === STEPS.length - 1;
        UI.modal = true; wrap.classList.remove("hidden"); wrap.innerHTML = "";
        const dots = h("div", { class: "rv-dots", "aria-hidden": "true" }, STEPS.map((_, k) => h("i", { class: k < i ? "done" : k === i ? "cur" : "" })));
        const body = S.lines().map((t) => h("p", { class: "fg-line" }, t.split(/\*\*(.+?)\*\*/).map((part, k) => (k % 2 ? h("b", { class: "rb-em", text: part }) : part))));
        const acts = [];
        if (i) acts.push(btn("이전", "", () => { i--; draw(); }));
        if (last) { acts.push(btn("나만의 공간 열기", "primary", () => { close(); if (!(AU.Prologue && AU.Prologue.on)) UI.open("gallery"); })); acts.push(btn("닫기", "", close)); }
        else acts.push(btn("다음", "primary", () => { i++; draw(); }));
        wrap.append(h("div", { class: "panel modal restnote review-step fg-card", role: "dialog", "aria-modal": "true" },
          h("div", { class: "rv-prog" }, dots, h("span", { text: (i + 1) + " / " + STEPS.length })),
          h("h3", { text: S.title }), S.extra ? S.extra() : null, ...body, h("div", { class: "choices" }, ...acts),
          last ? null : h("div", { class: "rv-foot" }, btn("건너뛰기", "", close))));
      };
      draw();
    },
    /* 첫 완료 직후에만 자동으로 */
    maybeOffer() { try { if (!AU.G.S.flags.firstDoneGuideSeen) this.open(); } catch (e) { /* 안내 실패가 기록을 막지 않음 */ } }
  };
})();
