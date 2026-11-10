/* 라우터와 공통 틀(헤더·푸터). 화면 이름은 주소의 #뒤 글자로 정합니다. */
window.OnOff = window.OnOff || {};
OnOff.App = (function () {
  const { esc, logo, toast } = OnOff.UI;
  const S = OnOff.State, Vw = OnOff.Views, GAMES = OnOff.GAMES;
  let current = null, firstRender = true;
  const go = (to) => { location.hash = to; };
  const firstGame = () => GAMES.find((g) => g.status !== "soon" && OnOff.Device.canPlay(g)) || GAMES.find((g) => g.status !== "soon");

  function parse() {
    const raw = (location.hash || "#home").slice(1) || "home";
    const m = raw.match(/^(intro|play)-(.+)$/);
    return m ? { name: m[1], param: m[2], raw } : { name: raw, param: null, raw };
  }

  function header(route) {
    const u = S.user;
    const cur = (n) => (route.name === n ? ' aria-current="page"' : "");
    const actions = u
      ? `<span class="who">${esc(u.name)}님</span><button class="btn ghost sm" type="button" data-action="go" data-to="mypage">마이페이지</button><button class="btn ghost sm" type="button" data-action="logout">로그아웃</button>`
      : `<button class="btn ghost sm" type="button" data-action="go" data-to="login">로그인</button><button class="btn sm" type="button" data-action="go" data-to="signup">회원가입</button>`;
    return `<div class="proto-bar"><div class="wrap"><b>시제품</b><span>실제 계정 인증과 서버 저장은 아직 없습니다. 입력한 내용은 서버로 전송되지 않으며, 새로고침하면 사라집니다.</span></div></div>
    <header class="site-header" id="site-header"><div class="wrap header-row">
      <a class="brand" href="#home" aria-label="온앤오프 홈">${logo(36)}<span>On &amp; Off</span><small>온앤오프</small></a>
      <nav class="nav" aria-label="주 메뉴"><a href="#home"${cur("home")}>홈</a><a href="#games"${cur("games")}>게임 둘러보기</a><a href="#about"${cur("about")}>서비스 소개</a></nav>
      <div class="header-actions">${actions}</div>
      <button class="menu-toggle" type="button" data-action="toggle-menu" aria-expanded="false" aria-controls="site-header">메뉴</button>
    </div></header>`;
  }

  function footer() {
    return `<div class="wrap footer-row">
      <div><a class="brand" href="#home" style="font-size:1.125rem">${logo(30)}<span>On &amp; Off</span></a>
      <p class="footer-copy" style="margin-top:10px">심리학 전공자들이 만든 성장형 게임 플랫폼</p></div>
      <div><ul class="footer-links"><li><a href="#terms">이용약관</a></li><li><a href="#privacy">개인정보처리방침</a></li><li><a href="#contact">문의</a></li></ul>
      <p class="footer-copy" style="margin-top:10px">© 2026 On &amp; Off</p></div></div>`;
  }

  function render() {
    const route = parse();
    const u = S.user;
    if (current && current.unmount) current.unmount();

    if ((route.name === "mypage" || route.name === "intro" || route.name === "play") && !u) { S.pending = route.raw; return go("login"); }
    if ((route.name === "login" || route.name === "signup") && u) return go("games");

    const view = Vw[route.name] && route.name !== "GATED" ? Vw[route.name] : Vw.notfound;
    current = view;
    document.getElementById("chrome-top").innerHTML = header(route);
    const main = document.getElementById("main");
    main.innerHTML = view.render({ param: route.param, route });
    document.getElementById("chrome-bottom").className = "site-footer";
    document.getElementById("chrome-bottom").innerHTML = footer();
    if (view.mount) view.mount(main, { param: route.param, route });
    if (!firstRender) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
    firstRender = false;
  }

  function openGame(id) {
    const gm = GAMES.find((x) => x.id === id);
    if (gm && !OnOff.Device.canPlay(gm)) { toast(OnOff.PC_ONLY_NOTE); return; }
    const u = S.user, save = u ? S.getSave(id) : null;
    if (!u) { S.pending = "intro-" + id; return go("login"); }
    go((save ? "play-" : "intro-") + id);
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const a = t.dataset.action;
    if (a === "go") go(t.dataset.to);
    else if (a === "start") { const g = firstGame(); if (S.user) openGame(g.id); else { S.pending = "intro-" + g.id; go("signup"); } }
    else if (a === "open-game") openGame(t.dataset.id);
    else if (a === "logout") { S.logout(); toast("로그아웃했습니다."); go("home"); }
    else if (a === "demo") { S.demoLogin(); const p = S.pending; S.pending = null; go(p || "mypage"); }
    else if (a === "toggle-menu") { const h = document.getElementById("site-header"); const open = h.classList.toggle("open"); t.setAttribute("aria-expanded", String(open)); }
    else if (a === "scroll") { e.preventDefault(); const el = document.getElementById(t.dataset.target); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else if (a === "skip") { e.preventDefault(); document.getElementById("main").focus(); }
  });

  window.addEventListener("hashchange", render);
  S.onChange(() => { /* 로그인 상태가 바뀌면 현재 화면을 다시 그립니다. */ });
  return { render, start: render };
})();
