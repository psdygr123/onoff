/* 서버(Firebase) 연결: 회원 인증(Authentication) + 데이터베이스(Cloud Firestore, 서울).
   - Firebase 가 불러와지지 않았거나 enabled=false 이면 enabled=false 로 남고, store.js 가 시제품(메모리) 방식으로 동작합니다.
   - 저장 위치: users/{uid} 프로필, users/{uid}/saves/{게임id} 게임 진행, users/{uid}/consentLog/{id} 동의 기록(추가만 가능).
   - 이메일은 Authentication 에만 있고 Firestore 문서에는 넣지 않습니다. */
window.OnOff = window.OnOff || {};
OnOff.Cloud = (function () {
  const cfg = window.ONOFF_FIREBASE;
  const out = { enabled: false, ready: Promise.resolve() };
  if (!cfg || !cfg.enabled || !window.firebase || !firebase.initializeApp) return out;

  let app, auth, db;
  try {
    app = firebase.initializeApp(cfg.config);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.languageCode = "ko";
  } catch (e) { console.warn("Firebase 초기화 실패 — 시제품(메모리) 방식으로 동작합니다.", e); return out; }

  const FV = firebase.firestore.FieldValue;
  const koDate = (ts) => { try { return (ts && ts.toDate ? ts.toDate() : new Date()).toLocaleDateString("ko-KR"); } catch (_) { return ""; } };
  const POLICY_VERSION = "demo-draft-2026-11-10"; // 안내문 초안 버전(정식 문서 확정 시 갱신)
  let registering = false, onUser = null, held = null;
  const deliver = (u, sv) => { if (onUser) onUser(u, sv); else held = [u, sv]; }; // 화면 쪽이 아직 연결 전이면 잠시 보관

  async function loadUser(fb) {
    const ref = db.collection("users").doc(fb.uid);
    const snap = await ref.get();
    const d = snap.exists ? snap.data() : null;
    const user = {
      id: fb.uid, demo: false, email: fb.email || "",
      name: d ? d.name : "이용자", gender: d ? d.gender || "" : "", adult: true,
      goals: d ? d.goals || [] : [], goalsFree: d ? d.goalsFree || "" : "",
      joined: d ? d.joined || koDate(d.createdAt) : "", consents: d ? d.consents || {} : {}, incomplete: !d
    };
    const saves = {};
    const ss = await ref.collection("saves").get();
    ss.forEach((doc) => { const v = doc.data(); saves[doc.id] = { label: v.label, percent: v.percent, test: !!v.test, updatedAt: koDate(v.updatedAt) }; });
    return { user, saves };
  }

  out.ready = new Promise((resolve) => {
    let first = true;
    auth.onAuthStateChanged(async (fb) => {
      if (registering) return;
      try {
        if (fb) { const r = await loadUser(fb); deliver(r.user, r.saves); }
        else deliver(null, {});
      } catch (e) {
        console.warn("계정 정보를 불러오지 못했습니다.", e);
        deliver(null, {});
      }
      if (first) { first = false; resolve(); }
    });
  });

  out.enabled = true;
  out.bind = (fn) => { onUser = fn; if (held) { const h = held; held = null; fn(h[0], h[1]); } };

  out.register = async function (profile, password) {
    registering = true;
    let cred;
    try {
      cred = await auth.createUserWithEmailAndPassword(profile.email, password);
      const uid = cred.user.uid, ref = db.collection("users").doc(uid);
      const c = profile.consents || {};
      const body = {
        name: profile.name, gender: profile.gender || "", adult: true,
        goals: profile.goals || [], goalsFree: profile.goalsFree || "",
        consents: { terms: c.terms || "", privacy: c.privacy || "", research: c.research || "" },
        joined: new Date().toLocaleDateString("ko-KR"), createdAt: FV.serverTimestamp()
      };
      await ref.set(body);
      const batch = db.batch();
      ["terms", "privacy", "research"].forEach((k) => {
        batch.set(ref.collection("consentLog").doc(), { item: k, granted: !!c[k], version: POLICY_VERSION, at: FV.serverTimestamp() });
      });
      await batch.commit();
      const r = await loadUser(cred.user);
      return r;
    } catch (e) {
      if (cred && cred.user) { try { await cred.user.delete(); } catch (_) { try { await auth.signOut(); } catch (__) {} } } // 일부만 저장된 계정이 남지 않게 되돌립니다.
      throw e;
    } finally { registering = false; }
  };

  out.login = async function (email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return loadUser(cred.user);
  };
  out.logout = () => auth.signOut();
  out.sendReset = (email) => auth.sendPasswordResetEmail(email);

  out.updateProfile = function (uid, patch) {
    const allowed = {};
    ["name", "gender", "goals", "goalsFree"].forEach((k) => { if (k in patch) allowed[k] = patch[k]; });
    allowed.updatedAt = FV.serverTimestamp();
    return db.collection("users").doc(uid).update(allowed);
  };
  out.setSave = function (uid, gameId, data) {
    return db.collection("users").doc(uid).collection("saves").doc(gameId).set({
      label: String(data.label || "").slice(0, 40), percent: Math.max(0, Math.min(100, Number(data.percent) || 0)), test: !!data.test, updatedAt: FV.serverTimestamp()
    });
  };
  return out;
})();
