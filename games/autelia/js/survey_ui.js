/* 설문 기록 화면(PSS·K-PERMA). 모험일지 > 마음 기록 탭 아래에 붙습니다. 규칙·채점은 survey.js.
   화면 원칙: 문항 원문은 척도 본문 상자에 그대로, 게임 안내 문구는 그 밖에 따로. 응답 초기값 없음. 뒤로·수정 가능. 제출 전 확인. */
window.AU = window.AU || {};
(function () {
  const UI = AU.UI, h = UI.h, btn = UI.btn, S = AU.Survey;
  const state = (UI.survey = { key: null, phase: null, view: "list", subId: null });   // view: list | intro | form | confirm | result
  const NAMES = { pss: "스트레스 설문(PSS)", perma: "웰빙 설문(PERMA)" };
  const MINUTES = { pss: "2~3", perma: "5" };
  const fmtDate = (iso) => { try { const d = new Date(iso); return d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate(); } catch (e) { return ""; } };
  const signed = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);
  const signed1 = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(1);
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);                 // 화면에서만 반올림(저장은 원값)
  const toList = (rerender) => { state.view = "list"; state.key = null; state.phase = null; rerender(); };

  UI.surveyPanel = function () {
    const box = h("div", { class: "svbox", "data-survey": "1" });
    const rerender = () => { box.replaceWith(UI.surveyPanel()); };
    const d = S.load();
    if (state.view === "list" || !state.key || !state.phase) box.append(listView(d, rerender));
    else if (state.view === "intro") box.append(introView(rerender));
    else if (state.view === "form") box.append(formView(rerender));
    else if (state.view === "confirm") box.append(confirmView(rerender));
    else box.append(resultView(d, rerender));
    return box;
  };

  const sel = {}, more = {};                                           // 척도별: 선택한 점 / 보조 선 표시
  function trendView(key, hist, rerender) {
    const W = 300, H = 140, L = 26, R = 12, T = 12, B = 22, max = key === "pss" ? 20 : 10;
    const main = key === "pss" ? ["negSum", "부정적 지각", "#B5543F"] : ["permaMean15", "PERMA 평균", "#2F5D50"];
    const extra = key === "pss" ? [["posRawSum", "긍정적 지각", "#4F7D6E"]] : [["P", "P 긍정정서", "#8DB3A5"], ["E", "E 몰입", "#C9A24B"], ["R", "R 관계", "#B5838D"], ["M", "M 의미", "#6C8EAD"], ["A", "A 성취", "#A0A66B"]];
    const i0 = sel[key] != null && sel[key] < hist.length ? sel[key] : hist.length - 1;
    const x = (i) => L + i * (W - L - R) / (hist.length - 1), y = (v) => T + (H - T - B) * (1 - v / max);
    let g = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="점수 변화 추이 그래프" class="svtrend">';
    for (const f of [0, 0.5, 1]) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(max * f) + '" y2="' + y(max * f) + '" stroke="#d9e0d8"/><text x="' + (L - 4) + '" y="' + (y(max * f) + 3) + '" text-anchor="end" font-size="9" fill="#7a857d">' + (max * f) + "</text>";
    const line = (k, col, w) => '<polyline points="' + hist.map((h, i) => x(i).toFixed(1) + "," + y(h.scores[k]).toFixed(1)).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round" opacity="' + (w > 2 ? 1 : 0.8) + '"/>';
    if (more[key]) extra.forEach(([k, , col]) => (g += line(k, col, 1.4)));
    g += line(main[0], main[2], 2.8);
    hist.forEach((h, i) => { const on = i === i0; g += '<circle class="svpt" data-i="' + i + '" cx="' + x(i).toFixed(1) + '" cy="' + y(h.scores[main[0]]).toFixed(1) + '" r="' + (on ? 6 : 4.5) + '" fill="' + (on ? "#4F7D6E" : main[2]) + '" stroke="#fff" stroke-width="1.6" style="cursor:pointer"/><circle class="svpt" data-i="' + i + '" cx="' + x(i).toFixed(1) + '" cy="' + y(h.scores[main[0]]).toFixed(1) + '" r="13" fill="transparent" style="cursor:pointer"/>'; });
    const lab = (i, anc) => '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + anc + '" font-size="9" fill="#7a857d">' + fmtDate(hist[i].submittedAt) + "</text>";
    g += lab(0, "start") + lab(hist.length - 1, "end") + "</svg>";
    const w = h("div", { class: "svtwrap" }), holder = h("div"); holder.innerHTML = g;
    holder.querySelectorAll(".svpt").forEach((el) => el.addEventListener("click", () => { sel[key] = +el.dataset.i; rerender(); }));
    w.append(holder, h("div", { class: "svleg" }, h("span", { class: "lg", style: "--c:" + main[2], text: main[1] }),
      btn(more[key] ? "보조 선 숨기기" : key === "pss" ? "긍정적 지각도 보기" : "영역별(P·E·R·M·A)도 보기", "mini", () => { more[key] = !more[key]; rerender(); }, { "data-act": "more" })));
    if (more[key]) w.append(h("div", { class: "svleg" }, extra.map(([, n, col]) => h("span", { class: "lg", style: "--c:" + col, text: n }))));
    w.append(detailCard(key, hist, i0, main[0]));
    return w;
  }

  function detailCard(key, hist, i, k) {
    const cur = hist[i], prev = i > 0 ? hist[i - 1] : null, fmt = (v) => (key === "pss" ? String(v) : f1(v));
    const day = (iso) => AU.dateStr(new Date(iso));
    let cnt = null;
    if (prev && AU.G && AU.G.S && AU.G.S.missions) { const a = day(prev.submittedAt), b = day(cur.submittedAt); cnt = AU.G.S.missions.log.filter((e) => e.state === "done" && e.t > a && e.t <= b).length; }
    const diff = prev ? Math.round((cur.scores[k] - prev.scores[k]) * 10) / 10 : null;
    const row = h("div", { class: "svdetail", "data-detail": "1" }, h("span", { class: "d", text: fmtDate(cur.submittedAt) }),
      h("b", { class: "ds", text: fmt(cur.scores[k]) }), diff != null && diff !== 0 ? h("small", { class: "dd", text: (diff < 0 ? "▼" : "▲") + Math.abs(diff) }) : null,
      h("div", { class: "dm" }, h("b", { text: prev ? "직전 점검 이후 완료한 미션 " + cnt + "개" : "첫 기록" }), cur.memo ? h("i", { text: "“" + cur.memo + "”" }) : h("i", { class: "none", text: "남긴 메모 없음" })));
    return row;
  }

  function listView(d, rerender) {
    const v = h("div", null, h("h3", { text: "나의 마음 점검" }),
      h("p", { class: "note", text: "원할 때마다 척도를 해 보고, 시간이 지나며 내가 어떻게 달라지는지 그래프로 확인하는 개인 기록입니다. 횟수 제한이 없고, 하지 않아도 모험에는 아무 영향이 없으며 피로도·은화·전투 능력에도 반영되지 않습니다. 위의 ‘마음 능력치’(현실 미션 활동 기록)와는 별개의 기록입니다." }));
    for (const key of Object.keys(S.KEYS)) {
      const s = S.scale(key), hist = S.history(key), dr = d.drafts[S.dk(key, "check")], n = dr ? Object.keys(dr.responses).length : 0;
      const sec = h("div", { class: "svlist", "data-scale": key }, h("h4", { class: "svh4", text: NAMES[key] + " · " + s.itemCount + "문항" }));
      sec.append(h("div", { class: "svrow", "data-phase": "check" }, h("b", { text: hist.length ? "지금까지 " + hist.length + "회 기록" : "아직 기록 없음" }),
        h("span", { class: "tag", text: n ? "작성 중 (" + n + "/" + s.itemCount + ")" : hist.length ? "최근 " + fmtDate(hist[hist.length - 1].submittedAt) : "" }), h("span", { class: "grow" }),
        btn(n ? "이어서 하기" : hist.length ? "다시 해보기" : "처음 해보기", "mini primary", () => { state.key = key; state.phase = "check"; state.subId = null; state.view = n ? "form" : "intro"; rerender(); }, { "data-act": "start" })));
      if (hist.length) {
        sec.append(hist.length > 1 ? trendView(key, hist, rerender) : h("p", { class: "note", text: "한 번 더 기록하면 변화 그래프가 그려집니다. 점을 누르면 그날의 메모와 그 사이 한 미션 수를 볼 수 있습니다." }));

      }
      v.append(sec);
    }
    v.append(h("p", { class: "note", text: "응답은 이 기기의 저장 공간에만 보관됩니다. 연구용 사전·사후 측정은 게임과 별도로 진행합니다." }));
    return v;
  }

  function introView(rerender) {
    const key = state.key, s = S.scale(key), P = S.PHASES.find((p) => p.id === state.phase);
    const what = key === "pss" ? "지난 한 달 동안 느끼고 생각한 것을 묻는 " + s.itemCount + "문항입니다." : "평소의 기분·몰입·관계·의미·성취·건강을 전반적으로 묻는 " + s.itemCount + "문항입니다.";
    const why = key === "pss" ? "시간이 지나며 내가 스트레스를 어떻게 느끼는지의 변화를 그래프로 돌아보기 위해서입니다." : "시간이 지나며 내 웰빙(잘 지내는 정도)이 어떻게 달라지는지 그래프로 돌아보기 위해서입니다.";
    return h("div", null, h("h3", { text: P.label + " · " + s.title }),
      h("div", { class: "svintro" },
        h("p", null, h("b", { text: "무엇을 묻나요  " }), what + " 약 " + MINUTES[key] + "분 걸립니다."),
        h("p", null, h("b", { text: "왜 하나요  " }), why + " 진단 검사가 아니며, 점수에 좋고 나쁨의 기준선이 없습니다."),
        h("p", null, h("b", { text: "알아 두세요  " }), "정답이 없습니다. 하고 싶지 않으면 지금 시작하지 않아도 됩니다. 점수를 올리려고 답을 고를 필요도, 그에 대한 보상도 없습니다."),
        h("div", { class: "svwarn", role: "note" }, h("b", { text: "꼭 읽어 주세요  " }), "검사 시점의 상태가 중간에 달라지면 결과를 비교할 수 없습니다. 그래서 한 번 시작하면 끝까지 모두 응답해야 합니다. 시간이 충분할 때 시작해 주세요.")),
      h("div", { class: "svbtns" }, btn("뒤로", "", () => toList(rerender)), btn("시작하기", "primary", () => { state.view = "form"; rerender(); }, { "data-act": "begin" })));
  }

  function formView(rerender) {
    const key = state.key, s = S.scale(key), P = S.PHASES.find((p) => p.id === state.phase), dr = S.draftFor(key, state.phase);
    const prog = h("span", { class: "svprog", "aria-live": "polite" }), next = btn("답을 확인하고 제출하기", "primary", () => { state.view = "confirm"; rerender(); }, { "data-act": "review" });
    const update = () => { const n = Object.keys(S.draftFor(key, state.phase).responses).length; prog.textContent = "응답 " + n + " / " + s.itemCount; next.disabled = n < s.itemCount; };
    const scale = h("div", { class: "svscale" + (key === "perma" ? " sv11" : ""), role: "group", "aria-label": s.title });
    if (s.instruction) scale.append(h("p", { class: "svinst", text: s.instruction }));
    for (const it of s.items) {
      const cur = dr.responses[it.itemId];
      const fs = h("fieldset", { class: "svitem", "data-item": it.itemId }, h("legend", null, h("span", { class: "svn", text: it.n }), it.text));
      const opts = h("div", { class: "svopts" });
      for (const c of s.choices) {
        const id = "sv-" + it.itemId + "-" + c.v, inp = h("input", { type: "radio", name: it.itemId, id, value: c.v });
        if (cur === c.v) inp.checked = true;
        inp.addEventListener("change", () => { if (S.setAnswer(key, state.phase, it.itemId, c.v)) update(); });
        opts.append(h("label", { class: "svopt", for: id }, inp, h("span", { class: "sv-v", text: c.v }), c.label ? h("span", { class: "sv-l", text: c.label }) : null));
      }
      fs.append(opts); scale.append(fs);
    }
    update();
    const hint = key === "perma" ? "0은 가장 낮은 쪽, 10은 가장 높은 쪽입니다(이 설명은 게임 안내이며 척도 원문이 아닙니다). " : "";
    return h("div", null, h("h3", { text: P.label + " · " + NAMES[key] }),
      h("p", { class: "note", text: hint + "아래 상자 안은 척도 원문입니다. 답을 고르지 않은 문항은 0점으로 처리되지 않습니다. 모두 고르면 제출할 수 있습니다." }),
      scale, h("div", { class: "svfoot" }, prog, h("span", { class: "grow" }), btn("나중에 이어서 하기", "", () => toList(rerender), { "data-act": "later" }), next),
      h("p", { class: "note svsrc", text: "출처: " + s.source.citation }));
  }

  function confirmView(rerender) {
    const key = state.key, dr = S.draftFor(key, state.phase), r = S.score(dr.responses, S.scale(key));
    const memoBox = state.phase === "check" ? h("div", { class: "svmemo" }, h("label", { text: "지금 마음을 한 줄로 남겨 볼까요? (선택)" }), (() => { const t = h("textarea", { maxlength: "200", rows: "2", placeholder: "예: 시험 기간이라 계속 압도되는 느낌", "data-memo": "1" }); t.value = state.memo || ""; t.addEventListener("input", () => { state.memo = t.value; }); return t; })()) : null;
    const msg = r.valid ? "모든 문항에 답했습니다. 제출하면 이 시점의 응답은 수정할 수 없습니다." : "아직 답하지 않은 문항이 있습니다: " + r.missing.join(", ") + "번";
    const go = btn("제출", "primary", () => {
      const res = S.submit(key, state.phase, state.memo); state.memo = "";
      if (res.ok) { state.view = "result"; AU.G && AU.G.toast && AU.G.toast("설문을 제출했습니다.", "good"); } else if (res.reason === "duplicate" || res.reason === "phase-done") state.view = "result";
      rerender();
    }, { "data-act": "submit" });
    go.disabled = !r.valid;
    return h("div", null, h("h3", { text: "제출 전 확인" }), h("p", { class: "svmsg", text: msg }), memoBox,
      h("div", { class: "svbtns" }, btn("돌아가서 고치기", "", () => { state.view = "form"; rerender(); }, { "data-act": "back" }), go));
  }

  function resultView(d, rerender) {
    const key = state.key, s = S.scale(key), sub = state.phase === "check" ? S.history(key).find((x) => x.submissionId === state.subId) || S.history(key).slice(-1)[0] : S.submissionFor(key, state.phase, d), P = S.PHASES.find((p) => p.id === state.phase);
    const v = h("div", null, h("h3", { text: P.label + " · " + NAMES[key] + " 결과" }));
    if (!sub) v.append(h("p", { class: "empty", text: "제출한 기록이 없습니다." }));
    else if (!AU.CONFIG.survey.showResultToParticipant) v.append(h("p", { class: "svmsg", text: "응답이 저장되었습니다. 참여해 주셔서 고맙습니다." }));
    else {
      const hh = S.history(key), ix = hh.findIndex((x) => sub && x.submissionId === sub.submissionId), pre = state.phase === "check" ? (ix > 0 ? hh[ix - 1] : null) : state.phase !== "pre" ? S.submissionFor(key, "pre", d) : null, cmp = pre ? S.compare(pre, sub) : null;
      v.append(key === "pss" ? pssResult(sub, cmp) : permaResult(s, sub, pre, cmp));
      if (state.phase !== "pre" && !cmp) v.append(h("p", { class: "note", text: state.phase === "check" ? "이전 기록이 쌓이면 변화를 함께 보여 드립니다." : "비교할 수 있는 ‘시작 전 설문’(같은 문항·채점 버전)이 아직 없습니다." }));
      v.append(h("p", { class: "note", text: "이 점수는 진단이 아니며 ‘정상·위험’ 같은 기준선이 없습니다. 점수가 높거나 낮다고 게임에서 달라지는 것은 없습니다. 힘든 마음이 이어진다면 믿을 수 있는 사람이나 전문가와 이야기해 보세요." }));
      v.append(h("div", { class: "svhelp", "data-help": "lines" }, h("b", { text: "도움을 받을 수 있는 상담전화" }),
        h("ul", null, h("li", { text: "자살예방 상담전화 109 (국번 없이, 24시간)" }), h("li", { text: "정신건강 위기상담전화 1577-0199 (24시간)" }), h("li", { text: "청소년전화 1388" }), h("li", { text: "보건복지상담센터 129" }))));   // 보건복지부·여성가족부 운영 전화(2024년 109 통합 안내 기준)
    }
    v.append(h("div", { class: "svbtns" }, btn("목록으로", "", () => toList(rerender), { "data-act": "tolist" })));
    return v;
  }

  function pssResult(sub, cmp) {
    const c = sub.scores, w = h("div", null, h("div", { class: "svres" },
      h("div", { class: "svr" }, h("span", { text: "부정적 지각" }), h("b", { class: "sv-neg", text: c.negSum + " / 20" }), h("em", { text: "통제할 수 없다·압도된다고 느낀 정도" })),
      h("div", { class: "svr" }, h("span", { text: "긍정적 지각" }), h("b", { class: "sv-pos", text: c.posRawSum + " / 20" }), h("em", { text: "대처하고 있다·통제하고 있다고 느낀 정도" })),
      h("div", { class: "svr" }, h("span", { text: "합계(참고용)" }), h("b", { class: "sv-tot", text: c.total + " / 40" }), h("em", { text: "긍정적 지각 문항을 뒤집어 더한 값: ‘부정적 지각’과 ‘긍정적 지각의 부족’이 함께 담겨 있습니다" }))));
    if (cmp) w.append(h("div", { class: "svcmp" }, h("b", { text: "이전 기록과 비교" }), h("span", { text: "부정적 지각 " + signed(cmp.negSum) }), h("span", { text: "긍정적 지각 " + signed(cmp.posRawSum) }), h("span", { text: "합계 " + signed(cmp.total) }),
      h("p", { class: "note", text: "나의 이전 응답과의 차이일 뿐이며, 게임의 효과를 뜻하지 않습니다." })));
    return w;
  }

  function permaResult(s, sub, pre, cmp) {
    const c = sub.scores, L = s.scoring.labels, w = h("div", null);
    w.append(h("p", { class: "svmean" }, h("span", { text: "PERMA 평균(15문항) " }), h("b", { class: "sv-pm", text: f1(c.permaMean15) + " / 10" })));
    const bars = h("div", { class: "svbars" });
    for (const k of s.scoring.core) {
      const prev = pre && cmp ? pre.scores[k] : null;
      bars.append(h("div", { class: "svbar", "data-perma": k }, h("b", { text: k }), h("span", { class: "bn", text: L[k] }),
        h("div", { class: "bt" }, h("i", { class: "cur", style: "width:" + (c[k] * 10) + "%" }), prev != null ? h("i", { class: "prev", style: "left:" + (prev * 10) + "%" }) : null),
        h("em", { class: "bv", text: f1(c[k]) }), h("span", { class: "bd", text: cmp ? "이전 " + f1(prev) + " · " + signed1(Math.round(cmp[k] * 10) / 10) : "" })));
    }
    w.append(bars);
    w.append(h("div", { class: "svextra" }, h("b", { text: "참고 항목" }), ["N", "H", "L", "T"].map((k) => h("span", { class: "sv-x", "data-perma": k, text: L[k] + " " + f1(c[k]) })),
      h("p", { class: "note", text: "부정적 정서·신체적 건강은 PERMA 점수에 포함되지 않는 참고 항목이고, 외로움·종합적 행복감은 한 문항이라 해석에 주의가 필요합니다. 점수는 각 영역 3문항의 평균(0~10)입니다." })));
    if (cmp) w.append(h("p", { class: "note", text: "표식(세로선)은 바로 이전 기록의 점수입니다. 나의 이전 응답과의 차이일 뿐이며, 게임의 효과를 뜻하지 않습니다." }));
    return w;
  }
})();
