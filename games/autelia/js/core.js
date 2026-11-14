/* 핵심 장치: 이미지 로더(누락 대비), 저장소 어댑터, 게임 상태, 능력치 계산, 키 입력.
   이전 아스텔리아 시제품의 구조(이름 기반 이미지 로더, 물리 키 기준 입력, 설정 저장)를 이어받아 다듬었습니다. */
window.AU = window.AU || {};
(function () {
  const C = AU.CONFIG;

  /* ---------- 이미지 로더: 파일이 없어도 게임은 멈추지 않음 ---------- */
  AU.Img = {
    map: {}, missing: new Set(),
    load() {
      for (const [key, spec] of Object.entries(AU.ASSETS)) {
        const im = new Image(); const rec = { image: im, ok: false, frames: spec.frames || 1 };
        im.onload = () => { rec.ok = true; rec.done = true; if (!rec.orig) rec.orig = im; if (AU.Tint) AU.Tint.onLoaded(key); };
        im.onerror = () => { rec.done = true; if (spec.optional) { console.info("[아우텔리아] 선택 그림 없음(임시 도형으로 표시):", spec.path); return; } this.missing.add(key); console.warn("[아우텔리아] 이미지 누락, 대체 그래픽으로 표시:", spec.path); };
        im.src = spec.path; this.map[key] = rec;
      }
    },
    // 그림이 모두 불러와질 때까지(성공이든 실패든) 기다림. 느린 접속에서 장면이 대체 그림(옛 주민 그림)으로 만들어지는 것을 막음
    whenSettled(match, maxMs) {
      const keys = Object.keys(this.map).filter((k) => match(k));
      const open = () => keys.filter((k) => !(this.map[k].done));
      return new Promise((res) => { const t0 = Date.now(); const tick = () => { if (!open().length || Date.now() - t0 > (maxMs || 10000)) res(open().length); else setTimeout(tick, 80); }; tick(); });
    },
    has(key) { return !!(this.map[key] && this.map[key].ok); },
    get(key) { return this.map[key] && this.map[key].image; }
  };

  /* ---------- 저장소 어댑터: localStorage가 막혀 있으면 메모리로 대체하고 사용자에게 알림 ---------- */
  AU.Store = {
    ns: "local", memory: {}, persistent: true,
    k(key) { return key + ":" + this.ns; },
    get(key) {
      try { const v = localStorage.getItem(this.k(key)); return v == null ? null : JSON.parse(v); }
      catch (e) { this.persistent = false; const v = this.memory[this.k(key)]; return v == null ? null : JSON.parse(v); }
    },
    set(key, val) {
      const s = JSON.stringify(val);
      try { localStorage.setItem(this.k(key), s); this.persistent = true; }
      catch (e) { this.persistent = false; this.memory[this.k(key)] = s; }
    },
    remove(key) { try { localStorage.removeItem(this.k(key)); } catch (e) { /* 무시 */ } delete this.memory[this.k(key)]; }
  };

  /* ---------- 날짜 도구: 주 단위 갱신용(월요일 시작) ---------- */
  AU.weekId = function (d = new Date()) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (t.getDay() + 6) % 7; // 월=0
    t.setDate(t.getDate() - day);
    return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  };
  AU.dateStr = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  /* ---------- 새 게임 상태 ---------- */
  AU.newState = function () {
    const st = {
      v: C.save.version, level: 1, exp: 0, job: "apprentice", jobChanged: false,
      stats: Object.assign({}, C.stats.base), alloc: { STR: 0, VIT: 0, AGI: 0, DEX: 0, WIL: 0 },
      freePoints: 0, trainingPoints: 0,
      hp: 1, fatigue: 0, fatigueMax: C.fatigue.max, fatigueWeek: AU.weekId(), rest: { done: {}, log: [], silverToday: { d: "", n: 0 } },
      silver: 0, inv: {}, equip: { weapon: null, armor: null, accessory: null },
      map: "pro_temple", x: AU.MAPS.pro_temple.start, visited: { pro_temple: true },
      profile: { name: "", gender: "" }, // 캐릭터 설정(닉네임·모습). 신규 시작 때 정함. 비어 있으면 기본값(주인공·남성형)
      prologue: { state: "NOT_STARTED", flags: {}, seen: {} }, // 신규 시작은 프롤로그부터. 기본 소지품(회복약)은 프롤로그 완료 시 지급
      quests: {}, skills: { unlocked: [], slots: [null, null, null] },
      flags: { missionsUnlocked: false, guideMet: false },
      missions: { states: {}, weekId: AU.weekId(), weekPoints: 0, log: [] },
      journal: [{ t: AU.dateStr(), text: "모험을 시작했습니다." }],
      mind: { checkins: [], last: null, snap: null }, mindStats: { P: 0, E: 0, R: 0, M: 0, A: 0 }, playSec: 0, savedAt: null
    };
    st.hp = AU.derive(st).maxHp;
    return st;
  };

  /* ---------- 능력치 계산: 스탯 → 전투 능력치 ---------- */
  AU.statTotal = (st, k) => st.stats[k] + st.alloc[k];
  AU.equipBonus = function (st, override) {
    const eq = Object.assign({}, st.equip, override || {});
    const b = { atk: 0, hp: 0, dodge: 0, crit: 0 };
    for (const slot of Object.keys(eq)) {
      const it = eq[slot] && AU.ITEMS[eq[slot]];
      if (it && it.stats) for (const [k, v] of Object.entries(it.stats)) b[k] = (b[k] || 0) + v;
    }
    return b;
  };
  AU.derive = function (st, opts = {}) {
    const P = C.stats.perPoint, eq = AU.equipBonus(st, opts.equip);
    const tot = (k) => (opts.stats ? opts.stats[k] : AU.statTotal(st, k));
    const eff = Math.min(C.stats.maxEfficiency, tot("WIL") * P.WIL.eff);
    return {
      atk: Math.round(C.combat.basePower + tot("STR") * P.STR.atk + eq.atk),
      maxHp: Math.round(C.combat.baseHp + tot("VIT") * P.VIT.hp + eq.hp),
      dodge: +(tot("AGI") * P.AGI.dodge + eq.dodge).toFixed(2),
      crit: +(C.combat.baseCrit + tot("DEX") * P.DEX.crit + eq.crit).toFixed(2),
      eff: +eff.toFixed(2), costMult: 1 - eff / 100
    };
  };
  AU.expToNext = (level) => Math.round(C.exp.base * Math.pow(level, C.exp.exponent));
  AU.levelCap = (st) => (st.jobChanged ? C.exp.maxLevel : C.levels.capWithoutJob);
  AU.jobName = (st) => AU.JOBS[st.job].name;

  /* ---------- 키 입력: 물리 키(code) 기준, 설정에서 변경 가능 ---------- */
  AU.Input = {
    held: new Set(), bindings: {}, reverse: {}, handlers: [], blocked: () => false, rawHandlers: [],
    reset() { this.bindings = Object.fromEntries(AU.ACTIONS.map((a) => [a.id, a.code])); this.rebuild(); },
    load(saved) {
      this.reset();
      if (saved && typeof saved === "object") {
        for (const a of AU.ACTIONS) { const v = saved[a.id]; if (typeof v === "string" && /^[A-Za-z0-9]{2,20}$/.test(v)) this.bindings[a.id] = v; }
        // 중복이 섞여 있으면 기본값으로 되돌림
        const codes = Object.values(this.bindings); if (new Set(codes).size !== codes.length) this.reset();
      }
      this.rebuild();
    },
    rebuild() {
      this.reverse = {};
      for (const a of AU.ACTIONS) {
        const code = this.bindings[a.id];
        for (const c of [code].concat(AU.ALIASES[code] || [])) this.reverse[c] = a.id;
      }
    },
    codesOf(id) { const c = this.bindings[id]; return [c].concat(AU.ALIASES[c] || []); },
    isHeld(id) { return this.codesOf(id).some((c) => this.held.has(c)); },
    conflict(id, code) { return AU.ACTIONS.find((a) => a.id !== id && this.bindings[a.id] === code) || null; },
    attach() {
      const typing = (e) => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      window.addEventListener("keydown", (e) => {
        if (e.isComposing) return;
        if (typing(e) && e.code !== "Escape") return;
        for (const h of this.rawHandlers) if (h(e) === true) { e.preventDefault(); return; }
        const act = this.reverse[e.code], isMenu = e.code === AU.FIXED_KEYS.menu;
        const stop = act || isMenu || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "AltLeft", "AltRight", "Tab"].includes(e.code);
        if (stop) e.preventDefault();
        if (!e.repeat) this.held.add(e.code); else if (!this.held.has(e.code)) this.held.add(e.code);
        if (e.repeat) return;
        const id = isMenu ? "menu" : act;
        if (id) for (const h of this.handlers) h(id, e);
      }, { capture: true });
      window.addEventListener("keyup", (e) => {
        this.held.delete(e.code);
        if (e.code === "AltLeft" || e.code === "AltRight") e.preventDefault(); // Alt 단독 입력이 브라우저 메뉴를 여는 것을 막음
      }, { capture: true });
      window.addEventListener("blur", () => this.held.clear());
    }
  };
})();
