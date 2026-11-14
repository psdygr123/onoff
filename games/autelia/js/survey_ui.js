/* 설문 기록 화면(PSS·K-PERMA). 모험일지 > 마음 기록 탭 아래에 붙습니다. 규칙·채점은 survey.js.
   화면 원칙: 문항 원문은 척도 본문 상자에 그대로, 게임 안내 문구는 그 밖에 따로. 응답 초기값 없음. 뒤로·수정 가능. 제출 전 확인. */
window.AU = window.AU || {};
(function () {
  const UI = AU.UI, h = UI.h, btn = UI.btn, S = AU.Survey;
  const state = (UI.survey = { key: null, phase: null, view: "list" });   // view: list | intro | form | confirm | result
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

  function listView(d, rerender) {
    const v = h("div", null, h("h3", { text: "설문 기록" }),
      h("p", { class: "note", text: "게임 이용 전후의 나를 돌아보는 설문입니다. 하지 않아도, 중간에 멈춰도 모험에는 아무 영향이 없고 피로도·은화·전투 능력에도 반영되지 않습니다. 위의 ‘마음 능력치’(현실 미션 활동 기록)와는 별개의 기록입니다." }));
    for (const key of Object.keys(S.KEYS)) {
      const s = S.scale(key), rows = h("div", { class: "svlist", "data-scale": key });
      for (const p of S.PHASES) {
        const sub = S.submissionFor(key, p.id, d), dr = d.drafts[S.dk(key, p.id)], n = dr ? Object.keys(dr.responses).length : 0;
        const status = sub ? "제출함 · " + fmtDate(sub.submittedAt) : n ? "작성 중 (" + n + "/" + s.itemCount + ")" : "아직 안 함";
        rows.append(h("div", { class: "svrow", "data-phase": p.id }, h("b", { text: p.label }), h("span", { class: "tag", text: status }), h("span", { class: "grow" }),
          sub ? btn("결과 보기", "mini", () => { state.key = key; state.phase = p.id; state.view = "result"; rerender(); }, { "data-act": "result" })
            : btn(n ? "이어서 하기" : "시작하기", "mini primary", () => { state.key = key; state.phase = p.id; state.view = n ? "form" : "intro"; rerender(); }, { "data-act": "start" })));
      }
      v.append(h("h4", { class: "svh4", text: NAMES[key] + " · " + s.itemCount + "문항" }), rows);
    }
    v.append(h("p", { class: "note", text: "응답은 이 기기의 저장 공간에만 보관되는 시험 단계입니다. 정식 연구 수집은 연구 동의·승인 절차가 끝난 뒤에 시작합니다." }));
    return v;
  }

  function introView(rerender) {
    const key = state.key, s = S.scale(key), P = S.PHASES.find((p) => p.id === state.phase);
    const what = key === "pss" ? "지난 한 달 동안 느끼고 생각한 것을 묻는 " + s.itemCount + "문항입니다." : "평소의 기분·몰입·관계·의미·성취·건강을 전반적으로 묻는 " + s.itemCount + "문항입니다.";
    const why = key === "pss" ? "게임을 하기 전후에 스트레스를 어떻게 느끼는지의 변화를 함께 살펴보기 위해서입니다." : "게임을 하기 전후에 웰빙(잘 지내는 정도)이 어떻게 달라지는지 함께 살펴보기 위해서입니다.";
    return h("div", null, h("h3", { text: P.label + " · " + s.title }),
      h("div", { class: "svintro" },
        h("p", null, h("b", { text: "무엇을 묻나요  " }), what + " 약 " + MINUTES[key] + "분 걸립니다."),
        h("p", null, h("b", { text: "왜 하나요  " }), why + " 진단 검사가 아니며, 점수에 좋고 나쁨의 기준선이 없습니다."),
        h("p", null, h("b", { text: "알아 두세요  " }), "정답이 없습니다. 하고 싶지 않으면 지금 하지 않아도 되고, 중간에 닫으면 답한 곳까지 저장됩니다. 점수를 올리려고 답을 고를 필요도, 그에 대한 보상도 없습니다.")),
      h("div", { class: "svbtns" }, btn("뒤로", "", () => toList(rerender)), btn("시작", "primary", () => { state.view = "form"; rerender(); }, { "data-act": "begin" })));
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
    const msg = r.valid ? "모든 문항에 답했습니다. 제출하면 이 시점의 응답은 수정할 수 없습니다." : "아직 답하지 않은 문항이 있습니다: " + r.missing.join(", ") + "번";
    const go = btn("제출", "primary", () => {
      const res = S.submit(key, state.phase);
      if (res.ok) { state.view = "result"; AU.G && AU.G.toast && AU.G.toast("설문을 제출했습니다.", "good"); } else if (res.reason === "duplicate" || res.reason === "phase-done") state.view = "result";
      rerender();
    }, { "data-act": "submit" });
    go.disabled = !r.valid;
    return h("div", null, h("h3", { text: "제출 전 확인" }), h("p", { class: "svmsg", text: msg }),
      h("div", { class: "svbtns" }, btn("돌아가서 고치기", "", () => { state.view = "form"; rerender(); }, { "data-act": "back" }), go));
  }

  function resultView(d, rerender) {
    const key = state.key, s = S.scale(key), sub = S.submissionFor(key, state.phase, d), P = S.PHASES.find((p) => p.id === state.phase);
    const v = h("div", null, h("h3", { text: P.label + " · " + NAMES[key] + " 결과" }));
    if (!sub) v.append(h("p", { class: "empty", text: "제출한 기록이 없습니다." }));
    else if (!AU.CONFIG.survey.showResultToParticipant) v.append(h("p", { class: "svmsg", text: "응답이 저장되었습니다. 참여해 주셔서 고맙습니다." }));
    else {
      const pre = state.phase !== "pre" ? S.submissionFor(key, "pre", d) : null, cmp = pre ? S.compare(pre, sub) : null;
      v.append(key === "pss" ? pssResult(sub, cmp) : permaResult(s, sub, pre, cmp));
      if (state.phase !== "pre" && !cmp) v.append(h("p", { class: "note", text: "비교할 수 있는 ‘시작 전 설문’(같은 문항·채점 버전)이 아직 없습니다." }));
      v.append(h("p", { class: "note", text: "이 점수는 진단이 아니며 ‘정상·위험’ 같은 기준선이 없습니다. 점수가 높거나 낮다고 게임에서 달라지는 것은 없습니다. 힘든 마음이 이어진다면 믿을 수 있는 사람이나 전문가와 이야기해 보세요." }));
    }
    v.append(h("div", { class: "svbtns" }, btn("목록으로", "", () => toList(rerender), { "data-act": "tolist" })));
    return v;
  }

  function pssResult(sub, cmp) {
    const c = sub.scores, w = h("div", null, h("div", { class: "svres" },
      h("div", { class: "svr" }, h("span", { text: "부정적 지각" }), h("b", { class: "sv-neg", text: c.negSum + " / 20" }), h("em", { text: "통제할 수 없다·압도된다고 느낀 정도" })),
      h("div", { class: "svr" }, h("span", { text: "긍정적 지각" }), h("b", { class: "sv-pos", text: c.posRawSum + " / 20" }), h("em", { text: "대처하고 있다·통제하고 있다고 느낀 정도" })),
      h("div", { class: "svr" }, h("span", { text: "합계(참고용)" }), h("b", { class: "sv-tot", text: c.total + " / 40" }), h("em", { text: "긍정적 지각 문항을 뒤집어 더한 값: ‘부정적 지각’과 ‘긍정적 지각의 부족’이 함께 담겨 있습니다" }))));
    if (cmp) w.append(h("div", { class: "svcmp" }, h("b", { text: "시작 전 설문과 비교" }), h("span", { text: "부정적 지각 " + signed(cmp.negSum) }), h("span", { text: "긍정적 지각 " + signed(cmp.posRawSum) }), h("span", { text: "합계 " + signed(cmp.total) }),
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
    if (cmp) w.append(h("p", { class: "note", text: "표식(세로선)은 시작 전 설문의 점수입니다. 나의 이전 응답과의 차이일 뿐이며, 게임의 효과를 뜻하지 않습니다." }));
    return w;
  }
})();
