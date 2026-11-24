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
    hide_guard:  { name: "아지트 경비병", lv: 11, hp: 320, atk: 43, speed: 85, chase: 230, sight: 330, w: 60, h: 112, exp: 280, silver: [9, 18], silverRate: 0.17, drops: [["iron_scrap", 0.15, 1, 2], ["potion", 0.05]], color: "#3A3340", motion: "swing", sprite: "mon_hide_guard", walk: ["mon_hide_guard_w1", "mon_hide_guard_w2", "mon_hide_guard_w3", "mon_hide_guard_w4"], walkIdle: "mon_hide_guard", pWind: "mon_hide_guard_a1", pLunge: "mon_hide_guard_a2", walkRefW: 163, frameLen: 22, sw: 72 },
    hide_beast:  { name: "실험체 늑대", lv: 12, hp: 380, atk: 47, speed: 118, chase: 250, w: 88, h: 54, exp: 330, silver: [10, 19], silverRate: 0.18, drops: [["wolf_pelt", 0.15, 1, 2], ["black_crystal", 0.3], ["potion", 0.05]], color: "#4A3A52", ear: true, motion: "leap", sprite: "mon_hide_beast", walk: ["mon_hide_beast_w1", "mon_hide_beast_w2", "mon_hide_beast_w3", "mon_hide_beast_w4"], walkIdle: "mon_hide_beast", pWind: "mon_hide_beast_a1", pLunge: "mon_hide_beast_a2", walkRefW: 480, frameLen: 26, sw: 140 },
    hide_keeper: { name: "연구소 감시병", lv: 13, hp: 440, atk: 50, speed: 92, chase: 240, sight: 340, w: 60, h: 112, exp: 390, silver: [12, 20], silverRate: 0.19, drops: [["iron_scrap", 0.15, 1, 3], ["black_crystal", 0.25], ["potion", 0.05]], color: "#35303E", motion: "swing", sprite: "mon_hide_keeper", walk: ["mon_hide_keeper_w1", "mon_hide_keeper_w2", "mon_hide_keeper_w3", "mon_hide_keeper_w4"], walkIdle: "mon_hide_keeper", pWind: "mon_hide_keeper_a1", pLunge: "mon_hide_keeper_a2", walkRefW: 116, frameLen: 22, sw: 52 },
    umbra_boss:  { name: "움브라", lv: 15, hp: 3000, atk: 63, cd: 2.8, cdRage: 1.9, patterns: ["lunge", "slam", "wave"], ragePatterns: ["chain", "slam"], slamR: 210, speed: 80, chase: 520, w: 240, h: 150, exp: 1500, silver: [120, 160], silverRate: 1, drops: [["black_crystal", 1, 2, 3], ["potion", 1, 2, 3]], color: "#9B7FD1", boss: true, motion: "swing",
      sprite: "mon_umbra_base", sw: 300, refW: 345, poses: { idle: "mon_umbra_base", walkA: "mon_umbra_walkA", walkB: "mon_umbra_walkB", windup: "mon_umbra_windup", attack: "mon_umbra_attack", hurt: "mon_umbra_hurt", down: "mon_umbra_down" } }
  });

  /* ---------- 맵 ---------- */
  Object.assign(AU.ASSETS, {
    mon_hide_guard: { path: "assets/monster/hide_guard.webp", optional: true }, mon_hide_keeper: { path: "assets/monster/hide_keeper.webp", optional: true }, mon_hide_beast: { path: "assets/monster/hide_beast.webp", optional: true },
    mon_hide_beast_a1: { path: "assets/monster/hide_beast_a1.webp", optional: true }, mon_hide_beast_a2: { path: "assets/monster/hide_beast_a2.webp", optional: true },   // 준비·공격 전용 그림
    mon_hide_beast_w1: { path: "assets/monster/hide_beast_w1.webp", optional: true }, mon_hide_beast_w2: { path: "assets/monster/hide_beast_w2.webp", optional: true }, mon_hide_beast_w3: { path: "assets/monster/hide_beast_w3.webp", optional: true }, mon_hide_beast_w4: { path: "assets/monster/hide_beast_w4.webp", optional: true },   // 실험체 늑대 걷기 4칸
    mon_hide_guard_a1: { path: "assets/monster/hide_guard_a1.webp", optional: true }, mon_hide_guard_a2: { path: "assets/monster/hide_guard_a2.webp", optional: true },   // 준비·공격 전용 그림
    mon_hide_guard_w1: { path: "assets/monster/hide_guard_w1.webp", optional: true }, mon_hide_guard_w2: { path: "assets/monster/hide_guard_w2.webp", optional: true }, mon_hide_guard_w3: { path: "assets/monster/hide_guard_w3.webp", optional: true }, mon_hide_guard_w4: { path: "assets/monster/hide_guard_w4.webp", optional: true },   // 경비병 걷기 4칸
    mon_hide_keeper_a1: { path: "assets/monster/hide_keeper_a1.webp", optional: true }, mon_hide_keeper_a2: { path: "assets/monster/hide_keeper_a2.webp", optional: true },   // 준비·공격 전용 그림
    mon_hide_keeper_w1: { path: "assets/monster/hide_keeper_w1.webp", optional: true }, mon_hide_keeper_w2: { path: "assets/monster/hide_keeper_w2.webp", optional: true }, mon_hide_keeper_w3: { path: "assets/monster/hide_keeper_w3.webp", optional: true }, mon_hide_keeper_w4: { path: "assets/monster/hide_keeper_w4.webp", optional: true },   // 감시병 걷기 4칸
    bg_hideout_outer_1: BG("hideout_outer_1"), bg_hideout_outer_2: BG("hideout_outer_2"), bg_hideout_tunnel: BG("hideout_tunnel"),
    bg_hideout_lab_1: BG("hideout_lab_1"), bg_hideout_lab_2: BG("hideout_lab_2"), bg_hideout_boss: BG("hideout_boss")
  });
  Object.assign(AU.ASSETS, { ob_hide_crate: { path: "assets/object/hide_crate.webp", optional: true }, ob_hide_pillar: { path: "assets/object/hide_pillar.webp", optional: true } }); // 숨는 곳·시야 가림 기둥 그림(없으면 임시 도형)
  /* 조사 지점 그림(옵션): assets/object/spot_<id>.webp 파일을 넣으면 임시 도형 대신 그려집니다. 규격은 docs의 요청문 참고 */
  Object.assign(AU.ASSETS, { ob_spot_lab_faustos: { path: "assets/object/spot_lab_faustos.webp", optional: true }, ob_spot_faustos_flee: { path: "assets/object/spot_faustos_flee.webp", optional: true }, ob_spot_hide_gate: { path: "assets/object/spot_hide_gate.webp", optional: true }, ob_spot_hide_cargo: { path: "assets/object/spot_hide_cargo.webp", optional: true }, ob_spot_tun_cages: { path: "assets/object/spot_tun_cages.webp", optional: true }, ob_spot_tun_notes: { path: "assets/object/spot_tun_notes.webp", optional: true }, ob_spot_lab_records: { path: "assets/object/spot_lab_records.webp", optional: true } });
  const FLOOR = { x: 0, y: 590, w: 2558 };
  const AREA = (x, y, d) => ({ x, y, desc: d });
  AU.MAPS.hide_outer = {
    name: "검은 아지트 외곽", bg: "bg_hideout_outer_1", bgs: ["bg_hideout_outer_1", "bg_hideout_outer_2"], width: 2558, safe: false, stealth: true,
    stealthMission: { quest: "q_h1a", next: "q_h1b", flag: "hide_outer_clear", start: 120 }, hideSpots: [{ x: 960 }, { x: 1490 }, { x: 2030 }], blockers: [{ x: 1260 }, { x: 1800 }],
    platforms: [FLOOR], ropes: [],
    portals: [{ x: 40, to: "gorge", toX: 2740, label: "협곡 바위틈" },
              { x: 2510, to: "hide_tunnel", toX: 90, label: "갱도 입구", reqQuest: "q_h1a", reqIn: ["active", "ready", "done"], reqText: "제페토의 부탁을 받아야 안으로 들어갈 수 있습니다." }],
    npcs: [],
    spots: [
      { id: "hide_gate", img: "ob_spot_hide_gate", w: 190, x: 700, kind: "investigate", label: "초소의 출입 장부", lines: [
        "초소 탁자 위에 출입 장부가 펼쳐져 있습니다. 매달 '짐승 N두, 원석 N상자'라는 숫자가 적혀 있고, 서명란에는 같은 이름이 반복됩니다.",
        "서명은 '실험 책임 파우스토스'. 장부 맨 아래에는 붉은 잉크로 '움브라 완성 임박'이라고 휘갈겨 있습니다.",
        L(HERO, "(이곳이 그 짐승들을 실험하는 곳인가 보다. 파우스토스? 이 사람은 누구지? 그리고 움브라? 이건 뭐지?)")] },
      { id: "hide_cargo", img: "ob_spot_hide_cargo", w: 240, x: 1750, kind: "investigate", label: "빈 수송 우리", lines: [
        "검은 쇠창살로 짠 우리가 층층이 쌓여 있습니다. 모두 비어 있지만 바닥에는 긁힌 자국과 검게 굳은 결정 가루가 남아 있습니다.",
        "우리마다 번호표가 달려 있습니다. 가장 큰 번호는 사백을 넘깁니다.",
        L(HERO, "(이 수가 전부 안쪽으로 들어갔다는 뜻이다. 서둘러야 한다.)")] }
    ],
    spawns: [{ type: "hide_guard", x: 560, min: 450, max: 900 }, { type: "hide_guard", x: 1180, min: 1020, max: 1420 }, { type: "hide_guard", x: 1700, min: 1560, max: 1950 }, { type: "hide_guard", x: 2230, min: 2100, max: 2420 }],
    area: AREA(88, 6, "협곡 안쪽 깊은 곳에 숨은 검은 아지트의 바깥 구역입니다. 경비에게 들키면 입구에서 다시 시작합니다. 상자 앞에서 Space로 숨고, 기둥 뒤로 시선을 피하세요.")
  };
  AU.MAPS.hide_tunnel = {
    name: "검은 아지트 갱도", bg: "bg_hideout_tunnel", width: 1280, safe: false,
    platforms: [{ x: 0, y: 590, w: 1280 }], ropes: [],
    portals: [{ x: 40, to: "hide_outer", toX: 2450, label: "아지트 외곽" }, { x: 1240, to: "hide_lab", toX: 90, label: "실험 구역" }],
    npcs: [],
    spots: [
      { id: "tun_cages", img: "ob_spot_tun_cages", w: 230, x: 430, kind: "investigate", label: "갱도 벽면의 빈 우리들", lines: [
        "갱도 벽을 따라 우리가 줄지어 박혀 있습니다. 문은 모두 열려 있고 안은 비어 있습니다.",
        "바닥에는 짐승 발톱이 낸 긁힌 자국과 함께, 붉은 줄이 비치는 검은 결정 조각이 점점이 떨어져 있습니다.",
        L(HERO, "(우리에서 나온 짐승들이 이 갱도를 돌아다니고 있다. 이것들이 협곡으로 빠져나간 늑대의 정체인가.)")] },
      { id: "tun_notes", img: "ob_spot_tun_notes", w: 150, x: 930, kind: "investigate", label: "갱도 기록판", lines: [
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
              { x: 2510, to: "hide_boss", toX: 90, label: "보스의 방", reqQuest: "q_h1e", reqIn: ["done"], reqText: "파우스토스가 풀어 놓은 변형체들을 먼저 쓰러뜨려야 합니다." }],
    npcs: [],
    spots: [
      { id: "lab_records", img: "ob_spot_lab_records", w: 210, x: 760, kind: "investigate", label: "실험 기록대", lines: [
        "유리 용기 사이 기록대에 두꺼운 실험 기록이 쌓여 있습니다. 표지에는 '검은 그릇 계획'이라고 쓰여 있습니다.",
        "'여러 짐승에 결정을 먹여 어둠을 쌓는다. 가장 잘 버틴 개체에게 모든 어둠을 모은다. 그 그릇이 용사의 힘과 부딪칠 때 낙인은 풀린다.'",
        L(HERO, "(몬스터들은 재료였다. 하나의 그릇을 완성하려고... 그리고 그 목적은 용사의 힘.)")] },
      { id: "lab_faustos", img: "ob_spot_lab_faustos", w: 200, x: 1850, kind: "investigate", label: "실험실 안쪽의 인기척", lines: [
        "깨진 유리 용기 사이로 앞치마 차림의 백발 사내가 보입니다. 한쪽 눈에 겹 렌즈를 끼고, 검은 결정이 박힌 팔로 기록을 넘기며 혼잣말을 합니다.",
        L(FA, "오오, 문이 열려 있었군. 쥐가 한 마리 들어온 줄 알았는데... 그 손목, 낙인이 아닌가. 용사가 제 발로 찾아오다니!"),
        L(FA_MAD, "내 소개를 하지. 파우스토스, 어둠의 세력에서 실험을 맡고 있네. 짐승에 어둠을 쌓는 일, 그게 내 연구야. 이 팔도 시험해 본 결과물이지. 훌륭하지 않나?"),
        L(HERO, "그 짐승들에게 무슨 짓을 한 겁니까. 무엇을 만들려는 거죠."),
        L(FA_MAD, "그릇이야! 어둠을 담아 용사의 힘을 정면으로 받아낼 그릇. 오래 걸렸지만 드디어 완성했다. 이름은 움브라. 짐승 사백 마리의 어둠이 한 몸에 들어 있어."),
        L(FA_SHOCK, "낙인을 가진 용사가 제 발로 왔으니 시험하기에 더없이 좋은 기회로군. 이쪽 문 너머에서 움브라가 기다리고 있네."),
        "파우스토스는 기록대에 기대어 팔짱을 낀 채 이쪽을 바라봅니다. 말을 걸어 볼 수 있습니다."] }
    ],
    spawns: [{ type: "hide_keeper", x: 520, min: 380, max: 700 }, { type: "hide_beast", x: 1000, min: 880, max: 1180 }, { type: "hide_keeper", x: 1320, min: 1160, max: 1520 }, { type: "hide_beast", x: 1560, min: 1420, max: 1700 }, { type: "hide_keeper", x: 2160, min: 2000, max: 2380 }],
    area: AREA(88, 50, "어둠의 세력이 짐승으로 실험을 하는 구역입니다. 책임자가 이곳에 있습니다.")
  };
  AU.MAPS.hide_boss = {
    name: "검은 아지트 심부", bg: "bg_hideout_boss", width: 1280, safe: false,
    platforms: [{ x: 0, y: 590, w: 1280 }], ropes: [],
    portals: [{ x: 40, to: "hide_lab", toX: 2450, label: "실험 구역" }],
    npcs: [], spots: [
      { id: "faustos_flee", img: "ob_spot_faustos_flee", w: 170, x: 1020, kind: "investigate", label: "철수하는 파우스토스", needFlag: "boss_umbra_boss", lines: [
        L(FA_SHOCK, "...움브라가 쓰러지다니. 사백 마리의 어둠이, 내 걸작이..."),
        L(FA, "실패했군. 철수하자. 기록만 챙기면 다시 시작할 수 있다."),
        L(FA_MAD, "기억해 두게, 용사. 아직 끝난 게 아니야. 그릇은 하나가 아니니까!"),
        "파우스토스는 가죽 가방을 끌어안고 비틀거리며 출구 쪽 어둠 속으로 달아납니다. 겹 렌즈 하나가 바닥에 굴러떨어집니다."],
        onDone: (W) => { W.fx = W.fx.filter((f) => f.tag !== "faustos"); W.fx.push({ kind: "runner", tag: "faustos", img: "faustos_run", x: 1020, y: 590, h: 190, vx: 480, t: 0, dur: 3.2 }); } }
    ],
    boss: { type: "umbra_boss", x: 700, quest: "q_h1f" },
    spawns: [],
    area: AREA(88, 72, "아지트의 가장 깊은 방입니다. 움브라가 기다립니다.")
  };
  AU.AREA_LINKS.push(["gorge", "hide_outer"], ["hide_outer", "hide_tunnel"], ["hide_tunnel", "hide_lab"], ["hide_lab", "hide_boss"]);

  /* ---------- 퀘스트 ---------- */
  /* ---------- 아지트 퀘스트: 6단계 연속 (1~5단계는 현장에서 자동 완료·다음 단계 자동 수락, 6단계만 제페토에게 보고) ---------- */
  const STEP = { type: "main", giver: "jepeto", minLevel: 10 };
  const rec = (fl) => AU.G.S.flags[fl];
  AU.QUESTS.q_h1a = Object.assign({}, STEP, {
    title: "그림자 속으로", pre: ["q_a3_jepeto"], area: "hide_outer", noWhere: true, autoDone: true, next: "q_h1b",
    desc: "협곡 안쪽 아지트 외곽으로 숨어듭니다. 경비의 시선을 피해 초소 장부와 빈 수송 우리를 조사한 뒤 갱도 입구로 향합니다.",
    objectives: [{ kind: "investigate", targets: ["hide_gate", "hide_cargo"] }],
    offer: [L(J(), "때가 되었네. 협곡 안쪽의 길을 열었네. 저 바위 너머가 어둠 세력의 아지트일세."),
            L(J(), "바깥은 경비병이 지키고 있네. 붉은 시선에 걸리면 잡히니, 입구로 돌려보내질 걸세. 상자 앞에서 Space를 눌러 숨고, 기둥 뒤로 지나가게. 몇 번을 다시 해도 잃는 건 없네."),
            L(J(), "길을 쭉 가다보면 갱도가 나올 걸세. 거기에서 무슨 일이 벌어지는지 꼭 알아오게.")],
    reminder: ["초소의 장부와 빈 수송 우리를 살피고 갱도 입구로 가게. 경비의 시선은 상자와 기둥으로 피하게."],
    reward: { exp: 400, silver: 40, items: [] }
  });
  AU.QUESTS.q_h1b = Object.assign({}, STEP, {
    title: "탈주한 12번", pre: ["q_h1a"], area: "hide_tunnel", autoDone: true, next: "q_h1c",
    desc: "갱도의 빈 우리와 기록판을 조사하고, 우리에서 풀려난 실험체 늑대 4마리를 물리칩니다.",
    objectives: [{ kind: "investigate", targets: ["tun_cages", "tun_notes"] }, { kind: "kill", target: "hide_beast", count: 4 }],
    reminder: ["갱도의 우리와 기록판을 살피고, 돌아다니는 실험체 늑대 네 마리를 물리치게."],
    reward: { exp: 600, silver: 50, items: [] }
  });
  AU.QUESTS.q_h1c = Object.assign({}, STEP, {
    title: "기록 빼내기", pre: ["q_h1b"], area: "hide_lab", autoDone: true, next: "q_h1d",
    desc: "실험 구역의 연구소 감시병 2명을 처치하고, 실험 기록대에서 '검은 그릇 계획' 기록을 확인합니다.",
    objectives: [{ kind: "kill", target: "hide_keeper", count: 2 }, { kind: "investigate", targets: ["lab_records"] }],
    reminder: ["실험 구역의 감시병 둘을 쓰러뜨리고 실험 기록대를 살펴보게."],
    reward: { exp: 700, silver: 50, items: [] }
  });
  AU.QUESTS.q_h1d = Object.assign({}, STEP, {
    title: "파우스토스의 그릇", pre: ["q_h1c"], area: "hide_lab", autoDone: true, next: "q_h1e",
    desc: "실험 구역 안쪽의 인기척을 확인하고, 책임자 파우스토스와 마주합니다. 기록의 처분은 당신이 정합니다.",
    objectives: [{ kind: "investigate", targets: ["lab_faustos"] }, { kind: "choice", id: "faustos_records", target: "faustos" }],
    reminder: ["실험 구역 안쪽의 인기척을 확인하고, 파우스토스에게 말을 걸어 보게."],
    choice: {
      prompt: ["(파우스토스가 기록대 위의 두꺼운 기록을 손끝으로 두드린다.)", "그 기록이 마음에 걸리나, 용사? 가져가도 좋고 태워도 좋네. 어차피 내 머릿속에 전부 들어 있으니."],
      options: [
        { label: "기록을 챙긴다", flag: "take", reply: ["호오, 챙기는 쪽인가. 읽는 법이나 알아낼 수 있으면 좋겠군.", "자, 구경은 여기까지일세. 움브라를 만나기 전에 우리 아이들부터 풀어 주지. 즐기게!", "(파우스토스가 안쪽 문 뒤로 사라지자, 갱도 쪽 우리의 문이 줄줄이 열리는 소리가 울린다.)"] },
        { label: "기록을 불태운다", flag: "burn", reply: ["하하, 태우는 쪽인가! 소용없네. 종이는 타도 내 머릿속은 타지 않아.", "자, 구경은 여기까지일세. 움브라를 만나기 전에 우리 아이들부터 풀어 주지. 즐기게!", "(파우스토스가 안쪽 문 뒤로 사라지자, 갱도 쪽 우리의 문이 줄줄이 열리는 소리가 울린다.)"] }
      ]
    },
    reward: { exp: 500, silver: 40, items: [] }
  });
  AU.QUESTS.q_h1e = Object.assign({}, STEP, {
    title: "풀려난 변형체들", pre: ["q_h1d"], area: "hide_lab", autoDone: true, next: "q_h1f",
    desc: "파우스토스가 풀어 놓은 변형체 늑대 6마리를 물리쳐 보스의 방으로 가는 길을 엽니다.",
    objectives: [{ kind: "kill", target: "hide_beast", count: 6 }],
    reminder: ["풀려난 변형체 늑대 여섯 마리를 물리치면 안쪽 문이 열리네."],
    reward: { exp: 700, silver: 50, items: [] }
  });
  AU.QUESTS.q_h1f = Object.assign({}, STEP, {
    title: "그릇의 끝", pre: ["q_h1e"], area: "hide_boss",
    desc: "보스의 방에서 움브라를 쓰러뜨리고, 철수하는 파우스토스를 확인한 뒤 제페토에게 보고합니다.",
    objectives: [{ kind: "kill", target: "umbra_boss", count: 1 }, { kind: "investigate", targets: ["faustos_flee"] }],
    reminder: ["아지트 심부의 움브라를 쓰러뜨리고, 파우스토스의 행방을 확인한 뒤 돌아오게."],
    reward: { exp: 600, silver: 70, items: [["potion", 5]], levelTo: 15 },
    setFlags: { a1_hideout_done: true },
    after: ["1막이 끝났습니다. 서쪽 땅으로 가는 길은 다음 이야기에서 열립니다."]
  });
  Object.defineProperty(AU.QUESTS.q_h1f, "done", { enumerable: true, configurable: true, get() {
      return [L(J(), "...돌아왔군. 다친 데는 없나."),
              L(HERO, "파우스토스라는 자가 짐승 사백 마리의 어둠으로 '그릇'을 만들고 있었어요. 이름은 움브라였고, 쓰러뜨렸지만 파우스토스는 달아났습니다."),
              L(J(), rec("choice_faustos_records") === "take" ? "그 기록을 챙겨 왔나. 잘했네. 이 늙은이가 천천히 읽어 보겠네." : "기록은 태웠다고... 아깝지만 그자의 손에 남지 않았다니 다행이군."),
              L(J(), "용사의 낙인이 풀리는 순간을 노리는 자들이라... 그자의 말대로 그릇이 하나뿐이 아니라면, 이 일은 이 협곡에서 끝나지 않네."),
              L(J(), "서쪽 땅 이야기를 해 주겠네. 옛 기록에는 다른 용사들의 흔적이 서부에 끊겨 있었네. 그곳에도 어둠이 손을 뻗었을 걸세."),
              L(HERO, "서쪽으로 가야 한다는 말씀이시군요."),
              L(J(), "그렇네. 하지만 지금은 숨을 고르게. 이 늙은이가 길을 알아보는 동안, 그대는 힘을 더 단련해 두게나.")];
    } });
  AU.NPCS.jepeto.quests.push("q_h1a", "q_h1f");
  AU.NPCS.faustos = { name: "파우스토스", title: "어둠의 연구자", sprite: "faustos", portrait: "pt_faustos", quests: [], idle: ["...구경은 즐겁나, 용사?"] };

  /* 이전 저장의 q_h1(7개 목표)을 6단계 기록으로 옮김: 목표 순서 0 정문·수송우리, 1 갱도 조사, 2 늑대4, 3 감시병2, 4 기록대·파우스토스, 5 움브라, 6 철수 */
  AU.migrateHideout = function (st) {
    const o = st.quests.q_h1; delete st.quests.q_h1; if (!o) return;
    const sp = o.spots || {}, pg = o.prog || [], now = AU.dateStr ? AU.dateStr() : "";
    const done = (id, prog, spots) => { const q = AU.QUESTS[id]; st.quests[id] = { state: "done", prog: q.objectives.map((x, i) => prog[i] != null ? prog[i] : (x.count || (x.targets || []).length || 1)), spots: spots || {}, doneAt: now }; };
    const pick = (ids) => Object.fromEntries(ids.filter((k) => sp[k]).map((k) => [k, true]));
    const all = o.state === "done" || o.state === "ready";
    const a = all || (sp.hide_gate && sp.hide_cargo), b = all || (a && sp.tun_cages && sp.tun_notes && (pg[2] || 0) >= 4), c = all || (b && (pg[3] || 0) >= 2 && sp.lab_records), d = all || (c && sp.lab_faustos);
    const steps = [["q_h1a", a, [pg[0] || 0], pick(["hide_gate", "hide_cargo"])], ["q_h1b", b, [pg[1] || 0, 4], pick(["tun_cages", "tun_notes"])], ["q_h1c", c, [2, 1], pick(["lab_records"])], ["q_h1d", d, [1, 1], pick(["lab_faustos"])]];
    let cur = null;
    for (const [id, ok, prog, spots] of steps) { if (ok) done(id, prog, spots); else { cur = id; break; } }
    if (!cur) { done("q_h1e", [6], {}); cur = "q_h1f"; }
    if (o.state === "done") { done("q_h1f", [1, 1], pick(["faustos_flee"])); return; }
    const q = AU.QUESTS[cur], keep = {
      q_h1a: [[0], ["hide_gate", "hide_cargo"]], q_h1b: [[null, pg[2] || 0], ["tun_cages", "tun_notes"]], q_h1c: [[pg[3] || 0], ["lab_records"]],
      q_h1d: [[], ["lab_faustos"]], q_h1f: [[pg[5] || 0], ["faustos_flee"]]
    }[cur] || [[], []];
    const prog = q.objectives.map((x, i) => keep[0][i] != null ? keep[0][i] : 0);
    if (cur === "q_h1f") prog[1] = sp.faustos_flee ? 1 : 0;
    if (o.state === "ready") { st.quests[cur] = { state: "ready", prog: q.objectives.map((x) => x.count || 1), spots: { faustos_flee: true } }; return; }
    st.quests[cur] = { state: o.state === "ready" ? "ready" : "active", prog, spots: pick(keep[1]) };
  };

  /* ---------- 훅(world.js에서 호출) ---------- */
  // 보스 처치: 파우스토스가 놀란 채 서 있게 함
  H.onKill = function (W, m) {
    if (m.type !== "umbra_boss") return;
    W.fx.push({ kind: "runner", tag: "faustos", img: "faustos", x: 1020, y: 590, h: 190, vx: 0, t: 0, dur: 9999 });
  };
  // 외곽에서 안 들키고 갱도에 도착하면 보너스(한 번만)
  H.onTravel = function (W, to) {
    if (to === "yard" && !AU.G.S.flags.yard_hint) { AU.G.S.flags.yard_hint = true; setTimeout(() => AU.UI.toast("금빛으로 빛나는 상자 앞에서 Space를 누르면 숨을 수 있습니다. 용병의 붉은 시야를 피해 가세요.", "info"), 1200); } // 첫 입장 안내
    if (W.mapId === "yard" && to === "valley") { // 하차장 잠입 성공: 두 곳을 모두 조사하고 입구로 나왔을 때
      const S = AU.G.S; if (!S.flags.yard_clear && AU.G.spotDone("yard_crates") && AU.G.spotDone("yard_ledger")) {
        S.flags.yard_clear = true;
        if (!(S.flags.stealth_tries_yard > 0) && !S.flags.yard_sneak_bonus) { S.flags.yard_sneak_bonus = true; AU.G.gainSilver(60); AU.G.toast("한 번도 들키지 않고 하차장을 조사했습니다! 보너스: 은화 60", "good"); }
        else AU.G.toast("하차장 잠입에 성공했습니다. 정보상에게 돌아가 보고하세요.", "good");
      }
      return;
    }
    if (W.mapId !== "hide_outer" || to !== "hide_tunnel") return;
    const S = AU.G.S; if (!AU.G.questStatus || S.flags.hide_outer_clear) return;
    S.flags.hide_outer_clear = true; // 외곽 잠입 구간 통과: 이후 경비는 평소처럼 행동
    if (!(S.flags.stealth_tries_hide_outer > 0) && !S.flags.hide_sneak_bonus) {
      S.flags.hide_sneak_bonus = true; AU.G.gainSilver(100); AU.G.giveItem("potion", 3, true);
      AU.G.toast("한 번도 들키지 않고 외곽을 통과했습니다! 보너스: 은화 100, 물약 3", "good");
    } else AU.G.toast("외곽을 통과했습니다. 갱도로 들어갑니다.", "good");
  };

  /* 파우스토스 NPC: 안쪽 인기척을 확인한 뒤 선택을 마칠 때까지만 서 있음 */
  const FA_NPC = { id: "faustos", x: 2030 };
  Object.defineProperty(AU.MAPS.hide_lab, "npcs", { configurable: true, get() { return AU.G && AU.G.S && AU.G.spotDone("lab_faustos") && !AU.G.S.flags.choice_faustos_records ? [FA_NPC] : []; } });
  /* 5단계 시작: 풀려난 늑대들이 실험 구역으로 몰려옴 */
  const wave = (announce) => {
    const W = AU.World; if (!W || W.mapId !== "hide_lab" || AU.G.questStatus("q_h1e") !== "active") return;
    [1300, 1550, 1800, 2050, 2250].forEach((x, i) => W.spawn("hide_beast", x, undefined, 900, 2400, "wave" + i));
    if (announce) AU.G.toast("우리에서 풀려난 늑대들이 몰려옵니다!", "warn");
  };
  setTimeout(() => {   // 스크립트 로드 순서와 무관하게, 전부 로드된 뒤 이벤트 연결
    if (!AU.Ev) return;
    AU.Ev.on("questStart", ({ id }) => { if (id === "q_h1e") wave(true); });
    AU.Ev.on("mapchange", ({ id }) => { if (id === "hide_lab") setTimeout(() => wave(false), 0); });
  }, 0);
})();
