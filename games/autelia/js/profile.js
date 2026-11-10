/* 캐릭터 설정(닉네임·모습): 저장 정보, 대사 호칭 치환, 설정 화면 */
(function () {
  "use strict";
  const AU = window.AU, NAME_RE = /^[가-힣A-Za-z0-9]{2,8}$/, DEFAULT_NAME = "주인공";

  /* 한국어 조사 선택: 마지막 글자의 받침 유무. 한글이 아닌 끝글자는 숫자·l m n r 만 받침 있는 것으로 봄(영문 이름은 읽는 소리와 다를 수 있음) */
  const PARTICLES = { "이": ["이", "가"], "은": ["은", "는"], "을": ["을", "를"], "아": ["아", "야"], "과": ["과", "와"] };
  function hasBatchim(s) {
    const c = s.charAt(s.length - 1), code = c.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28 !== 0;
    if (/[0136780]/.test(c)) return true;
    return /[lmnrLMNR]/.test(c);
  }

  const Profile = AU.Profile = {
    NAME_RE, DEFAULT_NAME,
    /* 저장값 정리: 이름은 규칙에 맞을 때만, 모습은 m/f 만 인정 */
    clean(p) {
      const o = p && typeof p === "object" ? p : {};
      return { name: typeof o.name === "string" && NAME_RE.test(o.name) ? o.name : "", gender: o.gender === "m" || o.gender === "f" ? o.gender : "" };
    },
    get() { return (AU.G && AU.G.S && AU.G.S.profile) || { name: "", gender: "" }; },
    isSet() { const p = this.get(); return !!p.name && !!p.gender; },
    name() { return this.get().name || DEFAULT_NAME; },
    gender() { return this.get().gender === "f" ? "f" : "m"; },
    portraitKey() { return this.gender() === "f" ? "pt_player_female" : "pt_player_male"; },
    /* 검사: 통과하면 null, 아니면 안내 문구 */
    check(raw) {
      const s = String(raw == null ? "" : raw).trim();
      if (!s) return "닉네임을 입력해 주세요.";
      if (Array.from(s).length < 2) return "2자 이상 입력해 주세요.";
      if (Array.from(s).length > 8) return "8자 이하로 입력해 주세요.";
      if (!NAME_RE.test(s)) return "한글, 영문, 숫자만 쓸 수 있습니다(띄어쓰기·특수문자 불가).";
      return null;
    },
    /* 현재 설정을 화면·대사에 반영(프롤로그 주인공 그림과 대사창 화자) */
    apply() {
      AU.PRO_GENDER = this.gender();
      const SP = AU.PRO_SPEAKERS, g = this.gender();
      if (SP && SP.hero) { Object.assign(SP.hero, { name: this.name(), portrait: g === "f" ? "pt_pro_hero_f" : "pt_pro_hero_m", alt: this.portraitKey() }); }
      if (SP && SP.heroS) { Object.assign(SP.heroS, { name: this.name(), portrait: g === "f" ? "pt_pro_hero_f" : "pt_pro_hero_m_surprised", alt: this.portraitKey() }); }
    },
    set(name, gender) {
      const S = AU.G.S; S.profile = this.clean({ name: String(name).trim(), gender }); this.apply(); return S.profile;
    },
    /* 대사 속 호칭: {이름} {이름이} {이름은} {이름을} {이름아} {이름과} → 닉네임(+조사) */
    fmt(text) {
      if (typeof text !== "string" || text.indexOf("{이름") < 0) return text;
      const n = this.name();
      return text.replace(/\{이름([이은을아과])?\}/g, (m, p) => p ? n + PARTICLES[p][hasBatchim(n) ? 0 : 1] : n);
    },

    /* ---------- 설정 화면 ---------- */
    sheetStyle(g) { // 대기 자세 1장(프롤로그 정식 그림)을 CSS 배경으로 잘라 보여 줌
      const key = "pc_player_" + g + "_actions", m = AU.PRO_ART && AU.PRO_ART.ch && AU.PRO_ART.ch["player_" + g + "_actions"];
      if (m && AU.Img.has(key)) return { cls: "sp", css: "width:" + m.cw + "px;height:" + m.ch + "px;background-image:url(" + AU.ASSETS[key].path + ");" };
      const pk = g === "f" ? "pt_player_female" : "pt_player_male";
      return { cls: "sp fb", css: "background-image:url(" + AU.ASSETS[pk].path + ");" };
    },
    /* root: 화면을 그릴 요소(#title), opts: { mode:"new"|"edit", initial:{name,gender}, onDone(name,gender), onBack() } */
    openSetup(root, opts) {
      const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
      const init = this.clean(opts.initial), st = { name: init.name, gender: init.gender || "m" }, edit = opts.mode === "edit";
      root.innerHTML = "";
      const box = h("div", "panel setupbox"); box.id = "charsetup"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "캐릭터 설정");
      box.append(h("p", "stitle", edit ? "캐릭터 설정" : "캐릭터 만들기"), h("p", "ssub", edit ? "닉네임과 모습을 바꿀 수 있습니다. 진행 기록은 그대로 유지됩니다." : "모험을 시작하기 전에 이름과 모습을 정해 주세요. 시작 전에는 언제든 돌아와 바꿀 수 있습니다."));
      const body = h("div", "sbody"), left = h("div"), right = h("div", "sright");
      left.append(h("div", "slabel", "모습"));
      const cards = h("div", "scards"); cards.setAttribute("role", "radiogroup"); cards.setAttribute("aria-label", "모습");
      const cardEls = {};
      for (const [g, label] of [["m", "남성형"], ["f", "여성형"]]) {
        const c = h("button", "scard"); c.type = "button"; c.setAttribute("role", "radio"); c.dataset.gender = g; c.id = "sg-" + g;
        const sp = this.sheetStyle(g), s = h("div", sp.cls); s.style.cssText = sp.css; c.append(h("i", "chk", "✓"), s, h("b", null, label));
        c.onclick = () => select(g); c.onkeydown = (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); select(g === "m" ? "f" : "m", true); } };
        cards.append(c); cardEls[g] = c;
      }
      left.append(cards);
      right.append(h("label", "slabel", "닉네임"));
      right.lastChild.htmlFor = "sname";
      const inp = h("input"); inp.id = "sname"; inp.type = "text"; inp.maxLength = 12; inp.autocomplete = "off"; inp.spellcheck = false; inp.placeholder = "2~8자"; inp.value = st.name; inp.setAttribute("aria-describedby", "shint");
      const hint = h("p", "shint", "2~8자 · 한글, 영문, 숫자 · 대사창에서 \"주인공\" 대신 이 이름으로 표시됩니다"); hint.id = "shint";
      const prev = h("div", "sprev"), pl = h("div", "sprevl", "대사창 미리보기"), pn = h("b"), pt = h("span", null, "“...여기서부터 시작이야.”");
      prev.append(pl, h("div", null, ""));
      prev.lastChild.append(pn, document.createTextNode(" "), pt);
      right.append(inp, hint, prev);
      body.append(left, right);
      const foot = h("div", "sfoot"), back = h("button", "btn", edit ? "취소" : "뒤로"); back.type = "button"; back.id = "setup-back";
      const ok = h("button", "btn primary big", edit ? "저장" : "이 모습으로 시작"); ok.type = "button"; ok.id = "setup-ok";
      foot.append(back, ok); box.append(body, foot); root.append(box); root.classList.remove("hidden");

      const select = (g, focus) => { st.gender = g; for (const k of ["m", "f"]) { cardEls[k].classList.toggle("sel", k === g); cardEls[k].setAttribute("aria-checked", k === g ? "true" : "false"); cardEls[k].tabIndex = k === g ? 0 : -1; } if (focus) cardEls[g].focus(); };
      const refresh = (showErr) => {
        const err = this.check(inp.value);
        pn.textContent = (inp.value.trim() || DEFAULT_NAME); ok.disabled = !!err;
        hint.classList.toggle("err", !!err && (showErr || inp.value.length > 0));
        hint.textContent = err && (showErr || inp.value.length > 0) ? err : "2~8자 · 한글, 영문, 숫자 · 대사창에서 \"주인공\" 대신 이 이름으로 표시됩니다";
        return !err;
      };
      const done = () => { if (!refresh(true)) { inp.focus(); return; } opts.onDone(inp.value.trim(), st.gender); };
      inp.addEventListener("input", () => refresh(false));
      inp.addEventListener("keydown", (e) => { if (e.isComposing) return; if (e.key === "Enter") { e.preventDefault(); done(); } });
      box.addEventListener("keydown", (e) => { if (e.key === "Escape" && !e.isComposing) { e.preventDefault(); opts.onBack(); } });
      ok.onclick = done; back.onclick = () => opts.onBack();
      select(st.gender); refresh(false); inp.focus(); inp.select();
    }
  };
})();
