/* 게임 규칙(화면과 무관): 경험치·레벨업, 인벤토리·장비, 스탯 분배, 퀘스트, 전직, 활력(스킬 자원), 현실 미션, 마음 기록, 저장.
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
    log(text) { const j = this.S.journal; j.push({ t: AU.dateStr(), text }); if (j.length > 300) j.shift(); },
    changed() { AU.Ev.emit("changed"); },

    /* ---------- 경험치·레벨 ---------- */
    gainExp(n, label) {
      const S = this.S; n = Math.round(n); if (n <= 0) return;
      if (AU.Prologue && AU.Prologue.on) return; // 프롤로그에서는 경험치·레벨업이 없음
      const cap = AU.levelCap(S);
      if (S.level >= cap) {
        // 전직 전에는 10레벨에서 멈춤: 경험치는 쌓지 않고 안내만 한다
        if (!S.jobChanged) this.toast("전직 전에는 더 오를 수 없습니다. 전직 시험을 받아 보세요.", "warn");
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
    count(id) { return this.S.inv[id] || 0; },
    giveItem(id, n = 1, quiet) {
      this.S.inv[id] = (this.S.inv[id] || 0) + n;
      if (!quiet) this.toast("획득: " + AU.ITEMS[id].name + (n > 1 ? " ×" + n : ""), "item");
      this.refreshCollectQuests(); this.changed();
    },
    takeItem(id, n = 1) {
      if (this.count(id) < n) return false;
      this.S.inv[id] -= n; if (this.S.inv[id] <= 0) delete this.S.inv[id];
      this.refreshCollectQuests(); this.changed(); return true;
    },
    useItem(id) {
      const it = AU.ITEMS[id]; if (!it || it.type !== "use" || this.count(id) < 1) return false;
      const S = this.S, max = this.d().maxHp;
      if (S.hp >= max) { this.toast("HP가 이미 가득 찼습니다.", "warn"); return false; }
      this.takeItem(id, 1); S.hp = Math.min(max, S.hp + it.heal);
      AU.Ev.emit("floater", { text: "+" + it.heal, color: "#6BCB77", onPlayer: true });
      this.toast(it.name + " 사용", "item"); this.changed(); return true;
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
    pool() { return this.S.freePoints + this.S.trainingPoints; },
    // pending: { STR: 2, ... }. 레벨 포인트를 먼저 쓰고 부족하면 훈련 포인트를 씀
    applyAllocation(pending) {
      const S = this.S, need = Object.values(pending).reduce((a, b) => a + b, 0);
      if (need <= 0 || need > this.pool()) return false;
      const oldMax = this.d().maxHp;
      let left = need; const useFree = Math.min(S.freePoints, left); S.freePoints -= useFree; left -= useFree;
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
      return (rec.prog[i] || 0) >= (o.count || 1);
    },
    startQuest(id) {
      if (this.questStatus(id) !== "available") return false;
      const q = AU.QUESTS[id];
      this.S.quests[id] = { state: "active", prog: q.objectives.map(() => 0) };
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
    turnIn(id) {
      const rec = this.qs(id), q = AU.QUESTS[id];
      if (!rec || rec.state !== "ready") return false;
      rec.state = "done"; rec.doneAt = AU.dateStr();
      const r = q.reward;
      if (r.silver) this.gainSilver(r.silver);
      for (const [it, n] of r.items || []) this.giveItem(it, n);
      this.log("퀘스트 완료: " + q.title); this.toast("퀘스트 완료: " + q.title, "good");
      if (q.jobChange) this.jobChange(q.jobChange);
      if (r.exp) this.gainExp(r.exp, q.title);
      this.save("quest"); this.changed(); return true;
    },
    bossActive() { const r = this.qs("q_job"); return !!r && (r.state === "active"); },

    /* ---------- 전직 ---------- */
    jobChange(job) {
      const S = this.S; if (S.jobChanged) return;
      S.job = job; S.jobChanged = true;
      S.freePoints += C.levels.freePointsOnJobChange;
      S.skills.unlocked = AU.WARRIOR_SKILLS.slice(); S.skills.slots = AU.WARRIOR_SKILLS.slice(0, 3);
      S.flags.missionsUnlocked = true; this.initMissions();
      S.hp = this.d().maxHp;
      this.log("전직: " + AU.JOBS[job].name);
      this.toast("전직했습니다: " + AU.JOBS[job].name, "good");
      this.toast("전사 스킬이 활성화되었습니다 (1·2·3 키, K 키)", "info");
      this.toast("스탯 포인트 +" + C.levels.freePointsOnJobChange + ", 모험일지(J)에 현실 미션이 열렸습니다", "info");
      AU.Ev.emit("jobchange", { job });
    },
    syncUnlockedState() { if (this.S.flags.missionsUnlocked) this.initMissions(); },

    /* ---------- 활력(스킬 자원). 회복 방법과 환산은 [미정]이라 기능만 열어 둠 ---------- */
    skillCost(id) { return Math.max(0, Math.round(AU.SKILLS[id].cost * this.d().costMult * 10) / 10); }, // 소수 첫째 자리까지: 의지 효율(0.2%/점)이 눈에 보이도록
    canSpend(id) { return this.S.resource >= this.skillCost(id); },
    spend(id) {
      const c = this.skillCost(id); if (this.S.resource < c) return false;
      this.S.resource = Math.round((this.S.resource - c) * 10) / 10; this.changed(); return true;
    },
    setResource(n) { this.S.resource = Math.max(0, Math.min(this.S.resourceMax, Math.round(n * 10) / 10)); this.changed(); },
    setResourceMax(n) { this.S.resourceMax = Math.max(1, Math.round(n)); this.S.resource = Math.min(this.S.resource, this.S.resourceMax); this.changed(); },
    // 나중에 회복 규칙이 정해지면 이 한 곳으로 연결: source = 'currency' | 'mission' | 'weekly' | 'dev'
    recover(source, amount, reason) { this.setResource(this.S.resource + amount); AU.Ev.emit("recover", { source, amount, reason }); },
    refreshWeekly(force) {
      const S = this.S, wk = AU.weekId();
      if (force || (C.resource.weeklyRefresh && S.resourceWeek !== wk)) {
        S.resourceWeek = wk; S.resource = S.resourceMax;
        if (S.missions.weekId !== wk) { S.missions.weekId = wk; S.missions.weekPoints = 0; }
        if (force || S.playSec > 1) this.toast("주간 활력이 갱신되었습니다.", "info");
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
    setMissionState(id, next) {
      const S = this.S; if (!S.flags.missionsUnlocked) return false;
      this.initMissions();
      const r = S.missions.states[id], m = this.mission(id); if (!r || !m) return false;
      const ok = {
        accept: ["available"], attempt: ["accepted"], partial: ["attempted"], done: ["accepted", "attempted", "partial"],
        skip: ["available", "accepted", "attempted", "partial"], retry: ["partial", "skipped"]
      };
      if (!ok[next] || !ok[next].includes(r.state)) return false;
      let points = 0, capped = false;
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
          S.trainingPoints += points; S.missions.weekPoints += points; r.rewarded = true;
        }
        for (const n of AU.MISSIONS) { const nr = S.missions.states[n.id]; if (n.pre === id && nr.state === "locked" && S.flags.guideMet) nr.state = "available"; }
      }
      // 수행 상태(state)와 인증 자료(proof)는 따로 기록. 지금은 자기보고만 있음
      S.missions.log.push({ t: AU.dateStr(), id, perma: m.perma, state: r.state, points, capped, proof: "self_report" });
      if (next === "done") {
        this.log("현실 미션 완료: " + m.title);
        this.toast(points ? "현실 미션 완료! 훈련 포인트 +" + points : (r.rewarded && capped ? "이번 주 훈련 포인트 한도에 도달해 포인트는 지급되지 않았습니다" : "현실 미션 완료"), "good");
      }
      this.save("mission"); this.changed(); return true;
    },
    // 영역별(PERMA) 주간 완료 횟수: 마음 기록 화면용
    permaCounts() {
      const out = {}; for (const k of Object.keys(AU.PERMA)) out[k] = 0;
      for (const e of this.S.missions.log) if (e.state === "done" && out[e.perma] != null) out[e.perma]++;
      return out;
    },

    /* ---------- 마음 기록: PSS·PERMA 측정과 변화 추이를 붙이는 자리 ----------
       게임 자원(활력)과 별도로 저장합니다. PSS 점수를 활력으로 바꾸는 공식은 만들지 않았습니다([미정]).
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
      merged.profile = AU.Profile ? AU.Profile.clean(raw.profile) : { name: "", gender: "" };
      merged.v = C.save.version; merged.inv = raw.inv || {}; merged.quests = raw.quests || {}; merged.visited = raw.visited || { arche: true };
      // 프롤로그 추가 전(v1) 저장: 이미 시작한 본편 진행을 그대로 유지하고 프롤로그는 '완료'로 간주(필요하면 제목 화면에서 다시 볼 수 있음)
      merged.prologue = raw.prologue && typeof raw.prologue === "object" ? raw.prologue : { state: "COMPLETED", flags: {}, seen: {}, legacy: true };
      return merged;
    }
  };
})();
