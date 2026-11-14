/* 1막 후반(스토리 Chapter 2~3): 잔다리 골목(바르샤) → 검은 골짜기 → 협곡 바위틈(제페토).
   문장은 사용자 원고(수정본 1114)의 Chapter 2·3을 게임 대사에 맞게 줄인 것입니다. 이름·수치는 임시입니다.
   폭력 표현 기준: 소리·그림자·결과만 보여 주고 가해 장면은 쓰지 않습니다. 그림이 없는 곳은 대체 그래픽으로 표시됩니다(optional). */
window.AU = window.AU || {};
(function () {
  /* ---------- 그림(없어도 동작) ---------- */
  Object.assign(AU.ASSETS, {
    alley:  { path: "assets/bg/alley.webp", optional: true },
    valley: { path: "assets/bg/valley.webp", optional: true },
    gorge:  { path: "assets/bg/gorge.webp", optional: true },
    barsha:  { path: "assets/char/barsha.webp", optional: true },
    jepeto:  { path: "assets/char/jepeto.webp", optional: true },
    pt_barsha: { path: "assets/portrait/barsha.webp", optional: true },
    pt_jepeto: { path: "assets/portrait/jepeto.webp", optional: true },
    mon_merc: { path: "assets/monster/merc.webp", optional: true },
    mon_wolf: { path: "assets/monster/wolf.webp", optional: true }
  });

  /* 말하는 사람(대화창 이름·초상화). 주인공은 성별·이름을 따라감 */
  const HERO = { get name() { return AU.Profile.name(); }, get portrait() { return AU.Profile.portraitKey(); } };
  const B = () => AU.NPCS.barsha, J = () => AU.NPCS.jepeto;
  const CLAUDE = { name: "감독관 클로드", portrait: "" }, BALTEIN = { name: "검수관 발테인", portrait: "" }, VOICE = { name: "용병", portrait: "" };
  const L = (npc, t) => ({ npc, t });

  /* ---------- 아이템 ---------- */
  Object.assign(AU.ITEMS, {
    barsha_map: { name: "바르샤의 양피지 지도", type: "quest", desc: "포르투 노바 북쪽 경계의 중계소 위치가 표시된 구겨진 지도입니다." },
    jepeto_blueprint: { name: "제페토의 도면 부품", type: "story", keep: true, desc: "기름종이에 싼 낡은 철제 도면 부품. 금속의 결을 읽어 약한 곳을 가늠하는 법이 적혀 있다." },
    iron_scrap: { name: "흑철 부스러기 (임시)", type: "etc", rarity: "common", sell: 9, desc: "갑옷에서 떨어진 은회색 부스러기입니다. 팔 수 있습니다." },
    wolf_pelt: { name: "오염된 늑대 가죽 (임시)", type: "etc", rarity: "common", sell: 8, desc: "눈이 붉던 늑대의 거친 가죽입니다. 팔 수 있습니다." }
  });

  /* ---------- 적 ---------- */
  Object.assign(AU.MONSTERS, {
    merc: { name: "블랙 웨이브 용병", lv: 9, hp: 260, atk: 34, speed: 90, chase: 210, w: 60, h: 112, exp: 170, silver: [12, 20], drops: [["iron_scrap", 0.5, 1, 2], ["potion", 0.15]], color: "#4D4D5C", motion: "swing", sprite: "mon_merc", sw: 88 },
    wolf: { name: "오염된 늑대", lv: 10, hp: 300, atk: 38, speed: 115, chase: 230, w: 88, h: 54, exp: 200, silver: [12, 18], drops: [["wolf_pelt", 0.55, 1, 2], ["potion", 0.12]], color: "#6C6F7A", ear: true, motion: "pounce", sprite: "mon_wolf", sw: 140 }
  });

  /* ---------- NPC ---------- */
  AU.NPCS.barsha = { name: "정보상 바르샤 (임시)", sprite: "barsha", portrait: "pt_barsha", quests: ["q_a2_secret", "q_a3_scout"],
    idle: ["...오르비스의 그림자를 밟지 않게 조심해라.", "은화가 있어야 입이 열린다. 이 바닥의 법칙이지."] };
  AU.NPCS.jepeto = { name: "도편수 제페토 (임시)", sprite: "jepeto", portrait: "pt_jepeto", quests: ["q_a3_scout", "q_a3_jepeto"],
    idle: ["손은 늙었어도 눈은 아직 쓸 만하다네.", "서부로 가는 길은 험하니 단련을 게을리하지 말게."] };

  /* ---------- 맵 ---------- */
  AU.MAPS.jandari = {
    name: "잔다리 골목", bg: "alley", width: 1500, safe: true,
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 40, to: "porto", toX: 260, label: "포르투 노바" },
              { x: 1460, to: "valley", toX: 90, label: "북쪽 경계(검은 골짜기)", reqQuest: "q_a3_scout", reqIn: ["active", "ready", "done"], reqText: "정보상에게 아직 들을 이야기가 남아 있습니다." }],
    npcs: [{ id: "barsha", x: 820 }],
    spots: [
      { id: "barsha_lens", img: "", x: 640, kind: "investigate", label: "황동 돋보기와 쇳조각", lines: [
        L(B(), "이건 평범한 잡쇠가 아니야. ...이 제련법은 대륙 동부 오르비스 가문의 비밀 공방에서나 쓰는 강철이다."),
        L(B(), "빛의 신전을 수호한다는 가문의 고결한 흑철이지. 그런데 안쪽에 붉은 핏줄처럼 터져 있는 이 결..."),
        L(B(), "어둠의 마석을 섞어 강도를 올린 거다. 빛의 가문이 마석에 손댔다면, 시장엔 절대 나올 수 없는 물건이지."),
        L(HERO, "(마석... 어둠의 기운이 굳은 광물이라고만 들었는데, 신전 가문의 강철 속에 섞여 있다니.)")] },
      { id: "barsha_map", img: "", x: 1010, kind: "investigate", label: "구겨진 양피지 지도", lines: [
        L(B(), "이 '검은 물결'은 마석과 잡쇠를 암거래하는 비밀 상단 '블랙 웨이브'의 표식이다."),
        L(B(), "매달 포르투 노바 북쪽 경계선으로 이런 쇳덩이들을 실어 나르지. 다만 상단은 심부름꾼일 뿐이야."),
        L(B(), "누가 무엇을 위해 시키는지는 나도 모른다.")] }
    ],
    spawns: [], start: 90,
    area: { x: 66, y: 52, desc: "포르투 노바 하층민 구역의 좁은 골목입니다. 정보상의 공방이 있습니다." }
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
        "궤짝 옆면마다 불도장으로 찍힌 '검은 물결' 표식이 선명합니다. 구석에서는 계약에 묶인 인부들이 마석 원석을 다듬고 있습니다."] },
      { id: "relay_tent", img: "", x: 1700, kind: "investigate", label: "중심 천막 밑 대화", lines: [
        "중심 천막 아래에서 두 사람이 낮게 이야기하고 있습니다.",
        "가죽 채찍을 찬 사내는 상단 감독관 클로드. 흰 인장 로브로 핏빛 원석을 들여다보는 사내는 오르비스 가문의 검수관 발테인입니다.",
        L(BALTEIN, "순도가 이 정도밖에 안 되나, 클로드? 가문 공방에서 섞을 원료가 부족하다."),
        L(CLAUDE, "서부 광맥이 말라 갑니다, 발테인 님. 대신 요즘은 땅이 스스로 마석을 뱉어 내는 곳이 늘었습니다. 캐는 것보다 줍는 쪽이 빠를 정도입니다."),
        L(BALTEIN, "그 틈을 놓치지 마라. 윗분께서 서두르고 계신다. 이번 물량은 오르비스 공방으로 바로 올라간다."),
        L(HERO, "(이 쇳조각이 오르비스 공방과 블랙 웨이브 상단으로 이어진다는 것은 분명해졌다. 하지만 아르케아를 왜 쳤는지, '윗분'이 누구인지는 아직 알 수 없다. 단서일 뿐, 증거는 아니다.)"),
        "그때 발밑에서 자갈 하나가 굴러떨어졌습니다. \"거기 누구냐! 바위 위에 쥐새끼가 꼬였다!\" 횃불이 암벽을 비춥니다."] },
      { id: "lift_rope", img: "fence", kind: "repair", x: 2500, dur: 2, label: "수하물 리프트 밧줄", done: "고정 밧줄을 정으로 끊었습니다. 거대한 도르래가 요란하게 무너져 내리며 추격자들의 길을 막습니다." }
    ],
    spawns: [{ type: "merc", x: 760 }, { type: "merc", x: 1100 }, { type: "merc", x: 1580, y: 440, min: 1490, max: 1710 }, { type: "merc", x: 2000 }, { type: "merc", x: 2420, y: 470, min: 2370, max: 2570 }, { type: "merc", x: 2750 }],
    area: { x: 78, y: 28, desc: "포르투 노바 북쪽 경계 너머의 기암괴석 지대입니다. 블랙 웨이브 비밀 중계소가 있습니다. (임시 설명)" }
  };
  AU.MAPS.gorge = {
    name: "협곡 바위틈", bg: "gorge", width: 1500, safe: false,
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 40, to: "valley", toX: 3050, label: "검은 골짜기" },
              { x: 1460, to: "gorge", toX: 1400, label: "서부 광산 수송로", lock: "서부 섀도우 미스트로 이어지는 광산 수송로입니다. 이 길은 다음 이야기(서부 편)에서 열립니다." }],
    npcs: [{ id: "jepeto", x: 420 }],
    spots: [
      { id: "grain_a", img: "fence", x: 760, kind: "repair", label: "결이 엇갈린 통나무", done: "손끝으로 결을 따라 정을 넣자 통나무가 깨끗이 갈라졌습니다." },
      { id: "grain_b", img: "fence", x: 1080, kind: "repair", label: "옹이 박힌 판자", done: "옹이 둘레의 결을 읽고 약한 곳을 정확히 쳐냈습니다." }
    ],
    spawns: [{ type: "wolf", x: 900 }, { type: "wolf", x: 1180 }, { type: "wolf", x: 1350 }, { type: "wolf", x: 600 }],
    area: { x: 90, y: 16, desc: "서부로 이어지는 협곡의 바위틈입니다. 오염된 짐승이 출몰합니다. (임시 설명)" }
  };
  AU.AREA_LINKS.push(["porto", "jandari"], ["jandari", "valley"], ["valley", "gorge"]);
  // 포르투 노바 → 잔다리 골목 출입구
  AU.MAPS.porto.portals.push({ x: 215, to: "jandari", toX: 90, label: "잔다리 골목" });

  /* ---------- 퀘스트 ---------- */
  // fee: 수락할 때 내는 은화 / feeShort: 은화가 모자랄 때 하는 말 / turnIn: 보고할 NPC(없으면 의뢰인) / reqQuest·reqIn: 포털 열림 조건 / setFlags: 완료 시 기록 / after: 완료 후 안내
  Object.assign(AU.QUESTS, {
    q_a2_secret: {
      title: "금속의 비밀 (임시)", type: "main", giver: "barsha", minLevel: 7, pre: ["q_a1_traces"], fee: 80,
      area: "jandari", desc: "잔다리 골목의 정보상 바르샤에게 은화 80잎을 내고 쇳조각의 출처를 듣습니다. 탁자 위 돋보기와 지도를 살펴봅니다.",
      objectives: [{ kind: "investigate", targets: ["barsha_lens", "barsha_map"] }],
      feeShort: ["문 닫았다. 물건 팔 거면 내일 오라 했을 텐데.", "아아, 그 풋내기 목수 놈이군. 은화 냄새도 못 풍기는 거지가 기웃거릴 곳이 아니라고 했을 텐데.", "은화 80잎쯤 쥐고 오면 그 쇠가 어느 놈 갑옷에서 떨어졌는지 말해 주지. 방파제에서 일하면 벌 수 있을 거다."],
      offer: ["...왔군. 은화 냄새가 나는 걸 보니 전에 그 풋내기는 아닌 모양이야.", "(은화 80잎을 먼지 덮인 탁자에 쏟고, 헝겊에 싼 쇳조각을 내려놓은 뒤 단면 안쪽의 '검은 물결' 흠집을 손가락으로 짚었다.)", "바르샤는 말없이 단면에 돋보기를 밀착시켰다. 노인의 미간에 그림자가 드리운다.", "...좋아. 탁자 위의 물건들을 직접 보면서 들어라."],
      reminder: ["탁자 위의 돋보기와 지도를 살펴보게. 눈으로 보는 게 빠르지."],
      done: ["들었나? 이 일은 평범한 목수 일과는 결이 달라.", "빛의 율법을 수호한다는 가문의 그림자를 밟는 순간, 평범한 목수 일로 돌아갈 생각은 접는 게 좋을 거다.", "(양피지 지도를 받았습니다.)"],
      reward: { exp: 700, silver: 0, items: [["barsha_map", 1]] }
    },
    q_a3_scout: {
      title: "검은 골짜기 정찰 (임시)", type: "main", giver: "barsha", turnIn: "jepeto", minLevel: 8, pre: ["q_a2_secret"],
      area: "valley", desc: "검은 골짜기의 블랙 웨이브 중계소를 정찰합니다. 궤짝과 천막 대화를 조사하고, 쫓아오는 용병 5명을 물리친 뒤 리프트 밧줄을 끊고 협곡으로 빠져나가, 도와준 노인(제페토)에게 보고합니다.",
      objectives: [{ kind: "investigate", targets: ["valley_crates", "relay_tent"] }, { kind: "kill", target: "merc", count: 5 }, { kind: "repair", targets: ["lift_rope"] }],
      offer: ["더 알고 싶으면 북쪽 암석 지대의 중계소를 찾아가든가. 양피지 지도의 점이 그곳이다.", "상단은 심부름꾼일 뿐, 그 위는 나도 모른다. 가까이 가서 직접 보고 와라. 들키면... 칼을 뽑아야 할 거다.", "중계소는 잔다리 골목 북쪽 끝에서 이어진다. 레벨 8 이상을 권한다."],
      reminder: ["북쪽 끝에서 검은 골짜기로 가게. 궤짝과 천막을 살피고, 쫓기면 밧줄을 끊어 길을 막게."],
      done: [L(J(), "이런 척박한 북부 골짜기까지 기어들 줄이야. 이름도 못 물었군. 나는 제페토라 하네. 끌려오기 전에는 동부에서 궁궐 짓는 도편수 소리를 듣기도 했지."),
             L(HERO, "아르케아 마을 출신의 목수, {이름}입니다. 영감님 덕분에 살았습니다."),
             L(J(), "아르케아라면... 이번에 통째로 불에 탔다는 그 산골 마을이군. 네 눈빛을 보니 복수를 품고 여기까지 온 모양인데, 검 한 자루로는 저 거대한 가문들의 갑옷을 뚫기 역부족이야.")],
      reward: { exp: 1000, silver: 120, items: [] }
    },
    q_a3_jepeto: {
      title: "결을 읽는 눈 (임시)", type: "main", giver: "jepeto", minLevel: 9, pre: ["q_a3_scout"],
      area: "gorge", desc: "협곡에서 제페토에게 금속과 나무의 결을 읽는 법을 배웁니다. 통나무와 판자 두 곳의 결을 읽어 가르고, 오염된 늑대 4마리를 물리쳐 단련합니다.",
      objectives: [{ kind: "repair", targets: ["grain_a", "grain_b"] }, { kind: "kill", target: "wolf", count: 4 }],
      offer: [L(J(), "눈빛이 마음에 드는구먼. 이 중계소 지하에서 몰래 빼낸 도면이다. 내 손은 늙어서 펼치지 못했지만 네 젊은 손이라면 가능할 거다."),
              L(J(), "금속이든 나무든 결을 읽으면 약한 곳이 보이네. 기술은 가르쳐 줄 수 있어도 몸에 익히는 건 네 몫이야."),
              L(J(), "저기 통나무와 판자로 결 읽는 법부터 익혀 보게. 그다음엔 서부로 가기 전에 오염된 짐승들을 상대하며 단련하는 게 좋겠구나.")],
      reminder: ["통나무와 판자의 결을 읽고, 늑대를 상대로 단련하게. 서두를 것 없네."],
      done: [L(J(), "...됐네. 결을 보는 눈이 제법 자랐군. 이 도면 부품과 숫돌 쓰는 법을 몸으로 익히게."),
             L(J(), "영감은 남쪽 하층민 구역으로 숨어들 테니 걱정 말게. 네 손은 부서진 나무나 고치는 손만이 아니야. 절대 꺾이지 마라."),
             L(J(), "오르비스 놈들의 비밀을 파헤치려면 서부의 마석 채굴장으로 가야 하지. 길은 험하니 반드시 살아남게."),
             L(HERO, "영감님도 조심하십시오. 반드시 살아남으십시오.")],
      reward: { exp: 1400, silver: 150, items: [["jepeto_blueprint", 1], ["potion", 3]] },
      setFlags: { act1_done: true },
      after: ["1막 이야기는 여기까지입니다. 서부 섀도우 미스트 편은 다음 이야기에서 이어집니다."]
    }
  });

  // 십장이 쇳조각 이야기를 꺼내 잔다리 골목으로 이어 줌(1장 → 2장)
  const tr = AU.QUESTS.q_a1_traces; if (tr && tr.done.length < 2) tr.done.push("참, 자네가 들고 다니는 그 쇳조각 말일세. 그런 건 잔다리 골목의 늙은 정보상이 밝지. 다만 입을 열게 하려면 은화가 필요할 걸세.");
})();
