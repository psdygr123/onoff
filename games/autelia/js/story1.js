/* 1막 후반(스토리 Chapter 2~3): 잔다리 골목(바르샤) → 검은 골짜기 → 협곡 바위틈(제페토).
   문장은 사용자 원고(수정본 1114)의 Chapter 2·3을 게임 대사에 맞게 줄인 것입니다. 이름·수치는 임시입니다.
   폭력 표현 기준: 소리·그림자·결과만 보여 주고 가해 장면은 쓰지 않습니다. 그림이 없는 곳은 대체 그래픽으로 표시됩니다(optional). */
window.AU = window.AU || {};
(function () {
  /* ---------- 그림(없어도 동작) ---------- */
  Object.assign(AU.ASSETS, {
    alley:  { path: "assets/bg/alley.webp", optional: true },
    valley: { path: "assets/bg/valley.webp", optional: true },
    bg_barsha_shop: { path: "assets/bg/weapon_store.webp", optional: true },   // 정보상 공방 실내(임시: 무기점 그림 재사용. 정식 그림이 오면 이 경로만 바꿈)
    gorge:  { path: "assets/bg/gorge.webp", optional: true },
    ridge:  { path: "assets/bg/ridge.webp", optional: true },   // 중심 천막 위 바위 능선(엿듣기 맵)
    barsha:  { path: "assets/char/barsha.webp", optional: true },
    jepeto:  { path: "assets/char/jepeto.webp", optional: true },
    pt_barsha: { path: "assets/portrait/barsha.webp", optional: true },
    pt_jepeto: { path: "assets/portrait/jepeto.webp", optional: true },
    faustos: { path: "assets/char/faustos.webp", frames: 4, optional: true },
    faustos_run: { path: "assets/char/faustos_run.webp", frames: 4, optional: true },
    pt_faustos: { path: "assets/portrait/faustos.webp", optional: true },
    pt_faustos_mad: { path: "assets/portrait/faustos_mad.webp", optional: true },
    pt_faustos_shock: { path: "assets/portrait/faustos_shock.webp", optional: true },
    bg_hideout_outer_1: { path: "assets/bg/hideout_outer_1.webp", optional: true },
    bg_hideout_outer_2: { path: "assets/bg/hideout_outer_2.webp", optional: true },
    bg_hideout_tunnel: { path: "assets/bg/hideout_tunnel.webp", optional: true },
    bg_hideout_lab_1: { path: "assets/bg/hideout_lab_1.webp", optional: true },
    bg_hideout_lab_2: { path: "assets/bg/hideout_lab_2.webp", optional: true },
    bg_hideout_boss: { path: "assets/bg/hideout_boss.webp", optional: true },
    mon_merc: { path: "assets/monster/merc.webp", optional: true },
    mon_merc_a1: { path: "assets/monster/merc_a1.webp", optional: true }, mon_merc_a2: { path: "assets/monster/merc_a2.webp", optional: true },   // 준비·공격 전용 그림
    mon_merc_w1: { path: "assets/monster/merc_w1.webp", optional: true }, mon_merc_w2: { path: "assets/monster/merc_w2.webp", optional: true }, mon_merc_w3: { path: "assets/monster/merc_w3.webp", optional: true }, mon_merc_w4: { path: "assets/monster/merc_w4.webp", optional: true }, mon_merc_idle: { path: "assets/monster/merc_idle.webp", optional: true },   // 용병 걷기 4칸(한 걸음 주기)
    bg_yard: { path: "assets/bg/yard_long.webp", optional: true },   // 용병 하차장(잠입 맵) 배경(11-25 가로로 1.5배 늘림, 3720px)
    ob_hide_crate_brand: { path: "assets/object/hide_crate_brand.webp", optional: true },
    ob_yard_ledger: { path: "assets/object/yard_ledger.webp", optional: true },   // 하차 장부 그림(GPT 제작 예정, docs/GPT_하차장부_요청문_1125.md). 오기 전에는 임시로 궤짝 그림   // 숨는 상자 옆면에 불도장 검은 물결 표식
    mon_mutfox: { path: "assets/monster/mutant_fox.webp", optional: true },
    ob_plank: { path: "assets/object/plank.webp", optional: true },
    ob_rope: { path: "assets/object/rope.webp", optional: true },
    pt_scene_crates: { path: "assets/portrait/scene_crates.webp", optional: true },
    pt_scene_tent: { path: "assets/portrait/scene_tent.webp", optional: true },
    mon_wolf: { path: "assets/monster/wolf.webp", optional: true },
    mon_wolf_a1: { path: "assets/monster/wolf_a1.webp", optional: true }, mon_wolf_a2: { path: "assets/monster/wolf_a2.webp", optional: true },   // 준비·공격 전용 그림
    mon_wolf_w1: { path: "assets/monster/wolf_w1.webp", optional: true }, mon_wolf_w2: { path: "assets/monster/wolf_w2.webp", optional: true }, mon_wolf_w3: { path: "assets/monster/wolf_w3.webp", optional: true }, mon_wolf_w4: { path: "assets/monster/wolf_w4.webp", optional: true },   // 늑대 걷기 4칸
    mon_mutfox_a1: { path: "assets/monster/mutant_fox_a1.webp", optional: true }, mon_mutfox_a2: { path: "assets/monster/mutant_fox_a2.webp", optional: true },   // 준비·공격 전용 그림
    mon_mutfox_w1: { path: "assets/monster/mutant_fox_w1.webp", optional: true }, mon_mutfox_w2: { path: "assets/monster/mutant_fox_w2.webp", optional: true }, mon_mutfox_w3: { path: "assets/monster/mutant_fox_w3.webp", optional: true }, mon_mutfox_w4: { path: "assets/monster/mutant_fox_w4.webp", optional: true }   // 변형 여우 걷기 4칸
  });

  /* 말하는 사람(대화창 이름·초상화). 주인공은 성별·이름을 따라감 */
  /* 조사 지점 그림(옵션): assets/object/spot_<id>.webp 파일을 넣으면 임시 도형 대신 그려집니다. 규격은 docs의 요청문 참고 */
  Object.assign(AU.ASSETS, { ob_spot_barsha_lens: { path: "assets/object/spot_barsha_lens.webp", optional: true }, ob_spot_barsha_map: { path: "assets/object/spot_barsha_map.webp", optional: true }, ob_spot_relay_tent: { path: "assets/object/spot_relay_tent.webp", optional: true }, pt_claude: { path: "assets/portrait/claude.webp", optional: true }, pt_baltein: { path: "assets/portrait/baltein.webp", optional: true } });
  const HERO = { get name() { return AU.Profile.name(); }, get portrait() { return AU.Profile.portraitKey(); } };
  const B = () => AU.NPCS.barsha, J = () => AU.NPCS.jepeto;
  const CLAUDE = { name: "클로드", portrait: "pt_claude" }, BALTEIN = { name: "흰 로브를 입은 남자", portrait: "pt_baltein" }, VOICE = { name: "용병", portrait: "" };
  const L = (npc, t) => ({ npc, t });

  /* ---------- 아이템 ---------- */
  Object.assign(AU.ITEMS, {
    barsha_map: { name: "바르샤의 양피지 지도", type: "quest", desc: "포르투 노바 북쪽 경계의 중계소 위치가 표시된 구겨진 지도입니다." },
    
    iron_scrap: { name: "흑철 부스러기", type: "etc", rarity: "common", sell: 9, desc: "갑옷에서 떨어진 은회색 부스러기입니다. 팔 수 있습니다." },
    wolf_pelt: { name: "오염된 늑대 가죽", type: "etc", rarity: "common", sell: 8, desc: "눈이 붉던 늑대의 거친 가죽입니다. 팔 수 있습니다." }
  });

  /* ---------- 적 ---------- */
  Object.assign(AU.MONSTERS, {
    merc: { name: "블랙 웨이브 용병", lv: 9, hp: 260, atk: 36, speed: 90, chase: 210, w: 60, h: 112, exp: 300, silver: [7, 16], silverRate: 0.16, drops: [["iron_scrap", 0.15, 1, 2], ["potion", 0.05]], color: "#4D4D5C", motion: "swing", sprite: "mon_merc", walk: ["mon_merc_w1", "mon_merc_w2", "mon_merc_w3", "mon_merc_w4"], walkIdle: "mon_merc_idle", pWind: "mon_merc_a1", pLunge: "mon_merc_a2", walkRefW: 215, frameLen: 24, sw: 88 },
    merc_sentry: { name: "블랙 웨이브 용병", lv: 9, hp: 260, atk: 36, speed: 70, patrolSpeed: 55, chase: 210, sight: 200, w: 60, h: 112, exp: 300, silver: [7, 16], silverRate: 0.16, drops: [["iron_scrap", 0.15, 1, 2], ["potion", 0.05]], color: "#4D4D5C", motion: "swing", sprite: "mon_merc", walk: ["mon_merc_w1", "mon_merc_w2", "mon_merc_w3", "mon_merc_w4"], walkIdle: "mon_merc_idle", pWind: "mon_merc_a1", pLunge: "mon_merc_a2", walkRefW: 215, frameLen: 24, sw: 88 },
    mutfox: { name: "변형된 여우", lv: 9, hp: 260, atk: 36, speed: 125, chase: 250, w: 84, h: 56, exp: 300, silver: [7, 16], silverRate: 0.16, drops: [["fur", 0.2, 1, 2], ["black_crystal", 0.75, 1, 1, "q_a3_crystal"], ["potion", 0.05]], color: "#7A2A35", ear: true, motion: "pounce", sprite: "mon_mutfox", walk: ["mon_mutfox_w1", "mon_mutfox_w2", "mon_mutfox_w3", "mon_mutfox_w4"], walkIdle: "mon_mutfox", pWind: "mon_mutfox_a1", pLunge: "mon_mutfox_a2", walkRefW: 480, frameLen: 26, sw: 132 },
    wolf: { name: "오염된 늑대", lv: 10, hp: 300, atk: 40, speed: 115, chase: 230, w: 88, h: 54, exp: 320, silver: [8, 18], silverRate: 0.17, drops: [["wolf_pelt", 0.15, 1, 2], ["potion", 0.05]], color: "#6C6F7A", ear: true, motion: "leap", sprite: "mon_wolf", walk: ["mon_wolf_w1", "mon_wolf_w2", "mon_wolf_w3", "mon_wolf_w4"], walkIdle: "mon_wolf", pWind: "mon_wolf_a1", pLunge: "mon_wolf_a2", walkRefW: 480, frameLen: 26, sw: 140 }
  });

  /* ---------- NPC ---------- */
  AU.NPCS.barsha = { name: "정보상 바르샤", sprite: "barsha", portrait: "pt_barsha", quests: ["q_a2_secret", "q_a3_recon", "q_a3_crystal", "q_a3_scout"],
    idle: ["길드 장부에 내 이름은 없네. 그게 이 일의 요령이지.", "필요한 소식이 생기면 내가 먼저 부를 걸세."] };
  AU.NPCS.jepeto = { name: "도편수 제페토", sprite: "jepeto", portrait: "pt_jepeto", quests: ["q_a3_scout", "q_a3_jepeto"],
    idle: ["손은 늙었어도 눈은 아직 쓸 만하다네.", "서부로 가는 길은 험하니 단련을 게을리하지 말게."] };

  /* ---------- 맵 ---------- */
  AU.MAPS.jandari = {
    name: "잔다리 골목", bg: "alley", width: 1500, safe: true,
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 40, to: "porto", toX: 260, label: "포르투 노바" },
              { x: 960, to: "jandari_shop", toX: 200, label: "정보상의 공방(문)", door: true },
              { x: 1460, to: "valley", toX: 90, label: "북쪽 경계(검은 골짜기)", reqQuest: "q_a3_recon", reqIn: ["active", "ready", "done"], reqText: "정보상에게 아직 들을 이야기가 남아 있습니다." }],
    npcs: [],
    spots: [],
    spawns: [], start: 90,
    area: { x: 66, y: 52, desc: "포르투 노바 하층민 구역의 좁은 골목입니다. 정보상의 공방 문이 있습니다." }
  };
  /* 정보상의 공방 내부: 골목 막다른 쪽 아치문 안쪽. 탁자(작업대) 위의 물건을 조사하는 장면은 여기서 일어납니다 */
  AU.MAPS.jandari_shop = {
    name: "정보상의 공방", bg: "bg_barsha_shop", width: 1500, safe: true, interior: true, parent: "jandari",
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 70, to: "jandari", toX: 960, label: "나가기(문)", door: true }],
    npcs: [{ id: "barsha", x: 940, npcY: 462 }],
    fgSlice: [625, 425, 640, 175],   // 작업대: 정보상보다 앞에 다시 그려 탁자 뒤에 서 있게 함
    spots: [
      { id: "barsha_lens", img: "ob_spot_barsha_lens", w: 120, x: 730, kind: "investigate", label: "작업대 위의 검은 결정 조각", lines: [
        L(B(), "길드가 보낸 것과 같은 결이다. 자연에서 이만큼 순하게 굳은 결정은 나오지 않아."),
        L(B(), "누군가 일부러 만들어 내고 있다는 뜻이지. 그리고 그 재료는 짐승의 몸이야. 몸에 닿은 어둠이 굳어서 이렇게 된다."),
        L(HERO, "(몬스터 몸에서 나온 검은 결정... 누군가 몬스터를 일부러 어둠에 물들이고 있다는 말이다.)")] },
      { id: "barsha_map", img: "ob_spot_barsha_map", w: 130, x: 1150, kind: "investigate", label: "구겨진 양피지 지도", lines: [
        L(B(), "북쪽 경계 너머 검은 골짜기에 붉은 점이 찍혀 있지. 블랙 웨이브 상단이 쓰는 비밀 중계소야."),
        L(B(), "매달 그리로 짐승을 가둘 우리와 검은 결정 원석이 실려 간다."),
        L(B(), "상단은 심부름꾼일 뿐이야. 누가 시키는지, 어디로 가는지는 직접 보고 와야 알 수 있네.")] }
    ],
    spawns: [], start: 200,
    area: { x: 66, y: 52, desc: "정보상 바르샤의 공방 안입니다. 작업대 위에 길드 장부에 없는 물건들이 놓여 있습니다." }
  };
  AU.MAPS.valley = {
    name: "검은 골짜기", bg: "valley", hint: "변형된 여우가 돌아다닙니다. 조심해서 안쪽으로 가세요", width: 3200, safe: false,
    /* 발판(나무 잔교): 땅에서 점프로 닿는 높이는 96px 이하라 70px씩 계단으로 쌓고, 190px 높이의 잔교는 밧줄로만 오름.
       밧줄은 잔교 왼쪽 끝 바로 옆(x=잔교 시작-15)에 걸고, 위쪽 끝(top)은 잔교 윗면보다 15px 위 */
    platforms: [{ x: 0, y: 590, w: 3200 }, { x: 840, y: 520, w: 240, thin: true }, { x: 1020, y: 450, w: 240, thin: true },
                { x: 2000, y: 400, w: 260, thin: true }, { x: 2700, y: 520, w: 240, thin: true }, { x: 2880, y: 450, w: 240, thin: true }],
    ropes: [{ x: 2020, top: 385, bottom: 590, exitDir: 1 }],
    portals: [{ x: 50, to: "jandari", toX: 1380, label: "잔다리 골목" },
              { x: 560, to: "yard", toX: 90, label: "용병 하차장(잠입)", reqQuest: "q_a3_recon", reqIn: ["active", "ready", "done"], reqText: "정보상에게 먼저 이야기를 들어야 합니다." },
              { x: 1700, to: "ridge", toX: 90, label: "속삭임 능선", reqQuest: "q_a3_scout", reqIn: ["active", "ready", "done"], reqText: "정보상에게 골짜기 안쪽 이야기를 먼저 들어야 합니다." },
              { x: 3150, to: "gorge", toX: 90, label: "협곡 바위틈", reqQuest: "q_a3_scout", reqIn: ["ready", "done"], reqText: "골짜기 안쪽 천막을 먼저 살펴봐야 합니다." }],
    npcs: [],
    spots: [
    ],
    spawns: [{ type: "mutfox", x: 700 }, { type: "mutfox", x: 1150 }, { type: "mutfox", x: 1140, y: 450, min: 1030, max: 1250 }, { type: "mutfox", x: 2130, y: 400, min: 2010, max: 2250 }, { type: "mutfox", x: 2400 }, { type: "mutfox", x: 3000, y: 450, min: 2890, max: 3110 }],
    area: { x: 78, y: 28, desc: "포르투 노바 북쪽 경계 너머의 기암괴석 지대입니다. 블랙 웨이브 비밀 중계소가 있습니다." }
  };
  /* 중심 천막 위 바위틈: 검은 골짜기 중심 천막의 포탈로 들어오는 짧은 엿듣기 맵.
     오른쪽 끝 바위 모서리까지 걸어가 Space로 아래의 대화를 엿들으면 들킴 → 추격 → 제페토 구출 컷신이 이어지고, 끝나면 협곡의 제페토 거처로 이동합니다. */
  AU.MAPS.ridge = {
    name: "속삭임 능선", bg: "ridge", hint: "발소리를 죽이고 오른쪽 끝 바위 모서리로 가세요", width: 1500, safe: true,
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 40, to: "valley", toX: 1640, label: "검은 골짜기" }],
    npcs: [],
    spots: [
      { id: "relay_tent", portrait: "pt_scene_tent", w: 520, x: 1300, kind: "investigate", label: "아래에서 들려오는 대화", cuts: [{ at: 0, src: "assets/cut/relay_peek.webp" }, { at: 7, src: "assets/cut/relay_found.webp" }, { at: 9, src: "assets/cut/relay_chase.webp" }, { at: 12, src: "assets/cut/relay_trapped.webp" }, { at: 14, src: "assets/cut/relay_rope.webp" }, { at: 17, src: "assets/cut/relay_hide.webp" }], lines: [
        L(HERO, "(아래에서 두 사람이 낮게 이야기하고 있다. 숨을 죽이고 들어 보자.)"),
        L(BALTEIN, "변형이 덜 되었군. 투입량을 늘려라, 클로드. 위에서 서두르고 계신다."),
        L(CLAUDE, "우리 짐승들이 버티질 못합니다. 결정을 더 먹이면 죽어 나가는 놈이 늘어요."),
        L(BALTEIN, "죽는 놈은 버려라. 실험 구역에 넘길 물량만 맞추면 된다. 이번에 잡은 짐승들은 곧바로 아지트로 올려 보낸다."),
        L(HERO, "(몬스터를 일부러 변형시키는 실험... 이 중계소는 그 재료를 아지트로 보내는 길목이다. 아지트가 어딘가에 있다.)"),
        "(그때 발밑에서 자갈 하나가 굴러떨어졌다.)",
        L(BALTEIN, "거기 누구냐!"),
        L(HERO, "(들켰다! 도망가자!)"),
        "(사방에서 발소리가 몰려온다. 횃불을 든 용병들이 바위 쪽으로 달려온다.)",
        L(BALTEIN, "잡아라! 산 채로 끌고 와!"),
        L(HERO, "(달려야 한다... 하지만 이 길은 절벽 끝으로 이어진다!)"),
        "(절벽 끝 리프트 앞에서 길이 끊겼다. 뒤에서는 용병들이, 옆에서는 변형 여우들이 몰려온다.)",
        L(HERO, "(더 갈 곳이 없다...!)"),
        "(그때 머리 위에서 쇠 부딪히는 소리가 울렸다. 누군가 리프트의 고정 밧줄을 끊었다.)",
        "(거대한 도르래와 궤짝이 추격대 위로 무너져 내린다. 그 순간 억센 손이 팔을 낚아챘다.)",
        L(J(), "쉿! 따라오게. 입을 다물고!"),
        "(좁은 바위틈 안쪽. 용병들의 발소리가 바위 밖으로 지나간다. 숨을 죽이자 노인이 낮게 속삭였다.)",
        L(J(), "...지나갔군. 이제 안심해도 되네. 이쪽으로 오게. 한숨 돌리며 이야기하세.")],
      onDone: (W) => { if (AU.G.questStatus("q_a3_scout") === "ready") W.trans = { t: 0, dur: 1.0, to: "gorge", x: 640, swapped: false }; } },
    ],
    spawns: [],
    area: { x: 78, y: 26, desc: "검은 골짜기 중심 천막을 내려다보는 절벽 위 바위 능선입니다. 아래에서 블랙 웨이브 사람들의 말소리가 올라옵니다." }
  };
  /* 용병 하차장: 잠입 맵. 용병(시야 부채꼴)에게 들키면 입구에서 다시 시작하며, 안 들킬 때까지 몇 번이고 반복합니다.
     상자 앞에서 Space로 숨습니다. 두 곳을 조사한 뒤 입구(왼쪽 끝)로 나가면 성공입니다. */
  AU.MAPS.yard = {
    name: "용병 하차장", bg: "bg_yard", width: 3720, safe: false, stealth: true,
    stealthMission: { quest: "q_a3_recon", flag: "yard_clear", start: 120 }, hideCrate: "ob_hide_crate_brand", hideSpots: [{ x: 540 }, { x: 1040 }, { x: 1500 }, { x: 1960 }, { x: 2420 }, { x: 2850 }, { x: 3250 }, { x: 3560 }], blockers: [],   // 11-25: 시야 막는 기둥 삭제, 상자는 검은 물결 불도장, 맵 가로 3720으로 확장
    platforms: [{ x: 0, y: 590, w: 3798 }], ropes: [],
    portals: [{ x: 40, to: "valley", toX: 620, label: "검은 골짜기" }],
    npcs: [],
    spots: [
      { id: "yard_crates", img: "ob_trace_crystal_crate", x: 1995, kind: "investigate", label: "불도장 찍힌 궤짝", lines: [
        "짐수레 곁에 궤짝이 산처럼 쌓여 있습니다. 옆면마다 불도장으로 찍힌 '검은 물결' 표식이 선명합니다.",
        "열린 궤짝 하나에는 검은 결정 원석이 가득합니다. 안쪽에 붉은 줄이 희미하게 비칩니다.",
        L(HERO, "(이 궤짝들이 전부 골짜기 안쪽으로 들어간다. 먹이는 게 결정이구나.)")] },
      { id: "yard_ledger", img: "ob_yard_ledger", imgFb: "ob_trace_crate", x: 3450, kind: "investigate", label: "하차 장부", lines: [
        "리프트 아래 목탁자 위에 하차 장부가 펼쳐져 있습니다. 날짜마다 '결정 N상자, 짐승 N두'라는 숫자가 적혀 있습니다.",
        "마지막 줄에는 다른 필체로 '투입량을 올린다. 변형이 덜 된 개체는 중심 천막으로.'라고 적혀 있습니다.",
        L(HERO, "(중심 천막... 이 골짜기 안쪽에서 누가 짐승을 만지고 있다는 뜻이다. 들키기 전에 빠져나가자.)")] }
    ],
    spawns: [{ type: "merc_sentry", x: 800, min: 660, max: 1100 }, { type: "merc_sentry", x: 1380, min: 1180, max: 1620 }, { type: "merc_sentry", x: 1950, min: 1760, max: 2200 }, { type: "merc_sentry", x: 2540, min: 2330, max: 2780 }, { type: "merc_sentry", x: 3060, min: 2900, max: 3300 }, { type: "merc_sentry", x: 3470, min: 3340, max: 3660 }],
    area: { x: 80, y: 32, desc: "검은 골짜기 안쪽의 용병 하차장입니다. 용병에게 들키면 입구에서 다시 시작합니다. 금빛으로 빛나는 상자 앞에서 Space로 숨으세요." }
  };
  AU.MAPS.gorge = {
    name: "협곡 바위틈", bg: "gorge", width: 2840, safe: false,
    noMonster: [0, 1500],   // 왼쪽 제페토의 임시 거처 구간: 몬스터가 생기지도, 들어오지도 못함
    platforms: [{ x: 0, y: 590, w: 2840 }], ropes: [],
    portals: [{ x: 40, to: "valley", toX: 3050, label: "검은 골짜기" },
              { x: 2800, to: "hide_outer", toX: 90, label: "검은 아지트", reqQuest: "q_h1a", reqIn: ["active", "ready", "done"], reqText: "협곡 안쪽 길은 아직 닫혀 있습니다. 제페토의 부탁을 받아야 합니다." }],
    npcs: [{ id: "jepeto", x: 760 }],
    spots: [
    ],
    spawns: [{ type: "wolf", x: 1940 }, { type: "wolf", x: 2240 }, { type: "wolf", x: 2520 }, { type: "wolf", x: 2690 }],
    area: { x: 90, y: 16, desc: "검은 골짜기 너머 협곡의 바위틈입니다. 왼쪽 천막과 판자 아래에는 제페토가 몰래 머무는 임시 거처가 있고, 안쪽에는 변형된 짐승이 출몰합니다." }
  };

  AU.AREA_LINKS.push(["porto", "jandari"], ["jandari", "jandari_shop"], ["jandari", "valley"], ["valley", "yard"], ["valley", "ridge"], ["valley", "gorge"]);
  { const r = AU.WORLD_REGIONS.find((x) => x.id === "south"); if (r && r.maps.indexOf("jandari_shop") < 0) r.maps.push("jandari_shop"); }
  // 포르투 노바 → 잔다리 골목 출입구
  AU.MAPS.porto.portals.push({ x: 215, to: "jandari", toX: 90, label: "잔다리 골목" });

  /* ---------- 퀘스트 ---------- */
  // fee: 수락할 때 내는 은화 / feeShort: 은화가 모자랄 때 하는 말 / turnIn: 보고할 NPC(없으면 의뢰인) / reqQuest·reqIn: 포털 열림 조건 / setFlags: 완료 시 기록 / after: 완료 후 안내
  Object.assign(AU.QUESTS, {
    q_a2_secret: {
      title: "바르샤의 전언", type: "main", giver: "barsha", minLevel: 7, pre: ["q_a1_boars"],
      area: "jandari_shop", desc: "잔다리 골목 안쪽, 정보상 바르샤의 공방으로 들어가 길드가 모르는 정보를 전달받습니다. 작업대 위의 결정 조각과 지도를 살펴봅니다.",
      objectives: [{ kind: "investigate", targets: ["barsha_lens", "barsha_map"] }],
      takeItems: [["teodoros_letter", 1]],
      offer: ["...카시안이 보냈군.", "...못 보던 얼굴이군.", L(HERO, "길드에 들어온 지 얼마 되지 않았습니다."), L(HERO, "(카시안의 서신과 보고서를 건넸다.)"), "...흠, 창고의 흔적까지 정리해 왔군. 서신에는 이 일을 내게 맡긴다고 적혀 있네. 좋아, 받아 두지.", "길드를 거쳐 온 검은 결정에 대해 알려 주겠네. 작업대 위의 물건들을 직접 보면서 들어 주게."],
      reminder: ["작업대 위의 결정 조각과 지도를 살펴보게. 눈으로 보는 게 빠르지."],
      done: ["몬스터를 일부러 어둠에 물들이는 자들이 있네. 이 도시 주변의 이상한 짐승들은 그 부산물이야.", "지도의 붉은 점이 그들의 중계소일세. 가 보려면 레벨 8은 되어야 하네. 들키면 칼을 뽑게 될 테니."],
      reward: { exp: 700, silver: 60, items: [["barsha_map", 1]] }
    },
    q_a3_recon: {
      title: "하차장 잠입", type: "main", giver: "barsha", minLevel: 8, pre: ["q_a2_secret"],
      area: "yard", desc: "검은 골짜기의 용병 하차장에 몰래 들어가 불도장 궤짝과 하차 장부를 조사하고 정보상 바르샤에게 돌아갑니다. 용병에게 들키면 입구에서 다시 시작하며, 들키지 않을 때까지 몇 번이든 도전할 수 있습니다.",
      objectives: [{ kind: "investigate", targets: ["yard_crates", "yard_ledger"] }],
      offer: ["북쪽 끝의 검은 골짜기에 중계소가 있네. 지도의 붉은 점이 그곳일세.", "먼저 골짜기 절벽 틈 길로 들어가면 용병들이 짐을 부리는 하차장이 나오네. 거기서 무엇이 오가는지 눈으로 확인해 오게.", "용병에게 들키면 안 되네. 놈들은 바라보는 쪽 앞의 부채꼴 안에서만 사람을 보네. 등 뒤나 기둥 뒤는 안전하고, 상자 앞에서 Space를 누르면 몸을 숨길 수 있네.", "들키면 입구로 돌아가 다시 하면 되네. 레벨 8 이상을 권하네."],
      reminder: ["골짜기 절벽 틈의 하차장에서 궤짝과 장부를 살피고 입구로 돌아오게. 들키면 다시 도전하면 되네."],
      done: [L(B(), "...숨이 찬 걸 보니 아슬아슬했나 보군. 그래도 들키지 않고 돌아왔으니 됐네."),
             L(B(), "불도장 궤짝에 결정 원석, 장부에는 투입량... 짐작대로군. 누군가 이 골짜기에서 결정으로 짐승을 일부러 변형시키고 있네."),
             L(B(), "증거가 더 필요하네. 골짜기를 돌아다니는 변형 여우를 잡아 결정을 가져오게. 그게 마지막 확인일세.")],
      reward: { exp: 400, silver: 40, items: [] }
    },
    q_a3_crystal: {
      title: "변형의 증거", type: "main", giver: "barsha", minLevel: 8, pre: ["q_a3_recon"],
      area: "valley", desc: "검은 골짜기를 돌아다니는 변형 여우 5마리를 처치하고 그 몸에서 나온 검은 결정 3개를 구해 정보상 바르샤에게 가져갑니다.",
      objectives: [{ kind: "kill", target: "mutfox", count: 5 }, { kind: "collect", item: "black_crystal", count: 3 }],
      offer: ["하차장 일은 잘 봤네. 이제 결정이 짐승 몸에 어떻게 박히는지 확인해야 하네.", "골짜기에는 이미 변형된 여우들이 돌아다니네. 다섯 마리를 잡고, 그 몸에서 나오는 검은 결정을 세 개 가져오게.", "변형 여우는 날쌔고 사납네. 물약을 아끼지 말게."],
      reminder: ["검은 골짜기에서 변형 여우 5마리를 처치하고, 몸에서 나온 검은 결정 3개를 가져오게."],
      done: [L(B(), "...이게 변형 여우의 몸에서 나온 결정인가. 선창 쥐나 게에서 나온 것과 같은 결이군."),
             L(B(), "이제 확실하네. 이 골짜기 한가운데에서 누군가 직접 결정을 먹이고 있네. 우두머리가 있다는 뜻이지."),
             L(B(), "골짜기 안쪽에 천막이 하나 서 있네. 다음엔 거기를 보고 오게. 조심하게, 아주 조심하게.")],
      reward: { exp: 500, silver: 50, items: [] }
    },
    q_a3_scout: {
      title: "속삭임 능선", type: "main", giver: "barsha", turnIn: "jepeto", minLevel: 8, pre: ["q_a3_crystal"],
      area: "ridge", desc: "골짜기 안쪽 길 끝의 포탈로 올라가 능선 바위틈에서 아래에서 오가는 이야기를 엿듣습니다. 들키면 도망치다 누군가의 도움으로 협곡 바위틈에 숨어들고, 그곳의 노인(제페토)에게 보고합니다.",
      objectives: [{ kind: "investigate", targets: ["relay_tent"] }],
      offer: ["골짜기 안쪽 길 끝으로 가 보게. 그쪽 어디쯤 가면 사람들의 대화 소리가 들릴 걸세. 바위 틈 위에서 몰래 귀를 기울여 보게.", "그 말소리에서 결정을 먹이는 자가 누구인지 정보를 얻어 오게. 들키면 무조건 도망치게. 절벽 쪽은 막혀 있지만... 협곡 바위틈에는 나와 뜻이 같은 도편수 제페토가 있네.", "그를 만나 보게. 살아서 돌아오게."],
      reminder: ["골짜기 안쪽 길 끝 바위틈에서 사람들의 대화 소리를 엿들어 정보를 얻어 오게. 들키면 도망쳐 협곡 바위틈의 제페토를 만나게."],
      done: [L(J(), "무사히 빠져나왔군. 이런 척박한 골짜기까지 들어온 사람이 있을 줄은 몰랐네. 나는 제페토라 하네. 겉으로는 동부에서 궁궐을 짓던 도편수였고, 바르샤와 같은 일도 하고 있지."),
             L(J(), "...잠깐. 손목을 좀 보여 주겠나. 그 검은 고리... 역시 그렇군."),
             L(J(), "오오, 그렇다면 그대는 용사로군. 옛 건축물과 비석을 파다 보면 용사의 기록이 여기저기 끊겨 있다는 걸 알게 된다네."),
             L(J(), "용사란 태초의 신이 나눠 준 힘 가운데 유독 큰 힘을 지닌 이들이라네. 손목의 낙인이 그 힘을 눌러 두고 있는데, 그대가 성장하면 힘이 조금씩 깨어난다네."),
             L(HERO, "제 손목의 이것이... 힘을 누르고 있다고요?"),
             L(J(), "마침 힘이 반응하는군. 손을 내밀어 보게, {이름}. 어렵게 생각할 것 없네. 깨어나는 만큼만 쓰면 되니까.")],
      reward: { exp: 1000, silver: 120, items: [], levelTo: 10 }, awaken: true
    },
    q_a3_jepeto: {
      title: "제페토의 부탁", type: "main", giver: "jepeto", minLevel: 10, pre: ["q_a3_scout"],
      area: "gorge", desc: "협곡에 출몰하는 변형된 늑대 4마리를 물리쳐 새로 깨어난 힘을 익히고, 제페토에게 돌아갑니다.",
      objectives: [{ kind: "kill", target: "wolf", count: 4 }],
      offer: [L(J(), "힘이 깨어났으니 쓰는 법부터 익혀야 하네. 이 협곡의 늑대들은 실험 때문에 변형된 놈들이야. 좋은 연습 상대지."),
              L(J(), "스킬은 {skills} 키에서 배치하게. 쓸수록 피로도가 쌓이니, 가득 차기 전에 쉬는 요령도 알려 주겠네."),
              L(J(), "늑대 네 마리를 상대하고 돌아오게.")],
      reminder: ["협곡의 변형 늑대를 네 마리 물리치고 돌아오게. 스킬은 {skills} 키에서 배치할 수 있네."],
      done: [L(J(), "...좋네. 힘을 다루는 눈이 제법 자랐군."),
             L(J(), "피로도가 쌓이는 게 보였나? 가득 차면 스킬을 쓸 수 없으니, 그땐 모험일지의 '쉼' 활동이 도움이 되지. 직접 해 보고 기록하면 피로도가 줄어든다네."),
             L(J(), "이제 본론일세. 중계소가 짐승을 보낸 곳, 어둠 세력의 아지트가 이 협곡 안쪽에 숨어 있네. 잠입해서 확인하는 일을 그대에게 부탁하고 싶네."),
             L(J(), "길은 내가 열어 두겠네. 준비가 되었으면 다시 말을 걸게.")],
      reward: { exp: 1400, silver: 150, items: [["potion", 3]] },
      setFlags: { a1_jepeto_done: true },
      after: ["준비가 되었으면 말을 걸게. 안쪽 길을 열어 두겠네."]
    }
  });

})();
