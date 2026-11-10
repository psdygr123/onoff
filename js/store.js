/* 시제품용 상태 저장소.
   - 모든 데이터는 이 탭의 메모리에만 있고, 새로고침하면 사라집니다. 서버로 전송하지 않으며 브라우저 저장소에도 쓰지 않습니다.
   - 실제 서비스에서는 register/login/updateUser/setSave 안에서 서버 API를 호출하도록 바꿉니다(서버 연동 위치).
   - 게임별 저장 데이터는 saves[사용자 id][게임 id]로 분리되어 서로 섞이지 않습니다. */
window.OnOff = window.OnOff || {};
OnOff.State = (function () {
  const s = { user: null, accounts: [], saves: {}, pending: null };
  const subs = [];
  const emit = () => subs.forEach((f) => f());
  const uid = () => "u" + Math.random().toString(36).slice(2, 10);
  const today = () => new Date().toLocaleDateString("ko-KR");
  const pub = (a) => { const { password, ...rest } = a; return rest; };

  return {
    get user() { return s.user; },
    get pending() { return s.pending; },
    set pending(v) { s.pending = v; },
    onChange(f) { subs.push(f); },

    emailTaken(email) { return s.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase()); },

    register(profile, password) {
      if (this.emailTaken(profile.email)) return { ok: false, error: "email-taken" };
      const acc = { ...profile, id: uid(), password, demo: false, joined: today() };
      s.accounts.push(acc);
      s.user = pub(acc);
      emit();
      return { ok: true };
    },

    login(email, password) {
      const acc = s.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (!acc || acc.password !== password) return { ok: false, error: "mismatch" };
      s.user = pub(acc);
      emit();
      return { ok: true };
    },

    demoLogin() {
      const id = "demo";
      s.user = {
        id, demo: true, email: "체험 계정 (실제 이메일 없음)", name: "체험 이용자", gender: "", adult: true,
        goals: ["happiness", "growth"], goalsFree: "", joined: today(),
        consents: { terms: today(), privacy: today(), research: today() }
      };
      s.saves[id] = s.saves[id] || { "autelia": { label: "견습 모험가 Lv.3", percent: 30, updatedAt: today(), example: true } };
      emit();
    },

    logout() { s.user = null; s.pending = null; emit(); },

    updateUser(patch) {
      if (!s.user) return;
      s.user = { ...s.user, ...patch };
      const acc = s.accounts.find((a) => a.id === s.user.id);
      if (acc) Object.assign(acc, patch);
      emit();
    },

    getSave(gameId) { return s.user && s.saves[s.user.id] ? s.saves[s.user.id][gameId] || null : null; },
    setSave(gameId, data) {
      if (!s.user) return;
      s.saves[s.user.id] = s.saves[s.user.id] || {};
      s.saves[s.user.id][gameId] = { ...data, updatedAt: today() };
      emit();
    },
    saveKey(gameId) { return s.user ? s.user.id + ":" + gameId : null; }
  };
})();
