/* 게임 규칙(화면과 무관): 경험치·레벨업, 인벤토리·장비, 스탯 분배, 퀘스트, 전직, 피로도(스킬로 쌓이는 수치), 현실 미션, 마음 기록, 저장.
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
    },

    /* ---------- 재화·아이템 ---------- */
    gainSilver(n) { this.S.silver += n; },
    tipOnce(id, text) { const F = this.S.flags; if (F["tip_" + id] || (AU.Prologue && AU.Prologue.on)) return; F["tip_" + id] = true; this.toast(text, "info"); },
    count(id) { return this.S.inv[id] || 0; },
    giveItem(id, n = 1, quiet) {
      this.S.inv[id] = (this.S.inv[id] || 0) + n;
      if (!quiet) this.toast("획득: " + AU.ITEMS[id].name + (n > 1 ? " ×" + n : ""), "item");
      if (AU.Guide) { AU.Guide.trigger("item"); if (AU.ITEMS[id].type === "equip") AU.Guide.trigger("equip"); }
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
    // 기본 레벨 포인트는 현실 미션 수행 여부와 무관하게 사용 가능. 훈련 포인트는 선택형 현실 활동 추가 보상.
    gateBand() { return Math.max(10, Math.floor(this.S.level / 5) * 5); },
    gateOpen() { return true; },
    openGate() { /* 구 저장과의 호환용. 더 이상 현실 미션이 스탯 분배를 잠그지 않음. */ },
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
      if (id === "q_job" && this.S.jobChanged) return "locked";
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
      for (const [it, n] of q.startItems || []) this.giveItem(it, n);   // 전달 퀘스트: 수락할 때 맡는 물건
      this.log("퀘스트 수락: " + q.title); this.toast("퀘스트 수락: " + q.title, "quest");
      this.refreshQuest(id); this.save("quest"); this.changed(); return true;
    },
    refreshQuest(id) {
      const rec = this.qs(id), q = AU.QUESTS[id]; if (!rec || rec.state === "done") return;
      const all = q.objectives.every((o, i) => this.objectiveDone(q, rec, i));
      const next = all ? "ready" : "active";
      if (next === "ready" && rec.state !== "ready") this.toast("목표 달성: " + q.title + " (의뢰인에게 돌아가세요)", "quest");
      rec.state = next;
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
      this.log("퀘스트 완료: " + q.title); this.toast("퀘스트 완료: " + q.title, "good");
      if (q.setFlags) Object.assign(this.S.flags, q.setFlags);
      for (const t of q.after || []) this.toast(t, "info");
      if (q.jobChange) this.jobChange(q.jobChange);
      if (r.exp) this.gainExp(r.exp, q.title);
      if (r.levelTo) { let g = 0; while (this.S.level < r.levelTo && g++ < 20) this.gainExp(Math.max(1, AU.expToNext(this.S.level) - this.S.exp), q.title); }
      if (q.awaken) this.awaken();
      this.save("quest"); this.changed(); return true;
    },
    bossActive() { const r = this.qs("q_job"); return !!r && (r.state === "active"); },

    /* ---------- 힘의 각성(Lv10, 제페토): 전직 없이 스킬이 열리고, 피로도·쉼 미션이 시작됨 ---------- */
    awakened() { return !!(this.S.jobChanged || this.S.flags.awakened); },
    awaken() {
      const S = this.S; if (S.flags.awakened || S.jobChanged) return false;
      S.flags.awakened = true; S.freePoints += C.levels.freePointsOnJobChange;
      S.skills.unlocked = AU.WARRIOR_SKILLS.slice(); S.skills.slots = AU.WARRIOR_SKILLS.slice(0, 3); S.hp = this.d().maxHp;
      this.unlockRealMissions(false); this.log("용사의 힘이 깨어났습니다.");
      this.toast("힘이 깨어났습니다! 스킬이 열렸습니다 (1·2·3 키, K 키)", "good");
      this.toast("스탯 포인트 +" + C.levels.freePointsOnJobChange + ". 스킬을 쓰면 피로도가 쌓이며, 모험일지의 '쉼'에서 줄일 수 있습니다", "info");
      AU.Ev.emit("awaken", {}); return true;
    },

    /* ---------- 전직 ---------- */
    jobChange(job) {
      const S = this.S; if (S.jobChanged) return;
      S.job = job; S.jobChanged = true;
      S.freePoints += C.levels.freePointsOnJobChange;
      S.skills.unlocked = AU.WARRIOR_SKILLS.slice(); S.skills.slots = AU.WARRIOR_SKILLS.slice(0, 3);
      this.unlockRealMissions(false);
      S.hp = this.d().maxHp;
      this.log("전직: " + AU.JOBS[job].name);
      this.toast("전직했습니다: " + AU.JOBS[job].name, "good");
      this.toast("전사 스킬이 활성화되었습니다 (1·2·3 키, K 키)", "info");
      this.toast("스탯 포인트 +" + C.levels.freePointsOnJobChange + ". 모험일지(J)의 '쉼' 미션으로 피로도를 줄일 수 있습니다", "info");
      AU.Ev.emit("jobchange", { job });
    },
    /* 현실 미션: 프롤로그가 끝나 본편(Lv1)이 시작되는 순간부터 열린다. 게임 안의 능력치와는 별개이며 선택 사항.
       쉼 미션·피로도는 스킬을 배우는 시점(Lv10)에 따로 안내한다(skills.unlocked가 비어 있는 동안은 쉼 미션을 쓸 수 없음). */
    unlockRealMissions(announce) {
      const S = this.S; if (S.flags.missionsUnlocked) return false;
      S.flags.missionsUnlocked = true; this.initMissions();
      if (announce) this.toast("모험일지(J)에 현실 활동이 열렸습니다. 알렉시오스에게 말을 걸어 보세요.", "info");
      return true;
    },
    syncUnlockedState() {
      const S = this.S, pro = S.prologue;
      // 프롤로그를 이미 끝낸 저장(또는 이전 규칙으로 전직한 저장)은 현실 미션을 연다
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
    // 피로도 줄이기. source = 'mission' | 'currency' | 'weekly' | 'dev'
    relieve(source, amount, reason) { this.setFatigue(this.S.fatigue - amount, source); AU.Ev.emit("recover", { source, amount, reason }); },
    restMission(id) { return AU.REST_MISSIONS.find((m) => m.id === id); },
    // 선택형 '쉼' 현실 미션: 하루에 같은 미션은 한 번. 자기보고이며 마음 스탯·훈련 포인트와는 무관
    restMissionAvailable(id) { return this.S.flags.missionsUnlocked && this.S.skills.unlocked.length > 0 && this.S.rest.done[id] !== AU.dateStr(); },
    restNoteOk(note) { return !!(note && typeof note === 'object' && ['calm', 'same', 'mixed', 'tense', 'other'].includes(note.feeling)); }, // 감정 선택 필수, 자유 소감은 선택
    doRestMission(id, note) {
      const S = this.S, m = this.restMission(id); if (!m || !this.restMissionAvailable(id)) return false;
      if (!this.restNoteOk(note)) { this.toast("활동 후 느낀 상태를 한 가지 선택해 주세요.", "warn"); return false; }
      const text = String(note.note || "").replace(/\s+/g, " ").trim().slice(0, C.fatigue.restNoteMax);
      S.rest.done[id] = AU.dateStr(); S.rest.log.push({ t: AU.dateStr(), id, recover: m.recover, feeling: note.feeling, note: text, proof: "self_report" }); if (S.rest.log.length > 200) S.rest.log.shift();
      const before = S.fatigue; this.relieve("mission", m.recover, m.title);
      this.log("쉼 미션 완료: " + m.title); this.toast("쉼 미션 완료! 피로도 −" + Math.round((before - S.fatigue) * 10) / 10 + " (현재 " + S.fatigue + " / " + S.fatigueMax + ")", "good");
      this.save("rest"); return true;
    },
    // 은화로 쉬기: 막다른 길이 없도록 현실 미션 없이도 가능. 하루 횟수 제한(임시)
    restPrice() { return C.fatigue.restSilverBase + this.S.level * C.fatigue.restSilverPerLevel; },
    restSilverLeft() { const t = this.S.rest.silverToday; return t.d === AU.dateStr() ? Math.max(0, C.fatigue.restDailyLimit - t.n) : C.fatigue.restDailyLimit; },
    restWithSilver() {
      const S = this.S, price = this.restPrice();
      if (S.fatigue <= 0) { this.toast("지금은 피로도가 쌓이지 않았습니다.", "info"); return false; }
      if (this.restSilverLeft() <= 0) { this.toast("오늘은 더 쉴 수 없습니다. (하루 " + C.fatigue.restDailyLimit + "회)", "warn"); return false; }
      if (S.silver < price) { this.toast("은화가 부족합니다. (필요 " + price + ")", "warn"); return false; }
      S.silver -= price; const t = S.rest.silverToday; if (t.d !== AU.dateStr()) { t.d = AU.dateStr(); t.n = 0; } t.n++;
      const before = S.fatigue; this.relieve("currency", C.fatigue.restSilverRecover, "휴식");
      this.toast("휴식했습니다. 피로도 −" + Math.round((before - S.fatigue) * 10) / 10 + " (은화 −" + price + ")", "good"); this.save("rest"); return true;
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

    /* ---------- 현실 미션 ---------- */
    mission(id) { return AU.MISSIONS.find((m) => m.id === id); },
    ms(id) { return this.S.missions.states[id] || { state: "locked", rewarded: false, tries: 0 }; },
    initMissions() {
      const M = this.S.missions;
      for (const m of AU.MISSIONS) if (!M.states[m.id]) M.states[m.id] = { state: "locked", rewarded: false, tries: 0 };
    },
    discoverMissions() {
      const S = this.S; if (!S.flags.missionsUnlocked) return false;
      S.flags.guideMet = true; this.initMissions();
      for (const m of AU.MISSIONS) { const r = S.missions.states[m.id]; if (r.state === "locked" && (!m.pre || this.ms(m.pre).state === "done")) r.state = "available"; }
      this.save("mission"); this.changed(); return true;
    },
    setMissionState(id, next, feedback) {
      const S = this.S; if (!S.flags.missionsUnlocked) return false;
      this.initMissions();
      const r = S.missions.states[id], m = this.mission(id); if (!r || !m) return false;
      const ok = {
        accept: ["available"], attempt: ["accepted"], partial: ["attempted"], done: ["accepted", "attempted", "partial"],
        skip: ["available", "accepted", "attempted", "partial"], retry: ["partial", "skipped"]
      };
      if (!ok[next] || !ok[next].includes(r.state)) return false;
      const review = this.validMissionFeedback(feedback) ? { challenge: feedback.challenge, meaning: feedback.meaning, satisfaction: feedback.satisfaction, note: String(feedback.note || '').trim().slice(0, 200) } : null;
      let points = 0, capped = false, gained = 0, earnedTokens = 0;
      if (next === "accept") r.state = "accepted";
      else if (next === "attempt") { r.state = "attempted"; r.tries++; }
      else if (next === "partial") { r.state = "partial"; points = C.missions.partialPoints; }
      else if (next === "skip") r.state = "skipped";
      else if (next === "retry") r.state = "accepted";
      else if (next === "done") {
        r.state = "done";
        if (!r.rewarded) { // 같은 미션의 보상은 한 번만 지급
          if (S.missions.weekId !== AU.weekId()) { S.missions.weekId = AU.weekId(); S.missions.weekPoints = 0; }
          const room = Math.max(0, C.missions.weeklyPointCap - S.missions.weekPoints);
          points = Math.min(m.points, room); capped = points < m.points;
          // 새 현실 미션 보상은 전투 스탯과 독립된 개인 공간 장식 재화로 지급합니다.
          // 구 저장의 trainingPoints 및 이미 배분한 스탯은 삭제하지 않습니다.
          if (!S.gallery) S.gallery = { tokens: 0, unlocked: [], selected: [], attendance: [] };
          earnedTokens = 1;
          S.gallery.tokens += earnedTokens;
          S.missions.weekPoints += points; r.rewarded = true;
          gained = this.gainMind(m.perma, m.points + (review ? 1 : 0)); // 기본 실천 점수 + 평가 참여 1점. 높은 만족도 자체에는 가산하지 않음
        }
        for (const n of AU.MISSIONS) { const nr = S.missions.states[n.id]; if (n.pre === id && nr.state === "locked" && S.flags.guideMet) nr.state = "available"; }
      }
      // 수행 상태(state)와 인증 자료(proof)는 따로 기록. 지금은 자기보고만 있음
      S.missions.log.push({ t: AU.dateStr(), id, perma: m.perma, state: r.state, points, capped, reflection: review, mindGained: gained, galleryTokens: earnedTokens, proof: "self_report" });
      if (next === "done") {
        this.log("현실 미션 완료: " + m.title);
        const mindTxt = gained ? " · 마음 [" + AU.PERMA[m.perma] + "] +" + gained : "";
        this.toast("현실 미션 완료! 갤러리 토큰 +" + earnedTokens + mindTxt, "good");
      }
      this.save("mission"); this.changed(); return true;
    },
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
    /* ---------- 마음 스탯(PERMA 5): 현실 미션을 수행하면 오르는 수치 ----------
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
    mindMax(k) { return AU.MISSIONS.filter((m) => m.perma === k).reduce((a, m) => a + m.points + 1, 0); },
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
      merged.profile = AU.Profile ? AU.Profile.clean(raw.profile) : { name: "", gender: "" };
      merged.v = C.save.version; merged.inv = raw.inv || {}; merged.quests = raw.quests || {}; merged.visited = raw.visited || { arche: true };
      // 프롤로그 추가 전(v1) 저장: 이미 시작한 본편 진행을 그대로 유지하고 프롤로그는 '완료'로 간주(필요하면 제목 화면에서 다시 볼 수 있음)
      merged.prologue = raw.prologue && typeof raw.prologue === "object" ? raw.prologue : { state: "COMPLETED", flags: {}, seen: {}, legacy: true };
      return merged;
    }
  };
})();
