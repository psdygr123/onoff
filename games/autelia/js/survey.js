/* 설문 기록(PSS·K-PERMA) — 채점·저장·CSV. 화면은 survey_ui.js.
   원칙: 게임 활동 기록(마음 스탯)·피로도·재화와 완전히 분리. 미응답≠0. 점수 기준선·판정 없음. 원응답은 덮어쓰지 않음.
   기능은 기본 꺼짐(C.survey.enabled=false): 주소 끝에 ?survey=1 을 붙이거나 개발 패널(F2)에서 켭니다. 사용 허가·IRB 확인 전에는 실제 이용자에게 켜지 않습니다. */
window.AU = window.AU || {};
(function () {
  const C = AU.CONFIG;
  C.survey = Object.assign({ enabled: false, studyId: "autelia-prototype-unassigned", storeKey: "autelia.survey", showResultToParticipant: true }, C.survey || {});
  const KEYS = { pss: "pss10_ko", perma: "perma_ko" };      // 척도 키 → AU.SCALES 이름
  const PHASES = [{ id: "pre", label: "시작 전 설문" }, { id: "post", label: "마친 뒤 설문" }, { id: "followup", label: "추적 설문" }];
  const rid = (p) => p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; } };
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const r2 = (x) => Math.round(x * 1e6) / 1e6;               // 원점수 정밀도는 유지(화면에서만 반올림)

  const Survey = AU.Survey = {
    PHASES, KEYS,
    scale(key) { return AU.SCALES[KEYS[key]]; },
    keyOfInstrument(id) { return Object.keys(KEYS).find((k) => this.scale(k).id === id); },
    enabled() { return !!(C.survey.enabled || /[?&]survey=1/.test(location.search) || this._on === true); },
    setEnabled(v) { this._on = !!v; AU.Ev && AU.Ev.emit("changed"); },

    /* ---------- 저장: 게임 저장과 다른 키 ---------- */
    load() {
      const raw = AU.Store.get(C.survey.storeKey), d = raw && typeof raw === "object" ? raw : {};
      if (!d.participantId) d.participantId = rid("P");   // 가명 ID(실명·학교·연락처와 연결하지 않음). 실제 연결은 연구자가 따로 관리
      d.drafts = d.drafts || {}; d.submissions = Array.isArray(d.submissions) ? d.submissions : [];
      return d;
    },
    save(d) { AU.Store.set(C.survey.storeKey, d); },

    /* ---------- 채점(순수 함수) ---------- */
    score(responses, scale) {
      const out = { scored: {}, answered: 0, missing: [], valid: false, scores: null };
      const raw = {};
      for (const it of scale.items) {
        const v = responses ? responses[it.itemId] : undefined;
        if (Number.isInteger(v) && v >= scale.min && v <= scale.max) { out.answered++; raw[it.n] = v; out.scored[it.itemId] = it.reversed ? scale.max - v : v; }
        else { out.scored[it.itemId] = null; out.missing.push(it.n); }
      }
      out.valid = out.missing.length === 0;
      if (!out.valid) return out;
      if (scale.scoring.groups) {                                    // PERMA: 하위요인 = 해당 문항 평균. 부정정서·외로움을 총점에 섞지 않음
        const G = scale.scoring.groups, s = {};
        for (const k of Object.keys(G)) s[k] = r2(mean(G[k].map((n) => raw[n])));
        const core = scale.scoring.core.flatMap((k) => G[k]);
        s.permaMean15 = r2(mean(core.map((n) => raw[n])));           // 논문의 PERMA 총점(15문항 평균)
        s.overall16 = r2(mean(core.concat(G.T).map((n) => raw[n]))); // 원개발자 안내의 전반적 웰빙(15문항+종합적 행복감) — 참고
        out.scores = s;
      } else {                                                       // PSS: 부정 5문항 합, 긍정 5문항 원점수 합, 역채점 후 합계
        const sum = (arr) => arr.reduce((a, n) => a + raw[n], 0);
        out.scores = { negSum: sum(scale.scoring.negItems), posRawSum: sum(scale.scoring.posItems), total: scale.items.reduce((a, it) => a + out.scored[it.itemId], 0) };
      }
      return out;
    },

    /* ---------- 임시 저장(미완료로 종료 가능) ---------- */
    dk: (key, phase) => key + "|" + phase,
    draftFor(key, phase) {
      const d = this.load(), k = this.dk(key, phase);
      let dr = d.drafts[k];
      if (!dr) { dr = d.drafts[k] = { draftId: rid("D"), scaleKey: key, phase, startedAt: new Date().toISOString(), responses: {} }; this.save(d); }
      return dr;
    },
    setAnswer(key, phase, itemId, v) {
      const scale = this.scale(key), it = scale && scale.items.find((x) => x.itemId === itemId);
      if (!it || !PHASES.some((p) => p.id === phase) || !Number.isInteger(v) || v < scale.min || v > scale.max) return false;
      const d = this.load(); if (this.submissionFor(key, phase, d)) return false;    // 제출 후에는 수정하지 않음(수정 규칙은 연구계획 확정 후)
      const k = this.dk(key, phase), dr = d.drafts[k] || (d.drafts[k] = { draftId: rid("D"), scaleKey: key, phase, startedAt: new Date().toISOString(), responses: {} });
      dr.responses[itemId] = v; dr.updatedAt = new Date().toISOString(); this.save(d); return true;
    },
    submissionFor(key, phase, d) { d = d || this.load(); const id = this.scale(key).id; return d.submissions.find((s) => s.instrumentId === id && s.phase === phase && s.completionStatus === "complete") || null; },

    /* ---------- 제출: 중복 제출 방지(같은 draftId는 한 번만, 같은 척도·시점은 한 번만) ---------- */
    submit(key, phase) {
      const scale = this.scale(key), d = this.load(), dr = d.drafts[this.dk(key, phase)];
      if (!scale || !PHASES.some((p) => p.id === phase)) return { ok: false, reason: "unknown" };
      if (this.submissionFor(key, phase, d)) return { ok: false, reason: "phase-done" };
      if (!dr) return { ok: false, reason: "no-draft" };
      if (d.submissions.some((s) => s.draftId === dr.draftId)) return { ok: false, reason: "duplicate" };
      const sc = this.score(dr.responses, scale);
      if (!sc.valid) return { ok: false, reason: "incomplete", missing: sc.missing };
      const sub = {
        submissionId: rid("S"), draftId: dr.draftId, participantId: d.participantId, studyId: C.survey.studyId, phase,
        instrumentId: scale.id, instrumentVersion: scale.instrumentVersion, scoringVersion: scale.scoringVersion, sourceHash: scale.source.sourceSha256,
        startedAt: dr.startedAt, submittedAt: new Date().toISOString(), timezone: tz(), consentVersion: null /* 연구 동의 흐름 연결 전 */,
        completionStatus: "complete", responsesByItemId: Object.assign({}, dr.responses),
        scores: Object.assign({}, sc.scores, scale.scoring.groups ? {} : { scoredByItemId: sc.scored }),
        scoringStatus: scale.review.scoringReviewStatus, rightsStatus: scale.review.rightsStatus
      };
      d.submissions.push(sub); delete d.drafts[this.dk(key, phase)]; this.save(d);
      return { ok: true, submission: sub };
    },

    /* ---------- 같은 instrumentVersion·scoringVersion끼리만 비교 ---------- */
    compare(a, b) {
      if (!a || !b || a.instrumentVersion !== b.instrumentVersion || a.scoringVersion !== b.scoringVersion) return null;
      const out = {}; for (const k of Object.keys(b.scores)) if (typeof b.scores[k] === "number") out[k] = r2(b.scores[k] - a.scores[k]);
      return out;
    },

    /* ---------- 연구용 CSV: 척도별로 따로(열 사전이 다름). 한 행 = 참여자×시점×척도 1건. 미완료 임시 저장은 점수를 비워 포함 ---------- */
    scoreCols(key) { return key === "pss" ? ["neg_sum", "pos_raw_sum", "total"] : ["P", "E", "R", "M", "A", "N", "H", "L", "T", "perma_mean15", "overall16_with_happiness"]; },
    scoreVals(key, sc) { return key === "pss" ? [sc.negSum, sc.posRawSum, sc.total] : [sc.P, sc.E, sc.R, sc.M, sc.A, sc.N, sc.H, sc.L, sc.T, sc.permaMean15, sc.overall16]; },
    csvRows(key) {
      const scale = this.scale(key), d = this.load(), rows = [], reversed = key === "pss", pad = (n) => String(n).padStart(2, "0");
      const base = (o) => ({ submissionId: o.submissionId || "", participantId: d.participantId, studyId: C.survey.studyId, phase: o.phase, instrumentId: scale.id, instrumentVersion: scale.instrumentVersion, scoringVersion: scale.scoringVersion, sourceHash: scale.source.sourceSha256 || "", startedAt: o.startedAt || "", submittedAt: o.submittedAt || "", timezone: o.timezone || "", consentVersion: o.consentVersion == null ? "" : o.consentVersion, completionStatus: o.completionStatus });
      const fill = (r, resp, sc, status) => {
        for (const it of scale.items) r["raw_item_" + pad(it.n)] = Number.isInteger(resp[it.itemId]) ? resp[it.itemId] : "";
        if (reversed) for (const it of scale.items) r["scored_item_" + pad(it.n)] = sc && sc.scoredByItemId && Number.isInteger(sc.scoredByItemId[it.itemId]) ? sc.scoredByItemId[it.itemId] : "";
        const cols = this.scoreCols(key), vals = sc ? this.scoreVals(key, sc) : [];
        cols.forEach((c, i) => { r[c] = vals[i] != null ? vals[i] : ""; }); r.scoringStatus = status || ""; return r;
      };
      for (const s of d.submissions) if (s.instrumentId === scale.id) rows.push(fill(base(s), s.responsesByItemId, s.scores, s.scoringStatus));
      for (const k of Object.keys(d.drafts)) { const dr = d.drafts[k]; if (dr.scaleKey === key) rows.push(fill(base({ phase: dr.phase, startedAt: dr.startedAt, completionStatus: "incomplete" }), dr.responses, null, "not_scored_incomplete")); }
      return rows;
    },
    csv(key) {
      const scale = this.scale(key), pad = (n) => String(n).padStart(2, "0");
      const cols = ["submissionId", "participantId", "studyId", "phase", "instrumentId", "instrumentVersion", "scoringVersion", "sourceHash", "startedAt", "submittedAt", "timezone", "consentVersion", "completionStatus"]
        .concat(scale.items.map((it) => "raw_item_" + pad(it.n)), key === "pss" ? scale.items.map((it) => "scored_item_" + pad(it.n)) : [], this.scoreCols(key), ["scoringStatus"]);
      // 스프레드시트 수식 삽입 방지: = + - @ 탭 캐리지리턴으로 시작하는 문자열은 앞에 작은따옴표. 숫자(0 포함)는 그대로, 비어 있음은 빈칸.
      const esc = (v) => { let s = v == null ? "" : String(v); if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      return "﻿" + [cols.join(",")].concat(this.csvRows(key).map((r) => cols.map((c) => esc(r[c])).join(","))).join("\r\n") + "\r\n";
    },
    download(key) {
      const blob = new Blob([this.csv(key)], { type: "text/csv;charset=utf-8" }), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "autelia_" + key + "_" + AU.dateStr() + ".csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    resetAll() { const d = this.load(); d.drafts = {}; d.submissions = []; this.save(d); AU.Ev && AU.Ev.emit("changed"); }
  };
})();
