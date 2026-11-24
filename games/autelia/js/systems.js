/* 게임 규칙(화면과 무관): 경험치·레벨업, 인벤토리·장비, 스탯 분배, 퀘스트, 전직, 피로도(스킬로 쌓이는 수치), 일상 미션, 마음 기록, 저장.
   화면 쪽은 AU.Ev 이벤트를 받아 갱신합니다. */
window.AU = window.AU || {};
(function () {
  const C = AU.CONFIG;

  AU.Ev = {
    h: {}, on(n, f) { (this.h[n] = this.h[n] || []).push(f); },
    emit(n, d) { (this.h[n] || []).forEach((f) => f(d)); }
  };

  const G = AU.G = {
    S: null,

    init(state) { this.S = state; this.syncUnlockedState(); this.refreshWeekly(false); },
    d() { return AU.derive(this.S); },
    toast(text, kind) { AU.Ev.emit("toast", { text, kind: kind || "info" }); },
    log(text) { const j = this.S.journal; j.push({ t: AU.dateStr(), text, a: (AU.Prologue && AU.Prologue.on) ? "pro" : "a1" }); if (j.length > 300) j.shift(); },
    changed() { AU.Ev.emit("changed"); },

    /* ---------- 경험치·레벨 ---------- */
    gainExp(n, label) {
      const S = this.S; n = Math.round(n); if (n <= 0) return;
      if (AU.Prologue && AU.Prologue.on) return; // 프롤로그에서는 경험치·레벨업이 없음
      const cap = AU.levelCap(S);
      if (S.level >= cap) {
        // 전직 전에는 10레벨에서 멈춤: 경험치는 쌓지 않고 안내만 한다
        if (!S.jobChanged) this.toast("1막의 최대 레벨(" + AU.levelCap(S) + ")입니다. 다음 이야기에서 이어집니다.", "warn");
        return;
      }
      S.exp += n; AU.Ev.emit("exp", { n, label });
      let leveled = false;
      while (S.level < cap && S.exp >= AU.expToNext(S.level)) {
        S.exp -= AU.expToNext(S.level); this.levelUp(); leveled = true;
      }
      if (S.level >= cap) S.exp = Math.min(S.exp, AU.expToNext(S.level) - 1);
      if (leveled) this.save("levelup");
      this.changed();
    },
    levelUp() {
      const S = this.S; S.level++;
      const G2 = C.stats;
      if (S.level <= C.levels.autoGrowthUntil) {
        for (const [k, v] of Object.entries(G2.autoGrowth)) S.stats[k] += v;
        const rot = G2.autoGrowthRotating[(S.level - 2) % G2.autoGrowthRotating.length]; S.stats[rot] += 1;
      } else {
        S.freePoints += C.levels.freePointsPerLevel;
      }
      S.hp = this.d().maxHp;
      this.log("Lv." + S.level + " 달성");
      AU.Ev.emit("levelup", { level: S.level });
      this.toast("레벨 업! Lv." + S.level, "good");
      if (S.level > C.levels.autoGrowthUntil) this.toast("스탯 포인트 +" + C.levels.freePointsPerLevel + " (S 키)", "info");
      for (const u of AU.UNLOCKS) if (u.level === S.level) this.toast(u.text, "info");
      this.syncSkills(true);
    },

    /* ---------- 재화·아이템 ---------- */
    gainSilver(n) { this.S.silver += n; },
    tipOnce(id, text) { const F = this.S.flags; if (F["tip_" + id] || (AU.Prologue && AU.Prologue.on)) return; F["tip_" + id] = true; this.toast(text, "info"); },
    count(id) { return this.S.inv[id] || 0; },
    giveItem(id, n = 1, quiet) {
      this.S.inv[id] = (this.S.inv[id] || 0) + n;
      if (!quiet) this.toast("획득: " + AU.ITEMS[id].name + (n > 1 ? " ×" + n : ""), "item");
      if (AU.Guide) { AU.Guide.trigger("item"); if (AU.ITEMS[id].type === "equip" && !(AU.EquipTour)) AU.Guide.trigger("equip"); }
      if (!quiet && AU.ITEMS[id].type === "equip" && AU.ITEMS[id].slot === "weapon" && !this.S.equip.weapon && AU.EquipTour) AU.EquipTour.offerSoon();
      this.refreshCollectQuests(); this.changed();
    },
    // 상인과 이야기해 상점을 연 동안에만 사고팔기·제작 가능(shop: "general" 잡화 / "weapon" 무기점 / "smith" 대장간)
    shop: null,
    openShop(kind) { this.shop = kind; },
    buyItem(id, n = 1) {
      const it = AU.ITEMS[id]; const list = this.shop && AU.SHOP[this.shop]; if (!list || !it || !(it.buy > 0) || !list.buy.includes(id)) return false;
      if (it.type === "equip" && this.count(id) > 0) { this.toast("이미 가지고 있는 장비입니다.", "warn"); return false; }
      const cost = it.buy * n; if (this.S.silver < cost) { this.toast("은화가 부족합니다.", "warn"); return false; }
      this.S.silver -= cost; this.giveItem(id, n, true); this.toast(it.name.replace(" (임시)", "") + (n > 1 ? " ×" + n : "") + " 구매: 은화 -" + cost, "good"); this.save("buy"); this.changed(); return true;
    },
    sellItem(id, n = 1) {
      const it = AU.ITEMS[id]; if (!it || it.type !== "etc" || !(it.sell > 0)) return false;
      if (this.shop !== "general") { this.toast("잡화상인에게 가서 팔 수 있습니다.", "warn"); return false; }
      n = Math.min(n, this.count(id)); if (n < 1) return false;
      this.takeItem(id, n); const gain = it.sell * n; this.gainSilver(gain);
      this.toast(it.name.replace(" (임시)", "") + (n > 1 ? " ×" + n : "") + " 판매: 은화 +" + gain, "good"); this.save("sell"); this.changed(); return true;
    },
    knowsRecipe(rid) { return (this.S.recipes || []).includes(rid); },   // 제작서 아이템을 사용해 배운 제작법만 사용 가능
    canCraft(rid) { const r = AU.RECIPES.find((x) => x.id === rid); return !!r && this.knowsRecipe(rid) && r.mats.every(([m, n]) => this.count(m) >= n) && this.S.silver >= r.silver; },
    craft(rid) {
      const r = AU.RECIPES.find((x) => x.id === rid); if (!r) return false;
      if (!this.knowsRecipe(rid)) { this.toast("아직 배우지 못한 제작법입니다.", "warn"); return false; }
      if (this.shop !== "smith") { this.toast("대장간의 대장장이에게 가서 만들 수 있습니다. (2막부터 마을마다 대장간이 있습니다)", "warn"); return false; }
      if (!this.canCraft(rid)) { this.toast("재료나 은화가 부족합니다.", "warn"); return false; }
      for (const [m, n] of r.mats) this.takeItem(m, n);
      this.S.silver -= r.silver; this.giveItem(r.out, 1, true);
      this.toast("제작 완료: " + AU.ITEMS[r.out].name.replace(" (임시)", ""), "good"); this.log("제작: " + AU.ITEMS[r.out].name); this.save("craft"); this.changed(); return true;
    },
    takeItem(id, n = 1) {
      if (this.count(id) < n) return false;
      this.S.inv[id] -= n; if (this.S.inv[id] <= 0) delete this.S.inv[id];
      this.refreshCollectQuests(); this.changed(); return true;
    },
    useItem(id) {
      const it = AU.ITEMS[id]; if (!it || it.type !== "use" || this.count(id) < 1) return false;
      const S = this.S, max = this.d().maxHp;
      if (it.recipe) { // 제작서: 읽으면 제작법을 배우고, 그때부터 필요한 재료와 수량이 제작법 탭에 보임
        const r = AU.RECIPES.find((x) => x.id === it.recipe); if (!r) return false;
        if (this.knowsRecipe(r.id)) { this.toast("이미 배운 제작법입니다.", "warn"); return false; }
        this.takeItem(id, 1); (S.recipes = S.recipes || []).push(r.id);
        this.toast("제작법을 배웠습니다: " + AU.ITEMS[r.out].name.replace(" (임시)", "") + " — 재료: " + r.mats.map(([m, n]) => AU.ITEMS[m].name.replace(" (임시)", "") + " ×" + n).join(", ") + ", 은화 " + r.silver, "good");
        this.log("제작법 습득: " + AU.ITEMS[r.out].name); this.save("recipe"); this.changed(); return true;
      }
      if (it.recall) { // 마을 귀환 주문서: 가까운 마을로 이동
        const W = AU.World, m = W && W.map; if (!m) return false;
        if (m.safe || m.interior) { this.toast("마을 안에서는 쓸 수 없습니다.", "warn"); return false; }
        const dest = m.town || "porto"; this.takeItem(id, 1); this.toast(it.name + " 사용 — " + AU.MAPS[dest].name + "(으)로 귀환합니다.", "item");
        W.enterMap(dest, AU.MAPS[dest].start || 160); this.changed(); return true;
      }
      if (it.relieve) { // 피로회복제: 피로도를 고정값만큼 줄임(스킬을 배우기 전에는 피로도가 쌓이지 않아 쓸 일이 없음)
        if (S.fatigue <= 0) { this.toast("지금은 피로도가 쌓이지 않았습니다.", "warn"); return false; }
        const before = S.fatigue; this.takeItem(id, 1); this.relieve("item", it.relieve, it.name);
        this.toast(it.name + " 사용 — 피로도 −" + Math.round((before - S.fatigue) * 10) / 10 + " (현재 " + S.fatigue + " / " + S.fatigueMax + ")", "item"); this.save("tonic"); return true;
      }
      if (S.hp >= max) { this.toast("HP가 이미 가득 찼습니다.", "warn"); return false; }
      this.takeItem(id, 1); S.hp = Math.min(max, S.hp + it.heal);
      AU.Ev.emit("floater", { text: "+" + it.heal, color: "#6BCB77", onPlayer: true });
      this.toast(it.name + " 사용", "item"); this.changed(); return true;
    },
    quickUse(kind) { // 단축키로 물약·귀환 주문서 사용
      if (kind === "scroll") { if (this.count("town_scroll") < 1) { this.toast("마을 귀환 주문서가 없습니다.", "warn"); return false; } return this.useItem("town_scroll"); }
      const ids = Object.keys(this.S.inv).filter((i) => AU.ITEMS[i] && AU.ITEMS[i].type === "use" && AU.ITEMS[i].heal && this.count(i) > 0).sort((a, b) => AU.ITEMS[a].heal - AU.ITEMS[b].heal);
      if (!ids.length) { this.toast("사용할 수 있는 물약이 없습니다.", "warn"); return false; }
      return this.useItem(ids[0]);
    },
    equip(id) {
      const it = AU.ITEMS[id], S = this.S; if (!it || it.type !== "equip" || this.count(id) < 1) return false;
      const prev = S.equip[it.slot]; if (prev === id) return false;
      this.takeItem(id, 1); if (prev) this.giveItem(prev, 1, true);
      S.equip[it.slot] = id; S.hp = Math.min(S.hp, this.d().maxHp);
      this.toast(it.name + " 장착", "item"); this.save("equip"); this.changed(); return true;
    },
    unequip(slot) {
      const S = this.S, id = S.equip[slot]; if (!id) return false;
      S.equip[slot] = null; this.giveItem(id, 1, true); S.hp = Math.min(S.hp, this.d().maxHp);
      this.save("equip"); this.changed(); return true;
    },

    /* ---------- 스탯 분배: 미리보기 → 최종 적용 ---------- */
    // 기본 레벨 포인트는 일상 미션 수행 여부와 무관하게 사용 가능. 훈련 포인트는 선택형 일상 활동 추가 보상.
    gateBand() { return Math.max(10, Math.floor(this.S.level / 5) * 5); },
    gateOpen() { return true; },
    openGate() { /* 구 저장과의 호환용. 더 이상 일상 미션이 스탯 분배를 잠그지 않음. */ },
    usableFree() { return this.gateOpen() ? this.S.freePoints : 0; },
    pool() { return this.usableFree() + this.S.trainingPoints; },
    // pending: { STR: 2, ... }. 레벨 포인트를 먼저 쓰고 부족하면 훈련 포인트를 씀
    applyAllocation(pending) {
      const S = this.S, need = Object.values(pending).reduce((a, b) => a + b, 0);
      if (need <= 0 || need > this.pool()) return false;
      const oldMax = this.d().maxHp;
      let left = need; const useFree = Math.min(this.usableFree(), left); S.freePoints -= useFree; left -= useFree;
      S.trainingPoints -= left;
      for (const [k, v] of Object.entries(pending)) S.alloc[k] += v;
      S.hp = Math.min(this.d().maxHp, S.hp + Math.max(0, this.d().maxHp - oldMax)); // 최대 HP가 늘어난 만큼 함께 회복
      this.log("스탯 포인트 " + need + "점을 분배했습니다.");
      this.toast("스탯을 적용했습니다.", "good"); this.save("stats"); this.changed(); return true;
    },

    /* ---------- 퀘스트 ---------- */
    qs(id) { return this.S.quests[id] || null; },
    questStatus(id) {
      const q = AU.QUESTS[id], rec = this.qs(id);
      if (rec) return rec.state;
      if (q.pre.some((p) => this.questStatus(p) !== "done")) return "locked";
      if (this.S.level < q.minLevel) return "locked";
      return "available";
    },
    objectiveDone(q, rec, i) {
      const o = q.objectives[i];
      if (o.kind === "collect") return this.count(o.item) >= o.count;
      if (o.targets) return o.targets.every((t) => rec.spots && rec.spots[t]);   // 조사·수리: 지점을 모두 마쳐야 함
      return (rec.prog[i] || 0) >= (o.count || 1);
    },
    startQuest(id) {
      if (this.questStatus(id) !== "available") return false;
      const q = AU.QUESTS[id];
      if (q.fee) { if (this.S.silver < q.fee) { this.toast("은화가 부족합니다. (필요 " + q.fee + ")", "warn"); return false; } this.S.silver -= q.fee; this.toast("은화 -" + q.fee, "info"); }   // 수락할 때 내는 값(정보료 등)
      this.S.quests[id] = { state: "active", prog: q.objectives.map(() => 0), spots: {} };
      if (AU.Guide) AU.Guide.trigger("quest");
      for (const [it, n] of q.takeItems || []) { this.S.inv[it] = Math.max(0, (this.S.inv[it] || 0) - n); if (!this.S.inv[it]) delete this.S.inv[it]; }
      for (const [it, n] of q.startItems || []) this.giveItem(it, n);   // 전달 퀘스트: 수락할 때 맡는 물건
      const qk = AU.questKind(id), ql = AU.QKIND[qk]; this.log(ql.label + " 퀘스트 수락: " + q.title); this.toast(ql.icon + " " + ql.label + " 퀘스트 수락: " + q.title, "quest qk-" + qk);
      if (AU.Ev) AU.Ev.emit("questStart", { id });
      this.refreshQuest(id);
      if (AU.RealBridge) AU.RealBridge.questEvent(id, "start");
      this.save("quest"); this.changed(); return true;
    },
    refreshQuest(id) {
      const rec = this.qs(id), q = AU.QUESTS[id]; if (!rec || rec.state === "done") return;
      const all = q.objectives.every((o, i) => this.objectiveDone(q, rec, i));
      const next = all ? "ready" : "active";
      if (next === "ready" && rec.state !== "ready" && !q.autoDone) this.toast("목표 달성: " + q.title + " (의뢰인에게 돌아가세요)", "quest");
      // 조사·수리 지점을 모두 마쳤지만 보고가 남은 경우: 한 번 크게 알림
      if (next === "active" && !rec.noted) {
        const wk = q.objectives.findIndex((o) => (o.kind === "investigate" || o.kind === "repair") && this.objectiveDone(q, rec, q.objectives.indexOf(o)));
        const rest = q.objectives.find((o, i) => !this.objectiveDone(q, rec, i));
        if (wk >= 0 && rest && rest.target && AU.NPCS[rest.target]) { rec.noted = true; this.toast("✔ " + (q.objectives[wk].kind === "repair" ? "수리" : "조사") + " 완료! " + AU.NPCS[rest.target].name.replace(" (임시)", "") + "에게 가서 결과를 알리세요.", "quest"); }
      }
      rec.state = next;
      if (next === "ready" && q.autoDone) this.turnIn(id);   // 현장 완료형: 의뢰인에게 돌아가지 않고 그 자리에서 완료
    },
    refreshCollectQuests() { for (const id of Object.keys(this.S.quests)) this.refreshQuest(id); },
    onKill(type) {
      for (const [id, rec] of Object.entries(this.S.quests)) {
        if (rec.state !== "active") continue;
        const q = AU.QUESTS[id];
        q.objectives.forEach((o, i) => { if (o.kind === "kill" && o.target === type && rec.prog[i] < o.count) rec.prog[i]++; });
        this.refreshQuest(id);
      }
      this.changed();
    },
    onTalk(npcId) {
      for (const [id, rec] of Object.entries(this.S.quests)) {
        if (rec.state !== "active") continue;
        const q = AU.QUESTS[id];
        q.objectives.forEach((o, i) => { if (o.kind === "talk" && o.target === npcId) rec.prog[i] = 1; });
        this.refreshQuest(id);
      }
      this.changed();
    },
    /* ---------- 퀘스트 종류 확장: 조사·수리 지점 / 전달 / 선택 ---------- */
    // 지점(spot)에 진행 중인 목표가 있으면 그 목표 정보를 돌려줌(없으면 null). 지점 표시·상호작용 가능 여부 판단에 씀
    spotObjective(spotId) {
      for (const [id, rec] of Object.entries(this.S.quests)) {
        if (rec.state !== "active") continue;
        const q = AU.QUESTS[id];
        for (let i = 0; i < q.objectives.length; i++) { const o = q.objectives[i]; if (o.targets && o.targets.includes(spotId) && !(rec.spots && rec.spots[spotId])) return { qid: id, i, o }; }
      }
      return null;
    },
    spotDone(spotId) { return Object.values(this.S.quests).some((r) => r.spots && r.spots[spotId]); },
    // 지점 완료 처리: 반환값 true = 진행됨
    completeSpot(spotId) {
      const f = this.spotObjective(spotId); if (!f) return false;
      const rec = this.S.quests[f.qid]; rec.spots[spotId] = true;
      rec.prog[f.i] = f.o.targets.filter((t) => rec.spots[t]).length;
      this.refreshQuest(f.qid); this.save("quest"); this.changed(); return true;
    },
    // 전달: 이 NPC에게 전할 물건이 있으면 물건을 내고 목표를 완료. 대사를 돌려줌
    tryDeliver(npcId) {
      for (const [id, rec] of Object.entries(this.S.quests)) {
        if (rec.state !== "active") continue;
        const q = AU.QUESTS[id];
        for (let i = 0; i < q.objectives.length; i++) {
          const o = q.objectives[i];
          if (o.kind === "deliver" && o.target === npcId && !this.objectiveDone(q, rec, i) && this.count(o.item) >= (o.count || 1)) {
            this.takeItem(o.item, o.count || 1); rec.prog[i] = 1; this.refreshQuest(id);
            this.log("전달 완료: " + AU.ITEMS[o.item].name); this.save("quest"); this.changed();
            return (q.deliver && q.deliver[npcId]) || ["전해 주셔서 고맙습니다."];
          }
        }
      }
      return null;
    },
    // 선택: 다른 목표를 모두 마친 뒤 이 NPC에게 말을 걸면 갈림길이 나옴
    pendingChoice(npcId) {
      for (const [id, rec] of Object.entries(this.S.quests)) {
        if (rec.state !== "active") continue;
        const q = AU.QUESTS[id];
        for (let i = 0; i < q.objectives.length; i++) {
          const o = q.objectives[i];
          if (o.kind === "choice" && o.target === npcId && !this.objectiveDone(q, rec, i) && q.objectives.every((x, j) => j === i || this.objectiveDone(q, rec, j))) return { qid: id, i, o, q };
        }
      }
      return null;
    },
    applyChoice(qid, i, opt) {
      const rec = this.qs(qid), q = AU.QUESTS[qid], o = q.objectives[i]; if (!rec || rec.state !== "active") return false;
      this.S.flags["choice_" + o.id] = opt.flag; rec.prog[i] = 1; this.refreshQuest(qid);
      this.log("선택 [" + q.title + "]: " + opt.label); this.save("quest"); this.changed(); return true;
    },
    turnIn(id) {
      const rec = this.qs(id), q = AU.QUESTS[id];
      if (!rec || rec.state !== "ready") return false;
      rec.state = "done"; rec.doneAt = AU.dateStr();
      for (const o of q.objectives) if (o.kind === "collect") this.takeItem(o.item, o.count); // 모은 퀘스트 물건은 제출
      const r = q.reward;
      if (r.silver) this.gainSilver(r.silver);
      for (const [it, n] of r.items || []) this.giveItem(it, n);
      const qk = AU.questKind(id), ql = AU.QKIND[qk]; this.log(ql.label + " 퀘스트 완료: " + q.title); this.toast(ql.icon + " " + ql.label + " 퀘스트 완료: " + q.title, "good qk-" + qk);
      if (q.setFlags) Object.assign(this.S.flags, q.setFlags);
      for (const t of q.after || []) this.toast(t, "info");
      if (q.jobChange) this.jobChange(q.jobChange);
      if (r.exp) this.gainExp(r.exp, q.title);
      if (r.levelTo) { let g = 0; while (this.S.level < r.levelTo && g++ < 20) this.gainExp(Math.max(1, AU.expToNext(this.S.level) - this.S.exp), q.title); }
      if (q.awaken) this.awaken();
      if (AU.RealBridge) AU.RealBridge.questEvent(id, "done");
      if (q.next) this.startQuest(q.next);   // 연속 퀘스트: 다음 단계를 바로 수락
      this.save("quest"); this.changed(); return true;
    },

    /* 레벨에 맞게 스킬을 열고 빈 슬롯에 순서대로 배치(각성·전직 이후에만). announce=true면 새 스킬을 알림 */
    syncSkills(announce) {
      const S = this.S; if (!this.awakened()) return;
      const want = AU.skillsForLevel(S.level), fresh = want.filter((id) => !S.skills.unlocked.includes(id));
      S.skills.unlocked = want.slice();
      S.skills.slots = [0, 1, 2].map((i) => (want.includes(S.skills.slots[i]) ? S.skills.slots[i] : null));
      for (const id of want) if (!S.skills.slots.includes(id)) { const i = S.skills.slots.indexOf(null); if (i >= 0) S.skills.slots[i] = id; }
      if (announce) for (const id of fresh) if (id !== "strike" || S.level > AU.SKILL_UNLOCK_LV.strike) this.toast("새 스킬 '" + AU.SKILLS[id].name + "'을(를) 배웠습니다! (" + (S.skills.slots.indexOf(id) + 1) + "번 키, K 키)", "good");
    },

    /* ---------- 힘의 각성(Lv10, 제페토): 전직 없이 스킬이 열리고, 피로도·쉼 미션이 시작됨 ---------- */
    awakened() { return !!(this.S.jobChanged || this.S.flags.awakened); },
    awaken() {
      const S = this.S; if (S.flags.awakened || S.jobChanged) return false;
      S.flags.awakened = true; S.freePoints += C.levels.freePointsOnJobChange;
      this.syncSkills(false); S.hp = this.d().maxHp;
      this.unlockRealMissions(false); this.log("용사의 힘이 깨어났습니다.");
      this.toast("힘이 깨어났습니다! 첫 스킬 '" + AU.SKILLS.strike.name + "'이 열렸습니다 (1번 키, K 키)", "good");
      this.toast("2번 스킬은 Lv." + AU.SKILL_UNLOCK_LV.spin + ", 3번 스킬은 Lv." + AU.SKILL_UNLOCK_LV.focus + "에 열립니다", "info");
      this.toast("스탯 포인트 +" + C.levels.freePointsOnJobChange + ". 스킬을 쓰면 피로도가 쌓이며, 모험일지의 '쉼'에서 줄일 수 있습니다", "info");
      AU.Ev.emit("awaken", {}); return true;
    },

    /* ---------- 전직 ---------- */
    jobChange(job) {
      const S = this.S; if (S.jobChanged) return;
      S.job = job; S.jobChanged = true;
      S.freePoints += C.levels.freePointsOnJobChange;
      this.syncSkills(false);
      this.unlockRealMissions(false);
      S.hp = this.d().maxHp;
      this.log("전직: " + AU.JOBS[job].name);
      this.toast("전직했습니다: " + AU.JOBS[job].name, "good");
      this.toast("전사 스킬이 활성화되었습니다. 레벨에 따라 하나씩 열립니다 (K 키)", "info");
      this.toast("스탯 포인트 +" + C.levels.freePointsOnJobChange + ". 모험일지(J)의 '쉼' 미션으로 피로도를 줄일 수 있습니다", "info");
      AU.Ev.emit("jobchange", { job });
    },
    /* 일상 미션: 프롤로그가 끝나 본편(Lv1)이 시작되는 순간부터 열린다. 게임 안의 능력치와는 별개이며 선택 사항.
       쉼 미션·피로도는 스킬을 배우는 시점(Lv10)에 따로 안내한다(skills.unlocked가 비어 있는 동안은 쉼 미션을 쓸 수 없음). */
    unlockRealMissions(announce) {
      const S = this.S; if (S.flags.missionsUnlocked) return false;
      S.flags.missionsUnlocked = true; this.initMissions();
      if (announce) this.toast("모험일지(J)에 일상 활동이 열렸습니다. 알렉시오스에게 말을 걸어 보세요.", "info");
      return true;
    },
    syncUnlockedState() {
      const S = this.S, pro = S.prologue;
      // 프롤로그를 이미 끝낸 저장(또는 이전 규칙으로 전직한 저장)은 일상 미션을 연다
      if (!S.flags.missionsUnlocked && ((pro && pro.state === "COMPLETED") || S.jobChanged || S.flags.awakened)) { S.flags.missionsUnlocked = true; }
      if (S.flags.missionsUnlocked) this.initMissions();
    },

    /* ---------- 피로도: 스킬을 쓸수록 쌓이는 수치. 가득 차면 스킬 잠김(기본 공격은 항상 가능) ---------- */
    skillCost(id) { return Math.max(0, Math.round(AU.SKILLS[id].cost * this.d().costMult * 10) / 10); }, // 스킬 1회로 쌓이는 피로도. 의지 효율(0.2%/점)이 소수 첫째 자리까지 보이도록
    canSpend(id) { return this.S.fatigue < this.S.fatigueMax - 1e-6; }, // 가득 차기 전까지 사용 가능. 마지막 한 번은 남은 만큼만 쌓여 가득 참(id는 나중에 스킬별 제한을 둘 때를 위해 받음)
    spend(id) { // 스킬 사용: 피로도가 쌓임(+)
      const c = this.skillCost(id); if (!this.canSpend(id)) return false;
      this.setFatigue(this.S.fatigue + c, "skill"); return true;
    },
    setFatigue(n, source) {
      const S = this.S, old = S.fatigue; S.fatigue = Math.max(0, Math.min(S.fatigueMax, Math.round(n * 10) / 10));
      if (S.fatigue !== old) AU.Ev.emit("fatigue", { delta: Math.round((S.fatigue - old) * 10) / 10, from: old, to: S.fatigue, source: source || "dev" });
      this.changed();
    },
    setFatigueMax(n) { this.S.fatigueMax = Math.max(1, Math.round(n)); this.S.fatigue = Math.min(this.S.fatigue, this.S.fatigueMax); this.changed(); },
    // 피로도 줄이기. source = 'mission' | 'item' | 'weekly' | 'dev'
    relieve(source, amount, reason) { this.setFatigue(this.S.fatigue - amount, source); AU.Ev.emit("recover", { source, amount, reason }); },
    restMission(id) { return AU.REST_MISSIONS.find((m) => m.id === id); },
    // 선택형 '쉼' 일상 미션: 하루에 같은 미션은 한 번. 자기보고이며 마음 스탯·훈련 포인트와는 무관
    restDaily() { // 11-24: 쉼 미션은 하루 5개씩, 날마다 다른 조합(id 순서를 5개씩 돌려 가며 보여 줌 — 같은 날엔 항상 같은 5개)
      const pool = AU.REST_MISSIONS.slice().sort((a, b) => (a.id < b.id ? -1 : 1)), n = pool.length, cnt = Math.min(5, n);
      const [y, mo, d] = AU.dateStr().split("-").map(Number), day = Math.floor(Date.UTC(y, mo - 1, d) / 86400000), start = (day * cnt) % n;
      return Array.from({ length: cnt }, (_, i) => pool[(start + i) % n]);
    },
    restMissionAvailable(id) { return this.S.flags.missionsUnlocked && this.S.skills.unlocked.length > 0; },   // 11-24: 쉼 활동은 하루에 몇 번이든 할 수 있음(피로도 회복만 하루 1회)
    restRecoverLeft() { return this.S.rest.recoverDay !== AU.dateStr(); },
    restDoneToday(id) { const t = AU.dateStr(); return (this.S.rest.log || []).filter((e) => e.t === t && e.id === id).length; },
    restNoteOk(note) { return !!(note && typeof note === 'object' && ['calm', 'same', 'mixed', 'tense', 'other'].includes(note.feeling)); }, // 감정 선택 필수, 자유 소감은 선택
    doRestMission(id, note) {
      const S = this.S, m = this.restMission(id); if (!m || !this.restMissionAvailable(id)) return false;
      if (!this.restNoteOk(note)) { this.toast("활동 후 느낀 상태를 한 가지 선택해 주세요.", "warn"); return false; }
      const text = String(note.note || "").replace(/\s+/g, " ").trim().slice(0, C.fatigue.restNoteMax);
      const first = this.restRecoverLeft(), rec = first ? m.recover : 0;   // 피로도 회복은 하루 첫 쉼 활동에만
      S.rest.done[id] = AU.dateStr(); S.rest.log.push({ t: AU.dateStr(), id, recover: rec, feeling: note.feeling, note: text, proof: "self_report" }); if (S.rest.log.length > 200) S.rest.log.shift();
      const before = S.fatigue; if (first) { S.rest.recoverDay = AU.dateStr(); this.relieve("mission", m.recover, m.title); }
      this.log("쉼 미션 완료: " + m.title); this.toast(first ? "쉼 미션 완료! 피로도 −" + Math.round((before - S.fatigue) * 10) / 10 + " (현재 " + S.fatigue + " / " + S.fatigueMax + ")" : "쉼 활동을 기록했어요. 피로도 회복은 하루 한 번이에요.", "good");
      this.save("rest"); return true;
    },
    refreshWeekly(force) {
      const S = this.S, wk = AU.weekId();
      if (force || (C.fatigue.weeklyReset && S.fatigueWeek !== wk)) {
        S.fatigueWeek = wk; const old = S.fatigue; S.fatigue = 0;
        if (S.missions.weekId !== wk) { S.missions.weekId = wk; S.missions.weekPoints = 0; }
        if (old > 0 && (force || S.playSec > 1)) this.toast("새 주가 시작되어 피로도가 풀렸습니다.", "info");
        this.changed(); return true;
      }
      return false;
    },

    /* ---------- 일상 미션 ---------- */
    mission(id) { return AU.MISSIONS.find((m) => m.id === id); },
    ms(id) { return this.S.missions.states[id] || { state: "locked", rewarded: false, tries: 0 }; },
    initMissions() {
      const M = this.S.missions;
      if (!M.plans || typeof M.plans !== "object" || Array.isArray(M.plans)) M.plans = {};
      // 즐겨찾기·추천 취향·추천 제외 목록: 구 저장에 없으면 빈 값으로 만들 뿐, 기존 기록은 건드리지 않음
      if (!Array.isArray(M.favorites)) M.favorites = [];
      if (!M.prefs || typeof M.prefs !== "object" || Array.isArray(M.prefs)) M.prefs = { areas: [], maxMin: 0 };
      if (!Array.isArray(M.prefs.areas)) M.prefs.areas = [];
      if (!Number.isFinite(M.prefs.maxMin)) M.prefs.maxMin = 0;
      if (!Array.isArray(M.recoHidden)) M.recoHidden = [];
      for (const m of AU.MISSIONS) if (!M.states[m.id]) M.states[m.id] = { state: "locked", rewarded: false, tries: 0 };
      if (this.S.flags.missionsUnlocked && this.S.flags.guideMet) {
        if (!this.S.flags.missionSlotsV2) { // 구 저장: 예전에 한꺼번에 열린 미수행 활동은 미공개로 되돌림(즐겨찾기·수행 계획에 건 활동은 유지)
          for (const m of AU.MISSIONS) { const r = M.states[m.id]; if (r.state === "available" && !M.favorites.includes(m.id) && !M.plans[m.id]) r.state = "locked"; }
          this.S.flags.missionSlotsV2 = true;
        }
        this.fillSlots();
      }
      for (const m of AU.MISSIONS) { const r = M.states[m.id]; if (r && AU.MISSION_ACTIVE.includes(r.state) && r.state !== "available" && !r.startDate) this.startMissionClock(m, r); }   // 구 저장: 이미 수락한 활동은 오늘부터 기간 계산
    },
    startMissionClock(m, r) { const t = AU.dateStr(); r.startDate = t; r.dueDate = AU.addDays(t, Math.max(1, m.span || 1) - 1); r.mid = null; },
    revealMission(id) { const r = this.S.missions.states[id]; if (r && r.state === "locked") { r.state = "available"; return true; } return false; },
    /* 미션 슬롯: 영역(P·E·R·M·A)마다 진행 가능한 활동을 1개씩만 보여 줌. 완료·건너뛰기로 자리가 비면 같은 영역의 다음 후보가 열림 */
    fillSlots(excludeId) {
      const M = this.S.missions; let opened = 0;
      for (const k of Object.keys(AU.PERMA)) {
        if (AU.MISSIONS.some((m) => m.perma === k && AU.MISSION_ACTIVE.includes((M.states[m.id] || {}).state))) continue;
        const c = this.slotCandidate(k, excludeId); if (c) { const was = M.states[c.id].state; M.states[c.id].state = "available"; if (was === "skipped") M.states[c.id].reoffer = true; opened++; }
      }
      return opened;
    },
    /* 다음 후보: 허용 단계 이하의 미공개 활동(쉬운 순·데이터 순) → 없으면 건너뛴 지 오래된 활동을 다시 제공. 막지는 않고 순서만 정함 */
    slotCandidate(k, excludeId) {
      const M = this.S.missions, st = (id) => (M.states[id] || {}).state, allowed = this.allowedDifficulty(k);
      const locked = AU.MISSIONS.filter((m) => m.perma === k && m.id !== excludeId && st(m.id) === "locked" && (!m.pre || st(m.pre) === "done")).sort((a, b) => a.difficulty - b.difficulty);
      const pick = locked.find((m) => m.difficulty <= allowed) || locked[0];
      if (pick) return pick;
      return AU.MISSIONS.filter((m) => m.perma === k && m.id !== excludeId && st(m.id) === "skipped").sort((a, b) => (M.states[a.id].skipSeq || 0) - (M.states[b.id].skipSeq || 0))[0] || null;
    },
    /* 같은 영역에서 낮은 단계 활동을 3종 이상 완료하고 평균 만족도 3 이상이면 다음 단계까지 허용. 평균 도전도가 4 이상이면 만족도 4 이상일 때만 올리고, 아니면 현재 단계 유지 */
    allowedDifficulty(k) {
      const M = this.S.missions; let allowed = 1;
      for (let d = 1; d <= 2; d++) {
        const rows = M.log.filter((e) => e.perma === k && e.state === "done" && !e.repeat && (this.mission(e.id) || {}).difficulty === d);
        if (new Set(rows.map((e) => e.id)).size < 3) break;
        const rv = rows.map((e) => e.reflection).filter((x) => x && Number.isFinite(x.satisfaction)), avg = (key) => rv.reduce((n, x) => n + x[key], 0) / rv.length;
        if (rv.length && (avg("satisfaction") < 3 || (avg("challenge") >= 4 && avg("satisfaction") < 4))) break;
        allowed = d + 1;
      }
      return allowed;
    },
    discoverMissions() {
      const S = this.S; if (!S.flags.missionsUnlocked) return false;
      S.flags.guideMet = true; this.initMissions();
      this.save("mission"); this.changed(); return true;
    },
    /* ---------- 일상 미션 보상: 난이도(1~3) + 시간(0~2) + 기간(0~2) 합산으로 3등급 ----------
       인증(보조 기록)을 하면 full, 안 하면 part만 지급하고 나중에 인증하면 차액을 소급 지급합니다. */
    missionTier(m) {
      const d = Math.max(1, Math.min(3, m.difficulty || 1)), t = (m.minutes || 0) <= 5 ? 0 : m.minutes <= 15 ? 1 : 2, sp = m.span || 1, g = sp >= 7 ? 2 : sp >= 2 ? 1 : 0;
      const score = d + t + g; return { score, tier: score <= 3 ? 1 : score <= 5 ? 2 : 3 };
    },
    missionReward(m) {
      const { score, tier } = this.missionTier(m), T = AU.MISSION_REWARD[tier];
      return { score, tier, name: T.name, full: { tokens: T.full[0], mind: T.full[1] }, part: { tokens: T.part[0], mind: T.part[1] }, extra: { tokens: T.full[0] - T.part[0], mind: T.full[1] - T.part[1] } };
    },
    // 완료했지만 인증하지 않은 활동에 나중에 인증을 붙이면 남은 보상을 지급
    verifyMission(id, evidence) {
      const S = this.S, m = this.mission(id), r = S.missions.states[id];
      if (!m || !r || r.state !== "done" || !r.reward || r.reward.verified) return false;
      const sup = AU.MissionEvidence ? AU.MissionEvidence.clean(evidence, m) : null; if (!sup) return false;
      const rw = this.missionReward(m), ex = { tokens: rw.full.tokens - r.reward.tokens, mind: rw.full.mind - r.reward.mind };
      const e = S.missions.log.slice().reverse().find((x) => x.id === id && x.state === "done" && !x.repeat); if (!e) return false;
      if (!S.gallery) S.gallery = { tokens: 0, unlocked: [], selected: [], attendance: [] };
      if (ex.tokens > 0) S.gallery.tokens += ex.tokens;
      let gained = 0; if (ex.mind > 0) gained = this.gainMind(m.perma, ex.mind);
      r.reward = { tier: rw.tier, verified: true, tokens: rw.full.tokens, mind: rw.full.mind };
      e.supplementary = sup; e.proof = "evidence"; e.galleryTokens = (e.galleryTokens || 0) + Math.max(0, ex.tokens); e.mindGained = (e.mindGained || 0) + gained; e.verifiedLate = AU.dateStr();
      this.log("일상 미션 인증: " + m.title);
      this.toast("인증 완료! 남은 보상 토큰 +" + Math.max(0, ex.tokens) + (gained ? " · 마음 [" + AU.PERMA[m.perma] + "] +" + gained : ""), "good");
      this.save("mission-verify"); this.changed(); return true;
    },
    /* ---------- 기간형 진행: 며칠째인지·마감·중간 확인·기한이 지난 활동 처리 ---------- */
    missionProgress(id) {
      const m = this.mission(id), r = this.ms(id); if (!m || !r.startDate) return null;
      const today = AU.dateStr(), span = m.span || 1, day = Math.min(span, Math.max(1, AU.daysBetween(r.startDate, today) + 1));
      return { span, day, left: Math.max(0, AU.daysBetween(today, r.dueDate)), start: r.startDate, due: r.dueDate, overdue: today > r.dueDate, finishable: today >= r.dueDate, needMid: span >= 7 && day >= 4 && day <= 6 && !r.mid };
    },
    /* 진행 중인 일상미션: 마감 빠른 순(기한 지난 것이 맨 앞) */
    activeMissionsByDue() { return AU.MISSIONS.filter((m) => { const r = this.ms(m.id); return ["accepted", "attempted", "partial"].includes(r.state) && r.startDate; }).sort((a, b) => this.ms(a.id).dueDate.localeCompare(this.ms(b.id).dueDate)); },
    overdueMissions() { return AU.MISSIONS.filter((m) => { const r = this.ms(m.id); return ["accepted", "attempted", "partial"].includes(r.state) && r.startDate && AU.dateStr() > r.dueDate; }); },
    // 7일형 중간 확인: 수행하면서 어려운 점을 글로 받음(없다고 적어도 됨)
    midCheck(id, text) {
      const r = this.S.missions.states[id], m = this.mission(id); if (!r || !m || !["accepted", "attempted", "partial"].includes(r.state)) return false;
      r.mid = { t: AU.dateStr(), text: String(text || "").trim().slice(0, 300) || "어려운 점 없음" };
      this.save("mission-mid"); this.changed(); return true;
    },
    /* 기간형 일별 기록: 하루에 한 줄(그날 다시 적으면 덮어씀). 마감 전에 깜빡하지 않도록 매일 남길 수 있음 */
    dailyCheck(id, text) {
      const r = this.S.missions.states[id], m = this.mission(id); if (!r || !m || (m.span || 1) < 2 || !["accepted", "attempted", "partial"].includes(r.state)) return false;
      r.daily = r.daily || {}; r.daily[AU.dateStr()] = String(text || "").trim().slice(0, 200) || "오늘 해 봤어요";
      this.save("mission-daily"); this.changed(); return true;
    },
    dailyInfo(id) { const r = this.ms(id), d = r.daily || {}, today = AU.dateStr(); return { n: Object.keys(d).length, today: d[today] || null }; },
    /* 4일차 이후 처음 접속했을 때 중간 점검을 한 번 물어볼 7일형 활동 */
    pendingMidChecks() { return AU.MISSIONS.filter((m) => { const r = this.ms(m.id), pg = ["accepted", "attempted", "partial"].includes(r.state) ? this.missionProgress(m.id) : null; return pg && (m.span || 1) >= 7 && pg.day >= 4 && !pg.overdue && !r.mid && !r.midAsked; }); },
    // 다시 제시된 활동을 수락하기 전에 '성공하려면 필요한 것'을 글로 받음
    setReofferNote(id, text) {
      const r = this.S.missions.states[id]; if (!r) return false;
      r.reofferNote = String(text || "").trim().slice(0, 300); r.reoffer = false; this.save("mission-reoffer"); return true;
    },
    // 기한이 지난 활동: extend(기한 연장) · notdone(수행하지 못함: 필요한 것 기록) · quit(중도 포기: 다시 도전 여부)
    resolveMission(id, kind, p) {
      p = p || {}; const S = this.S, r = S.missions.states[id], m = this.mission(id);
      if (!r || !m || !["accepted", "attempted", "partial"].includes(r.state)) return false;
      if (kind === "extend") { r.dueDate = AU.addDays(AU.dateStr(), Math.max(1, Math.ceil((m.span || 1) / 2))); r.extended = (r.extended || 0) + 1; this.save("mission-extend"); this.changed(); return true; }
      if (kind === "quit" && p.retry) { r.quitCount = (r.quitCount || 0) + 1; r.state = "accepted"; this.startMissionClock(m, r); this.save("mission-retry"); this.changed(); return true; }
      if (kind !== "notdone" && kind !== "quit") return false;
      const ok = this.setMissionState(id, "skip"); if (!ok) return false;
      r.skipReason = kind; if (kind === "notdone") r.need = String(p.text || "").trim().slice(0, 300);
      const e = S.missions.log[S.missions.log.length - 1]; if (e && e.id === id) e.reason = kind;
      this.save("mission-resolve"); this.changed(); return true;
    },
    setMissionState(id, next, feedback, evidence) {
      const S = this.S; if (!S.flags.missionsUnlocked) return false;
      this.initMissions();
      const r = S.missions.states[id], m = this.mission(id); if (!r || !m) return false;
      const ok = {
        accept: ["available"], attempt: ["accepted"], partial: ["accepted", "attempted"], done: ["accepted", "attempted", "partial"],
        skip: ["available", "accepted", "attempted", "partial"], retry: ["partial", "skipped"]
      };
      if (!ok[next] || !ok[next].includes(r.state)) return false;
      const review = this.validMissionFeedback(feedback) ? { challenge: feedback.challenge, meaning: feedback.meaning, satisfaction: feedback.satisfaction, efficacy: (Number.isInteger(feedback.efficacy) && feedback.efficacy >= 1 && feedback.efficacy <= 5) ? feedback.efficacy : null, mood: (typeof feedback.mood === 'string' && feedback.mood.length <= 20) ? feedback.mood : null, note: String(feedback.note || '').trim().slice(0, 200) } : null;
      let points = 0, capped = false, gained = 0, earnedTokens = 0;
      if (next === "accept") { r.state = "accepted"; this.startMissionClock(m, r); }
      else if (next === "attempt") { r.state = "attempted"; r.tries++; }
      else if (next === "partial") {
        r.state = "partial"; points = C.missions.partialPoints;
        // 일부 시도도 한 번 기록하고 소규모 꾸미기 보상 제공. 동일 미션 중복 지급 방지.
        if (!r.partialRewarded) {
          const g = this.galleryState(); g.fragments = (Number.isInteger(g.fragments) && g.fragments >= 0 ? g.fragments : 0) + 1;
          if (g.fragments >= 3) { g.tokens += Math.floor(g.fragments / 3); g.fragments %= 3; }
          r.partialRewarded = true;
        }
      }
      else if (next === "skip") { r.state = "skipped"; r.skipSeq = (S.missions.skipSeq = (S.missions.skipSeq || 0) + 1); }
      else if (next === "retry") { r.state = "accepted"; this.startMissionClock(m, r); }
      else if (next === "done") {
        r.state = "done";
        if (!r.rewarded) { // 같은 미션의 보상은 한 번만 지급
          if (S.missions.weekId !== AU.weekId()) { S.missions.weekId = AU.weekId(); S.missions.weekPoints = 0; }
          // 난이도·시간·기간으로 등급을 정하고, 인증(보조 기록)을 하면 전액·안 하면 일부만 지급합니다. 나중에 인증하면 나머지를 소급 지급(verifyMission).
          const rw = this.missionReward(m), verified = !!(AU.MissionEvidence && AU.MissionEvidence.clean(evidence, m));
          const pay = verified ? rw.full : rw.part;
          const room = Math.max(0, C.missions.weeklyPointCap - S.missions.weekPoints);
          points = Math.min(pay.mind, room); capped = points < pay.mind;
          // 새 일상 미션 보상은 전투 스탯과 독립된 개인 공간 장식 재화로 지급합니다.
          // 구 저장의 trainingPoints 및 이미 배분한 스탯은 삭제하지 않습니다.
          if (!S.gallery) S.gallery = { tokens: 0, unlocked: [], selected: [], attendance: [] };
          earnedTokens = pay.tokens;
          S.gallery.tokens += earnedTokens;
          S.missions.weekPoints += points; r.rewarded = true;
          r.reward = { tier: rw.tier, verified, tokens: earnedTokens, mind: pay.mind };
          gained = this.gainMind(m.perma, pay.mind); // 평가 응답 여부와 무관하게 동일 보상
        }
      }
      // 자기보고와 선택적인 보조 기록을 분리. 사진 원본은 저장 파일에 포함하지 않음.
      const supplementary = (next === "done" || next === "partial") && AU.MissionEvidence ? AU.MissionEvidence.clean(evidence, m) : null;
      S.missions.log.push({ t: AU.dateStr(), id, perma: m.perma, state: r.state, points, capped, reflection: review, mindGained: gained, galleryTokens: earnedTokens, proof: supplementary ? "evidence" : "self_report", supplementary });
      if (next === "done" || next === "skip") this.fillSlots(next === "skip" ? id : undefined);
      if (next === "done") {
        this.log("일상 미션 완료: " + m.title);
        const mindTxt = gained ? " · 마음 [" + AU.PERMA[m.perma] + "] +" + gained : "";
        const rr = S.missions.states[id].reward, rw = this.missionReward(m);
        const more = rr && !rr.verified && (rw.full.tokens - rr.tokens || rw.full.mind - rr.mind) ? " · 인증하면 토큰 +" + (rw.full.tokens - rr.tokens) + (rw.full.mind - rr.mind ? "·마음 +" + (rw.full.mind - rr.mind) : "") + " 더" : "";
        this.toast("일상 미션 완료! [" + rw.name + "] 갤러리 토큰 +" + earnedTokens + mindTxt + more, "good");
      }
      this.save("mission"); this.changed(); return true;
    },
    repeatMission(id,feedback,evidence) {
      const S=this.S,m=this.mission(id),r=S.missions.states[id];
      if(!S.flags.missionsUnlocked||!m||!r||r.state!=="done")return false;
      const reflection=this.validMissionFeedback(feedback)?{challenge:feedback.challenge,meaning:feedback.meaning,satisfaction:feedback.satisfaction,efficacy:(Number.isInteger(feedback.efficacy)&&feedback.efficacy>=1&&feedback.efficacy<=5)?feedback.efficacy:null,mood:(typeof feedback.mood==="string"&&feedback.mood.length<=20)?feedback.mood:null,note:String(feedback.note||"").trim().slice(0,200)}:null;
      const supplementary=AU.MissionEvidence?AU.MissionEvidence.clean(evidence,m):null;
      S.missions.log.push({t:AU.dateStr(),id,perma:m.perma,state:"done",repeat:true,points:0,capped:false,reflection,mindGained:0,galleryTokens:0,proof:supplementary?"evidence":"self_report",supplementary});
      this.log("일상 미션 반복 수행: "+m.title);this.toast("반복 수행 기록 완료 · 추가 점수와 토큰은 없습니다.","info");
      this.save("mission-repeat");this.changed();return true;
    },
    missionRepeatStats(id){
      const rows=this.S.missions.log.filter(e=>e.id===id&&e.state==="done");
      const reviews=rows.map(e=>e.reflection).filter(x=>x&&Number.isFinite(x.satisfaction)&&Number.isFinite(x.meaning)&&Number.isFinite(x.challenge));
      const avg=k=>{const v=reviews.filter(x=>Number.isFinite(x[k]));return v.length?Math.round(v.reduce((n,x)=>n+x[k],0)/v.length*10)/10:null;};
      return {count:rows.length,repeats:rows.filter(x=>x.repeat).length,last:rows.length?rows[rows.length-1].t:null,satisfaction:avg("satisfaction"),meaning:avg("meaning"),challenge:avg("challenge"),efficacy:avg("efficacy")};
    },
    missionPlan(id){this.initMissions();return this.S.missions.plans[id]||{mode:"free"};},
    setMissionPlan(id,p){
      if(!this.mission(id)||!this.S.missions.states[id]||this.S.missions.states[id].state!=="done"||!p)return false;
      if(!["free","daily","weekly_count","weekdays","interval","paused"].includes(p.mode))return false;
      const x={mode:p.mode};
      if(p.mode==="weekly_count"){if(!Number.isInteger(p.count)||p.count<1||p.count>7)return false;x.count=p.count;}
      if(p.mode==="weekdays"){if(!Array.isArray(p.days)||!p.days.length||p.days.some(n=>!Number.isInteger(n)||n<0||n>6))return false;x.days=[...new Set(p.days)].sort((a,b)=>a-b);}
      if(p.mode==="interval"){if(!Number.isInteger(p.interval)||p.interval<2||p.interval>30)return false;x.interval=p.interval;x.anchor=AU.dateStr();}
      x.remind=!!p.remind&&!["free","paused"].includes(p.mode);
      this.initMissions();this.S.missions.plans[id]=x;this.save("mission-plan");this.changed();return true;
    },
    missionPlanDue(id,day){
      const p=this.missionPlan(id),today=day||AU.dateStr();
      if(["free","paused"].includes(p.mode))return false;
      if(p.mode==="daily")return true;
      const date=new Date(today+"T12:00:00");if(!Number.isFinite(date.getTime()))return false;
      if(p.mode==="weekdays")return p.days.includes(date.getDay());
      if(p.mode==="interval"){const a=new Date(p.anchor+"T12:00:00"),n=Math.floor((date-a)/86400000);return Number.isFinite(n)&&n>=0&&n%p.interval===0;}
      if(p.mode==="weekly_count"){
        const monday=new Date(date);monday.setDate(date.getDate()-(date.getDay()+6)%7);
        const key=x=>x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");
        const begin=key(monday),n=this.S.missions.log.filter(e=>e.id===id&&e.state==="done"&&e.t>=begin&&e.t<=today).length;
        return n<p.count;
      }
      return false;
    },
    /* ---------- 즐겨찾기 · 추천(설명 가능한 규칙 기반) ----------
       즐겨찾기는 보상·진행과 무관한 개인 목록입니다. 추천은 이용자가 직접 고른 관심 영역·시간, 즐겨찾기, 이전에 스스로 매긴 평가만 쓰며
       정신건강 상태를 추정하지 않고, 수행 횟수가 적다는 이유로 불리하게 보지 않습니다. 추천마다 이유를 함께 돌려줍니다. */
    isFavorite(id) { this.initMissions(); return this.S.missions.favorites.includes(id); },
    toggleFavorite(id) {
      if (!this.S.flags.missionsUnlocked || !this.mission(id)) return false;
      this.initMissions(); const f = this.S.missions.favorites, i = f.indexOf(id);
      if (i >= 0) f.splice(i, 1); else f.push(id);
      this.save("mission-fav"); this.changed(); return true;
    },
    recoPrefs() { this.initMissions(); return this.S.missions.prefs; },
    setRecoPrefs(p) {
      if (!p || !Array.isArray(p.areas) || p.areas.some((a) => !AU.MISSION_FUNCTION_AREAS[a]) || ![0, 3, 5, 10, 20].includes(p.maxMin)) return false;
      this.initMissions(); this.S.missions.prefs = { areas: [...new Set(p.areas)], maxMin: p.maxMin }; this.save("mission-prefs"); this.changed(); return true;
    },
    hideReco(id, hide) {
      if (!this.mission(id)) return false;
      this.initMissions(); const h = this.S.missions.recoHidden, i = h.indexOf(id);
      if (hide !== false && i < 0) h.push(id); else if (hide === false && i >= 0) h.splice(i, 1);
      this.save("mission-reco-hide"); this.changed(); return true;
    },
    recommend(limit, offset) {
      this.initMissions(); const M = this.S.missions, pr = M.prefs, A = AU.MISSION_FUNCTION_AREAS, favAreas = new Set(M.favorites.map((id) => (this.mission(id) || {}).functionArea).filter(Boolean));
      const liked = new Set(); // 이용자가 직접 만족도·의미를 4 이상으로 평가한 활동의 PERMA 영역
      for (const e of M.log) { const r = e.reflection; if (r && Number.isInteger(r.satisfaction) && (r.satisfaction >= 4 || r.meaning >= 4)) liked.add(e.perma); }
      const tried = {}; for (const m of AU.MISSIONS) if (M.states[m.id] && M.states[m.id].state === "done") tried[m.perma] = (tried[m.perma] || 0) + 1;
      const rows = [];
      for (const m of AU.MISSIONS) {
        const st = (M.states[m.id] || {}).state; if (st !== "available" || M.recoHidden.includes(m.id) || M.favorites.includes(m.id)) continue;
        let sc = 0; const why = [];
        if (pr.areas.includes(m.functionArea)) { sc += 3; why.push("직접 고르신 관심 영역 '" + A[m.functionArea] + "'"); }
        if (pr.maxMin && m.minutes <= pr.maxMin) { sc += 2; why.push("권장 시간 " + m.minutes + "분 — 선택하신 " + pr.maxMin + "분 이내"); }
        if (favAreas.has(m.functionArea)) { sc += 2; why.push("즐겨찾기한 활동과 같은 '" + A[m.functionArea] + "' 영역"); }
        if (liked.has(m.perma)) { sc += 2; why.push("스스로 높게 평가한 '" + AU.PERMA[m.perma] + "' 영역"); }
        if (!tried[m.perma]) { sc += 1; why.push("아직 해 보지 않은 '" + AU.PERMA[m.perma] + "' 영역"); }
        if (m.difficulty === 1) { sc += 1; why.push("부담이 적은 쉬운 활동"); }
        rows.push({ m, score: sc, reasons: why.length ? why : ["가볍게 시작해 볼 수 있는 활동"] });
      }
      rows.sort((a, b) => b.score - a.score || a.m.id.localeCompare(b.m.id));
      const out = [], per = {}, n = Math.max(1, limit || 3), cut = Math.max(n * 4, 12), pool = rows.slice(0, cut), rest = rows.slice(cut); // 점수 상위 묶음을 돌려 가며 보여 줌
      const start = pool.length ? ((offset || 0) * n) % pool.length : 0, ordered = pool.slice(start).concat(pool.slice(0, start), rest);
      for (const r of ordered) { if ((per[r.m.perma] || 0) >= 2) continue; per[r.m.perma] = (per[r.m.perma] || 0) + 1; out.push(r); if (out.length >= n) break; } // 같은 PERMA 영역은 2개까지
      if (out.length < n) for (const r of ordered) { if (out.length >= n) break; if (!out.includes(r)) out.push(r); } // 후보가 모자랄 때만 한도를 넘겨 채움
      return out;
    },
    // 오늘의 활동: 이용자가 직접 정한 수행 계획 중 오늘 해당하는 것(완료한 활동만 계획 가능). 하지 않아도 불이익 없음
    todayPlanned() { return AU.MISSIONS.filter((m) => this.ms(m.id).state === "done" && this.missionPlanDue(m.id) && !this.S.missions.log.some((e) => e.id === m.id && e.t === AU.dateStr() && e.state === "done")); },
    todayDone() { return this.S.missions.log.filter((e) => e.t === AU.dateStr() && e.state === "done").length; },
    validMissionFeedback(x) { return !!(x && typeof x === 'object' && ['challenge','meaning','satisfaction'].every(k => Number.isInteger(x[k]) && x[k] >= 1 && x[k] <= 5)); },
    /* ---------- 개인 공간: 활동의 기록을 수집하되, 메인 스토리나 전투 성장에 영향 없음 ---------- */
    galleryItems() { return [
      { id: 'frame', name: '기억의 액자', cost: 2, icon: '🖼️', desc: '도전했던 순간을 전시하는 액자' },
      { id: 'plant', name: '새싹 화분', cost: 3, icon: '🪴', desc: '조금씩 성장하는 일상을 상징하는 화분' },
      { id: 'lamp', name: '따뜻한 등불', cost: 4, icon: '🏮', desc: '나만의 공간을 밝히는 등불' },
      { id: 'banner', name: '모험의 깃발', cost: 5, icon: '🏳️', desc: '스스로 선택한 도전을 기념하는 장식' }
    ]; },
    galleryState() {
      const S = this.S; if (!S.gallery || typeof S.gallery !== 'object') S.gallery = { tokens: 0, unlocked: [], selected: [], attendance: [] };
      const g = S.gallery;
      g.tokens = Number.isFinite(g.tokens) && g.tokens >= 0 ? Math.floor(g.tokens) : 0;
      for (const k of ['unlocked', 'selected', 'attendance']) if (!Array.isArray(g[k])) g[k] = [];
      if (!Number.isInteger(g.fragments) || g.fragments < 0) g.fragments = 0;
      return g;
    },
    galleryCheckin() {
      const g = this.galleryState(), today = AU.dateStr();
      if (g.attendance.includes(today)) return false;
      g.attendance.push(today); if (g.attendance.length > 365) g.attendance.shift();
      g.tokens += 1;
      this.toast('오늘의 방문 기록! 갤러리 토큰 +1', 'good'); this.save('gallery'); this.changed(); return true;
    },
    galleryBuy(id) {
      const item = this.galleryItems().find(x => x.id === id), g = this.galleryState();
      if (!item || g.unlocked.includes(id) || g.tokens < item.cost) return false;
      g.tokens -= item.cost; g.unlocked.push(id); g.selected.push(id);
      this.toast(item.name + ' 획득! 나만의 공간에 전시됩니다.', 'good'); this.save('gallery'); this.changed(); return true;
    },
    galleryToggle(id) {
      const g = this.galleryState(); if (!g.unlocked.includes(id)) return false;
      if (g.selected.includes(id)) g.selected = g.selected.filter(x => x !== id); else g.selected.push(id);
      this.save('gallery'); this.changed(); return true;
    },
    /* ---------- 마음 스탯(PERMA 5): 일상 미션을 수행하면 오르는 수치 ----------
       전투 스탯과 따로 보관하며 전투 능력에는 영향을 주지 않습니다(게임 효과 연결은 [미정]). 같은 미션의 보상은 한 번만. */
    /* 마음 스탯 변화 추이: '이전' = 이번 주가 시작될 때의 기록(주가 바뀌면 그 시점의 수치로 새로 찍음). 현재−이전 = 이번 주에 오른 만큼.
       게임 속 활동 점수의 변화이며 PSS·PERMA 같은 검사 점수와는 별개입니다. 저장된 값이 바뀌었으면 true */
    rollMindWeek() {
      const S = this.S, wk = AU.weekId(), m = S.mind; if (!m) return false;
      if (m.snap && m.snap.week === wk) return false;
      m.snap = { week: wk, base: Object.assign({ P: 0, E: 0, R: 0, M: 0, A: 0 }, S.mindStats) }; return true;
    },
    mindTrend() {
      this.rollMindWeek(); const S = this.S, out = {};
      for (const k of Object.keys(AU.PERMA)) { const cur = S.mindStats[k] || 0, prev = S.mind.snap.base[k] || 0, mx = Math.max(this.mindMax(k), cur, prev, 1); out[k] = { cur, prev, mx, curPct: Math.round(cur / mx * 100), prevPct: Math.round(prev / mx * 100), diff: cur - prev }; }
      return out;
    },
    gainMind(k, n) {
      const S = this.S; if (!AU.PERMA[k] || !(n > 0)) return 0;
      this.rollMindWeek();   // 주가 바뀐 뒤 첫 증가라면 증가 전 수치를 '이전'으로 먼저 기록
      S.mindStats[k] = (S.mindStats[k] || 0) + n;
      S.mind.last = { k, n, t: AU.dateStr() }; // 가장 최근에 오른 영역(스탯 창에 '방금 +N' 표시)
      this.log("마음 스탯 [" + AU.PERMA[k] + "] +" + n + " (현재 " + S.mindStats[k] + ")");
      return n;
    },
    // 영역별 현재 목록에서 얻을 수 있는 최대치(막대 길이 기준). 미션이 늘면 자동으로 늘어남
    mindMax(k) { return AU.MISSIONS.filter((m) => m.perma === k).reduce((a, m) => a + this.missionReward(m).full.mind, 0); },
    // 영역별(PERMA) 주간 완료 횟수: 마음 기록 화면용
    permaCounts() {
      const out = {}; for (const k of Object.keys(AU.PERMA)) out[k] = 0;
      for (const e of this.S.missions.log) if (e.state === "done" && out[e.perma] != null) out[e.perma]++;
      return out;
    },

    /* ---------- 마음 기록: PSS·PERMA 측정과 변화 추이를 붙이는 자리 ----------
       게임 수치(피로도)와 별도로 저장합니다. PSS 점수를 피로도로 바꾸는 공식은 만들지 않았습니다([미정]).
       문항 전문은 사용 허가 확인 전이라 넣지 않았고, 아래 함수로 결과만 받습니다. */
    addCheckin({ scale, score, items, source }) {
      if (!["PSS", "PERMA"].includes(scale) || !Number.isFinite(score)) return false;
      this.S.mind.checkins.push({ t: new Date().toISOString(), scale, score, items: items || null, source: source || "game" });
      this.save("mind"); this.changed(); return true;
    },

    /* ---------- 저장·불러오기 ---------- */
    save(reason) {
      let bak = null;
      try {
        const S = this.S; S.savedAt = new Date().toISOString();
        // 프롤로그 '다시 보기' 중에는 진행 기록을 바꾸지 않도록, 돌아갈 위치로 바꿔서 저장
        if (AU.Prologue && AU.Prologue.replay && AU.Prologue.ret) { bak = { map: S.map, x: S.x }; S.map = AU.Prologue.ret.map; S.x = AU.Prologue.ret.x; }
        AU.Store.set(C.save.key, S);
        AU.Ev.emit("saved", { reason });
      } catch (e) { console.warn("[저장 실패]", e); }
      if (bak) { this.S.map = bak.map; this.S.x = bak.x; }
    },
    load() {
      const raw = AU.Store.get(C.save.key); if (!raw || typeof raw !== "object") return null;
      const base = AU.newState();
      // 버전이 달라도 새 항목은 기본값으로 채움(구조 변경 대응)
      const merged = Object.assign(base, raw);
      for (const k of ["stats", "alloc", "equip", "flags", "skills", "missions", "mind"]) merged[k] = Object.assign(base[k], raw[k] || {});
      if (typeof raw.fatigue !== "number") { // 활력(남은 양) 저장 → 피로도(쌓인 양)로 변환
        const mx = Number.isFinite(raw.resourceMax) ? raw.resourceMax : C.fatigue.max, cur = Number.isFinite(raw.resource) ? raw.resource : mx;
        merged.fatigueMax = mx; merged.fatigue = Math.max(0, Math.min(mx, Math.round((mx - cur) * 10) / 10)); merged.fatigueWeek = raw.resourceWeek || AU.weekId();
      }
      merged.gallery = Object.assign(base.gallery, raw.gallery || {});
      if (!Array.isArray(merged.gallery.unlocked)) merged.gallery.unlocked = [];
      if (!Array.isArray(merged.gallery.selected)) merged.gallery.selected = [];
      if (!Array.isArray(merged.gallery.attendance)) merged.gallery.attendance = [];
      merged.rest = Object.assign(base.rest, raw.rest || {}); delete merged.resource; delete merged.resourceMax; delete merged.resourceWeek;
      if (!raw.mindStats) { // 마음 스탯 도입 전 저장: 이미 보상받은 미션 점수로 계산해 채움
        merged.mindStats = { P: 0, E: 0, R: 0, M: 0, A: 0 };
        for (const m of AU.MISSIONS) { const r = merged.missions.states[m.id]; if (r && r.rewarded && merged.mindStats[m.perma] != null) merged.mindStats[m.perma] += m.points; }
      } else merged.mindStats = Object.assign(base.mindStats, raw.mindStats);
      if (merged.jobChanged || (merged.flags && merged.flags.awakened)) { const w = AU.skillsForLevel(merged.level); merged.skills.unlocked = w.slice(); merged.skills.slots = [0, 1, 2].map((i) => (w.includes(merged.skills.slots[i]) ? merged.skills.slots[i] : null)); for (const id of w) if (!merged.skills.slots.includes(id)) { const i = merged.skills.slots.indexOf(null); if (i >= 0) merged.skills.slots[i] = id; } }   // 레벨별 스킬 개방 규칙 적용(이전 저장 보정)
      merged.profile = AU.Profile ? AU.Profile.clean(raw.profile) : { name: "", gender: "" };
      merged.v = C.save.version; merged.inv = raw.inv || {}; merged.quests = raw.quests || {}; merged.visited = raw.visited || { arche: true };
      delete merged.quests.q_job;
      // 현재 게임에 없는 아이템(삭제·이름 변경된 항목)이 가방·장비에 남아 있으면 인벤토리/장비창 그리기가 예외로 멈춰 창이 안 열림 → 불러올 때 정리
      { const bad = []; for (const id of Object.keys(merged.inv)) { if (!AU.ITEMS[id] || !(merged.inv[id] > 0)) { bad.push(id); delete merged.inv[id]; } }
        for (const sl of Object.keys(merged.equip)) { const id = merged.equip[sl]; if (id && !AU.ITEMS[id]) { bad.push(id); merged.equip[sl] = null; } }
        if (bad.length) console.warn("[autelia] 알 수 없는 아이템 정리:", bad.join(", ")); }
      if (merged.quests.q_h1) AU.migrateHideout(merged);   // 아지트 퀘스트 6단계 분할: 이전 저장의 q_h1을 단계별 기록으로 옮김   // 전직 시험 폐지: 이전 저장의 기록 제거
      // 프롤로그 추가 전(v1) 저장: 이미 시작한 본편 진행을 그대로 유지하고 프롤로그는 '완료'로 간주(필요하면 제목 화면에서 다시 볼 수 있음)
      merged.prologue = raw.prologue && typeof raw.prologue === "object" ? raw.prologue : { state: "COMPLETED", flags: {}, seen: {}, legacy: true };
      return merged;
    }
  };
})();
