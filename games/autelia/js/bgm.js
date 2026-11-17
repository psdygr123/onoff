/* 임시 배경음(BGM) 재생기. 음원 1곡을 반복 재생하며, 게임이 실제로 진행 중일 때만 소리가 납니다.
   - 시작 버튼을 눌러 게임이 시작된 뒤에 재생(브라우저가 사용자 조작 전 자동 재생을 막기 때문)
   - 설정의 "소리 끄기"와 연동, 탭이 숨겨지면 멈춤, 켜고 끌 때 서서히 커지고 작아짐
   - 프롤로그 컷신 중에는 컷신 효과음이 묻히지 않도록 소리를 낮춤
   - 음원이 없거나 재생이 막혀도 게임은 그대로 진행됨 */
window.AU = window.AU || {};
(function () {
  const BG = "assets/audio/bgm/";
  const TRACKS = { main: "assets/audio/light_through_the_blinds.mp3", harbor: "assets/audio/harbor.mp3", adventure: "assets/audio/adventure.mp3",
    arkea: BG + "arkea.mp3", porto1: BG + "porto1.mp3", porto2: BG + "porto2.mp3", porto3: BG + "porto3.mp3", store_a: BG + "store_a.mp3", store_b: BG + "store_b.mp3",
    guild: BG + "guild.mp3", inn: BG + "inn.mp3", warehouse: BG + "warehouse.mp3", east_road: BG + "east_road.mp3", field1: BG + "field1.mp3", field2: BG + "field2.mp3",
    ship1: BG + "ship1.mp3", ship2: BG + "ship2.mp3", boss: BG + "boss.mp3", escort: BG + "escort.mp3", breath: BG + "breath.mp3", ending: BG + "ending.mp3" };
  /* 곡 묶음(그룹): 같은 묶음 안에서는 곡이 끝나면 다음 곡으로 이어지고, 묶음 안의 다른 지역으로 옮겨도 끊기지 않고 계속 이어집니다.
     oneShot은 한 번만 재생하고 끝납니다. 예: 포르투 노바 1·2·3번이 차례로 이어지고, 숲길·항구 길·선창 외곽은 사냥터 1·2번이 이어집니다. */
  const GROUPS = { main: ["main"], arkea: ["arkea"], adventure: ["adventure"], town: ["porto1", "porto2", "porto3"], store_a: ["store_a"], store_b: ["store_b"], guild: ["guild"], inn: ["inn"], warehouse: ["warehouse"],
    field: ["field1", "field2"], east_road: ["east_road"], ship: ["ship1", "ship2"], boss: ["boss"], escort: ["escort"], breath: ["breath"], ending: ["ending"] };
  const ONE_SHOT = { ending: true };
  const MAP_GROUP = { porto: "town", general_store: "store_a", weapon_store: "store_b", guild_hall: "guild", warehouse: "warehouse", forest: "field", harbor_road: "field", docks: "field" };
  const GAIN = { harbor: 1.7 };   // 원본 소리가 작은 곡 보정(새 곡들은 소리 크기를 맞춰 두었음)
  const CFG = { src: TRACKS.main, vol: 0.32, duckVol: 0.14, fadeInPerSec: 0.5, fadeOutPerSec: 1.6 };
  const B = AU.Bgm = { cfg: CFG, el: null, vol: 0, failed: false, blocked: false, state: "idle", track: "main", cur: "main", group: "main", idx: {}, silentG: null, tracks: TRACKS, groups: GROUPS };

  function ensure() {
    if (B.el || B.failed) return B.el;
    try {
      const a = new Audio(TRACKS[B.cur] || CFG.src); a.loop = GROUPS[B.group].length === 1 && !ONE_SHOT[B.group]; a.preload = "auto"; a.volume = 0;
      a.addEventListener("error", () => { B.failed = true; B.state = "missing"; });
      a.addEventListener("ended", () => { const g = B.group, L = GROUPS[g]; if (ONE_SHOT[g]) { B.silentG = g; return; } if (L.length > 1) B.idx[g] = ((B.idx[g] || 0) + 1) % L.length; });
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

  /* 장면에 맞는 곡 고르기. 프롤로그: 항구로 가는 마지막 장면=모험, 끝 화면=엔딩, 그 밖=아르케아(회상) 곡.
     본편: 보스가 있으면 보스 곡, 호흡 가이드가 열려 있으면 호흡 곡, 그 밖에는 지역별 곡 묶음. 반환: { g: 묶음, key: 곡 } */
  B.endShown = function () { const P = AU.Prologue; return !!(P && P.on && P.endEl && !P.endEl.classList.contains("hidden")); };
  B.pickGroup = function () {
    const P = AU.Prologue;
    if (P && P.on) { if (B.endShown()) return "ending"; const st = AU.G && AU.G.S && AU.G.S.prologue && AU.G.S.prologue.state; return st === "SCENE_06_PORT_VIEW" ? "adventure" : "arkea"; }
    const me = AU.UI && AU.UI.modalEl; if (me && !me.classList.contains("hidden") && me.querySelector(".guided")) return "breath";
    const W = AU.World, m = W && W.map; if (!m) return "main";
    if ((W.monsters || []).some((q) => q.alive && q.d && q.d.boss)) return "boss";
    return MAP_GROUP[W.mapId] || MAP_GROUP[m.parent] || "main";
  };
  B.pick = function () { const g = B.pickGroup(), L = GROUPS[g]; return { g, key: L[(B.idx[g] || 0) % L.length] }; };

  /* 설정의 배경음 음량(0~1). 설정이 없으면 100% */
  B.userVol = function () { const S = AU.UI && AU.UI.settings; const v = S && S.volBgm; return (typeof v === "number" && isFinite(v)) ? Math.max(0, Math.min(1, v)) : 1; };

  /* 매 프레임 호출(main.js 반복 처리) */
  B.tick = function (dt) {
    const main = AU.main, S = AU.UI && AU.UI.settings;
    const want = !!(main && main.running && S && !S.mute && !document.hidden);
    let target = 0; const pk = B.pick(); B.track = pk.key; if (pk.g !== B.group) { B.group = pk.g; B.silentG = null; if (B.el) B.el.loop = GROUPS[pk.g].length === 1 && !ONE_SHOT[pk.g]; }
    if (B.el && B.track !== B.cur) { // 곡이 바뀌면 지금 곡을 서서히 줄인 뒤 새 곡으로 교체
      if (B.vol > 0.002) { want && (B.vol = Math.max(0, B.vol - 0.9 * dt * CFG.vol)); B.el.volume = Math.max(0, Math.min(1, B.vol)); return; }
      B.el.pause(); B.el.src = TRACKS[B.track]; B.el.load(); B.cur = B.track; B.state = "idle"; B.blocked = false; return;
    }
    if (!B.el && B.track !== B.cur) B.cur = B.track;
    if (want && B.silentG !== B.group) target = ((AU.Prologue && AU.Prologue.on && !B.endShown()) ? CFG.duckVol : CFG.vol) * (B.endShown() ? 1 : B.sceneMult()) * B.userVol() * (GAIN[B.cur] || 1);
    if (AU.Sfx && AU.Sfx.applyVolume) AU.Sfx.applyVolume(); // 소리 끄기·효과음 음량: 효과음·환경음에 반영
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
