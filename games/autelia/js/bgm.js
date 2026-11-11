/* 임시 배경음(BGM) 재생기. 음원 1곡을 반복 재생하며, 게임이 실제로 진행 중일 때만 소리가 납니다.
   - 시작 버튼을 눌러 게임이 시작된 뒤에 재생(브라우저가 사용자 조작 전 자동 재생을 막기 때문)
   - 설정의 "소리 끄기"와 연동, 탭이 숨겨지면 멈춤, 켜고 끌 때 서서히 커지고 작아짐
   - 프롤로그 컷신 중에는 컷신 효과음이 묻히지 않도록 소리를 낮춤
   - 음원이 없거나 재생이 막혀도 게임은 그대로 진행됨 */
window.AU = window.AU || {};
(function () {
  const CFG = { src: "assets/audio/light_through_the_blinds.mp3", vol: 0.32, duckVol: 0.14, fadeInPerSec: 0.5, fadeOutPerSec: 1.6 };
  const B = AU.Bgm = { cfg: CFG, el: null, vol: 0, failed: false, blocked: false, state: "idle" };

  function ensure() {
    if (B.el || B.failed) return B.el;
    try {
      const a = new Audio(CFG.src); a.loop = true; a.preload = "auto"; a.volume = 0;
      a.addEventListener("error", () => { B.failed = true; B.state = "missing"; });
      B.el = a;
    } catch (e) { B.failed = true; }
    return B.el;
  }

  document.addEventListener("visibilitychange", () => { if (document.hidden && B.el && !B.el.paused) { B.el.pause(); B.state = "paused"; } });

  /* 장면에 따른 배경음 크기. 습격·탈출 장면은 잔잔한 곡이 어울리지 않아 끄고(효과음·환경음만), 이별 장면은 아주 작게.
     장면별 전용 곡(BGM-05·06·07 등)이 준비되면 이 표에서 곡을 바꿔 연결합니다. */
  const SCENE_MULT = { SCENE_03_ATTACK: 0, SCENE_04_FATHER: 0.4, SCENE_05_ESCAPE: 0 };
  B.sceneMult = function () {
    const P = AU.Prologue; if (!(P && P.on)) return 1;
    const st = AU.G && AU.G.S && AU.G.S.prologue && AU.G.S.prologue.state;
    return st in SCENE_MULT ? SCENE_MULT[st] : 1;
  };

  /* 매 프레임 호출(main.js 반복 처리) */
  B.tick = function (dt) {
    const main = AU.main, S = AU.UI && AU.UI.settings;
    const want = !!(main && main.running && S && !S.mute && !document.hidden);
    let target = 0;
    if (want) target = ((AU.Prologue && AU.Prologue.on) ? CFG.duckVol : CFG.vol) * B.sceneMult();
    if (AU.Sfx && AU.Sfx.master) AU.Sfx.master.gain.value = (S && S.mute) ? 0 : 0.7; // 소리 끄기: 효과음·환경음도 함께
    if (target === 0 && B.vol === 0 && !B.el) return;
    const a = ensure(); if (!a || B.failed) return;
    const step = (B.vol < target ? CFG.fadeInPerSec : CFG.fadeOutPerSec) * dt * CFG.vol;
    B.vol = B.vol < target ? Math.min(target, B.vol + step) : Math.max(target, B.vol - step);
    a.volume = Math.max(0, Math.min(1, B.vol));
    if (B.vol > 0 && a.paused && !B.blocked) {
      B.blocked = true; // 중복 호출 방지
      const pr = a.play();
      if (pr && pr.then) pr.then(() => { B.blocked = false; B.state = "playing"; }).catch(() => { B.state = "blocked"; setTimeout(() => { B.blocked = false; }, 1500); });
      else B.blocked = false;
    } else if (B.vol === 0 && !a.paused) { a.pause(); B.state = "paused"; }
  };
})();
