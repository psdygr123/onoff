/* 화면별 구조. 각 화면은 { title, render(ctx) -> html, mount(root, ctx) } 형태입니다. */
window.OnOff = window.OnOff || {};
OnOff.Views = (function () {
  const { esc, field, checks, V, setError, toast, val, vals, icons } = OnOff.UI;
  const S = OnOff.State;
  const GAMES = OnOff.GAMES;
  const first = () => GAMES.find((g) => g.status !== "soon");
  const go = (to) => { location.hash = to; };

  /* ---------- 공통 조각 ---------- */
  function gameCard(g) {
    const user = S.user;
    const soon = g.status === "soon";
    const save = user ? S.getSave(g.id) : null;
    let cta;
    if (soon) cta = `<button class="btn ghost sm" type="button" disabled aria-disabled="true">준비 중</button>`;
    else cta = `<button class="btn sm" type="button" data-action="open-game" data-id="${g.id}">${save ? "이어하기" : "게임 시작"}</button>`;
    const art = soon
      ? `<div class="card-art soon">${icons.soon}<span class="badge soon">${esc(g.statusLabel)}</span></div>`
      : `<div class="card-art"><img src="${g.cover}" alt="${esc(g.title)} 대표 이미지: 노을 진 항구에 정박한 범선" loading="lazy" width="1000" height="720"><span class="badge">${esc(g.statusLabel)}</span></div>`;
    return `<article class="card">${art}<div class="card-body">
      <h3>${esc(g.title)}</h3>
      <div class="card-meta">${esc(g.genre)}${soon ? "" : " · 플레이 연결 전 (시제품)"}</div>
      <div><p>${esc(g.summary)}</p>${g.audienceNote ? `<p class="card-aud">${esc(g.audienceNote)}</p>` : ""}</div>
      <div class="card-foot">${cta}${!soon ? `<button class="btn ghost sm" type="button" data-action="go" data-to="intro-${g.id}">시작 전 안내</button>` : ""}</div>
    </div></article>`;
  }

  /* ---------- 홈 ---------- */
  let io = null;
  // 홈 배너: 게임이 아니라 서비스·이용 방식을 소개합니다. 문구는 기존 홈·서비스 소개 화면의 내용을 그대로 씁니다.
  const BANNERS = [
    { label: "일상 밖의 모험", sub: "온앤오프 소개", kicker: "심리학 전공자들이 만든 성장형 게임", title: "<span>일상 밖의 모험,</span><span><em>일상 속</em>의 성장</span>",
      text: "이야기 속 작은 선택과 경험이 쌓여, 일상의 변화로 이어지는 여정을 함께합니다.", img: "img/hero.webp", pos: "50% 30%",
      alt: "노을빛 바다와 언덕 위 마을이 내려다보이는 판타지 풍경", cta: '<button class="btn" type="button" data-action="scroll" data-target="lib">게임 둘러보기</button>' },
    { label: "직접 만듭니다", sub: "심리학 전공자들", kicker: "온앤오프의 약속", title: "<span>심리학 전공자들이</span><span>직접 만듭니다</span>",
      text: "심리학 이론을 바탕으로 기획하고, 효과가 입증되었다고 말하지 않으며 할 수 있는 만큼만 약속합니다.", img: "img/about-forest.webp", pos: "50% 60%",
      alt: "햇살이 비치는 숲길", cta: '<button class="btn" type="button" data-action="go" data-to="about">서비스 소개 보기</button>' },
    { label: "하루 몇 분이어도", sub: "쉬어 가도 괜찮은 여정", kicker: "내 속도로", title: "<span>하루 몇 분이어도</span><span>괜찮아요</span>",
      text: "게임마다 진행 기록이 따로 저장되어, 언제든 이어서 할 수 있습니다.", img: "img/game-maeum.webp", pos: "30% 60%",
      alt: "노을 진 항구에 정박한 범선", cta: '<button class="btn" type="button" data-action="start">모험 시작하기</button>' }
  ];

  const home = {
    render() {
      const user = S.user, g = first(), save = user ? S.getSave(g.id) : null;
      const g0 = GAMES[0], it = g0.intro || { who: "", purpose: "", parts: [], partsNote: "" };
      const slides = BANNERS.map((b, i) => `<div class="slide${i === 0 ? " on" : ""}" id="slide-${i}" role="group" aria-roledescription="슬라이드" aria-label="${i + 1} / ${BANNERS.length}" ${i === 0 ? "" : 'aria-hidden="true"'}>
          <img src="${b.img}" alt="${esc(b.alt)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} width="1280" height="720" style="object-position:${b.pos}">
          <div class="slide-shade"></div>
          <div class="slide-copy"><p class="eyebrow">${esc(b.kicker)}</p><h2 class="slide-title">${b.title}</h2><p>${esc(b.text)}</p>
            <div class="hero-actions">${b.cta}</div></div></div>`).join("");
      const list = BANNERS.map((b, i) => `<button class="banner-item${i === 0 ? " on" : ""}" type="button" data-idx="${i}" aria-controls="slide-${i}" aria-current="${i === 0 ? "true" : "false"}">
          <img src="${b.img}" alt="" width="160" height="160" loading="lazy" style="object-position:${b.pos}"><span><b>${esc(b.label)}</b><small>${esc(b.sub)}</small></span><i class="bar" aria-hidden="true"></i></button>`).join("");
      return `
      <div class="wrap">
        <h1 class="sr-only">온앤오프 — 심리학 전공자들이 만든 성장형 게임 플랫폼</h1>
        <section class="banner" aria-roledescription="캐러셀" aria-label="온앤오프 소개 배너">
          <div class="banner-main">${slides}
            <button class="banner-ctrl" type="button" data-banner="toggle" aria-label="자동 넘김 멈춤">❚❚</button>
            <div class="banner-dots" aria-hidden="true">${BANNERS.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("")}</div>
          </div>
          <div class="banner-list" role="group" aria-label="배너 목록">${list}</div>
        </section>
        <p class="banner-foot">당신의 성장과 행복 그리고 정신건강에 도움을 제공하는 심리서비스</p>
      </div>
      <section class="section tint reveal" id="lib" aria-labelledby="lib-title"><div class="wrap">
        <div class="section-head"><p class="eyebrow">추천 게임</p><h2 id="lib-title">지금 만날 수 있는 게임</h2><p>하나의 계정으로 게임을 고르고, 게임마다 따로 저장됩니다.</p></div>
        <div class="cards">${GAMES.map(gameCard).join("")}</div>
      </div></section>
      <section class="section reveal" aria-labelledby="gi-title"><div class="wrap">
        <div class="section-head"><p class="eyebrow">게임 소개</p><h2 id="gi-title">${esc(g0.title)}는 이런 게임입니다</h2></div>
        <div class="tabs" role="tablist" aria-label="게임 소개 항목">
          <button class="tab on" type="button" role="tab" id="tab-0" aria-selected="true" aria-controls="tp-0" data-tab="0">이런 게임이에요</button>
          <button class="tab" type="button" role="tab" id="tab-1" aria-selected="false" aria-controls="tp-1" data-tab="1" tabindex="-1">이렇게 즐겨요</button>
          <button class="tab" type="button" role="tab" id="tab-2" aria-selected="false" aria-controls="tp-2" data-tab="2" tabindex="-1">이런 분께</button>
        </div>
        <div class="panel tabpanels">
          <div class="tabpanel on" role="tabpanel" id="tp-0" aria-labelledby="tab-0"><p class="lead">${esc(g0.summary)}</p><p class="lead">${esc(it.purpose ? "이 게임이 바라는 것: " + it.purpose + "." : "")}</p></div>
          <div class="tabpanel" role="tabpanel" id="tp-1" aria-labelledby="tab-1" hidden><ul class="checklist">${it.parts.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${it.partsNote ? `<p class="hero-foot">${esc(it.partsNote)}</p>` : ""}</div>
          <div class="tabpanel" role="tabpanel" id="tp-2" aria-labelledby="tab-2" hidden><p class="lead">${esc(it.who)}</p><p class="lead">${esc(g0.audienceNote)}</p></div>
        </div>
      </div></section>
      <section class="section reveal" aria-labelledby="feat-title"><div class="wrap">
        <div class="section-head"><p class="eyebrow">온앤오프의 방식</p><h2 id="feat-title">천천히, 내 속도로 즐기는 모험</h2></div>
        <div class="features">
          <div class="feature"><div class="ico">${icons.compass}</div><h3>이야기 속에서 즐기는 모험</h3><p>낯선 지도를 걷고, 단서를 모으고, 캐릭터를 키웁니다. 재미있는 모험이 먼저입니다.</p></div>
          <div class="feature"><div class="ico">${icons.branch}</div><h3>선택이 쌓이며 보이는 나</h3><p>갈림길에서 내린 선택들이 모이면서, 내가 어떤 선택을 좋아하는지 자연스럽게 알게 됩니다.</p></div>
          <div class="feature"><div class="ico">${icons.link}</div><h3>쉬어 가도 괜찮은 여정</h3><p>하루에 몇 분이어도 좋습니다. 게임마다 진행 기록이 따로 저장되어, 언제든 이어서 할 수 있습니다.</p></div>
        </div>
      </div></section>
      <section class="section tint reveal" aria-labelledby="about-title"><div class="wrap split">
        <div class="art"><img src="img/about-forest.webp" alt="햇살이 비치는 숲길" loading="lazy" width="1100" height="720"></div>
        <div class="copy">
          <p class="eyebrow">서비스 소개</p>
          <h2 id="about-title">게임 속 경험이 일상에 닿기를</h2>
          <p class="lead">온앤오프는 정신건강에 관심을 가진 성인을 위해 기획했습니다. 이용하시는 분들의 행복을 기원하고, 성장을 함께 꿈꾸는 마음으로 만들었습니다.</p><p class="lead">현실에서 잠시 벗어나 쉬어 가는 곳에 머물지 않고, 게임에서 쌓은 경험이 현실의 하루에도 좋은 영향을 주기를 바랍니다.</p>
          <ul class="checklist">
            <li>심리학 이론을 바탕으로, 심리학을 전공한 사람들이 직접 만듭니다.</li>
            <li>효과가 입증되었다고 말하지 않고, 할 수 있는 만큼만 약속합니다.</li>
            <li>가입과 게임 이용은 연구 참여와 별개입니다.</li>
          </ul>
          <div><button class="btn ghost" type="button" data-action="go" data-to="about">자세히 보기</button></div>
        </div>
      </div></section>`;
    },
    mount(root) {
      const banner = root.querySelector(".banner"); if (!banner) return;
      const slides = Array.from(banner.querySelectorAll(".slide")), items = Array.from(banner.querySelectorAll(".banner-item")), dots = Array.from(banner.querySelectorAll(".banner-dots i"));
      const ctrl = banner.querySelector(".banner-ctrl"), reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      let idx = 0, paused = reduce;
      const apply = () => { banner.classList.toggle("paused", paused); ctrl.textContent = paused ? "▶" : "❚❚"; ctrl.setAttribute("aria-label", paused ? "자동 넘김 시작" : "자동 넘김 멈춤"); banner.querySelector(".banner-main").setAttribute("aria-live", paused ? "polite" : "off"); };
      const show = (i) => {
        idx = (i + slides.length) % slides.length;
        slides.forEach((el, k) => { el.classList.toggle("on", k === idx); el.setAttribute("aria-hidden", k === idx ? "false" : "true"); });
        items.forEach((el, k) => { el.classList.toggle("on", k === idx); el.setAttribute("aria-current", k === idx ? "true" : "false"); const bar = el.querySelector(".bar"); bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; });
        dots.forEach((el, k) => el.classList.toggle("on", k === idx));
      };
      banner.addEventListener("click", (e) => {
        const it = e.target.closest(".banner-item"); if (it) { show(+it.dataset.idx); return; }
        if (e.target.closest("[data-banner='toggle']")) { paused = !paused; apply(); }
      });
      banner.addEventListener("animationend", (e) => { if (e.target.classList.contains("bar") && !paused) show(idx + 1); });
      let hold = false; const hoverOn = () => { hold = true; banner.classList.add("hold"); }, hoverOff = () => { hold = false; banner.classList.remove("hold"); };
      banner.addEventListener("mouseenter", hoverOn); banner.addEventListener("mouseleave", hoverOff); banner.addEventListener("focusin", hoverOn); banner.addEventListener("focusout", hoverOff);
      apply(); show(0);
      // 게임 소개 탭
      const tabs = Array.from(root.querySelectorAll(".tab")), panels = Array.from(root.querySelectorAll(".tabpanel"));
      const pick = (i, focus) => { tabs.forEach((t, k) => { t.classList.toggle("on", k === i); t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; }); panels.forEach((p, k) => { p.classList.toggle("on", k === i); p.hidden = k !== i; }); if (focus) tabs[i].focus(); };
      tabs.forEach((t, k) => { t.addEventListener("click", () => pick(k)); t.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { e.preventDefault(); pick((k + 1) % tabs.length, true); } else if (e.key === "ArrowLeft") { e.preventDefault(); pick((k + tabs.length - 1) % tabs.length, true); } }); });
      // 스크롤하면 부드럽게 나타남(움직임 줄이기 설정이면 생략)
      const els = Array.from(root.querySelectorAll(".reveal"));
      if ("IntersectionObserver" in window && !reduce) {
        els.forEach((el) => el.classList.add("pre"));
        io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.remove("pre"); io.unobserve(en.target); } }), { threshold: 0.12 });
        els.forEach((el) => io.observe(el));
      }
    },
    unmount() { if (io) { io.disconnect(); io = null; } }
  };

  /* ---------- 게임 둘러보기 ---------- */
  const games = {
    render() {
      return `<div class="wrap page">
        <div class="section-head"><p class="eyebrow">게임 라이브러리</p><h1 style="font-family:var(--font-display);font-size:var(--fs-2xl)">게임 둘러보기</h1>
        <p>${S.user ? "이용 중인 게임은 ‘이어하기’로 표시됩니다." : "게임을 시작하려면 로그인이 필요합니다."}</p></div>
        <div class="cards">${GAMES.map(gameCard).join("")}</div>
        <p class="note" style="margin-top:28px">출시 예정 카드는 자리만 마련해 둔 것이며, 장르와 일정은 정해진 것이 없습니다.</p>
      </div>`;
    }
  };

  /* ---------- 서비스 소개 ---------- */
  const about = {
    render() {
      return `<div class="wrap page"><div class="page-narrow" style="max-width:720px;display:grid;gap:28px">
        <div class="section-head" style="margin:0"><p class="eyebrow">서비스 소개</p><h1 style="font-family:var(--font-display);font-size:var(--fs-2xl)">일상 밖의 모험, 일상 속의 성장</h1></div>
        <p class="lead" style="max-width:none">온앤오프는 심리학 전공자들이 만든 성장형 게임 플랫폼입니다. 정신건강에 관심을 가진 성인이 하나의 계정으로 여러 게임을 즐기며, 행복과 성장에 한 걸음 가까워지기를 바랍니다.</p>
        <div class="panel"><h2>미리 알려 드립니다</h2><ul class="checklist"><li>치료를 기반으로 한 서비스는 아니며, 의료·상담을 대신하지 않습니다.</li><li>효과가 입증되었다고 말하지 않습니다.</li><li>연구 참여를 가입의 조건으로 요구하지 않습니다.</li></ul></div>
        <div class="panel"><h2>계정과 저장 데이터</h2><p>하나의 계정으로 여러 게임을 이용합니다. 게임별 캐릭터와 진행 기록은 서로 독립적으로 저장되도록 설계했습니다.</p></div>
        <div><button class="btn" type="button" data-action="go" data-to="games">게임 둘러보기</button></div>
      </div></div>`;
    }
  };

  /* ---------- 로그인 ---------- */
  const login = {
    render() {
      const why = S.pending ? `<div class="note">게임을 시작하려면 로그인이 필요합니다. 로그인하면 바로 이어서 진행합니다.</div>` : "";
      return `<div class="wrap page"><div class="page-narrow">
        <form class="panel" id="login-form" novalidate>
          <h1>로그인</h1>${why}
          <div class="note err summary-err" id="login-summary" role="alert" tabindex="-1"></div>
          ${field({ id: "li-email", name: "email", label: "이메일", type: "email", auto: "email", required: true })}
          ${field({ id: "li-pw", name: "password", label: "비밀번호", type: "password", auto: "current-password", required: true })}
          <button class="btn block" type="submit">로그인</button>
          <div class="link-row"><button type="button" data-action="go" data-to="reset">비밀번호를 잊으셨나요?</button><button type="button" data-action="go" data-to="signup">회원가입</button></div>
          <hr style="border:0;border-top:1px solid var(--line);width:100%">
          <div class="note"><strong>시제품 안내</strong> 실제 인증은 아직 없습니다. 이 화면에서 가입한 계정으로만 로그인되며, 새로고침하면 사라집니다. 화면 구성을 보려면 체험 계정을 쓰세요.</div>
          <button class="btn ghost block" type="button" data-action="demo">체험 계정으로 둘러보기</button>
        </form></div></div>`;
    },
    mount(root) {
      const form = root.querySelector("#login-form"), sum = root.querySelector("#login-summary");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = val(form, "email").trim(), pw = val(form, "password");
        const e1 = V.email(email), e2 = pw ? "" : "비밀번호를 입력해 주세요.";
        setError(form, "li-email", e1); setError(form, "li-pw", e2);
        sum.classList.remove("show");
        if (e1 || e2) { form.querySelector(e1 ? "#li-email" : "#li-pw").focus(); return; }
        const r = S.login(email, pw);
        if (!r.ok) { sum.textContent = "이메일 또는 비밀번호가 맞지 않습니다. 시제품에서는 이 화면에서 가입한 계정만 쓸 수 있습니다."; sum.classList.add("show"); sum.focus(); return; }
        toast("로그인했습니다.");
        const p = S.pending; S.pending = null; go(p || "games");
      });
    }
  };

  /* ---------- 비밀번호 재설정 ---------- */
  const reset = {
    render() {
      return `<div class="wrap page"><div class="page-narrow">
        <form class="panel" id="reset-form" novalidate>
          <h1>비밀번호 재설정</h1>
          <p style="color:var(--ink-2)">가입한 이메일을 입력하면 재설정 안내를 받는 화면입니다.</p>
          ${field({ id: "rs-email", name: "email", label: "이메일", type: "email", auto: "email", required: true })}
          <button class="btn block" type="submit">재설정 안내 요청</button>
          <div id="reset-result" role="status"></div>
          <div class="link-row"><button type="button" data-action="go" data-to="login">로그인으로 돌아가기</button></div>
        </form></div></div>`;
    },
    mount(root) {
      const form = root.querySelector("#reset-form"), out = root.querySelector("#reset-result");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const em = val(form, "email").trim(), err = V.email(em);
        setError(form, "rs-email", err);
        if (err) { out.innerHTML = ""; form.querySelector("#rs-email").focus(); return; }
        out.innerHTML = `<div class="note"><strong>시제품 안내</strong> 입력한 형식은 올바릅니다. 시제품에는 메일 서버가 없어 실제로 메일을 보내지 않았습니다. 서비스 출시 때 이 자리에서 재설정 안내를 보냅니다.</div>`;
      });
    }
  };

  /* ---------- 회원가입 (4단계) ---------- */
  const STEPS = ["계정", "기본정보", "이용 목표", "동의"];
  const signup = {
    render() {
      return `<div class="wrap page"><div class="page-narrow">
        <form class="panel" id="su-form" novalidate>
          <h1>회원가입</h1>
          <ol class="steps" aria-label="가입 단계">${STEPS.map((s, i) => `<li data-step="${i}">${i + 1}. ${s}</li>`).join("")}</ol>
          <div class="note err summary-err" id="su-summary" role="alert" tabindex="-1"></div>

          <fieldset data-pane="0" style="border:0;padding:0;margin:0;display:grid;gap:20px;min-width:0"><legend class="sr-only">계정 만들기</legend>
            ${field({ id: "su-email", name: "email", label: "이메일", type: "email", auto: "email", required: true })}
            ${field({ id: "su-pw", name: "password", label: "비밀번호", type: "password", auto: "new-password", required: true, hint: "8자 이상, 영문과 숫자를 함께 넣어 주세요." })}
            ${field({ id: "su-pw2", name: "password2", label: "비밀번호 확인", type: "password", auto: "new-password", required: true })}
          </fieldset>

          <fieldset data-pane="1" hidden style="border:0;padding:0;margin:0;display:grid;gap:20px;min-width:0"><legend class="sr-only">기본정보</legend>
            ${field({ id: "su-name", name: "name", label: "이름", auto: "name", required: true })}
            <div class="field" data-field="su-gender" id="su-gender" tabindex="-1"><span class="legend" id="su-gender-l">성별</span>${checks("gender", OnOff.GENDERS, [], "radio", true)}<div class="err-msg" id="su-gender-err" role="alert"></div></div>
            <div class="field" data-field="su-adult"><label class="choice"><input type="checkbox" id="su-adult" name="adult"><span>만 19세 이상 성인입니다.</span></label><div class="err-msg" id="su-adult-err" role="alert"></div></div>
          </fieldset>

          <fieldset data-pane="2" hidden style="border:0;padding:0;margin:0;display:grid;gap:20px;min-width:0"><legend class="sr-only">이용 목표</legend>
            <div class="field"><span class="legend">온앤오프를 통해 얻고 싶은 점 <span class="hint">(여러 개 선택, 건너뛰어도 됩니다)</span></span>${checks("goals", OnOff.GOALS, [], "checkbox", true)}</div>
            ${field({ id: "su-goal-free", name: "goalsFree", label: "직접 적기", area: true, max: 200 })}
          </fieldset>

          <fieldset data-pane="3" hidden style="border:0;padding:0;margin:0;display:grid;gap:16px;min-width:0"><legend class="sr-only">약관 동의</legend>
            <div class="field" data-field="su-terms"><label class="choice"><input type="checkbox" id="su-terms" name="terms"><span><b>[필수]</b> 서비스 이용약관에 동의합니다. <a href="#terms" target="_blank" rel="noopener">내용 보기</a></span></label><div class="err-msg" id="su-terms-err" role="alert"></div></div>
            <div class="field" data-field="su-privacy"><label class="choice"><input type="checkbox" id="su-privacy" name="privacy"><span><b>[필수]</b> 개인정보 처리 안내를 확인했습니다. <a href="#privacy" target="_blank" rel="noopener">내용 보기</a></span></label><div class="err-msg" id="su-privacy-err" role="alert"></div></div>
            <div class="note"><strong>연구 참여는 가입과 별개입니다.</strong> 연구 참여 안내와 동의는 절차가 정해진 뒤 별도로 제공되며, 이 가입 과정에 포함되지 않습니다.</div>
            <div class="note"><strong>시제품 안내</strong> 입력한 정보는 서버로 전송되지 않고, 이 탭을 새로고침하면 사라집니다. 실제 개인정보는 입력하지 않아도 됩니다.</div>
          </fieldset>

          <div class="form-actions">
            <button class="btn ghost" type="button" data-su="prev">이전</button>
            <button class="btn" type="button" data-su="next">다음</button>
            <button class="btn" type="submit" data-su="done" hidden>가입 완료</button>
          </div>
          <div class="link-row"><span>이미 계정이 있나요?</span><button type="button" data-action="go" data-to="login">로그인</button></div>
        </form></div></div>`;
    },
    mount(root) {
      const form = root.querySelector("#su-form"), sum = root.querySelector("#su-summary");
      const panes = Array.from(form.querySelectorAll("[data-pane]")), lis = Array.from(form.querySelectorAll(".steps li"));
      const prev = form.querySelector('[data-su="prev"]'), next = form.querySelector('[data-su="next"]'), done = form.querySelector('[data-su="done"]');
      let step = 0;

      const validate = (n) => {
        let first = null;
        const set = (id, msg) => { setError(form, id, msg); if (msg && !first) first = form.querySelector("#" + id); };
        if (n === 0) {
          const em = val(form, "email").trim(), pw = val(form, "password"), p2 = val(form, "password2");
          let e1 = V.email(em); if (!e1 && S.emailTaken(em)) e1 = "이미 이 화면에서 가입한 이메일입니다.";
          set("su-email", e1); set("su-pw", V.password(pw));
          set("su-pw2", p2 ? (p2 === pw ? "" : "비밀번호가 서로 다릅니다.") : "비밀번호를 한 번 더 입력해 주세요.");
        }
        if (n === 1) {
          set("su-name", V.required(val(form, "name"), "이름을 입력해 주세요."));
          set("su-gender", vals(form, "gender").length ? "" : "성별을 선택해 주세요.");
          set("su-adult", form.querySelector("#su-adult").checked ? "" : "성인만 가입할 수 있습니다. 확인란을 체크해 주세요.");
        }
        if (n === 3) {
          set("su-terms", form.querySelector("#su-terms").checked ? "" : "이용약관 동의가 필요합니다.");
          set("su-privacy", form.querySelector("#su-privacy").checked ? "" : "개인정보 처리 안내 확인이 필요합니다.");
        }
        sum.classList.remove("show");
        if (first) { sum.textContent = "입력을 확인해 주세요. 표시된 항목을 고치면 다음으로 넘어갈 수 있습니다."; sum.classList.add("show"); first.focus(); return false; }
        return true;
      };
      const show = (n) => {
        step = n;
        panes.forEach((p, i) => { p.hidden = i !== n; });
        lis.forEach((li, i) => { li.toggleAttribute("aria-current", i === n); if (i === n) li.setAttribute("aria-current", "step"); li.classList.toggle("done", i < n); });
        prev.hidden = n === 0; next.hidden = n === STEPS.length - 1; done.hidden = n !== STEPS.length - 1;
        const f = panes[n].querySelector("input,textarea"); if (f) f.focus();
      };
      next.addEventListener("click", () => { if (validate(step)) show(step + 1); });
      prev.addEventListener("click", () => show(step - 1));
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!validate(3)) return;
        const r = S.register({
          email: val(form, "email").trim(), name: val(form, "name").trim(), gender: vals(form, "gender")[0] || "", adult: true,
          goals: vals(form, "goals"), goalsFree: val(form, "goalsFree").trim(),
          consents: { terms: new Date().toLocaleDateString("ko-KR"), privacy: new Date().toLocaleDateString("ko-KR") }
        }, val(form, "password"));
        if (!r.ok) { show(0); setError(form, "su-email", "이미 이 화면에서 가입한 이메일입니다."); return; }
        toast("가입했습니다. (시제품: 실제 계정은 만들어지지 않았습니다)");
        const p = S.pending; S.pending = null; go(p || "games");
      });
      show(0);
    }
  };

  /* ---------- 마이페이지 ---------- */
  const mypage = {
    render() {
      const u = S.user;
      const gname = (OnOff.GENDERS.find((g) => g.id === u.gender) || {}).label || "입력 안 함";
      const goals = u.goals.map((id) => (OnOff.GOALS.find((g) => g.id === id) || {}).label).filter(Boolean);
      const rows = GAMES.filter((g) => g.status !== "soon").map((g) => {
        const sv = S.getSave(g.id);
        return `<div class="game-row"><img src="${g.cover}" alt="" width="96" height="64"><div><h3>${esc(g.title)}</h3>
          <p>${sv ? `${esc(sv.label)}${sv.percent != null ? " · " + sv.percent + "%" : ""} · 마지막 기록 ${esc(sv.updatedAt)}` : "아직 시작하지 않았습니다."}</p>
          ${sv && sv.example ? '<span class="tag example">예시 데이터</span>' : ""}${sv && sv.test ? '<span class="tag example">연결 시험 기록</span>' : ""}</div>
          <button class="btn sm ${sv ? "" : "ghost"}" type="button" data-action="open-game" data-id="${g.id}">${sv ? "이어하기" : "게임 시작"}</button></div>`;
      }).join("");
      return `<div class="wrap page"><div class="account-grid">
        <nav class="side" aria-label="마이페이지 메뉴">
          <a href="#mypage" data-action="scroll" data-target="sec-account">계정 정보</a>
          <a href="#mypage" data-action="scroll" data-target="sec-goals">이용 목표</a>
          <a href="#mypage" data-action="scroll" data-target="sec-games">이용 중인 게임</a>
          <a href="#mypage" data-action="scroll" data-target="sec-consent">동의 관리</a>
          <a href="#mypage" data-action="scroll" data-target="sec-leave">로그아웃·탈퇴</a>
        </nav>
        <div class="stack">
          <h1 style="font-family:var(--font-display);font-size:var(--fs-2xl)">마이페이지</h1>
          ${u.demo ? '<div class="note"><strong>체험 계정</strong> 화면 구성을 보여 주기 위한 예시 데이터입니다. 실제 이용 기록이 아닙니다.</div>' : ""}

          <section class="panel" id="sec-account" aria-labelledby="h-account"><h2 id="h-account">계정 정보</h2>
            <dl class="kv"><dt>이메일</dt><dd>${esc(u.email)}</dd><dt>이름</dt><dd>${esc(u.name)}</dd><dt>성별</dt><dd>${esc(gname)}</dd><dt>가입일</dt><dd>${esc(u.joined)}</dd></dl>
            <form id="profile-form" novalidate style="display:grid;gap:16px"><h3>기본정보 수정</h3>
              ${field({ id: "mp-name", name: "name", label: "이름", value: u.name, auto: "name", required: true })}
              <div class="field"><span class="legend">성별</span>${checks("gender", OnOff.GENDERS, [u.gender], "radio", true)}</div>
              <div><button class="btn sm" type="submit">저장</button></div></form>
          </section>

          <section class="panel" id="sec-goals" aria-labelledby="h-goals"><h2 id="h-goals">서비스 이용 목표</h2>
            <p style="color:var(--ink-2);font-size:var(--fs-sm)">이 목표는 개별 게임이 아니라 온앤오프 전체에 적용됩니다.${goals.length ? " 현재: " + esc(goals.join(", ")) : " 현재 선택한 목표가 없습니다."}</p>
            <form id="goal-form" style="display:grid;gap:16px">${checks("goals", OnOff.GOALS, u.goals, "checkbox", true)}
              ${field({ id: "mp-free", name: "goalsFree", label: "직접 적기", area: true, value: u.goalsFree })}
              <div><button class="btn sm" type="submit">저장</button></div></form>
          </section>

          <section class="panel" id="sec-games" aria-labelledby="h-games"><h2 id="h-games">이용 중인 게임</h2><div>${rows}</div>
            <p style="color:var(--ink-2);font-size:var(--fs-xs)">게임별 진행 기록은 서로 독립적으로 저장됩니다.</p></section>

          <section class="panel" id="sec-consent" aria-labelledby="h-consent"><h2 id="h-consent">개인정보 및 이용 동의</h2>
            <dl class="kv"><dt>이용약관</dt><dd>동의함 (${esc((u.consents || {}).terms || "-")})</dd><dt>개인정보 처리 안내</dt><dd>확인함 (${esc((u.consents || {}).privacy || "-")})</dd><dt>연구 참여</dt><dd>해당 없음. 절차가 정해지면 별도로 안내합니다.</dd></dl>
            <div><button class="btn ghost sm" type="button" disabled aria-disabled="true">동의 철회 (서버 연동 후 제공)</button></div>
          </section>

          <section class="panel" id="sec-leave" aria-labelledby="h-leave"><h2 id="h-leave">로그아웃 · 계정 탈퇴</h2>
            <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost" type="button" data-action="logout">로그아웃</button><button class="btn danger" type="button" id="leave-btn" aria-expanded="false" aria-controls="leave-info">계정 탈퇴 안내</button></div>
            <div id="leave-info" hidden class="note"><strong>시제품에서는 탈퇴와 삭제가 되지 않습니다.</strong> 계정 삭제와 개인정보 삭제는 서버가 있어야 처리할 수 있어 아직 구현되지 않았습니다. 이 화면의 데이터는 새로고침하면 사라지는 임시 데이터입니다. 서비스 출시 때 이 자리에서 탈퇴를 요청하게 됩니다.</div>
          </section>
        </div></div></div>`;
    },
    mount(root) {
      const pf = root.querySelector("#profile-form"), gf = root.querySelector("#goal-form");
      pf.addEventListener("submit", (e) => {
        e.preventDefault();
        const err = V.required(val(pf, "name"), "이름을 입력해 주세요."); setError(pf, "mp-name", err);
        if (err) { pf.querySelector("#mp-name").focus(); return; }
        S.updateUser({ name: val(pf, "name").trim(), gender: vals(pf, "gender")[0] || u.gender || "" });
        toast("저장했습니다. (시제품: 이 탭에서만 유지됩니다)"); OnOff.App.render();
      });
      gf.addEventListener("submit", (e) => {
        e.preventDefault();
        S.updateUser({ goals: vals(gf, "goals"), goalsFree: val(gf, "goalsFree").trim() });
        toast("이용 목표를 저장했습니다."); OnOff.App.render();
      });
      const lb = root.querySelector("#leave-btn"), li = root.querySelector("#leave-info");
      lb.addEventListener("click", () => { li.hidden = !li.hidden; lb.setAttribute("aria-expanded", String(!li.hidden)); });
    }
  };

  /* ---------- 게임 시작 전 안내 ---------- */
  const intro = {
    render(ctx) {
      const g = GAMES.find((x) => x.id === ctx.param);
      if (!g || g.status === "soon") return notfound.render();
      return `<div class="wrap page"><div class="intro">
        <div class="art"><img src="${g.cover}" alt="${esc(g.title)} 대표 이미지" width="1000" height="720"></div>
        <div class="panel">
          <p class="eyebrow">시작 전 안내</p><h1>${esc(g.title)}</h1>
          <div><h3>이런 분을 위해 만들었습니다</h3><p style="color:var(--ink-2);font-size:var(--fs-sm)">${esc(g.intro.who)}</p></div>
          <div><h3>만든 목적</h3><p style="color:var(--ink-2);font-size:var(--fs-sm)">${esc(g.intro.purpose)}</p></div>
          <div><h3>게임 구성</h3><ul class="checklist">${g.intro.parts.map((p) => `<li>${esc(p)}</li>`).join("")}</ul><p style="color:var(--ink-2);font-size:var(--fs-xs);margin-top:8px">${esc(g.intro.partsNote)}</p></div>
          <div class="note"><strong>알아 두세요.</strong> 이 게임은 의료·상담을 대신하지 않습니다. 하다가 마음이 불편해지면 언제든 멈추셔도 됩니다. 마음이 많이 힘들 때는 가까운 전문 상담기관이나 의료기관의 도움을 받아 보세요. 가입과 게임 이용은 연구 참여와 별개입니다.</div>
          <label class="choice"><input type="checkbox" id="intro-ok"><span>안내를 읽었습니다.</span></label>
          <div class="form-actions"><button class="btn ghost" type="button" data-action="go" data-to="games">뒤로</button><button class="btn" type="button" id="intro-go" disabled aria-disabled="true">모험 시작</button></div>
        </div></div></div>`;
    },
    mount(root, ctx) {
      const ok = root.querySelector("#intro-ok"), btn = root.querySelector("#intro-go");
      if (!ok) return;
      ok.addEventListener("change", () => { btn.disabled = !ok.checked; btn.setAttribute("aria-disabled", String(!ok.checked)); });
      btn.addEventListener("click", () => { if (ok.checked) go("play-" + ctx.param); });
    }
  };

  /* ---------- 게임 실행 ---------- */
  let disposeBridge = null;
  const play = {
    render(ctx) {
      const g = GAMES.find((x) => x.id === ctx.param);
      if (!g || g.status === "soon") return notfound.render();
      return `<div class="wrap page">
        <div class="play-bar"><h1>${esc(g.title)}</h1><button class="btn ghost sm" type="button" data-action="go" data-to="games">플랫폼으로 돌아가기</button></div>
        <div class="stage" id="stage" aria-live="polite"></div>
        <p class="bridge-log" id="bridge-log" role="status"></p>
        <details class="dev"><summary>개발용: 게임 연결 규격</summary>
          <p style="font-size:var(--fs-sm);color:var(--ink-2);margin:8px 0">게임 파일을 <code>${esc(g.entry)}</code> 에 넣으면 이 영역에 iframe으로 열립니다. 플랫폼과 게임은 아래 메시지로만 대화하며, 이름·이메일 같은 개인정보는 게임에 전달하지 않습니다.</p>
          <pre>${esc(OnOff.Bridge.SPEC)}</pre></details>
      </div>`;
    },
    mount(root, ctx) {
      const g = GAMES.find((x) => x.id === ctx.param);
      if (!g) return;
      const stage = root.querySelector("#stage"), log = root.querySelector("#bridge-log");
      const open = (override) => {
        if (disposeBridge) { disposeBridge(); disposeBridge = null; }
        OnOff.Bridge.mount(stage, g, { entryOverride: override, onLog: (m) => { log.textContent = m; }, onExit: () => { toast("플랫폼으로 돌아왔습니다."); go("games"); } })
          .then((d) => { disposeBridge = d; });
      };
      stage.addEventListener("click", (e) => { if (e.target.closest('[data-action="stub-open"]')) open("games/_stub/index.html"); });
      open(null);
    },
    unmount() { if (disposeBridge) { disposeBridge(); disposeBridge = null; } }
  };

  /* ---------- 정책·문의·없는 화면 ---------- */
  /* 시연용 안내문: 법적 효력이 있는 정식 문서가 아닙니다. 정식 문서가 정해지면 이 부분만 교체합니다. */
  const doc = (title, lead, sections) => ({
    render() {
      const body = sections.map((s) => `<section style="display:grid;gap:8px"><h2 style="font-size:var(--fs-lg)">${s[0]}</h2>${s[1].map((t) => `<p>${t}</p>`).join("")}</section>`).join("");
      return `<div class="wrap page"><div class="page-narrow"><div class="panel" style="display:grid;gap:22px"><h1>${title}</h1><div class="note"><strong>시연용 안내문</strong> ${lead}</div>${body}<div><button class="btn ghost" type="button" data-action="go" data-to="home">홈으로</button></div></div></div></div>`;
    }
  });
  const terms = doc("이용약관", "이 문서는 시연을 위한 안내문이며, 법적 효력이 있는 정식 약관이 아닙니다. 정식 약관은 서비스 공개 전에 따로 마련됩니다.", [
    ["1. 서비스의 성격", ["온앤오프는 심리학 전공자들이 만든 성장형 게임 플랫폼의 시제품입니다. 치료를 기반으로 한 서비스가 아니며, 의료·상담이나 전문가의 판단을 대신하지 않습니다."]],
    ["2. 시연 중 이용", ["현재 화면은 기능을 보여 드리기 위한 시제품입니다. 가입과 로그인은 실제 계정을 만들지 않으며, 입력한 내용은 새로고침하면 사라집니다.", "게임 본편은 개발 중이어서 일부 기능은 연결 시험 화면으로 대체되어 있습니다."]],
    ["3. 이용자 안내", ["시연 중에는 실제 이름이나 이메일 대신 가상의 값을 입력하셔도 됩니다.", "마음이 많이 힘들거나 위기 상황이라면 이 서비스에 의존하지 마시고 가까운 전문 기관이나 상담 창구에 연락해 주세요."]],
    ["4. 변경", ["정식 공개 전에 약관의 내용이 바뀔 수 있으며, 바뀌면 이 화면에 안내합니다."]]
  ]);
  const privacy = doc("개인정보처리방침", "이 문서는 시연을 위한 안내문이며, 법적 효력이 있는 정식 처리방침이 아닙니다. 연구 참여와 관련한 동의는 이 화면과 별도로, 연구 절차가 정해진 뒤에 따로 받습니다.", [
    ["1. 현재 시연에서 다루는 정보", ["가입 화면에서는 이메일, 이름, 성별, 이용 목표 등을 입력할 수 있습니다. 시연 중에는 어떤 정보도 가상의 값으로 입력하셔도 됩니다."]],
    ["2. 저장과 전송", ["입력한 정보는 이 브라우저 화면 안에서만 임시로 쓰이며 서버로 전송되거나 저장되지 않습니다. 새로고침하거나 창을 닫으면 사라집니다.", "게임 연결 화면으로 전달되는 정보에도 이름·이메일 같은 개인정보는 포함되지 않습니다."]],
    ["3. 정식 공개 시", ["정식 공개 때에는 수집 항목, 이용 목적, 보관 기간, 제3자 제공 여부, 삭제 요청 방법 등을 이 화면에 구체적으로 안내합니다.", "연구 참여 자료로 쓰이는 정보가 있다면 연구 기관의 윤리 심의 절차에 따라 별도의 동의를 받은 뒤에만 수집합니다."]]
  ]);
  const contact = doc("문의", "정식 문의 창구는 아직 마련되지 않았습니다.", [
    ["시연 중 문의", ["시연 중 궁금한 점이나 불편한 점은 시연을 안내해 드린 담당자에게 직접 말씀해 주세요."]],
    ["정식 공개 시", ["정식 공개 때에는 문의 이메일과 응답 시간을 이 화면에 안내합니다."]]
  ]);
  const notfound = { render() { return `<div class="wrap page"><div class="page-narrow"><div class="panel"><h1>찾을 수 없는 화면입니다</h1><p>주소가 바뀌었거나 아직 없는 화면입니다.</p><div><button class="btn" type="button" data-action="go" data-to="home">홈으로</button></div></div></div></div>`; } };

  return { home, games, about, login, reset, signup, mypage, intro, play, terms, privacy, contact, notfound, GATED: { mypage: true } };
})();
