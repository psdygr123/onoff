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
    mon_wolf: { path: "assets/monster/wolf.webp", optional: true }
  });

  /* 말하는 사람(대화창 이름·초상화). 주인공은 성별·이름을 따라감 */
  const HERO = { get name() { return AU.Profile.name(); }, get portrait() { return AU.Profile.portraitKey(); } };
  const B = () => AU.NPCS.barsha, J = () => AU.NPCS.jepeto;
  const CLAUDE = { name: "감독관 클로드", portrait: "" }, BALTEIN = { name: "흰 로브의 검수관", portrait: "" }, VOICE = { name: "용병", portrait: "" };
  const L = (npc, t) => ({ npc, t });

  /* ---------- 아이템 ---------- */
  Object.assign(AU.ITEMS, {
    barsha_map: { name: "바르샤의 양피지 지도", type: "quest", desc: "포르투 노바 북쪽 경계의 중계소 위치가 표시된 구겨진 지도입니다." },
    
    iron_scrap: { name: "흑철 부스러기", type: "etc", rarity: "common", sell: 9, desc: "갑옷에서 떨어진 은회색 부스러기입니다. 팔 수 있습니다." },
    wolf_pelt: { name: "오염된 늑대 가죽", type: "etc", rarity: "common", sell: 8, desc: "눈이 붉던 늑대의 거친 가죽입니다. 팔 수 있습니다." }
  });

  /* ---------- 적 ---------- */
  Object.assign(AU.MONSTERS, {
    merc: { name: "블랙 웨이브 용병", lv: 9, hp: 260, atk: 34, speed: 90, chase: 210, w: 60, h: 112, exp: 300, silver: [7, 16], silverRate: 0.16, drops: [["iron_scrap", 0.15, 1, 2], ["potion", 0.05]], color: "#4D4D5C", motion: "swing", sprite: "mon_merc", sw: 88 },
    wolf: { name: "오염된 늑대", lv: 10, hp: 300, atk: 38, speed: 115, chase: 230, w: 88, h: 54, exp: 320, silver: [8, 18], silverRate: 0.17, drops: [["wolf_pelt", 0.15, 1, 2], ["potion", 0.05]], color: "#6C6F7A", ear: true, motion: "leap", sprite: "mon_wolf", sw: 140 }
  });

  /* ---------- NPC ---------- */
  AU.NPCS.barsha = { name: "정보상 바르샤", sprite: "barsha", portrait: "pt_barsha", quests: ["q_a2_secret", "q_a3_scout"],
    idle: ["길드 장부에 내 이름은 없네. 그게 이 일의 요령이지.", "필요한 소식이 생기면 내가 먼저 부를 걸세."] };
  AU.NPCS.jepeto = { name: "도편수 제페토", sprite: "jepeto", portrait: "pt_jepeto", quests: ["q_a3_scout", "q_a3_jepeto"],
    idle: ["손은 늙었어도 눈은 아직 쓸 만하다네.", "서부로 가는 길은 험하니 단련을 게을리하지 말게."] };

  /* ---------- 맵 ---------- */
  AU.MAPS.jandari = {
    name: "잔다리 골목", bg: "alley", width: 1500, safe: true,
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 40, to: "porto", toX: 260, label: "포르투 노바" },
              { x: 960, to: "jandari_shop", toX: 200, label: "정보상의 공방(문)", door: true },
              { x: 1460, to: "valley", toX: 90, label: "북쪽 경계(검은 골짜기)", reqQuest: "q_a3_scout", reqIn: ["active", "ready", "done"], reqText: "정보상에게 아직 들을 이야기가 남아 있습니다." }],
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
      { id: "barsha_lens", img: "", x: 730, kind: "investigate", label: "작업대 위의 검은 결정 조각", lines: [
        L(B(), "길드가 보낸 것과 같은 결이다. 자연에서 이만큼 순하게 굳은 결정은 나오지 않아."),
        L(B(), "누군가 일부러 만들어 내고 있다는 뜻이지. 그리고 그 재료는 짐승의 몸이야. 몸에 닿은 어둠이 굳어서 이렇게 된다."),
        L(HERO, "(몬스터 몸에서 나온 검은 결정... 누군가 몬스터를 일부러 어둠에 물들이고 있다는 말이다.)")] },
      { id: "barsha_map", img: "", x: 1150, kind: "investigate", label: "구겨진 양피지 지도", lines: [
        L(B(), "북쪽 경계 너머 검은 골짜기에 붉은 점이 찍혀 있지. 블랙 웨이브 상단이 쓰는 비밀 중계소야."),
        L(B(), "매달 그리로 짐승을 가둘 우리와 검은 결정 원석이 실려 간다."),
        L(B(), "상단은 심부름꾼일 뿐이야. 누가 시키는지, 어디로 가는지는 직접 보고 와야 알 수 있네.")] }
    ],
    spawns: [], start: 200,
    area: { x: 66, y: 52, desc: "정보상 바르샤의 공방 안입니다. 작업대 위에 길드 장부에 없는 물건들이 놓여 있습니다." }
  };
  AU.MAPS.valley = {
    name: "검은 골짜기", bg: "valley", width: 3200, safe: false,
    platforms: [{ x: 0, y: 590, w: 3200 }, { x: 880, y: 470, w: 220, thin: true }, { x: 1480, y: 440, w: 240, thin: true }, { x: 2360, y: 470, w: 220, thin: true }], ropes: [],
    portals: [{ x: 50, to: "jandari", toX: 1380, label: "잔다리 골목" },
              { x: 3150, to: "gorge", toX: 90, label: "협곡 바위틈", reqSpot: "lift_rope", reqText: "아직 추격자들이 길을 막고 있습니다. 리프트 밧줄을 끊어 길을 막아야 합니다." }],
    npcs: [],
    spots: [
      { id: "valley_crates", img: "ob_trace_crate", x: 520, kind: "investigate", label: "불도장 찍힌 궤짝", lines: [
        "절벽 틈에서 내려다본 하차장입니다. 검은 옷의 용병 수십 명이 짐수레에서 묵직한 궤짝을 끊임없이 나르고 있습니다.",
        "궤짝 옆면마다 불도장으로 찍힌 '검은 물결' 표식이 선명합니다. 구석에서는 계약에 묶인 인부들이 검은 결정 원석을 다듬고 있습니다."] },
      { id: "relay_tent", img: "", x: 1700, kind: "investigate", label: "중심 천막 밑 대화", lines: [
        "중심 천막 아래에서 두 사람이 낮게 이야기하고 있습니다.",
        "가죽 채찍을 찬 사내는 상단 감독관 클로드. 흰 로브를 입고 핏빛 원석을 들여다보는 사내는 흰 로브의 검수관이라 불립니다.",
        L(BALTEIN, "변형이 덜 되었군. 투입량을 늘려라, 클로드. 위에서 서두르고 계신다."),
        L(CLAUDE, "우리 짐승들이 버티질 못합니다. 결정을 더 먹이면 죽어 나가는 놈이 늘어요."),
        L(BALTEIN, "죽는 놈은 버려라. 실험 구역에 넘길 물량만 맞추면 된다. 이번에 잡은 짐승들은 곧바로 아지트로 올려 보낸다."),
        L(HERO, "(몬스터를 일부러 변형시키는 실험... 이 중계소는 그 재료를 아지트로 보내는 길목이다. 아지트가 어딘가에 있다.)"),
        "그때 발밑에서 자갈 하나가 굴러떨어졌습니다. \"거기 누구냐! 바위 위에 쥐새끼가 꼬였다!\" 횃불이 암벽을 비춥니다."] },
      { id: "lift_rope", img: "fence", kind: "repair", x: 2500, dur: 2, label: "수하물 리프트 밧줄", done: "고정 밧줄을 정으로 끊었습니다. 거대한 도르래가 요란하게 무너져 내리며 추격자들의 길을 막습니다." }
    ],
    spawns: [{ type: "merc", x: 760 }, { type: "merc", x: 1100 }, { type: "merc", x: 1580, y: 440, min: 1490, max: 1710 }, { type: "merc", x: 2000 }, { type: "merc", x: 2420, y: 470, min: 2370, max: 2570 }, { type: "merc", x: 2750 }],
    area: { x: 78, y: 28, desc: "포르투 노바 북쪽 경계 너머의 기암괴석 지대입니다. 블랙 웨이브 비밀 중계소가 있습니다." }
  };
  AU.MAPS.gorge = {
    name: "협곡 바위틈", bg: "gorge", width: 1500, safe: false,
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 40, to: "valley", toX: 3050, label: "검은 골짜기" },
              { x: 1460, to: "hide_outer", toX: 90, label: "검은 아지트", reqQuest: "q_h1", reqIn: ["active", "ready", "done"], reqText: "협곡 안쪽 길은 아직 닫혀 있습니다. 제페토의 부탁을 받아야 합니다." }],
    npcs: [{ id: "jepeto", x: 420 }],
    spots: [
    ],
    spawns: [{ type: "wolf", x: 900 }, { type: "wolf", x: 1180 }, { type: "wolf", x: 1350 }, { type: "wolf", x: 600 }],
    area: { x: 90, y: 16, desc: "검은 골짜기 너머 협곡의 바위틈입니다. 변형된 짐승이 출몰합니다." }
  };
  AU.AREA_LINKS.push(["porto", "jandari"], ["jandari", "jandari_shop"], ["jandari", "valley"], ["valley", "gorge"]);
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
      offer: ["...카시안이 보냈군. 문 닫히는 소리가 났으니 됐네. 이쪽으로 오게.", "(카시안의 서신과 보고서를 건넸다.)", "...흠, 창고의 흔적까지 정리해 왔군. 서신에는 이 일을 내게 맡긴다고 적혀 있네. 좋아, 받아 두지.", "내가 하는 일을 길드 장부에서 찾을 순 없네. 길드의 뒷세계에서 소식을 모으는 일을 하지. 쉽게 말해 비밀 요원일세.", "길드를 거쳐 온 검은 결정에 대해 알려 주겠네. 작업대 위의 물건들을 직접 보면서 들어 주게."],
      reminder: ["작업대 위의 결정 조각과 지도를 살펴보게. 눈으로 보는 게 빠르지."],
      done: ["들었나? 몬스터를 일부러 어둠에 물들이는 자들이 있네. 이 도시 주변의 이상한 짐승들은 그 부산물이야.", "지도의 붉은 점이 그들의 중계소일세. 가 보려면 레벨 8은 되어야 하네. 들키면 칼을 뽑게 될 테니."],
      reward: { exp: 700, silver: 60, items: [["barsha_map", 1]] }
    },
    q_a3_scout: {
      title: "검은 골짜기 정찰", type: "main", giver: "barsha", turnIn: "jepeto", minLevel: 8, pre: ["q_a2_secret"],
      area: "valley", desc: "검은 골짜기의 중계소를 정찰합니다. 궤짝과 천막 대화를 조사하고, 쫓아오는 용병 5명을 물리친 뒤 리프트 밧줄을 끊고 협곡으로 빠져나가, 도와준 노인(제페토)에게 보고합니다.",
      objectives: [{ kind: "investigate", targets: ["valley_crates", "relay_tent"] }, { kind: "kill", target: "merc", count: 5 }, { kind: "repair", targets: ["lift_rope"] }],
      offer: ["북쪽 끝의 검은 골짜기에 중계소가 있네. 지도의 붉은 점이 그곳일세.", "가까이 가서 무엇을 나르는지 직접 보고 오게. 들키면 칼을 뽑아야 할 걸세.", "중계소는 잔다리 골목 북쪽 끝에서 이어지네. 레벨 8 이상을 권하네."],
      reminder: ["북쪽 끝에서 검은 골짜기로 가게. 궤짝과 천막을 살피고, 쫓기면 밧줄을 끊어 길을 막게."],
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
