/* 1막 마지막: 검은 아지트(외곽 → 갱도 → 실험 구역 → 보스).
   확정(1117): 어둠의 세력 색감 + 미치광이 과학자 분위기. 외곽은 경비 시야를 피하는 잠입(들켜도 전투로 이어질 뿐 처음부터 다시 하지 않음, 안 들키면 보너스),
   갱도·실험 구역은 전투+조사, 보스 방은 정면 전투. 파우스토스는 전투 없는 간부(대화 이벤트·초상화 3표정), 보스는 움브라(Lv15).
   보스를 쓰러뜨리면 파우스토스가 당황해 달아나고(달리기 시트), 제페토에게 보고하며 2막(서부)이 예고됩니다. 수치는 임시입니다. */
window.AU = window.AU || {};
(function () {
  const BG = (k) => ({ path: "assets/bg/" + k + ".webp", optional: true });
  const H = AU.Hideout = { };
  const L = (npc, t) => ({ npc, t });
  const HERO = { get name() { return AU.Profile.name(); }, get portrait() { return AU.Profile.portraitKey(); } };
  const J = () => AU.NPCS.jepeto;
  const FA = { name: "파우스토스", portrait: "pt_faustos" }, FA_MAD = { name: "파우스토스", portrait: "pt_faustos_mad" }, FA_SHOCK = { name: "파우스토스", portrait: "pt_faustos_shock" };

  /* ---------- 적 ---------- */
  Object.assign(AU.MONSTERS, {
    hide_guard:  { name: "아지트 경비병", lv: 11, hp: 320, atk: 38, speed: 85, chase: 230, sight: 330, w: 60, h: 112, exp: 190, silver: [14, 22], drops: [["iron_scrap", 0.3, 1, 2], ["potion", 0.075]], color: "#3A3340", motion: "swing", sprite: "mon_hide_guard", sw: 72 },
    hide_beast:  { name: "실험체 늑대", lv: 12, hp: 380, atk: 42, speed: 118, chase: 250, w: 88, h: 54, exp: 230, silver: [14, 22], drops: [["wolf_pelt", 0.3, 1, 2], ["black_crystal", 0.3], ["potion", 0.06]], color: "#4A3A52", ear: true, motion: "leap", sprite: "mon_hide_beast", sw: 140 },
    hide_keeper: { name: "연구소 감시병", lv: 13, hp: 440, atk: 46, speed: 92, chase: 240, sight: 340, w: 60, h: 112, exp: 270, silver: [16, 26], drops: [["iron_scrap", 0.3, 1, 3], ["black_crystal", 0.25], ["potion", 0.075]], color: "#35303E", motion: "swing", sprite: "mon_hide_keeper", sw: 52 },
    umbra_boss:  { name: "움브라", lv: 15, hp: 1700, atk: 56, speed: 80, chase: 520, w: 240, h: 150, exp: 1500, silver: [120, 160], silverRate: 1, drops: [["black_crystal", 1, 2, 3], ["potion", 1, 2, 3]], color: "#9B7FD1", boss: true, motion: "swing",
      sprite: "mon_umbra_base", sw: 300, refW: 345, poses: { idle: "mon_umbra_base", walkA: "mon_umbra_walkA", walkB: "mon_umbra_walkB", windup: "mon_umbra_windup", attack: "mon_umbra_attack", hurt: "mon_umbra_hurt", down: "mon_umbra_down" } }
  });

  /* ---------- 맵 ---------- */
  Object.assign(AU.ASSETS, {
    mon_hide_guard: { path: "assets/monster/hide_guard.webp", optional: true }, mon_hide_keeper: { path: "assets/monster/hide_keeper.webp", optional: true }, mon_hide_beast: { path: "assets/monster/hide_beast.webp", optional: true },
    bg_hideout_outer_1: BG("hideout_outer_1"), bg_hideout_outer_2: BG("hideout_outer_2"), bg_hideout_tunnel: BG("hideout_tunnel"),
    bg_hideout_lab_1: BG("hideout_lab_1"), bg_hideout_lab_2: BG("hideout_lab_2"), bg_hideout_boss: BG("hideout_boss")
  });
  const FLOOR = { x: 0, y: 590, w: 2558 };
  const AREA = (x, y, d) => ({ x, y, desc: d });
  AU.MAPS.hide_outer = {
    name: "검은 아지트 외곽", bg: "bg_hideout_outer_1", bgs: ["bg_hideout_outer_1", "bg_hideout_outer_2"], width: 2558, safe: false, stealth: true,
    platforms: [FLOOR], ropes: [],
    portals: [{ x: 40, to: "gorge", toX: 1400, label: "협곡 바위틈" },
              { x: 2510, to: "hide_tunnel", toX: 90, label: "갱도 입구", reqQuest: "q_h1", reqIn: ["active", "ready", "done"], reqText: "제페토의 부탁을 받아야 안으로 들어갈 수 있습니다." }],
    npcs: [],
    spots: [
      { id: "hide_gate", img: "", x: 700, kind: "investigate", label: "초소의 출입 장부", lines: [
        "초소 탁자 위에 출입 장부가 펼쳐져 있습니다. 매달 '짐승 N두, 원석 N상자'라는 숫자가 적혀 있고, 서명란에는 같은 이름이 반복됩니다.",
        "서명은 '실험 책임 파우스토스'. 장부 맨 아래에는 붉은 잉크로 '움브라 완성 임박'이라고 휘갈겨 있습니다.",
        L(HERO, "(이곳은 짐승이 들어가는 입구구나. 책임자의 이름은 파우스토스... 그리고 움브라.)")] },
      { id: "hide_cargo", img: "", x: 1750, kind: "investigate", label: "빈 수송 우리", lines: [
        "검은 쇠창살로 짠 우리가 층층이 쌓여 있습니다. 모두 비어 있지만 바닥에는 긁힌 자국과 검게 굳은 결정 가루가 남아 있습니다.",
        "우리마다 번호표가 달려 있습니다. 가장 큰 번호는 사백을 넘깁니다.",
        L(HERO, "(이 수가 전부 안쪽으로 들어갔다는 뜻이다. 서둘러야 한다.)")] }
    ],
    spawns: [{ type: "hide_guard", x: 560, min: 450, max: 900 }, { type: "hide_guard", x: 1180, min: 1020, max: 1420 }, { type: "hide_guard", x: 1700, min: 1560, max: 1950 }, { type: "hide_guard", x: 2230, min: 2100, max: 2420 }],
    area: AREA(88, 6, "협곡 안쪽 깊은 곳에 숨은 검은 아지트의 바깥 구역입니다. 경비의 시선을 피해 지나가면 싸움을 줄일 수 있습니다.")
  };
  AU.MAPS.hide_tunnel = {
    name: "검은 아지트 갱도", bg: "bg_hideout_tunnel", width: 1280, safe: false,
    platforms: [{ x: 0, y: 590, w: 1280 }], ropes: [],
    portals: [{ x: 40, to: "hide_outer", toX: 2450, label: "아지트 외곽" }, { x: 1240, to: "hide_lab", toX: 90, label: "실험 구역" }],
    npcs: [],
    spots: [
      { id: "tun_cages", img: "", x: 430, kind: "investigate", label: "갱도 벽면의 빈 우리들", lines: [
        "갱도 벽을 따라 우리가 줄지어 박혀 있습니다. 문은 모두 열려 있고 안은 비어 있습니다.",
        "바닥에는 짐승 발톱이 낸 긁힌 자국과 함께, 붉은 줄이 비치는 검은 결정 조각이 점점이 떨어져 있습니다.",
        L(HERO, "(우리에서 나온 짐승들이 이 갱도를 돌아다니고 있다. 이것들이 협곡으로 빠져나간 늑대의 정체인가.)")] },
      { id: "tun_notes", img: "", x: 930, kind: "investigate", label: "갱도 기록판", lines: [
        "광부용 작업판에 누군가 분필로 일지를 적어 두었습니다. '결정 투입량 3단계, 개체 7번 이상 반응, 개체 12번 탈주'.",
        "마지막 줄은 지워지다 만 글씨입니다. '이대로는 안 된다. 책임자는 더 큰 그릇이 필요하다고 한다. 그릇이란 무엇인가.'",
        L(HERO, "(그릇... 더 큰 그릇을 만들려는 건가.)")] }
    ],
    spawns: [{ type: "hide_beast", x: 360, min: 200, max: 560 }, { type: "hide_beast", x: 620, min: 450, max: 800 }, { type: "hide_beast", x: 900, min: 760, max: 1050 }, { type: "hide_beast", x: 1100, min: 980, max: 1200 }, { type: "hide_beast", x: 520, min: 300, max: 700 }],
    area: AREA(88, 28, "아지트 아래로 파 내려간 갱도입니다. 실험에서 탈주한 짐승들이 돌아다닙니다.")
  };
  AU.MAPS.hide_lab = {
    name: "검은 아지트 실험 구역", bg: "bg_hideout_lab_1", bgs: ["bg_hideout_lab_1", "bg_hideout_lab_2"], width: 2558, safe: false, stealth: true,
    platforms: [FLOOR], ropes: [],
    portals: [{ x: 40, to: "hide_tunnel", toX: 1190, label: "갱도" },
              { x: 2510, to: "hide_boss", toX: 90, label: "보스의 방", reqSpot: "lab_faustos", reqText: "파우스토스가 기다리는 안쪽을 먼저 확인해야 합니다." }],
    npcs: [],
    spots: [
      { id: "lab_records", img: "", x: 760, kind: "investigate", label: "실험 기록대", lines: [
        "유리 용기 사이 기록대에 두꺼운 실험 기록이 쌓여 있습니다. 표지에는 '검은 그릇 계획'이라고 쓰여 있습니다.",
        "'여러 짐승에 결정을 먹여 어둠을 쌓는다. 가장 잘 버틴 개체에게 모든 어둠을 모은다. 그 그릇이 용사의 힘과 부딪칠 때 낙인은 풀린다.'",
        L(HERO, "(몬스터들은 재료였다. 하나의 그릇을 완성하려고... 그리고 그 목적은 용사의 힘.)")] },
      { id: "lab_faustos", img: "", x: 1850, kind: "investigate", label: "실험실 안쪽의 인기척", lines: [
        "깨진 유리 용기 사이로 앞치마 차림의 백발 사내가 보입니다. 한쪽 눈에 겹 렌즈를 끼고, 검은 결정이 박힌 팔로 기록을 넘기며 혼잣말을 합니다.",
        L(FA, "오오, 문이 열려 있었군. 쥐가 한 마리 들어온 줄 알았는데... 그 손목, 낙인이 아닌가. 용사가 제 발로 찾아오다니!"),
        L(FA_MAD, "내 소개를 하지. 파우스토스, 어둠의 세력의 실험 담당일세. 짐승에 어둠을 쌓는 일, 그게 내 연구야. 이 팔도 시험해 본 결과물이지. 훌륭하지 않나?"),
        L(HERO, "그 짐승들에게 무슨 짓을 한 겁니까. 무엇을 만들려는 거죠."),
        L(FA_MAD, "그릇이야! 어둠을 담아 용사의 힘을 정면으로 받아낼 그릇. 오래 걸렸지만 드디어 완성했다. 이름은 움브라. 짐승 사백 마리의 어둠이 한 몸에 들어 있어."),
        L(FA_SHOCK, "낙인을 가진 용사가 살아 있다면 시험하기에 더없이 좋은 기회로군. 이쪽 문 너머에서 움브라가 기다리고 있네. 나는 구경이나 하겠네, 용사여."),
        "파우스토스는 기록 몇 권을 품에 안고 안쪽 문 뒤의 어둠 속으로 물러납니다."] }
    ],
    spawns: [{ type: "hide_keeper", x: 520, min: 380, max: 700 }, { type: "hide_beast", x: 1000, min: 880, max: 1180 }, { type: "hide_keeper", x: 1320, min: 1160, max: 1520 }, { type: "hide_beast", x: 1560, min: 1420, max: 1700 }, { type: "hide_keeper", x: 2160, min: 2000, max: 2380 }],
    area: AREA(88, 50, "어둠의 세력이 짐승으로 실험을 하는 구역입니다. 책임자가 이곳에 있습니다.")
  };
  AU.MAPS.hide_boss = {
    name: "검은 아지트 심부", bg: "bg_hideout_boss", width: 1280, safe: false,
    platforms: [{ x: 0, y: 590, w: 1280 }], ropes: [],
    portals: [{ x: 40, to: "hide_lab", toX: 2450, label: "실험 구역" }],
    npcs: [], spots: [
      { id: "faustos_flee", img: "", x: 1020, kind: "investigate", label: "철수하는 파우스토스", needFlag: "boss_umbra_boss", lines: [
        L(FA_SHOCK, "...움브라가 쓰러지다니. 사백 마리의 어둠이, 내 걸작이..."),
        L(FA, "실패했군. 철수하자. 기록만 챙기면 다시 시작할 수 있다."),
        L(FA_MAD, "기억해 두게, 용사. 아직 끝난 게 아니야. 그릇은 하나가 아니니까!"),
        "파우스토스는 가죽 가방을 끌어안고 비틀거리며 출구 쪽 어둠 속으로 달아납니다. 겹 렌즈 하나가 바닥에 굴러떨어집니다."],
        onDone: (W) => { W.fx = W.fx.filter((f) => f.tag !== "faustos"); W.fx.push({ kind: "runner", tag: "faustos", img: "faustos_run", x: 1020, y: 590, h: 190, vx: 480, t: 0, dur: 3.2 }); } }
    ],
    boss: { type: "umbra_boss", x: 700, quest: "q_h1", afterSpot: "lab_faustos" },
    spawns: [],
    area: AREA(88, 72, "아지트의 가장 깊은 방입니다. 움브라가 기다립니다.")
  };
  AU.AREA_LINKS.push(["gorge", "hide_outer"], ["hide_outer", "hide_tunnel"], ["hide_tunnel", "hide_lab"], ["hide_lab", "hide_boss"]);

  /* ---------- 퀘스트 ---------- */
  AU.QUESTS.q_h1 = {
    title: "검은 아지트 잠입", type: "main", giver: "jepeto", minLevel: 10, pre: ["q_a3_jepeto"],
    area: "hide_outer", desc: "협곡 안쪽의 검은 아지트에 잠입합니다. 외곽 경비의 시선을 피해 장부와 우리를 살피고, 갱도와 실험 구역의 짐승을 물리치며 기록을 확인한 뒤, 보스 움브라를 쓰러뜨리고 제페토에게 보고합니다.",
    objectives: [
      { kind: "investigate", targets: ["hide_gate", "hide_cargo"] },
      { kind: "investigate", targets: ["tun_cages", "tun_notes"] },
      { kind: "kill", target: "hide_beast", count: 4 },
      { kind: "kill", target: "hide_keeper", count: 2 },
      { kind: "investigate", targets: ["lab_records", "lab_faustos"] },
      { kind: "kill", target: "umbra_boss", count: 1 },
      { kind: "investigate", targets: ["faustos_flee"] }],
    offer: [L(J(), "때가 되었네. 협곡 안쪽의 길을 열었네. 저 바위 너머가 어둠 세력의 아지트일세."),
            L(J(), "바깥은 경비병이 지키고 있네. 눈에 띄지 않게 시선을 피해 가면 싸움을 줄일 수 있지. 들켜도 되돌아갈 필요는 없지만, 숫자가 많으니 조심하게."),
            L(J(), "안쪽 갱도와 실험 구역에서는 싸울 각오를 하게. 그리고 무엇을 만드는지, 누가 책임자인지 꼭 눈으로 확인하고 오게.")],
    reminder: ["아지트는 협곡 안쪽 길 끝일세. 장부와 우리, 갱도 기록, 실험 기록을 살피고 책임자를 확인하게."],
    done: [L(J(), "...돌아왔군. 다친 데는 없나. 그래, 파우스토스라는 자가 짐승으로 그릇을 만들고 있었다고."),
           L(J(), "용사의 낙인이 풀리는 순간을 노리는 자들이라... 그자의 말대로 그릇이 하나뿐이 아니라면, 이 일은 이 협곡에서 끝나지 않네."),
           L(J(), "서쪽 땅 이야기를 해 주겠네. 옛 기록에는 다른 용사들의 흔적이 서부에 끊겨 있었네. 그곳에도 어둠이 손을 뻗었을 걸세."),
           L(HERO, "서쪽으로 가야 한다는 말씀이시군요."),
           L(J(), "그렇네. 하지만 지금은 숨을 고르게. 이 늙은이가 길을 알아보는 동안, 그대는 힘을 더 단련해 두게나.")],
    reward: { exp: 3500, silver: 300, items: [["potion", 5]], levelTo: 15 },
    setFlags: { a1_hideout_done: true },
    after: ["1막이 끝났습니다. 서쪽 땅으로 가는 길은 다음 이야기에서 열립니다."]
  };
  AU.NPCS.jepeto.quests.push("q_h1");

  /* ---------- 훅(world.js에서 호출) ---------- */
  // 보스 처치: 파우스토스가 놀란 채 서 있게 함
  H.onKill = function (W, m) {
    if (m.type !== "umbra_boss") return;
    W.fx.push({ kind: "runner", tag: "faustos", img: "faustos", x: 1020, y: 590, h: 190, vx: 0, t: 0, dur: 9999 });
  };
  // 외곽에서 안 들키고 갱도에 도착하면 보너스(한 번만)
  H.onTravel = function (W, to) {
    if (W.mapId !== "hide_outer" || to !== "hide_tunnel") return;
    const S = AU.G.S; if (W.spotted || S.flags.hide_sneak_bonus) return;
    S.flags.hide_sneak_bonus = true; AU.G.gainSilver(100); AU.G.giveItem("potion", 3, true);
    AU.G.toast("들키지 않고 외곽을 통과했습니다! 보너스: 은화 100, 물약 3", "good");
  };
})();
