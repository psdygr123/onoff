/* 시제품용 상태 저장소.
   - OnOff.Cloud.enabled 가 false(서버 연결 없음)이면: 모든 데이터는 이 탭의 메모리에만 있고, 새로고침하면 사라집니다. 서버로 전송하지 않으며 브라우저 저장소에도 쓰지 않습니다.
   - OnOff.Cloud.enabled 가 true 이면: 가입·로그인·프로필·게임 진행·동의 기록을 서버(Firebase)에 저장하고, 이 객체는 화면용 복사본으로 씁니다. 체험 계정은 서버에 쓰지 않습니다.
   - register/login 은 서버 연결 시 Promise 를 돌려줍니다(호출하는 쪽은 await 로 받습니다).
   - 게임별 저장 데이터는 saves[사용자 id][게임 id]로 분리되어 서로 섞이지 않습니다. */
window.OnOff = window.OnOff || {};
OnOff.State = (function () {
  const s = { user: null, accounts: [], saves: {}, pending: null, records: {} };
  const subs = [];
  const emit = () => subs.forEach((f) => f());
  const uid = () => "u" + Math.random().toString(36).slice(2, 10);
  const today = () => new Date().toLocaleDateString("ko-KR");
  const pub = (a) => { const { password, ...rest } = a; return rest; };
  const cloud = () => (OnOff.Cloud && OnOff.Cloud.enabled ? OnOff.Cloud : null);
  const warn = (e) => { console.warn("서버 저장 실패", e); if (OnOff.UI && OnOff.UI.toast) OnOff.UI.toast("서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."); };
  const authError = (e) => {
    const c = e && e.code || "";
    if (c === "auth/email-already-in-use") return "email-taken";
    if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found" || c === "auth/invalid-login-credentials") return "mismatch";
    if (c === "auth/too-many-requests") return "too-many";
    if (c === "auth/network-request-failed") return "network";
    if (c === "auth/weak-password") return "weak";
    return "server";
  };

  return {
    get user() { return s.user; },
    get pending() { return s.pending; },
    set pending(v) { s.pending = v; },
    onChange(f) { subs.push(f); },

    get cloud() { return !!cloud(); },
    /* 서버 연결 시 로그인 상태가 바뀔 때(새로고침 후 복원 포함) 불립니다. */
    _fromCloud(user, saves) { s.user = user; if (user) s.saves[user.id] = saves || {}; emit(); },

    emailTaken(email) { return s.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase()); },

    register(profile, password) {
      const c = cloud();
      if (c) {
        return c.register(profile, password).then((r) => { s.user = r.user; s.saves[r.user.id] = r.saves; emit(); return { ok: true }; })
          .catch((e) => { console.warn(e); return { ok: false, error: authError(e) }; });
      }
      if (this.emailTaken(profile.email)) return { ok: false, error: "email-taken" };
      const acc = { ...profile, id: uid(), password, demo: false, joined: today() };
      s.accounts.push(acc);
      s.user = pub(acc);
      emit();
      return { ok: true };
    },

    login(email, password) {
      const c = cloud();
      if (c) {
        return c.login(email, password).then((r) => { s.user = r.user; s.saves[r.user.id] = r.saves; emit(); return { ok: true }; })
          .catch((e) => { console.warn(e); return { ok: false, error: authError(e) }; });
      }
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
      s.saves[id] = s.saves[id] || {};   // 체험 계정도 처음에는 저장 기록이 없습니다(가짜 "이어하기" 방지)
      emit();
    },

    logout() {
      const wasDemo = s.user && s.user.demo;
      s.user = null; s.pending = null; emit();
      const c = cloud(); if (c && !wasDemo) c.logout().catch(warn);
    },
    sendReset(email) { const c = cloud(); return c ? c.sendReset(email).then(() => ({ ok: true })).catch((e) => ({ ok: false, error: authError(e) })) : Promise.resolve({ ok: true, local: true }); },

    updateUser(patch) {
      if (!s.user) return;
      s.user = { ...s.user, ...patch };
      const acc = s.accounts.find((a) => a.id === s.user.id);
      if (acc) Object.assign(acc, patch);
      emit();
      const c = cloud(); if (c && !s.user.demo) c.updateProfile(s.user.id, patch).catch(warn);
    },

    getSave(gameId) { return s.user && s.saves[s.user.id] ? s.saves[s.user.id][gameId] || null : null; },
    setSave(gameId, data) {
      if (!s.user) return;
      s.saves[s.user.id] = s.saves[s.user.id] || {};
      s.saves[s.user.id][gameId] = { ...data, updatedAt: today() };
      emit();
      const c = cloud(); if (c && !s.user.demo) c.setSave(s.user.id, gameId, data).catch(warn);
    },
    /* 게임이 보내는 행동 기록(반응시간·속도 등). 지금은 이 탭의 메모리에만 두고 마이페이지에서 CSV로 내려받습니다(서버 전송 없음). */
    addRecord(gameId, rec) {
      if (!s.user || !rec || typeof rec !== "object") return;
      const list = (s.records[s.user.id] = s.records[s.user.id] || {});
      const arr = (list[gameId] = list[gameId] || []);
      const clean = {};
      Object.keys(rec).slice(0, 40).forEach((k) => { const v = rec[k]; clean[String(k).slice(0, 40)] = typeof v === "number" || typeof v === "boolean" ? v : String(v == null ? "" : v).slice(0, 80); });
      arr.push(clean); if (arr.length > 5000) arr.shift();
    },
    getRecords(gameId) { return s.user && s.records[s.user.id] ? s.records[s.user.id][gameId] || [] : []; },
    recordsCsv(gameId) {
      const rows = this.getRecords(gameId); if (!rows.length) return "";
      const cols = []; rows.forEach((r) => Object.keys(r).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
      const q = (v) => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      return "\ufeff" + [cols.join(",")].concat(rows.map((r) => cols.map((c) => q(r[c])).join(","))).join("\r\n");
    },
    /* 게임 안내(연구 수집 정보 포함)를 읽었다고 확인한 기록. 사용자·게임별로 이 브라우저에 남겨 다시 묻지 않습니다(동의 철회·내용 변경 때는 지우면 다시 묻습니다). */
    hasAck(gameId) { if (!s.user) return false; try { return localStorage.getItem("onoff-ack:" + s.user.id + ":" + gameId) === "1"; } catch (e) { return !!(s.ack && s.ack[s.user.id + ":" + gameId]); } },
    setAck(gameId) { if (!s.user) return; s.ack = s.ack || {}; s.ack[s.user.id + ":" + gameId] = 1; try { localStorage.setItem("onoff-ack:" + s.user.id + ":" + gameId, "1"); } catch (e) { /* 무시 */ } },
    saveKey(gameId) { return s.user ? s.user.id + ":" + gameId : null; }
  };
})();
/* 서버 연결 시 로그인 상태 변화를 이 저장소로 받습니다. */
if (OnOff.Cloud && OnOff.Cloud.enabled) OnOff.Cloud.bind((u, sv) => OnOff.State._fromCloud(u, sv));
