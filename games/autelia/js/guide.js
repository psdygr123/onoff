/* 단계별 기능 가이드: 처음 그 기능이 필요해지거나(첫 아이템·첫 레벨업·첫 스킬 등) 처음 창을 열 때 한 번씩 알려 줍니다.
   - 트리거 카드: 화면 오른쪽 위에 "○ 키를 눌러 보세요"를 띄우고, 사용자가 그 창을 열면 사라집니다.
   - 창 안내: 창을 처음 열면 창 맨 위에 설명 상자가 나오고 '이해했어요'를 누르면 다시 나오지 않습니다.
   - 전체 매뉴얼은 H 키(기능 안내)에서 언제든 볼 수 있습니다. 개발 확인용 주소(dev=1)에서는 자동으로 나오지 않습니다. */
window.AU = window.AU || {};
(function () {
  "use strict";
  const AU = window.AU, h = (t, a, ...c) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a || {})) { if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else e.setAttribute(k, v); } for (const x of c.flat()) if (x != null) e.append(x.nodeType ? x : document.createTextNode(x)); return e; };
  const K = (a) => AU.keyLabel(AU.Input.bindings[a]);
  const off = () => /[?&]dev=1/.test(location.search) || (AU.Prologue && AU.Prologue.on);
  const flags = () => AU.G.S.flags;

  /* 트리거 카드: 어떤 창을 열라고 안내하는지(win)와 문구 */
  const TRIG = {
    item: { win: "inventory", title: "첫 물건을 얻었습니다", lines: () => ["얻은 물건은 가방에 들어갑니다.", "[" + K("inventory") + "] 키를 눌러 인벤토리를 열어 보세요."] },
    equip: { win: "equipment", title: "장비를 얻었습니다", lines: () => ["인벤토리에서 장비를 골라 '장착'할 수 있습니다.", "[" + K("equipment") + "] 키로 장비창을 열어 장착한 장비를 확인하세요."] },
    levelup: { win: "stats", title: "레벨이 올랐습니다", lines: () => ["능력치가 어떻게 달라졌는지 볼 수 있습니다.", "[" + K("stats") + "] 키를 눌러 스탯창을 열어 보세요."] },
    skill: { win: "skills", title: "스킬을 배웠습니다", lines: () => ["스킬은 단축 슬롯에 놓아야 쓸 수 있습니다.", "[" + K("skills") + "] 키를 눌러 스킬창을 열어 보세요."] },
    quest: { win: "quests", title: "퀘스트를 받았습니다", lines: () => ["진행 상황은 왼쪽 '목표'에 나옵니다.", "자세한 내용은 [" + K("quests") + "] 키 퀘스트창에서 볼 수 있습니다."] },
    map: { win: "worldmap", title: "다른 지역이 있습니다", lines: () => ["지역 이동과 설명은 월드맵에서 볼 수 있습니다.", "[" + K("worldmap") + "] 키를 눌러 보세요."] }
  };

  /* 창 안내: 창을 처음 열 때 창 위쪽에 나오는 설명 */
  const WIN = {
    inventory: () => ["가진 물건 목록입니다. 물건을 누르면 오른쪽에 설명이 나옵니다.", "회복약은 '사용', 장비는 '장착'을 누르면 바로 씁니다.", "재료는 마을 상인에게 팔 수 있습니다. 물건은 몬스터가 떨어뜨리면 바닥에서 [" + K("interact") + "] 키로 직접 줍습니다."],
    equipment: () => ["무기·방어구·장신구를 끼는 곳입니다.", "새 장비를 고르면 지금 장비와 능력치가 어떻게 달라지는지 비교해서 보여 줍니다.", "장착하면 공격력(ATK)이나 체력(HP) 같은 전투 능력치가 바로 달라집니다."],
    stats: () => {
      const P = AU.CONFIG.stats.perPoint, f = (k) => P[k] ? Object.entries(P[k]).map(([a, v]) => ({ atk: "공격력", hp: "최대 체력", dodge: "회피", crit: "치명타", eff: "스킬 효율" }[a] || a) + " +" + v).join(", ") : "";
      return ["STR(힘): 공격력이 오릅니다 (1점당 " + f("STR") + ").", "VIT(체력): 최대 체력이 오릅니다 (1점당 " + f("VIT") + ").", "AGI(민첩): 공격을 피할 확률이 오릅니다 (1점당 " + f("AGI") + ").", "DEX(기교): 치명타 확률이 오릅니다 (1점당 " + f("DEX") + ").", "WIL(의지): 스킬을 쓸 때 쌓이는 피로도가 줄어듭니다 (1점당 " + f("WIL") + ").", AU.CONFIG.levels.autoGrowthUntil + "레벨까지는 능력치가 자동으로 오르고, 그 뒤로는 레벨업마다 포인트 " + AU.CONFIG.levels.freePointsPerLevel + "점을 직접 나눕니다. 마음 스탯(PERMA)은 현실 활동 미션으로만 오릅니다."];
    },
    skills: () => ["위쪽 '단축 슬롯' 1·2·3이 전투 중 누르는 키입니다. 아래 '배운 스킬'에서 슬롯 버튼을 눌러 배치하세요.", "스킬을 쓸 때마다 피로도가 쌓이고, 가득 차면 스킬을 못 씁니다(기본 공격은 가능).", "피로도는 '휴식하기'(은화)나 모험일지의 쉼 현실 미션으로 줄입니다. 스킬은 레벨이 오르면 늘어납니다."],
    quests: () => ["진행 중·완료한 퀘스트와 목표를 보는 곳입니다.", "의뢰인(! 표시 NPC)에게 받고, 목표를 마치면 ? 표시가 뜬 의뢰인에게 돌아가 보고합니다.", "다음에 어디로 가야 하는지는 왼쪽 '목표'창에도 방향으로 나옵니다."],
    worldmap: () => ["갈 수 있는 지역과 이어진 길을 보여 줍니다.", "지역을 누르면 설명이 나오고, 실제 이동은 마을 끝의 출구(화살표)에서 위 방향키로 합니다."],
    journal: () => ["마음에 남은 장면 정리와 감정 메모, 현실 활동 미션, 마음 기록(설문·변화 추이)을 보는 곳입니다.", "미션은 선택 사항이며, 하면 마음 스탯(PERMA)과 훈련 포인트가 오릅니다.", "피로도를 줄이는 쉼 미션은 스킬을 배우는 Lv.10부터 열립니다."],
    shop: () => ["위쪽 목록에서 살 물건을, 가방에서 팔 물건을 고릅니다.", "은화가 모자라면 살 수 없습니다. 재료는 상인에게 팔아 은화로 바꿀 수 있습니다."]
  };

  const G = AU.Guide = {
    card: null, waiting: null, queue: [],
    seen(id) { return !!flags()["gd_" + id]; },
    mark(id) { flags()["gd_" + id] = true; },
    /* 트리거 카드 표시(한 번만) */
    trigger(id) {
      if (off() || this.seen(id) || !TRIG[id]) return;
      this.mark(id); this.queue.push(id); this.next();
    },
    next() {
      if (this.card || !this.queue.length) return;
      const id = this.queue.shift(), T = TRIG[id], root = document.getElementById("ui"); if (!root) return;
      // 이미 그 창을 한 번이라도 열어 봤다면 카드가 필요 없음
      if (flags()["gdw_" + T.win]) return this.next();
      const card = h("div", { class: "guidecard" }, h("div", { class: "gtitle", text: T.title }), T.lines().map((l) => h("p", { text: l })), h("button", { type: "button", class: "gclose", text: "나중에" }));
      card.querySelector(".gclose").onclick = () => this.dismiss();
      root.append(card); this.card = card; this.waiting = T.win;
    },
    dismiss() { if (this.card) { this.card.remove(); this.card = null; this.waiting = null; } this.next(); },
    /* UI.open에서 호출: 기다리던 창이 열리면 카드를 닫음 */
    opened(name) { if (this.waiting === name) this.dismiss(); if (this.card) this.card.style.display = "none"; },
    closed() { if (this.card) this.card.style.display = ""; },
    /* 창 안내 상자(처음 열 때만, 창 맨 위에 붙음). renderWin마다 호출되어도 '이해했어요'를 누르기 전까지 유지 */
    winBox(name) {
      if (off() || !WIN[name] || flags()["gdw_" + name]) return null;
      const lines = WIN[name](), box = h("div", { class: "guidebox" }, h("b", { text: "처음 열었네요 — 이 창은 이렇게 씁니다" }), h("ul", null, lines.map((l) => h("li", { text: l }))));
      const b = h("button", { type: "button", class: "btn primary", text: "이해했어요" }); b.onclick = () => { flags()["gdw_" + name] = true; AU.G.save("guide"); if (AU.UI.cur) AU.UI.renderWin(); };
      box.append(b); return box;
    }
  };
  AU.Ev.on("levelup", () => G.trigger("levelup"));
  AU.Ev.on("jobchange", () => G.trigger("skill"));
})();
