/* 단계별 조작 튜토리얼: 프롤로그가 끝난 뒤 본편에서, 화면 위쪽 카드로 "무엇을 누르면 무엇을 볼 수 있는지"를 한 단계씩 알려 줍니다.
   - 카드의 체크 항목을 실제로 해 보면 ✔ 표시가 되고, 모두 하면 다음 단계로 넘어갑니다. 진행 상황은 저장됩니다.
   - '건너뛰기'를 누르면 끝납니다. 이미 어느 정도 진행한 저장(Lv.3 이상)은 시작하지 않습니다. 전체 설명은 H 키(기능 안내)에서 언제든 볼 수 있습니다.
   - 개발 확인용 주소(dev=1)에서는 자동으로 나오지 않습니다(?tut=1을 붙이면 나옴). */
window.AU = window.AU || {};
(function () {
  "use strict";
  const AU = window.AU, h = (t, a, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a || {})) { if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else e.setAttribute(k, v); } for (const x of c.flat()) if (x != null) e.append(x); return e; };
  const K = (a) => "[" + AU.keyLabel(AU.Input.bindings[a]) + "]";
  const S = () => AU.G.S, win = () => AU.UI && AU.UI.curName;

  /* 단계: title 제목, lines 짧은 설명(키는 현재 설정에 맞춰 표시), checks 직접 해 볼 일(id는 저장용), ready 이 단계를 시작할 조건 */
  const STEPS = [
    { id: "move", title: "이동과 점프", lines: () => ["방향키로 걷고, 점프 키로 뛰어오릅니다.", "밧줄이나 사다리 앞에서는 " + K("up") + "로 오르내립니다."],
      checks: [{ id: "walk", label: () => K("left") + " " + K("right") + " 로 걸어 보기" }, { id: "jump", label: () => K("jump") + " 로 점프해 보기" }] },
    { id: "talk", title: "사람에게 말 걸기", lines: () => ["NPC(마을 사람)에게 가까이 가면 화면 아래에 안내가 뜹니다.", "머리 위의 ! 는 받을 수 있는 의뢰, ? 는 보고할 의뢰입니다."],
      checks: [{ id: "talk", label: () => K("interact") + " 로 NPC에게 말 걸어 보기" }] },
    { id: "quest", title: "의뢰(퀘스트) 받기", lines: () => ["대화에서 의뢰를 수락하면 화면 왼쪽 '목표'에 해야 할 일과 가야 할 방향이 나옵니다.", "어디로 가야 할지 모르겠다면 '목표'를 보세요."],
      checks: [{ id: "accept", label: () => "의뢰 하나 수락하기" }, { id: "qwin", label: () => K("quests") + " 로 퀘스트창 열어 보기" }] },
    { id: "map", title: "지역 이동과 월드맵", lines: () => ["마을 끝의 화살표(포털) 앞에서 " + K("up") + " 를 누르면 다른 지역으로 갑니다.", "월드맵에서는 갈 수 있는 지역과 의뢰 목적지(★)를 볼 수 있습니다."],
      checks: [{ id: "mapwin", label: () => K("worldmap") + " 로 월드맵 열어 보기" }, { id: "travel", label: () => "포털로 다른 지역에 가 보기" }] },
    { id: "fight", title: "싸우기", lines: () => ["사냥터에는 몬스터가 있습니다. 가까이 다가가 공격 키를 누르세요.", "몬스터 머리 위 ! 는 곧 공격한다는 신호입니다. 내 체력(HP)이 0이 되기 전에 피하거나 물러나세요."],
      checks: [{ id: "kill", label: () => K("attack") + " 로 몬스터 처치하기" }] },
    { id: "loot", title: "전리품과 가방", lines: () => ["몬스터가 떨어뜨린 물건은 앞에서 " + K("interact") + " 로 줍습니다.", "가방에서 물건을 쓰고, 장비창에서 무기·방어구를 끼면 능력치가 달라집니다."],
      checks: [{ id: "inv", label: () => K("inventory") + " 로 인벤토리 열어 보기" }, { id: "equip", label: () => K("equipment") + " 로 장비창 열어 보기" }] },
    { id: "grow", title: "성장: 능력치", ready: () => S().level >= 2, lines: () => ["레벨이 오르면 능력치 포인트를 얻습니다.", "스탯창에서 힘·체력·민첩 등에 나눠 넣으면 전투가 달라집니다. (스킬은 10레벨 전직 뒤에 배웁니다)"],
      checks: [{ id: "stats", label: () => K("stats") + " 로 스탯창 열어 보기" }] }
  ];

  const T = AU.Tutorial = {
    st: null, card: null, hold: 0, cur: null, walked: 0, lastX: null, lastMap: null, wasGround: true, ses: {}, travels: 0,
    enabled() { return !(/[?&]dev=1/.test(location.search) && !/[?&]tut=1/.test(location.search)) && !(AU.Prologue && AU.Prologue.on); },
    init() {
      const F = S().flags; if (!F.tut) F.tut = { i: 0, c: {}, off: S().level >= 3 };
      this.st = F.tut; this.travels = 0;
    },
    mark(id) { if (this.st && !this.st.c[id]) { this.st.c[id] = true; AU.G.save && AU.G.save("tutorial"); } },
    step() { return this.st && !this.st.off ? STEPS[this.st.i] : null; },
    skip() { if (this.st) { this.st.off = true; AU.G.save && AU.G.save("tutorial"); } this.render(null); },
    detect(dt) {
      const W = AU.World, p = W.player, st = this.st; if (!p) return;
      if (this.lastMap !== W.mapId) { if (this.lastMap && W.player) this.travels++; this.lastMap = W.mapId; this.lastX = p.x; }
      if (this.lastX != null && p.onGround && !AU.UI.anyOpen()) this.walked += Math.abs(p.x - this.lastX);
      this.lastX = p.x; if (this.walked > 200) this.mark("walk");
      if (this.wasGround && !p.onGround && p.vy < 0 && !p.rope) this.mark("jump");
      this.wasGround = p.onGround;
      if (AU.UI.dialog) this.mark("talk");
      if (Object.keys(S().quests).length) this.mark("accept");
      const w = win(); if (w === "quests") this.mark("qwin"); if (w === "worldmap") this.mark("mapwin"); if (w === "inventory") this.mark("inv"); if (w === "equipment") this.mark("equip"); if (w === "stats") this.mark("stats");
      if (this.travels > 0) this.mark("travel"); if (this.ses.kill) this.mark("kill");
    },
    tick(dt) {
      try {
        if (!this.enabled() || !AU.G || !AU.G.S) { this.render(null); return; }
        if (!this.st) this.init();
        const s = this.step(); if (!s) { this.render(null); return; }
        if (s.ready && !s.ready()) { this.render(null); return; }
        this.detect(dt);
        if (s.checks.every((c) => this.st.c[c.id])) { // 이번 단계 완료: 잠깐 보여 준 뒤 다음 단계
          this.hold += dt; if (this.hold > 1.1) { this.hold = 0; this.st.i++; if (this.st.i >= STEPS.length) this.st.off = true; AU.G.save && AU.G.save("tutorial"); this.cur = null; }
        } else this.hold = 0;
        this.render(AU.UI.anyOpen() && !s.checks.every((c) => this.st.c[c.id]) && !["quests", "worldmap", "inventory", "equipment", "stats"].includes(win()) ? null : s);
      } catch (e) { console.error("[튜토리얼]", e); }
    },
    render(s) {
      const root = document.getElementById("ui"); if (!root) return;
      if (!s) { if (this.card) { this.card.remove(); this.card = null; this.cur = null; } return; }
      const done = s.checks.every((c) => this.st.c[c.id]), sig = s.id + "|" + done + "|" + s.checks.map((c) => this.st.c[c.id] ? 1 : 0).join("") + "|" + AU.keyLabel(AU.Input.bindings.jump) + AU.keyLabel(AU.Input.bindings.attack);
      if (this.card && this.cur === sig) return;
      if (this.card) this.card.remove();
      const n = STEPS.indexOf(s) + 1, card = h("div", { class: "tutcard" + (done ? " done" : "") },
        h("div", { class: "thead" }, h("span", { class: "tstep", text: "튜토리얼 " + n + " / " + STEPS.length }), h("button", { type: "button", class: "tskip", text: "건너뛰기" })),
        h("div", { class: "ttitle", text: done ? "✔ " + s.title + " 완료!" : s.title }),
        done ? null : s.lines().map((l) => h("p", { text: l })),
        h("ul", { class: "tchecks" }, s.checks.map((c) => h("li", { class: this.st.c[c.id] ? "ok" : "" }, h("i", { text: this.st.c[c.id] ? "✔" : "○" }), h("span", { text: c.label() })))));
      card.querySelector(".tskip").onclick = () => this.skip();
      root.append(card); this.card = card; this.cur = sig;
    }
  };
  AU.Ev.on("exp", () => { if (AU.Tutorial) AU.Tutorial.ses.kill = true; });
})();
