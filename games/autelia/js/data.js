/* 아우텔리아 콘텐츠 데이터(맵·적·아이템·퀘스트·스킬·현실 미션).
   스토리 담당자가 세부 시나리오를 따로 쓰므로, 여기 있는 퀘스트·대사·NPC 이름은 전부 '임시 테스트 콘텐츠'입니다.
   TODO 표시가 붙은 곳은 정식 데이터가 들어올 자리입니다. 이전 아스텔리아 스토리는 섞지 않았습니다. */
window.AU = window.AU || {};

/* ---------- 이미지 자산 (없으면 대체 그래픽으로 표시) ---------- */
AU.ASSETS = {
  plaza:        { path: "assets/bg/plaza.webp" },
  forest_road:  { path: "assets/bg/forest_road.webp" },
  harbor_road:  { path: "assets/bg/harbor_road.webp" },
  harbor:       { path: "assets/bg/harbor.webp" },
  storage:      { path: "assets/bg/storage.webp" },
  player_male:   { path: "assets/char/player_male.webp", frames: 4 },
  player_female: { path: "assets/char/player_female.webp", frames: 4 },
  villager_a:   { path: "assets/char/villager_a.webp" },
  villager_b:   { path: "assets/char/villager_b.webp" },
  smith:        { path: "assets/char/smith.webp" },
  baker:        { path: "assets/char/baker.webp" },
  porto_general: { path: "assets/char/porto_general.webp" },
  porto_smith:  { path: "assets/char/porto_smith.webp" },
  porto_armor:  { path: "assets/char/porto_armor.webp" },
  porto_foreman: { path: "assets/char/porto_foreman.webp" },
  general_store: { path: "assets/bg/general_store.webp" },
  weapon_store: { path: "assets/bg/weapon_store.webp" },
  guild_hall: { path: "assets/bg/guild_hall.webp" },
  warehouse: { path: "assets/bg/warehouse.webp" },
  mon_umbra_base: { path: "assets/monster/umbra_base.webp", optional: true },
  mon_umbra_walkA: { path: "assets/monster/umbra_walkA.webp", optional: true },
  mon_umbra_walkB: { path: "assets/monster/umbra_walkB.webp", optional: true },
  mon_umbra_windup: { path: "assets/monster/umbra_windup.webp", optional: true },
  mon_umbra_attack: { path: "assets/monster/umbra_attack.webp", optional: true },
  mon_umbra_hurt: { path: "assets/monster/umbra_hurt.webp", optional: true },
  mon_umbra_down: { path: "assets/monster/umbra_down.webp", optional: true },
  ob_rock_s: { path: "assets/object/rock_s.webp", optional: true }, ob_rock_m: { path: "assets/object/rock_m.webp", optional: true }, ob_rock_big: { path: "assets/object/rock_big.webp", optional: true }, ob_rock_tall: { path: "assets/object/rock_tall.webp", optional: true }, ob_rock_low: { path: "assets/object/rock_low.webp", optional: true },
  ob_fence_broken: { path: "assets/object/fence_broken.webp", optional: true }, ob_fence_fixed: { path: "assets/object/fence_fixed.webp", optional: true },
  ob_trace_stain: { path: "assets/object/trace_stain.webp", optional: true }, ob_trace_crate: { path: "assets/object/trace_crate.webp", optional: true }, it_guild_parcel: { path: "assets/object/guild_parcel.webp", optional: true },
  job_warrior: { path: "assets/job/warrior.webp", optional: true }, job_hero: { path: "assets/job/hero.webp", optional: true }, job_mage: { path: "assets/job/mage.webp", optional: true }, job_archer: { path: "assets/job/archer.webp", optional: true }, job_rogue: { path: "assets/job/rogue.webp", optional: true }, job_pirate: { path: "assets/job/pirate.webp", optional: true },
  mon_fox:   { path: "assets/monster/fox.webp", optional: true },
  mon_snake: { path: "assets/monster/snake.webp", optional: true },
  mon_rat:   { path: "assets/monster/rat.webp", optional: true },
  mon_crab:  { path: "assets/monster/crab.webp", optional: true },
  pt_player_male: { path: "assets/portrait/player_male.webp" },
  pt_player_female: { path: "assets/portrait/player_female.webp" },
  pt_villager_a: { path: "assets/portrait/villager_a.webp" },
  pt_villager_b: { path: "assets/portrait/villager_b.webp" },
  pt_smith:      { path: "assets/portrait/smith.webp" },
  pt_baker:      { path: "assets/portrait/baker.webp" },
  pt_porto_general: { path: "assets/portrait/porto_general.webp" },
  pt_porto_smith: { path: "assets/portrait/porto_smith.webp" },
  pt_porto_armor: { path: "assets/portrait/porto_armor.webp" },
  pt_porto_foreman: { path: "assets/portrait/porto_foreman.webp" }
};


/* ---------- 맵 ---------- */
// 지역 이름은 요청서에 나온 아르케아·포르투 노바만 확정. 나머지 이름은 임시 일반 명칭입니다(TODO).
AU.MAPS = {
  arche: {
    // 프롤로그 이후 이야기에서 아르케아는 습격으로 파괴된 마을이라 신규 플레이어는 갈 수 없음. 기존(프롤로그 이전) 저장을 위해 데이터는 유지.
    name: "아르케아 마을", bg: "plaza", width: 2484, safe: true, hidden: true,
    platforms: [{ x: 0, y: 590, w: 2484 }], ropes: [],
    portals: [{ x: 2420, to: "forest", toX: 90, label: "숲길" }],
    npcs: [{ id: "arche_guide", x: 620 }],
    spawns: [], start: 300,
    area: { x: 16, y: 64, desc: "주인공이 살던 산골 마을입니다. 모험이 시작되는 곳입니다." }
  },
  forest: {
    name: "숲길", bg: "forest_road", width: 3000, safe: false,
    // 발판·밧줄 위치는 이전 시제품의 숲길 그림에 맞춘 값을 그대로 사용
    platforms: [{ x: 0, y: 590, w: 3000 }, { x: 620, y: 542, w: 130, h: 48, img: "ob_rock_s" }, { x: 900, y: 520, w: 190, h: 70, img: "ob_rock_m" },
                { x: 1350, y: 390, w: 650, h: 200, img: "ob_rock_big" }, { x: 2000, y: 460, w: 80, h: 130, img: "ob_rock_tall" }, { x: 2085, y: 530, w: 120, h: 60, img: "ob_rock_low" }], // h가 있으면 옆이 막힌 단단한 바위·턱(img: 눈에 보이는 바위 그림)
    ropes: [{ x: 1315, top: 370, bottom: 590 }],
    portals: [{ x: 2950, to: "harbor_road", toX: 90, label: "항구 길" }],
    npcs: [],
    spawns: [
      { type: "fox", x: 520 }, { type: "fox", x: 880 }, { type: "fox", x: 1250 }, { type: "fox", x: 1600, y: 390, min: 1370, max: 1990 },
      { type: "fox", x: 1850, y: 390, min: 1370, max: 1990 }, { type: "fox", x: 2200 }, { type: "snake", x: 2450 }, { type: "snake", x: 2750 }
    ],
    area: { x: 36, y: 46, desc: "마을과 항구를 잇는 길입니다. 들짐승이 자주 나옵니다." }
  },
  harbor_road: {
    name: "항구 길", bg: "harbor_road", width: 2450, safe: false,
    platforms: [{ x: 0, y: 590, w: 2450 }], ropes: [],
    portals: [{ x: 50, to: "forest", toX: 2860, label: "숲길" }, { x: 2400, to: "porto", toX: 90, label: "포르투 노바" }],
    npcs: [],
    spawns: [
      { type: "snake", x: 600 }, { type: "rat", x: 900 }, { type: "rat", x: 1200 }, { type: "rat", x: 1500 },
      { type: "snake", x: 1750 }, { type: "fox", x: 2000 }, { type: "fox", x: 2250 }
    ],
    area: { x: 58, y: 56, desc: "포르투 노바로 이어지는 바닷가 길입니다." }
  },
  porto: {
    name: "포르투 노바", bg: "harbor", width: 2689, safe: true,
    platforms: [{ x: 0, y: 590, w: 2689 }], ropes: [],
    portals: [{ x: 40, to: "harbor_road", toX: 2330, label: "항구 길" }, { x: 2620, to: "docks", toX: 90, label: "선창 외곽" }, { x: 2430, to: "general_store", toX: 90, label: "해풍 잡화점" }, { x: 370, to: "weapon_store", toX: 90, label: "철파도 무기점" },
              { x: 1736, to: "guild_hall", toX: 110, label: "선창 길드" }, { x: 2080, to: "warehouse", toX: 110, label: "부두 창고" }],
    npcs: [{ id: "porto_dock", x: 600 }, { id: "job_npc", x: 900 }, { id: "guide_npc", x: 1250 }],
    spots: [],
    spawns: [], start: 160,
    area: { x: 78, y: 40, desc: "중립 항구도시입니다. 선창 길드와 부두 창고, 상점이 모여 있습니다." }
  },
  general_store: {
    name: "해풍 잡화점", bg: "general_store", width: 1500, safe: true, interior: true, parent: "porto",
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 70, to: "porto", toX: 2430, label: "나가기" }],
    npcs: [{ id: "porto_general", x: 960, npcY: 462 }],
    fgSlice: [665, 421, 660, 180],   // 계산대: 상인보다 앞에 다시 그려 상인이 계산대 뒤에 서 있게 함
    spots: [], spawns: [], start: 200,
    area: { x: 74, y: 36, desc: "포르투 노바의 잡화점입니다. 재료를 팔고 회복약을 살 수 있습니다." }
  },
  weapon_store: {
    name: "철파도 무기점", bg: "weapon_store", width: 1500, safe: true, interior: true, parent: "porto",
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 70, to: "porto", toX: 370, label: "나가기" }],
    npcs: [{ id: "porto_armor", x: 400 }, { id: "porto_smith", x: 940, npcY: 462 }],
    fgSlice: [625, 425, 640, 175],
    spots: [], spawns: [], start: 200,
    area: { x: 82, y: 36, desc: "포르투 노바의 무기점입니다. 기본 무기와 방어구를 살 수 있습니다. (장비 제작은 2막부터 마을마다 있는 대장간에서)" }
  },
  guild_hall: {
    name: "선창 길드", bg: "guild_hall", width: 1280, safe: true, interior: true, parent: "porto",
    platforms: [{ x: 0, y: 590, w: 1280 }], ropes: [],
    portals: [{ x: 100, to: "porto", toX: 1736, label: "나가기" }],
    npcs: [{ id: "porto_foreman", x: 840 }, { id: "porto_guild", x: 1120, npcY: 505 }],
    fgSlice: [975, 425, 305, 165],   // 접수 카운터: 접수원보다 앞에 다시 그려 카운터 뒤에 서 있게 함
    spots: [],
    spawns: [], start: 220,
    area: { x: 80, y: 30, desc: "선창 길드의 본관입니다. 입단 면담과 의뢰를 받는 곳입니다." }
  },
  warehouse: {
    name: "부두 창고", bg: "warehouse", width: 1280, safe: true, interior: true, parent: "porto",
    platforms: [{ x: 0, y: 590, w: 1280 }], ropes: [],
    portals: [{ x: 100, to: "porto", toX: 2080, label: "나가기" }],
    npcs: [],
    spots: [
      { id: "trace_stain", img: "ob_trace_stain", x: 560, kind: "investigate", label: "바위틈의 검은 얼룩", lines: ["바위틈에 말라붙은 검은 얼룩이 있습니다. 바닷물에도 씻기지 않은 듯 끈적하게 굳어 있습니다.", "짐승이 지나간 자리마다 이 얼룩이 남아 있습니다. 어둠의 기운이 짐승의 몸을 거쳐 흘러나온 흔적처럼 보입니다."] },
      { id: "trace_crate", img: "ob_trace_crate", x: 1140, kind: "investigate", label: "부서진 짐 상자", lines: ["부서진 짐 상자의 옆면에 불도장이 찍혀 있습니다. 파도 같은 물결무늬입니다.", "어디선가 본 듯한 모양입니다. 상자 안은 비어 있지만 바닥에 검은 가루가 남아 있습니다."] }
    ],
    spawns: [], start: 220,
    area: { x: 84, y: 34, desc: "부두 옆의 큰 창고입니다. 최근 이상한 흔적이 남는다는 소문이 있습니다." }
  },
  docks: {
    name: "선창 외곽", bg: "storage", width: 1280, safe: false,
    // thin: 위에 올라설 수 있고 ↓+점프로 내려올 수 있는 얇은 발판(임시 그래픽)
    platforms: [{ x: 0, y: 590, w: 1280 }, { x: 300, y: 480, w: 200, thin: true }, { x: 520, y: 430, w: 220, thin: true }],
    ropes: [{ x: 285, top: 465, bottom: 590 }],
    portals: [{ x: 40, to: "porto", toX: 2540, label: "포르투 노바" }],
    npcs: [],
    // 조사·수리 지점: 해당 목표가 진행 중일 때만 표시됩니다(kind: repair=목공 수리 / investigate=조사)
    spots: [
    ],
    spawns: [{ type: "crab", x: 360 }, { type: "crab", x: 600 }, { type: "rat", x: 820 }, { type: "crab", x: 1060 }],
    boss: { type: "trial_boss", x: 980 },     // 전직 시험 중에만 등장
    area: { x: 90, y: 64, desc: "항구 바깥 선창 지대입니다. 길드 의뢰의 사냥터입니다." }
  }
};
/* 대륙 지도: 이름은 아직 정해지지 않음(미정). 열리지 않은 권역은 이름 대신 방향만 보여 줌(스포일러 방지). maps는 지역 지도 id */
AU.WORLD_REGIONS = [
  { id: "south", name: "남부 해안", x: 50, y: 82, open: true, maps: ["forest", "harbor_road", "porto", "docks", "jandari", "general_store", "weapon_store", "guild_hall", "warehouse"], desc: "대륙 최남단의 해안 지대입니다. 정보와 상인의 자유 항구도시 포르투 노바가 있습니다." },
  { id: "west", name: "서부", x: 20, y: 52, open: false, desc: "아직 가 보지 않은 땅입니다. 이야기가 진행되면 길이 열립니다." },
  { id: "north", name: "북부", x: 48, y: 18, open: false, desc: "아직 가 보지 않은 땅입니다. 이야기가 진행되면 길이 열립니다." },
  { id: "east", name: "동부", x: 80, y: 44, open: false, desc: "아직 가 보지 않은 땅입니다. 이야기가 진행되면 길이 열립니다." }
];
AU.AREA_LINKS = [["forest", "harbor_road"], ["harbor_road", "porto"], ["porto", "docks"], ["porto", "general_store"], ["porto", "weapon_store"], ["porto", "guild_hall"], ["porto", "warehouse"]];

/* ---------- 적 ---------- */
// sprite/sw: 정식 그림(assets/monster/*.webp, 투명 배경, 오른쪽을 보는 옆모습 1장)이 있으면 그 그림을 sw(가로 px)로 그리고, 없으면 임시 도형으로 표시합니다.
// 이전 아스텔리아 기획의 사냥터 구성(들짐승→부두 쥐→게→거대 적)을 규칙으로만 재사용. 모두 임시 수치.
AU.MONSTERS = {
  fox:   { motion: "pounce", name: "들여우", lv: 1, hp: 51, atk: 8, speed: 70, chase: 130, w: 72, h: 50, exp: 34, silver: [1, 4], silverRate: 0.1, drops: [["fur", 0.15, 1, 2], ["fox_tail", 0.07], ["black_crystal", 0.2, 1, 1, "q_a1_variant"], ["potion", 0.04], ["fox_scarf", 0]], color: "#F5A25D", ear: true, sprite: "mon_fox", sw: 92 },
  snake: { motion: "coil", name: "뱀", lv: 3, hp: 88, atk: 14, speed: 85, chase: 150, w: 90, h: 34, exp: 62, silver: [2, 7], silverRate: 0.12, drops: [["snake_skin", 0.15], ["snake_fang", 0.07], ["black_crystal", 0.3, 1, 1, "q_a1_variant"], ["potion", 0.05], ["snake_ring", 0]], color: "#7DBE6B", snake: true, sprite: "mon_snake", sw: 128 },
  rat:   { motion: "scurry", name: "부두 쥐", lv: 5, hp: 144, atk: 21, speed: 100, chase: 160, w: 70, h: 46, exp: 90, silver: [3, 10], silverRate: 0.14, drops: [["rat_tooth", 0.15, 1, 2], ["black_crystal", 0.4, 1, 1, "q_a1_variant"], ["potion", 0.05]], color: "#A79C94", ear: true, sprite: "mon_rat", sw: 88 },
  crab:  { motion: "sidestep", name: "집게 게", lv: 8, hp: 272, atk: 36, speed: 60, chase: 150, w: 92, h: 56, exp: 132, silver: [5, 14], silverRate: 0.16, drops: [["crab_claw", 0.15, 1, 2], ["crab_shell", 0.07], ["potion", 0.06], ["crab_vest", 0]], color: "#E9777A", crab: true, sprite: "mon_crab", sw: 116 },
  trial_boss: { name: "움브라", lv: 10, hp: 1500, atk: 40, patterns: ["lunge", "slam", "wave"], ragePatterns: ["chain"], slamR: 180, cd: 2.2, cdRage: 1.5, speed: 75, chase: 420, w: 240, h: 150, exp: 600, silver: [60, 80], silverRate: 1, drops: [], color: "#9B7FD1", boss: true, motion: "swing",
    sprite: "mon_umbra_base", sw: 300, refW: 345, poses: { idle: "mon_umbra_base", walkA: "mon_umbra_walkA", walkB: "mon_umbra_walkB", windup: "mon_umbra_windup", attack: "mon_umbra_attack", hurt: "mon_umbra_hurt", down: "mon_umbra_down" } }
};

/* ---------- 아이템 ---------- */
AU.ITEMS = {
  sword_a: { name: "견습용 검", type: "equip", slot: "weapon", buy: 60, stats: { atk: 4 }, desc: "견습 모험가가 쓰는 기본 검입니다." },
  cloth_a: { name: "견습용 작업복", type: "equip", slot: "armor", buy: 50, stats: { hp: 20 }, desc: "움직이기 편한 작업복입니다." },
  charm_a: { name: "작은 부적", type: "equip", slot: "accessory", buy: 80, stats: { dodge: 1, crit: 1 }, desc: "작은 행운이 깃들었다는 부적입니다." },
  town_scroll: { name: "마을 귀환 주문서", type: "use", recall: true, buy: 60, desc: "가까운 마을로 즉시 귀환합니다. 마을 안에서는 쓸 수 없습니다." },
  potion:  { name: "작은 회복약", type: "use", heal: 50, buy: 15, desc: "HP를 50 회복합니다." },
  // 드롭 확률 원칙: 좋은 아이템일수록 확률이 낮다 — 흔함 15% · 포션 평균 5% · 드묾 7% · 희귀(장비) 0%(제작서로만 획득). 은화는 몬스터마다 silverRate 확률(10%대)로 레벨이 높을수록 커지는 범위(1~20, 균등 랜덤)가 바닥에 떨어짐
  // rarity: common(흔함) / uncommon(드묾) / rare(희귀). sell: 안전한 곳(마을)에서 팔 때 받는 은화. 재료는 팔거나 제작(AU.RECIPES)에 씀
  fur:     { name: "여우 털 뭉치", type: "etc", rarity: "common", sell: 3, desc: "부드러운 털 뭉치입니다. 팔거나 장신구 제작에 씁니다." },
  fox_tail: { name: "여우 꼬리털", type: "etc", rarity: "uncommon", sell: 10, desc: "윤기가 도는 꼬리털입니다. 제작 재료로 쓰입니다." },
  snake_skin: { name: "뱀 허물", type: "etc", rarity: "common", sell: 5, desc: "바싹 마른 뱀 허물입니다. 팔거나 제작에 씁니다." },
  snake_fang: { name: "독니 조각", type: "etc", rarity: "uncommon", sell: 14, desc: "부러진 뱀의 이빨 조각입니다. 제작 재료로 쓰입니다." },
  rat_tooth: { name: "쥐 이빨", type: "etc", rarity: "common", sell: 6, desc: "작지만 단단한 이빨입니다. 팔 수 있습니다." },
  crab_claw: { name: "게 집게 조각", type: "etc", rarity: "common", sell: 8, desc: "떨어져 나온 집게 조각입니다. 팔거나 제작에 씁니다." },
  crab_shell: { name: "단단한 게딱지", type: "etc", rarity: "uncommon", sell: 18, desc: "바닷가 게의 단단한 껍데기입니다. 제작 재료로 쓰입니다." },
  fox_scarf: { name: "여우 털 목도리", type: "equip", slot: "accessory", rarity: "rare", sell: 0, stats: { crit: 2, dodge: 1 }, desc: "여우 털로 짠 포근한 목도리입니다." },
  snake_ring: { name: "뱀 비늘 반지", type: "equip", slot: "accessory", rarity: "rare", sell: 0, stats: { dodge: 3 }, desc: "비늘 무늬가 새겨진 반지입니다." },
  crab_vest: { name: "게딱지 조끼", type: "equip", slot: "armor", rarity: "rare", sell: 0, stats: { hp: 40 }, desc: "단단한 게딱지를 이어 붙인 조끼입니다." },
  silver_coin: { name: "은화", type: "currency", rarity: "common", desc: "줍으면 은화가 됩니다." },
  rcp_fox_scarf: { name: "제작서: 여우 털 목도리", type: "use", recipe: "cr_fox_scarf", desc: "읽으면 여우 털 목도리의 제작법을 배웁니다. 필요한 재료는 읽은 뒤 제작법 탭에서 확인하고, 재료와 은화를 무기상인에게 가져가면 만들어 줍니다." },
  rcp_snake_ring: { name: "제작서: 뱀 비늘 반지", type: "use", recipe: "cr_snake_ring", desc: "읽으면 뱀 비늘 반지의 제작법을 배웁니다. 필요한 재료는 읽은 뒤 제작법 탭에서 확인하고, 재료와 은화를 무기상인에게 가져가면 만들어 줍니다." },
  rcp_crab_vest: { name: "제작서: 집게 게 껍질 조끼", type: "use", recipe: "cr_crab_vest", desc: "읽으면 게 껍질 조끼의 제작법을 배웁니다. 필요한 재료는 읽은 뒤 제작법 탭에서 확인하고, 재료와 은화를 무기상인에게 가져가면 만들어 줍니다." },
  guild_token: { name: "선창 길드 증표", type: "quest", desc: "선창 길드의 의뢰를 받았다는 표시입니다." },
  guild_parcel: { name: "길드 짐 꾸러미", type: "quest", desc: "선창 길드가 전해 달라고 맡긴 작은 꾸러미입니다." },
  black_crystal: { name: "검은 결정", type: "quest", desc: "변형된 몬스터의 몸에서 나온 각진 검은 돌입니다. 안쪽에 붉은 줄이 희미하게 비칩니다." }
};
// 상점: 잡화상인은 재료를 사고 소비 아이템을 팔며, 무기상인은 기본 장비를 팔고, 장비 제작은 2막부터 마을마다 있는 대장간의 대장장이가 함
AU.SHOP = { general: { buy: ["potion", "town_scroll"] }, weapon: { buy: ["sword_a", "cloth_a", "charm_a"] } };
AU.RARITY = { common: { label: "흔함", color: "#D9C79A" }, uncommon: { label: "드묾", color: "#7FC8A9" }, rare: { label: "희귀", color: "#F2C14E" } };
// 제작: 안전한 곳(마을)에서 재료와 은화로 희귀 장비를 직접 만듦(드롭보다 확실하지만 재료가 많이 듦). 제작법은 처음부터 알지 못하고, 의뢰 보상으로 받는 '제작서' 아이템을 사용해야 배움(필요 재료·수량이 그때부터 보임). 제작은 무기상인에게서 재료와 은화를 내고 함
AU.RECIPES = [
  { id: "cr_fox_scarf", out: "fox_scarf", mats: [["fur", 8], ["fox_tail", 3]], silver: 30 },
  { id: "cr_snake_ring", out: "snake_ring", mats: [["snake_skin", 6], ["snake_fang", 4]], silver: 40 },
  { id: "cr_crab_vest", out: "crab_vest", mats: [["crab_claw", 6], ["crab_shell", 5]], silver: 60 }
];
AU.SLOT_LABEL = { weapon: "무기", armor: "방어구", accessory: "장신구" };

/* ---------- 직업 ---------- */
AU.JOBS = {
  apprentice: { name: "견습 모험가" },
  warrior: { name: "전사" }
};
// 2·3차 전직은 직업 이름과 계열을 임의로 정하지 않고 자리만 둠 (요청서 7장)
/* 직업 계열: 캐릭터를 만들 때 먼저 고름. 시작 직업은 모두 견습 모험가이고, Lv.10 전직 때 고른 계열의 1차 직업이 됨.
   지금 열려 있는 계열은 전사뿐(open). 나머지 넷은 세계관의 다섯 영웅 직업으로, 화면에 잠긴 채 보여 줌. icon은 그림이 오기 전 임시 도형 */
/* 직업군(1단계): 지금은 용사만 열려 있고 나머지는 추후 공개 예정. 용사를 고르면 아래 JOB_LINES(전사·마법사…) 선택 창으로 이어짐 */
AU.JOB_GROUPS = [
  { id: "hero", name: "용사", open: true, art: "job_hero", full: true, desc: "마음과 몸을 함께 단련하며 모험을 이끌어 가는 첫 번째 길입니다.", icon: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>' },
  { id: "soon1", name: "???", open: false, icon: '<text x="12" y="18" text-anchor="middle" font-size="18" fill="currentColor">?</text>' },
  { id: "soon2", name: "???", open: false, icon: '<text x="12" y="18" text-anchor="middle" font-size="18" fill="currentColor">?</text>' }
];
AU.JOB_LINES = [
  { id: "warrior", name: "전사", open: true, job: "warrior", desc: "검과 방패로 가까이에서 버티며 싸웁니다.", icon: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>' },
  { id: "mage", name: "마법사", open: false, icon: '<path d="M12 2l2.6 6.2 6.7.5-5.1 4.3 1.6 6.5L12 16l-5.8 3.5 1.6-6.5L2.7 8.7l6.7-.5z"/>' },
  { id: "archer", name: "궁수", open: false, icon: '<path d="M5 3c8 3 8 15 0 18M5 3v18M3 12h17m-4-3 4 3-4 3" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "rogue", name: "도적", open: false, icon: '<path d="M12 2c4 2 6 6 6 10l2 9H4l2-9c0-4 2-8 6-10z"/>' },
  { id: "pirate", name: "해적", open: false, icon: '<path d="M12 3a2 2 0 110 4 2 2 0 010-4zm-1 5h2v9c3-.5 5-2.5 5.5-5l2 1c-1 4-4.5 7-8.5 7s-7.5-3-8.5-7l2-1c.5 2.5 2.5 4.5 5.5 5z"/>' }
];
AU.JOB_TIERS = [
  { level: 10, name: "1차 전직: 전사" },
  { level: 30, name: "2차 전직 (준비 중)" },
  { level: 50, name: "3차 전직 (준비 중)" }
];

/* ---------- 스킬 (전사, 임시) ---------- */
AU.SKILLS = {
  strike: { name: "결의의 일격", cost: 8, cd: 3, mult: 2.2, range: 135, desc: "마음을 모아 앞쪽의 적에게 강한 일격을 가합니다. (공격력 220%)" },
  spin:   { name: "소용돌이 베기", cost: 14, cd: 6, mult: 1.5, radius: 150, desc: "몸을 돌리며 주변 양쪽의 적을 한꺼번에 벱니다. (공격력 150%)" },
  focus:  { name: "마음 다잡기", cost: 12, cd: 10, heal: 0.35, desc: "숨을 고르고 마음을 다잡아 HP를 최대 HP의 35% 회복합니다." }
};
AU.WARRIOR_SKILLS = ["strike", "spin", "focus"];

/* ---------- 퀘스트 (전부 임시 테스트 콘텐츠) ---------- */
// kind: kill(처치) / collect(아이템 수집) / talk(대화) / deliver(물건 전달: item→target NPC) / investigate(조사 지점 targets) / repair(목공 수리 지점 targets) / choice(선택: 정답 없는 갈림길, target NPC에게 말 걸기)
// 선택지에는 정답·오답이 없고 보상 차이도 없습니다. 고른 값은 flags["choice_<id>"]에 기록해 이후 이야기에서 쓸 수 있습니다.
AU.QUESTS = {
  q_s1_silver: {
    title: "항구도시의 첫걸음", type: "main", giver: "porto_dock", turnIn: "porto_foreman", minLevel: 1, pre: [],
    area: "guild_hall", desc: "부두 안쪽의 선창 길드를 찾아가 십장 테오도로스를 만납니다.", objectives: [{ kind: "talk", target: "porto_foreman" }],
    offer: ["처음 보는 얼굴이군요. 포르투 노바에 오신 걸 환영합니다. 이곳은 어느 세력에도 속하지 않은 중립 항구도시라, 무기를 든 사람도 평화롭게 지내는 곳이에요.", "배로 온 상인, 길 떠나는 용병, 갓 출발한 모험가까지 다양한 사람이 모여 있답니다.", "그대도 모험가이군요? 많은 모험가들은 길드를 통해 활동해요. 의뢰를 받고 보수를 받으며 실력을 쌓지요.", "부두 안쪽의 닻 깃발 달린 건물이 선창 길드예요. 십장 테오도로스를 찾아가 보세요."],
    reminder: ["선창 길드는 부두 안쪽, 닻 깃발이 걸린 건물이에요. 십장 테오도로스를 찾아가 보세요."],
    done: ["어이, 젊은이. 그대의 이름은 무엇인가?", "...{이름이}라. 좋은 이름이군. 그래, {이름은} 여기에 왜 왔지?", "길드에 들어오고 싶다고? 하하, 모험가라고 아무나 받아 주진 않네. 그렇다면 입단 테스트를 해야지.", "시험은 세 단계일세. 쉬운 것부터 차례로 어려워지니 서두르지 말게.", "우선 이 검을 빌려주지. 창고 구석에서 굴러다니던 놈일세.", "준비가 되면 다시 말을 걸게. 첫 번째 시험을 내주겠네."],
    reward: { exp: 20, silver: 0, items: [["sword_a", 1]] }
  },
  q_s1_test: {
    title: "입단 시험 1: 첫 번째 사냥", type: "main", giver: "porto_foreman", minLevel: 1, pre: ["q_s1_silver"],
    area: "forest", desc: "숲길 입구의 들여우를 1마리 처치합니다.", objectives: [{ kind: "kill", target: "fox", count: 1 }],
    offer: ["첫 번째 시험일세. 항구 길 너머 숲길 입구에서 들여우 한 마리만 쫓아내 보게.", "공격은 {attack}, 점프는 {jump}일세. 위험하다 싶으면 물러서도 좋네."],
    reminder: ["항구 길을 따라 왼쪽으로 가면 숲길일세. 들여우에게 다가가 공격 키를 눌러 보게."],
    done: ["...무사히 돌아왔군. 첫 시험은 통과일세.", "다음은 조금 어려울 걸세. 숨을 돌리고 다시 말을 걸게."],
    reward: { exp: 60, silver: 10, items: [] }
  },
  q_first: {
    title: "입단 시험 2: 해안의 짐승", type: "main", giver: "porto_foreman", minLevel: 1, pre: ["q_s1_test"],
    desc: "숲길에서 내려오는 오염된 들여우를 3마리 처치합니다.", objectives: [{ kind: "kill", target: "fox", count: 3 }],
    area: "forest",
    offer: ["두 번째 시험일세. 요즘 숲길의 짐승들이 항구 쪽으로 내려와 방책과 창고를 갉아먹네.", "이번엔 들여우 세 마리를 쫓아내 주게. 한 마리보다 정신없을 걸세."],
    reminder: ["공격은 {attack}, 점프는 {jump}, 말 걸기·줍기는 {interact}라네.", "항구 길을 따라 왼쪽으로 쭉 가면 숲길일세. 들여우에게 가까이 가 공격 키를 눌러 보게."],
    done: ["벌써 해냈나. 수고했네. 이건 보수일세.", "마지막 시험이 남았네. 준비되면 말을 걸게."],
    reward: { exp: 80, silver: 30, items: [] }
  },
  q_forest: {
    title: "입단 시험 3: 숲길 정리", type: "main", giver: "porto_foreman", minLevel: 2, pre: ["q_first"],
    desc: "숲길의 뱀을 5마리 처치합니다.", objectives: [{ kind: "kill", target: "snake", count: 5 }],
    area: "forest",
    offer: ["마지막 시험일세. 숲길 안쪽의 뱀 다섯 마리를 상대해 보게.", "가는 길에도 뱀이 있으니 조심하게. 포션을 아끼지 말고."],
    reminder: ["숲길 안쪽의 뱀 다섯 마리일세. 가는 길에도 뱀이 있으니 포션을 아끼지 말게."],
    done: ["고생했네. 이로써 시험은 모두 끝났네. 합격일세.", "작업복이 낡았더군. 이거라도 걸치게.", "정식으로 이름을 올리는 일이 남았네. 다시 말을 걸게."],
    reward: { exp: 300, silver: 60, items: [["cloth_a", 1]] }
  },
  q_guild_talk: {
    title: "정식 등록", type: "main", giver: "porto_foreman", turnIn: "porto_guild", minLevel: 3, pre: ["q_forest"],
    area: "guild_hall", desc: "접수의 다프네에게 가서 길드 장부에 이름을 올립니다.", objectives: [{ kind: "talk", target: "porto_guild" }],
    offer: ["이제 자네도 선창 길드의 일원일세. 접수의 다프네에게 가서 장부에 정식으로 이름을 올리게."],
    done: ["어서 오세요. 테오도로스 님께 이야기 들었어요. 정식 등록을 도와드릴게요.", "이 장부에 이름이 올라가면 길드 의뢰를 받을 수 있어요. 의뢰를 마치면 은화로 보수가 나가요. 은화는 포르투 노바에서 장비와 물건을 사고파는 데 쓰는 돈이에요.", "그리고 모험가들은 모험일지에 마음에 남은 일을 적어 둔답니다. 일지에는 몸과 마음을 돌보는 작은 활동도 소개돼 있어요. 해 볼지는 자유예요.", "길드 의뢰는 제가 맡고 있어요. 레벨이 4가 되면 첫 의뢰를 드릴게요. 짐 심부름 같은 일은 테오도로스 님께 여쭤 보세요.", "등록을 축하해요. 이제 정식 모험가세요!"],
    reward: { exp: 150, silver: 20, items: [["rcp_fox_scarf", 1]] }
  },
  q_guild_rats: {
    title: "부두 쥐 소탕", type: "sub", giver: "porto_guild", minLevel: 4, pre: ["q_guild_talk"],
    area: "harbor_road", desc: "항구 길의 부두 쥐를 8마리 처치합니다.", objectives: [{ kind: "kill", target: "rat", count: 8 }],
    offer: ["선창 길드의 첫 의뢰예요. 항구 길을 돌아다니는 부두 쥐가 곡식 자루를 갉아서 골치예요.", "쥐를 8마리만 줄여 주세요."],
    reminder: ["항구 길의 부두 쥐 8마리예요. 곡식 자루 근처에 많이 보여요."],
    done: ["확인했어요. 수고하셨어요. 보수와 길드 증표예요.", "참, 테오도로스 님이 일이 있다고 하셨어요. 레벨이 5쯤 되면 들러 보세요."],
    reward: { exp: 600, silver: 120, items: [["charm_a", 1], ["guild_token", 1], ["rcp_snake_ring", 1]] }
  },
  q_guild_crabs: {
    title: "집게 게 퇴치", type: "sub", giver: "porto_guild", minLevel: 7, pre: ["q_guild_rats"],
    area: "docks", desc: "선창 외곽의 집게 게를 5마리 처치합니다.", objectives: [{ kind: "kill", target: "crab", count: 5 }],
    offer: ["선창 외곽에서 집게 게가 짐을 자꾸 상하게 해요. 다섯 마리만 처리해 주세요."],
    reminder: ["선창 외곽의 집게 게 다섯 마리예요. 집게에 조심하세요."],
    done: ["수고하셨어요. 이번 보수예요.", "게 껍질로 조끼 만드는 법도 같이 적어 드렸어요. 도움이 될 거예요."],
    reward: { exp: 1200, silver: 200, items: [["rcp_crab_vest", 1]] }
  },
  q_a1_parcel: {
    title: "길드 짐 전하기", type: "sub", giver: "porto_foreman", minLevel: 5, pre: ["q_guild_talk"],
    area: "general_store", desc: "길드 짐 꾸러미를 포르투 노바의 잡화상인에게 전합니다.", startItems: [["guild_parcel", 1]],
    objectives: [{ kind: "deliver", item: "guild_parcel", target: "porto_general" }],
    offer: ["심부름을 하나 부탁하겠네. 이 꾸러미를 잡화상인에게 전해 주게.", "마을 안이니 멀지 않을 걸세."],
    reminder: ["꾸러미는 잡화상인에게 전하면 되네."],
    deliver: { porto_general: ["선창 길드에서 온 꾸러미군요. 기다리고 있었어요. 고맙습니다.", "(꾸러미를 건넸습니다.)"] },
    done: ["전했나? 수고했네. 수고비일세.", "포션이 떨어졌거든 잡화점에서 사 두게. 다음 일엔 쓸 데가 많을 걸세."],
    reward: { exp: 250, silver: 50, items: [["potion", 2]] }
  },
  q_a1_variant: {
    title: "변형의 흔적", type: "main", giver: "porto_foreman", minLevel: 5, pre: ["q_guild_talk"],
    area: "harbor_road", desc: "변형된 몬스터에게서 검은 결정 3개를 구해 십장에게 가져갑니다.", objectives: [{ kind: "collect", item: "black_crystal", count: 3 }],
    offer: ["이제 제법 성장하였으니, 그대에게도 어려운 의뢰를 맡겨야겠군.", "최근 이 일대 몬스터들이 이상하게 변하고 있네. 몇 가지 확인할 것이 있어.", "변형된 놈들의 몸에서 검은 결정이 나온다는 말이 있네. 그 결정 세 개를 구해 와 주게. 숲길의 짐승이든 항구 길의 쥐든 상관없네."],
    reminder: ["검은 결정은 변형된 몬스터를 쓰러뜨리면 나올 걸세. 세 개를 모아 오게."],
    done: ["...이게 검은 결정인가. 만져 보니 차갑고, 안쪽에 붉은 줄이 비치는군.", "자연히 생기는 물건이 아니야. 누군가 일부러 몬스터를 변형시키고 있다는 뜻이지.", "길드가 따로 알아보겠네. 레벨이 6이 되면 다시 오게. 자네에게 맡길 일이 또 있을 걸세."],
    reward: { exp: 700, silver: 80, items: [] }
  },
  q_a1_traces: {
    title: "창고의 흔적", type: "main", giver: "porto_foreman", minLevel: 6, pre: ["q_a1_variant"],
    area: "warehouse", desc: "부두 창고 안에 남은 이상한 흔적 두 곳을 조사하고, 십장에게 알립니다.",
    objectives: [{ kind: "investigate", targets: ["trace_stain", "trace_crate"] }, { kind: "choice", id: "traces", target: "porto_foreman" }],
    offer: ["요즘 부두 창고에 이상한 흔적이 남는다는 말이 돌아. 짐승이 지나간 자리라는데, 직접 보고 와 주겠나?", "창고 안쪽 구석과 부서진 짐 상자 쪽일세. 부두의 큰 목조 창고 말일세."],
    reminder: ["부두 창고 안쪽 구석과 부서진 상자를 살펴보고 오게."],
    choice: {
      prompt: ["다녀왔나? 뭘 보았는지 말해 보게.", "...듣고 보니 심상치 않군. 이 일을 어떻게 하면 좋겠나?"],
      options: [
        { label: "길드에 알린다", flag: "report", reply: ["그래, 길드가 알고 있어야 대비를 하지. 내가 장부에 올려 두겠네."] },
        { label: "일단 혼자 알아본다", flag: "alone", reply: ["혼자서 말인가. 위험한 일일세. 그래도 먼저 확인해 보겠다면 말리진 않겠네.", "다만 무슨 일이든 알게 되면 귀띔은 해 주게."] }
      ]
    },
    done: ["수고했네. 자네 덕에 창고 일이 한결 분명해졌어.", "이건 길드가 풀 수 있는 일이 아닌 것 같네. 잔다리 골목에 길드 뒷일을 맡는 자가 있으니 찾아가 보게. 내가 보냈다고 하게."],
    reward: { exp: 800, silver: 100, items: [] }
  },
  q_job: {
    title: "전직 시험", type: "main", giver: "job_npc", minLevel: 99, pre: [],
    area: "docks", desc: "선창 외곽에 나타나는 움브라를 처치합니다.",
    objectives: [{ kind: "kill", target: "trial_boss", count: 1 }],
    offer: ["10레벨이 되었군요. 전직 시험을 치르겠습니까? 선창 외곽에 움브라가 나타납니다."],
    done: ["시험을 통과했습니다. 이제 전사의 길로 들어섭니다."],
    reward: { exp: 0, silver: 100, items: [] },
    jobChange: "warrior"
  }
};

/* ---------- 퀘스트 구분: 메인(금색 ★) / 서브(파란 !) ----------
   화면 표시(NPC 머리 위 표시·미니맵·월드맵·퀘스트 창·목표창·알림)는 모두 이 표를 기준으로 합니다.
   종류를 바꾸려면 위 퀘스트의 type 값("main" 또는 "sub")만 바꾸면 됩니다. */
AU.QKIND = {
  main: { label: "메인", icon: "★", color: "#B98B45", colorDark: "#946B2C", colorLight: "#FFD978", bg: "#F6E8C6" },
  sub: { label: "서브", icon: "!", color: "#4C8DC6", colorDark: "#2F6A9C", colorLight: "#8EC5F2", bg: "#DCEAF6" },
  real: { label: "현실", icon: "♥", color: "#8A78B0", colorDark: "#6B5A92", colorLight: "#C9BBE6", bg: "#ECE7F5" }
};
// 색의 원본은 위 표 한 곳: CSS 변수(--qk-종류, -d, -l, -bg)로 내보내 화면 스타일이 같은 값을 씁니다.
(() => { const r = document.documentElement.style; for (const [k, v] of Object.entries(AU.QKIND)) { r.setProperty("--qk-" + k, v.color); r.setProperty("--qk-" + k + "-d", v.colorDark); r.setProperty("--qk-" + k + "-l", v.colorLight); r.setProperty("--qk-" + k + "-bg", v.bg); } })();
AU.questKind = (id) => { const q = AU.QUESTS[id]; return q && q.type === "sub" ? "sub" : "main"; };
// NPC가 지금 줄 수 있는/받을 수 있는 퀘스트 표시: { mark: "?"(완료 가능)|"★"|"!", kind } 또는 null. 완료 가능이 새 의뢰보다, 메인이 서브보다 먼저 보입니다.
AU.npcQuestMark = (npcId) => {
  const d = AU.NPCS[npcId]; if (!d) return null;
  let ready = null, avail = null;
  for (const id of d.quests || []) {
    const s = AU.G.questStatus(id), k = AU.questKind(id), q = AU.QUESTS[id];
    if (s === "ready" && (q.turnIn || q.giver) === npcId && (!ready || (k === "main" && ready.kind !== "main"))) ready = { mark: "?", kind: k };
    if (s === "available" && (!avail || (k === "main" && avail.kind !== "main"))) avail = { mark: AU.QKIND[k].icon, kind: k };
  }
  return ready || avail;
};

/* ---------- NPC (전부 임시 이름·대사) ---------- */
AU.NPCS = {
  porto_dock: { name: "니코스", sprite: "villager_a", portrait: "pt_villager_a", quests: ["q_s1_silver"],
    idle: ["쇳조각 얘기는 잔다리 골목의 정보상이 밝지. 은화는 챙겨 가게.", "부두는 새벽부터 바쁘다네."] },
  arche_guide: { name: "엘레니", title: "주민", sprite: "villager_a", portrait: "pt_villager_a", quests: [],
    idle: ["오늘도 평화로운 마을이에요.", "다친 곳은 없나요? 쉬어 가면서 하세요."] },
  porto_foreman: { name: "테오도로스", sprite: "porto_foreman", portrait: "pt_porto_foreman", quests: ["q_s1_silver", "q_s1_test", "q_first", "q_forest", "q_guild_talk", "q_a1_parcel", "q_a1_variant", "q_a1_traces"],
    idle: ["창고 일은 자네 덕에 한시름 놨네.", "바닷바람이 거세니 몸조심하게."] },
  porto_guild: { name: "다프네", sprite: "villager_b", portrait: "pt_villager_b", quests: ["q_guild_talk", "q_guild_rats", "q_guild_crabs"],
    idle: ["선창 길드입니다. 의뢰가 필요하면 말씀하세요.", "오늘은 부두가 조용하군요."] },
  job_npc: { name: "레오니다스", sprite: "smith", portrait: "pt_smith", quests: ["q_job"],
    idle: ["전직이라... 아직은 이른 이야기일세.", "더 단련하고 오게. 때가 되면 알려 주겠네."] },
  porto_armor: { name: "이리스", title: "점원", sprite: "porto_armor", portrait: "pt_porto_armor", quests: [],
    idle: ["방어구는 몸에 맞는 게 제일이에요. 천천히 구경하세요.", "무기점 주인이 망치를 잡으면 저는 갑옷을 손봅니다."] },
  porto_general: { name: "페넬로페", sprite: "porto_general", portrait: "pt_porto_general", shop: "general",
    idle: ["어서 오세요. 모험에서 주워 온 재료, 제가 사들입니다.", "회복약도 있어요. 필요하면 말씀하세요."] },
  porto_smith: { name: "데메트리오스", sprite: "porto_smith", portrait: "pt_porto_smith", shop: "weapon",
    idle: ["쓸 만한 무기와 방어구라면 여기 다 있소.", "튼튼한 장비가 모험의 반이오."] },
  // 대장장이: 2막부터 마을마다 대장간에 있다(아직 맵에는 배치하지 않음). 제작서로 배운 제작법의 장비를 재료·은화를 받고 만들어 준다.
  forge_smith: { name: "대장장이", sprite: "porto_smith", portrait: "pt_porto_smith", shop: "smith",
    idle: ["제작법을 아는 장비라면 재료와 은화로 만들어 드리죠.", "희귀한 재료는 늘 환영이오."] },
  guide_npc: { name: "알렉시오스", sprite: "baker", portrait: "pt_baker", special: "missionGuide",
    idle: ["모험은 잘 되어 가나요?"] }
};

/* ---------- 알림(기능 해금) ---------- */
AU.UNLOCKS = [
  { level: 2, text: "스탯창(S)에서 현재 능력치를 볼 수 있습니다." },
  { level: 4, text: "선창 길드 접수대의 다프네에게서 길드 의뢰를 받을 수 있습니다." },
  { level: 10, text: "10레벨입니다. 손목의 낙인이 반응합니다. 제페토에게 힘이 깨어나는 이야기를 들어 보세요." }
];

/* ---------- 현실 미션 (임시 목록, [미정]) ---------- */
// 'PERMA' 영역: P 긍정정서, E 몰입, R 긍정적 관계, M 의미, A 성취. 전투 스탯과 일대일로 묶지 않음.
// 쉬운 것(d1)부터 시작하고, d2는 같은 영역의 d1을 완료하면 열립니다. 성찰 질문·설명 팝업은 두지 않습니다.
AU.PERMA = { P: "긍정정서", E: "몰입", R: "긍정적 관계", M: "의미", A: "성취" };
AU.MISSIONS = [
  { id: "m_p1", perma: "P", d: 1, points: 1, title: "좋아하는 노래 한 곡 끝까지 듣기", desc: "하던 일을 잠시 멈추고, 좋아하는 노래 한 곡을 끝까지 들어 봅니다." },
  { id: "m_p2", perma: "P", d: 2, points: 2, title: "기분 좋아지는 일 하나 해 보기", desc: "산책, 간식, 취미 등 오늘 기분이 좋아질 만한 일을 하나 골라 해 봅니다.", pre: "m_p1" },
  { id: "m_e1", perma: "E", d: 1, points: 1, title: "10분 동안 한 가지에만 집중하기", desc: "휴대폰을 잠시 두고, 하나의 활동에 10분간 집중해 봅니다.",
    guide: { kind: "timer", secs: 600, intro: ["휴대폰을 잠시 두고, 하나의 활동에만 집중해 보세요.", "10분이 지나면 ‘해 봤어요’를 누를 수 있습니다."] } },
  { id: "m_e2", perma: "E", d: 2, points: 2, title: "시간 가는 줄 모르는 활동 해 보기", desc: "빠져들 수 있는 활동을 골라 30분 이상 해 봅니다.", pre: "m_e1" },
  { id: "m_r1", perma: "R", d: 1, points: 1, title: "가까운 사람에게 안부 메시지 보내기", desc: "가족이나 친구 한 사람에게 짧은 안부를 보냅니다." },
  { id: "m_r2", perma: "R", d: 2, points: 2, title: "누군가와 함께 시간 보내기", desc: "가까운 사람과 식사나 통화 등 함께하는 시간을 가져 봅니다.", pre: "m_r1" },
  { id: "m_m1", perma: "M", d: 1, points: 1, title: "작은 도움 하나 건네기", desc: "주변 사람에게 부담 없는 작은 도움을 하나 건넵니다." },
  { id: "m_m2", perma: "M", d: 2, points: 2, title: "소중한 일에 시간 쓰기", desc: "내게 의미 있다고 느끼는 일에 20분을 써 봅니다.", pre: "m_m1" },
  { id: "m_a1", perma: "A", d: 1, points: 1, title: "미뤄 둔 작은 일 하나 끝내기", desc: "5분 안에 끝낼 수 있는 미뤄 둔 일을 하나 처리합니다.",
    guide: { kind: "timer", secs: 300, intro: ["미뤄 둔 작은 일을 하나 골라 시작해 보세요.", "5분 타이머가 끝나면 ‘해 봤어요’를 누를 수 있습니다."] } },
  { id: "m_a2", perma: "A", d: 2, points: 2, title: "목표 하나 정하고 시작해 보기", desc: "이번 주에 해 볼 작은 목표를 하나 정하고 첫 걸음을 뗍니다.", pre: "m_a1" }
];

// 신규 활동 20종: 기존 10개 미션 ID와 저장 기록은 유지합니다.
AU.MISSION_FUNCTION_AREAS = {"self_care":"자기돌봄","leisure":"취미·여가","learning":"학습·탐색","relationships":"사회적 관계","self_understanding":"자기이해","planning":"계획·목표","daily_living":"생활 관리"};
const _originalMissions = AU.MISSIONS;
const _legacyMeta = {"m_p1":["leisure",1,3],"m_p2":["leisure",2,5],"m_e1":["learning",3,10],"m_e2":["leisure",3,30],"m_r1":["relationships",2,5],"m_r2":["relationships",3,15],"m_m1":["relationships",2,5],"m_m2":["self_understanding",3,20],"m_a1":["daily_living",2,5],"m_a2":["planning",2,5]};
_originalMissions.forEach(m => {
  const [functionArea, difficulty, minutes] = _legacyMeta[m.id];
  Object.assign(m, { functionArea, difficulty, minutes, optional: true, legacy: true });
});
AU.MISSIONS.push(
  {"id":"m_p3","perma":"P","d":1,"points":1,"title":"주변에서 마음에 드는 것 하나 찾기","desc":"창밖이나 가까운 곳에서 마음에 드는 것 하나를 찾아봅니다.","functionArea":"self_care","difficulty":1,"minutes":2,"optional":true},
  {"id":"m_p4","perma":"P","d":2,"points":2,"title":"좋아하는 음료나 간식 즐기기","desc":"가능한 범위에서 좋아하는 음료나 간식을 잠깐 즐겨 봅니다.","functionArea":"leisure","difficulty":2,"minutes":5,"optional":true},
  {"id":"m_p5","perma":"P","d":3,"points":3,"title":"편안한 장소에서 잠시 쉬기","desc":"편안한 장소를 골라 쉬어 봅니다. 중간에 멈춰도 괜찮습니다.","functionArea":"self_care","difficulty":3,"minutes":10,"optional":true},
  {"id":"m_p6","perma":"P","d":3,"points":3,"title":"좋아하는 취미활동 즐기기","desc":"원하는 취미를 가볍게 해 봅니다. 꼭 시간을 채울 필요는 없습니다.","functionArea":"leisure","difficulty":3,"minutes":15,"optional":true},
  {"id":"m_e3","perma":"E","d":1,"points":1,"title":"좋아하는 글이나 그림 살펴보기","desc":"관심 있는 글이나 그림 한 부분을 살펴봅니다.","functionArea":"leisure","difficulty":1,"minutes":2,"optional":true},
  {"id":"m_e4","perma":"E","d":1,"points":1,"title":"관심 있는 주제 하나 찾아보기","desc":"궁금한 주제나 좋아하는 분야에서 한 가지 정보를 찾아봅니다.","functionArea":"learning","difficulty":1,"minutes":3,"optional":true},
  {"id":"m_e5","perma":"E","d":2,"points":2,"title":"간단한 그림이나 낙서 그리기","desc":"종이나 화면에 자유롭게 선이나 그림을 그려 봅니다.","functionArea":"leisure","difficulty":2,"minutes":5,"optional":true},
  {"id":"m_e6","perma":"E","d":3,"points":3,"title":"배우고 싶었던 것 하나 연습하기","desc":"배워 보고 싶었던 활동의 작은 부분을 연습해 봅니다.","functionArea":"learning","difficulty":3,"minutes":15,"optional":true},
  {"id":"m_r3","perma":"R","d":1,"points":1,"title":"고마웠던 사람이나 순간 떠올리기","desc":"편한 관계나 고마웠던 순간을 떠올려 봅니다. 연락할 필요는 없습니다.","functionArea":"relationships","difficulty":1,"minutes":2,"optional":true},
  {"id":"m_r4","perma":"R","d":1,"points":1,"title":"소중한 사람과의 좋은 추억 떠올리기","desc":"편안하게 느껴지는 좋은 기억 하나를 떠올려 봅니다.","functionArea":"relationships","difficulty":1,"minutes":3,"optional":true},
  {"id":"m_r5","perma":"R","d":2,"points":2,"title":"고마운 마음을 짧게 적어 보기","desc":"고마움을 짧게 적어 봅니다. 상대에게 보내지 않아도 됩니다.","functionArea":"relationships","difficulty":2,"minutes":5,"optional":true},
  {"id":"m_r6","perma":"R","d":3,"points":3,"title":"원하는 사람과 관심사 나누기","desc":"안전하고 편한 상대가 있다면 관심사를 조금 나눠 봅니다. 다른 활동을 골라도 됩니다.","functionArea":"relationships","difficulty":3,"minutes":10,"optional":true},
  {"id":"m_m3","perma":"M","d":1,"points":1,"title":"자신이 좋아하는 것 하나 떠올리기","desc":"좋아하는 것 한 가지를 떠올려 봅니다.","functionArea":"self_understanding","difficulty":1,"minutes":2,"optional":true},
  {"id":"m_m4","perma":"M","d":1,"points":1,"title":"오늘 중요하게 생각하는 일 선택하기","desc":"오늘 스스로 중요하다고 느끼는 작은 일 하나를 정해 봅니다.","functionArea":"planning","difficulty":1,"minutes":3,"optional":true},
  {"id":"m_m5","perma":"M","d":2,"points":2,"title":"최근 의미 있었던 경험 적기","desc":"최근 자신에게 의미 있던 순간을 한 줄로 남겨 봅니다.","functionArea":"self_understanding","difficulty":2,"minutes":5,"optional":true},
  {"id":"m_m6","perma":"M","d":3,"points":3,"title":"자신이 소중하게 생각하는 가치 3가지 고르기","desc":"자신에게 중요한 가치들을 골라 봅니다. 답은 바뀌어도 괜찮습니다.","functionArea":"self_understanding","difficulty":3,"minutes":10,"optional":true},
  {"id":"m_a3","perma":"A","d":1,"points":1,"title":"물건 하나 제자리에 놓기","desc":"가까운 물건 한 개만 제자리에 놓아봅니다.","functionArea":"daily_living","difficulty":1,"minutes":1,"optional":true},
  {"id":"m_a4","perma":"A","d":1,"points":1,"title":"오늘 할 수 있는 작은 일 정하기","desc":"부담 없는 오늘의 할 일을 하나 정해 봅니다.","functionArea":"planning","difficulty":1,"minutes":3,"optional":true},
  {"id":"m_a5","perma":"A","d":2,"points":2,"title":"생활 공간 한 구역 정리하기","desc":"책상이나 방의 작은 구역을 정리해 봅니다. 일부만 해도 괜찮습니다.","functionArea":"daily_living","difficulty":2,"minutes":5,"optional":true},
  {"id":"m_a6","perma":"A","d":3,"points":3,"title":"간단한 생활 과제 하나 수행하기","desc":"스스로 고른 작은 생활 과제를 시도해 봅니다.","functionArea":"daily_living","difficulty":3,"minutes":10,"optional":true}
);
// 보조 기록은 선택이며 모든 활동은 자기보고로 완료할 수 있습니다.
const evidenceGroups={timer:["m_p1","m_p5","m_p6","m_e1","m_e2","m_e6"],record:["m_e4","m_r5","m_m3","m_m4","m_m5","m_m6","m_a2","m_a4"],photo:["m_e5","m_a3","m_a5","m_a6"]};
for(const m of AU.MISSIONS) m.evidence=Object.keys(evidenceGroups).find(k=>evidenceGroups[k].includes(m.id))||"self_report";
// 신규 활동: 문헌 개별 검토 전까지 효과 검증을 주장하지 않습니다.
AU.MISSIONS.push(...[
  {
    "id": "m_p7",
    "perma": "P",
    "title": "좋았던 일 세 가지",
    "desc": "오늘 괜찮았던 일 세 가지와 이유를 적어 봅니다. 하나만 떠올라도 괜찮습니다.",
    "functionArea": "self_understanding",
    "minutes": 5,
    "evidence": "record",
    "basis": "감사·긍정심리중재",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p8",
    "perma": "P",
    "title": "긍정적인 순간 음미하기",
    "desc": "편안한 순간의 감각을 잠시 살펴봅니다.",
    "functionArea": "self_care",
    "minutes": 3,
    "evidence": "timer",
    "basis": "음미",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p9",
    "perma": "P",
    "title": "자연의 색 찾기",
    "desc": "안전한 장소에서 자연의 색이나 질감을 세 가지 찾아봅니다.",
    "functionArea": "leisure",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "자연 접촉",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p10",
    "perma": "P",
    "title": "자신에게 따뜻한 말 건네기",
    "desc": "친구에게 하듯 자신에게 부담 없는 말 한 문장을 건넵니다.",
    "functionArea": "self_understanding",
    "minutes": 2,
    "evidence": "record",
    "basis": "자기자비",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p11",
    "perma": "P",
    "title": "즐거운 기억 다시 만나기",
    "desc": "원한다면 편안한 기억 하나의 세부 장면을 떠올립니다.",
    "functionArea": "self_understanding",
    "minutes": 3,
    "evidence": "self_report",
    "basis": "음미",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p12",
    "perma": "P",
    "title": "좋아하는 향기 느끼기",
    "desc": "평소 안전하게 사용하는 향이나 음식 냄새를 잠시 즐깁니다.",
    "functionArea": "self_care",
    "minutes": 2,
    "evidence": "self_report",
    "basis": "감각 음미",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p13",
    "perma": "P",
    "title": "햇살이 드는 곳 바라보기",
    "desc": "실내 창가나 안전한 야외에서 빛과 풍경을 잠시 감상합니다.",
    "functionArea": "self_care",
    "minutes": 3,
    "evidence": "self_report",
    "basis": "자연 접촉",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p14",
    "perma": "P",
    "title": "기분 좋은 이야기 읽기",
    "desc": "부담 없는 짧은 이야기나 만화를 즐깁니다.",
    "functionArea": "leisure",
    "minutes": 5,
    "evidence": "timer",
    "basis": "여가·행동활성화",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p15",
    "perma": "P",
    "title": "작은 즐거움 미리 계획하기",
    "desc": "오늘 또는 내일 가능한 즐거운 활동 하나를 정합니다.",
    "functionArea": "planning",
    "minutes": 3,
    "evidence": "record",
    "basis": "행동활성화",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p16",
    "perma": "P",
    "title": "좋아하는 색으로 꾸미기",
    "desc": "종이에 색을 칠하거나 개인 소품을 원하는 색으로 꾸밉니다.",
    "functionArea": "leisure",
    "minutes": 5,
    "evidence": "photo",
    "basis": "창작 여가",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p17",
    "perma": "P",
    "title": "나만의 즐거움 목록 만들기",
    "desc": "부담 없이 할 수 있는 즐거운 활동 세 가지를 적습니다.",
    "functionArea": "self_understanding",
    "minutes": 5,
    "evidence": "record",
    "basis": "행동활성화",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p18",
    "perma": "P",
    "title": "일상의 작은 발견",
    "desc": "평소 지나쳤던 풍경이나 소리에서 흥미로운 점을 찾아봅니다.",
    "functionArea": "leisure",
    "minutes": 3,
    "evidence": "self_report",
    "basis": "주의·음미",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p19",
    "perma": "P",
    "title": "긍정적인 경험 나누기",
    "desc": "원한다면 믿을 만한 사람에게 좋았던 일을 짧게 이야기합니다.",
    "functionArea": "relationships",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "긍정 경험 공유",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_p20",
    "perma": "P",
    "title": "나를 편안하게 하는 선택",
    "desc": "오늘 자신에게 부담을 덜어 주는 작은 선택을 하나 합니다.",
    "functionArea": "self_care",
    "minutes": 3,
    "evidence": "record",
    "basis": "자율성",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_e7",
    "perma": "E",
    "title": "관심 분야 책 읽기",
    "desc": "원하는 책 몇 쪽을 부담 없이 읽습니다.",
    "functionArea": "learning",
    "minutes": 10,
    "evidence": "timer",
    "basis": "여가·학습",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_e8",
    "perma": "E",
    "title": "새 요리 한 단계 연습",
    "desc": "안전한 범위의 간단한 조리 단계 하나를 연습합니다.",
    "functionArea": "daily_living",
    "minutes": 15,
    "evidence": "self_report",
    "basis": "기술 연습",
    "evidenceStatus": "pending_review",
    "difficulty": 3,
    "d": 3,
    "points": 3,
    "optional": true
  },
  {
    "id": "m_e9",
    "perma": "E",
    "title": "악기나 노래 연습",
    "desc": "원하는 음악 활동의 짧은 부분을 연습합니다.",
    "functionArea": "leisure",
    "minutes": 10,
    "evidence": "timer",
    "basis": "기술 연습",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_e10",
    "perma": "E",
    "title": "퍼즐 풀기",
    "desc": "자신에게 맞는 난이도의 퍼즐을 골라 즐깁니다.",
    "functionArea": "leisure",
    "minutes": 10,
    "evidence": "timer",
    "basis": "몰입",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_e11",
    "perma": "E",
    "title": "방해 요소 줄이기",
    "desc": "활동에 방해되는 알림 하나를 줄이고 원하는 일에 집중합니다.",
    "functionArea": "planning",
    "minutes": 10,
    "evidence": "timer",
    "basis": "주의 조절",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_e12",
    "perma": "E",
    "title": "새 단어 익히기",
    "desc": "관심 있는 언어의 단어 세 개를 익혀 봅니다.",
    "functionArea": "learning",
    "minutes": 5,
    "evidence": "record",
    "basis": "학습",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_e13",
    "perma": "E",
    "title": "짧은 글 창작",
    "desc": "소재 하나를 선택해 몇 문장의 이야기를 써 봅니다.",
    "functionArea": "leisure",
    "minutes": 10,
    "evidence": "record",
    "basis": "창작",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_e14",
    "perma": "E",
    "title": "손으로 작은 작품 만들기",
    "desc": "종이 접기나 간단한 공예 등 안전한 작품을 만들어 봅니다.",
    "functionArea": "leisure",
    "minutes": 15,
    "evidence": "photo",
    "basis": "창작 여가",
    "evidenceStatus": "pending_review",
    "difficulty": 3,
    "d": 3,
    "points": 3,
    "optional": true
  },
  {
    "id": "m_e15",
    "perma": "E",
    "title": "관심 강의 일부 듣기",
    "desc": "원하는 주제의 강의 한 부분을 듣습니다.",
    "functionArea": "learning",
    "minutes": 10,
    "evidence": "timer",
    "basis": "학습",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_e16",
    "perma": "E",
    "title": "배운 내용 한 문장 설명하기",
    "desc": "방금 배운 내용을자신의 말로 한 문장 정리합니다.",
    "functionArea": "learning",
    "minutes": 3,
    "evidence": "record",
    "basis": "학습 전략",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_e17",
    "perma": "E",
    "title": "관찰하여 스케치하기",
    "desc": "주변 사물 하나를 관찰하며 가볍게 그립니다.",
    "functionArea": "leisure",
    "minutes": 10,
    "evidence": "photo",
    "basis": "창작·주의",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_e18",
    "perma": "E",
    "title": "적절한 도전 선택하기",
    "desc": "너무 쉽거나 어렵지 않은 활동 하나를 선택해 시도합니다.",
    "functionArea": "self_understanding",
    "minutes": 10,
    "evidence": "self_report",
    "basis": "몰입 이론",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_e19",
    "perma": "E",
    "title": "기술의 한 부분 반복 연습",
    "desc": "원하는 기술의 작은 단계 하나를 편안한 속도로 연습합니다.",
    "functionArea": "learning",
    "minutes": 10,
    "evidence": "timer",
    "basis": "기술 연습",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_e20",
    "perma": "E",
    "title": "몰입 조건 돌아보기",
    "desc": "집중하기 편했던 장소나 시간, 활동을 떠올려 적습니다.",
    "functionArea": "self_understanding",
    "minutes": 5,
    "evidence": "record",
    "basis": "자기조절",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r7",
    "perma": "R",
    "title": "상대의 이야기 듣기",
    "desc": "동의하는 사람과 대화할 때 말을 끊지 않고 들어 봅니다.",
    "functionArea": "relationships",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "적극적 경청",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r8",
    "perma": "R",
    "title": "구체적인 칭찬 건네기",
    "desc": "부담 없는 관계에서 고마웠던 행동을 구체적으로 말합니다.",
    "functionArea": "relationships",
    "minutes": 3,
    "evidence": "self_report",
    "basis": "긍정적 상호작용",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r9",
    "perma": "R",
    "title": "함께 식사하기",
    "desc": "원하는 사람과 서로 편한 방식으로 식사 시간을 갖습니다.",
    "functionArea": "relationships",
    "minutes": 20,
    "evidence": "self_report",
    "basis": "사회적 연결",
    "evidenceStatus": "pending_review",
    "difficulty": 3,
    "d": 3,
    "points": 3,
    "optional": true
  },
  {
    "id": "m_r10",
    "perma": "R",
    "title": "작은 도움 요청하기",
    "desc": "필요할 때 믿을 만한 사람에게 부담 없는 도움을 요청합니다.",
    "functionArea": "relationships",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "사회적 지지",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r11",
    "perma": "R",
    "title": "함께할 계획 세우기",
    "desc": "상대의 의사를 존중하며 함께 할 활동을 제안합니다.",
    "functionArea": "relationships",
    "minutes": 5,
    "evidence": "record",
    "basis": "사회적 연결",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r12",
    "perma": "R",
    "title": "응원 메시지 전하기",
    "desc": "원하는 사람에게 짧은 응원의 말을 전합니다.",
    "functionArea": "relationships",
    "minutes": 3,
    "evidence": "self_report",
    "basis": "친사회 행동",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r13",
    "perma": "R",
    "title": "상대의 좋은 소식 축하하기",
    "desc": "기회가 있다면 좋은 소식에 관심을 표현합니다.",
    "functionArea": "relationships",
    "minutes": 3,
    "evidence": "self_report",
    "basis": "적극적 건설적 반응",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r14",
    "perma": "R",
    "title": "공통 관심사 발견하기",
    "desc": "편안한 대화에서 서로 좋아하는 주제를 찾아봅니다.",
    "functionArea": "relationships",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "사회적 연결",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r15",
    "perma": "R",
    "title": "감사의 이유 전하기",
    "desc": "원할 때 상대의 도움이 어떤 의미였는지 짧게 전합니다.",
    "functionArea": "relationships",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "감사 표현",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r16",
    "perma": "R",
    "title": "서로 편한 연락 방식 정하기",
    "desc": "함께 연락하기 편한 방식이나 시간을 상의합니다.",
    "functionArea": "relationships",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "관계 조율",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r17",
    "perma": "R",
    "title": "나의 필요 말하기",
    "desc": "안전한 상황에서 원하는 것 한 가지를 정중히 표현합니다.",
    "functionArea": "relationships",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "자기주장",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r18",
    "perma": "R",
    "title": "가벼운 공동 활동",
    "desc": "서로 원한다면 짧은 게임이나 산책 등 함께 즐깁니다.",
    "functionArea": "relationships",
    "minutes": 15,
    "evidence": "self_report",
    "basis": "사회적 연결",
    "evidenceStatus": "pending_review",
    "difficulty": 3,
    "d": 3,
    "points": 3,
    "optional": true
  },
  {
    "id": "m_r19",
    "perma": "R",
    "title": "관계의 좋은 점 돌아보기",
    "desc": "편안한 관계에서 고마운 점 하나를 자신만의 기록으로 남깁니다.",
    "functionArea": "self_understanding",
    "minutes": 3,
    "evidence": "record",
    "basis": "감사",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_r20",
    "perma": "R",
    "title": "존중하는 경계 정하기",
    "desc": "자신과 상대 모두 편한 관계의 기준 하나를 생각합니다.",
    "functionArea": "self_understanding",
    "minutes": 5,
    "evidence": "record",
    "basis": "자율성·경계",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m7",
    "perma": "M",
    "title": "자신의 강점 발견하기",
    "desc": "최근 잘 활용했던 능력이나 태도 하나를 적습니다.",
    "functionArea": "self_understanding",
    "minutes": 5,
    "evidence": "record",
    "basis": "강점 중재",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m8",
    "perma": "M",
    "title": "강점을 새롭게 활용하기",
    "desc": "자신이 선택한 강점을 평소와 다른 작은 상황에 써 봅니다.",
    "functionArea": "self_understanding",
    "minutes": 10,
    "evidence": "self_report",
    "basis": "강점 중재",
    "evidenceStatus": "pending_review",
    "difficulty": 2,
    "d": 2,
    "points": 2,
    "optional": true
  },
  {
    "id": "m_m9",
    "perma": "M",
    "title": "미래의 자신에게 편지",
    "desc": "부담 없는 미래의 자신에게 응원 한 문장을 적습니다.",
    "functionArea": "self_understanding",
    "minutes": 5,
    "evidence": "record",
    "basis": "미래 자기",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m10",
    "perma": "M",
    "title": "가치에 맞는 행동 하나",
    "desc": "중요하게 생각하는 가치와 맞는 작은 행동을 선택합니다.",
    "functionArea": "planning",
    "minutes": 5,
    "evidence": "record",
    "basis": "가치 기반 행동",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m11",
    "perma": "M",
    "title": "기여하고 싶은 일 찾기",
    "desc": "도움이 되고 싶은 분야가 있다면 하나 생각해 봅니다.",
    "functionArea": "self_understanding",
    "minutes": 5,
    "evidence": "record",
    "basis": "의미·친사회",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m12",
    "perma": "M",
    "title": "나의 선택 이유 돌아보기",
    "desc": "오늘 선택한 일 하나가 자신에게 왜 중요했는지 생각합니다.",
    "functionArea": "self_understanding",
    "minutes": 3,
    "evidence": "record",
    "basis": "가치 명료화",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m13",
    "perma": "M",
    "title": "배움의 의미 찾기",
    "desc": "배우고 싶은 것이 자신의 삶과 어떻게 연결되는지 적습니다.",
    "functionArea": "learning",
    "minutes": 5,
    "evidence": "record",
    "basis": "의미",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m14",
    "perma": "M",
    "title": "소중한 물건의 이야기",
    "desc": "개인정보 없이 소중한 물건의 의미를 떠올립니다.",
    "functionArea": "self_understanding",
    "minutes": 3,
    "evidence": "self_report",
    "basis": "삶의 의미",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m15",
    "perma": "M",
    "title": "한 주의 중요한 순간 돌아보기",
    "desc": "최근 의미 있었던 작은 순간 하나를 선택합니다.",
    "functionArea": "self_understanding",
    "minutes": 5,
    "evidence": "record",
    "basis": "의미",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m16",
    "perma": "M",
    "title": "환경을 위한 작은 행동",
    "desc": "가능하면 재사용이나 분리배출 등 원하는 행동 하나를 합니다.",
    "functionArea": "daily_living",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "가치 기반 행동",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m17",
    "perma": "M",
    "title": "나만의 원칙 한 문장",
    "desc": "자신에게 중요한 삶의 태도 하나를 적습니다.",
    "functionArea": "self_understanding",
    "minutes": 3,
    "evidence": "record",
    "basis": "가치 명료화",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m18",
    "perma": "M",
    "title": "관심 있는 공동체 알아보기",
    "desc": "참여 의무 없이 관심 있는 공동체나 활동 정보를 살펴봅니다.",
    "functionArea": "learning",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "사회적 의미",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m19",
    "perma": "M",
    "title": "일상의 역할 인정하기",
    "desc": "현재 자신이 맡고 있는 역할 중 중요한 점 하나를 생각합니다.",
    "functionArea": "self_understanding",
    "minutes": 5,
    "evidence": "record",
    "basis": "의미",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_m20",
    "perma": "M",
    "title": "내가 소중히 여기는 시간을 마련하기",
    "desc": "중요한 일에 쓸 수 있는 짧은 시간대를 자율적으로 정합니다.",
    "functionArea": "planning",
    "minutes": 5,
    "evidence": "record",
    "basis": "가치 기반 행동",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a7",
    "perma": "A",
    "title": "큰 목표를 작은 단계로 나누기",
    "desc": "부담되는 목표를 다음에 할 수 있는 작은 행동으로 나눕니다.",
    "functionArea": "planning",
    "minutes": 5,
    "evidence": "record",
    "basis": "목표 설정",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a8",
    "perma": "A",
    "title": "실행할 시간과 장소 정하기",
    "desc": "원하는 행동에 대해 언제 어디서 할지 정합니다.",
    "functionArea": "planning",
    "minutes": 3,
    "evidence": "record",
    "basis": "실행의도",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a9",
    "perma": "A",
    "title": "지출 내역 살펴보기",
    "desc": "금액이나 개인정보를 제출하지 않고 최근 지출을 확인합니다.",
    "functionArea": "daily_living",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "생활 관리",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a10",
    "perma": "A",
    "title": "내일 필요한 물건 준비하기",
    "desc": "내일 사용할 물건 하나를 미리 준비합니다.",
    "functionArea": "daily_living",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "환경 조성",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a11",
    "perma": "A",
    "title": "오늘 해낸 일 돌아보기",
    "desc": "작더라도 해낸 일 하나를 적습니다.",
    "functionArea": "self_understanding",
    "minutes": 3,
    "evidence": "record",
    "basis": "성취 기록",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a12",
    "perma": "A",
    "title": "세탁물 한 종류 정리하기",
    "desc": "가능한 범위에서 세탁물을 분류하거나 정리합니다.",
    "functionArea": "daily_living",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "생활 관리",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a13",
    "perma": "A",
    "title": "간단한 식사 계획 세우기",
    "desc": "자신에게 맞는 부담 없는 식사 계획 하나를 정합니다.",
    "functionArea": "daily_living",
    "minutes": 5,
    "evidence": "record",
    "basis": "생활 관리",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a14",
    "perma": "A",
    "title": "필요한 일정 확인하기",
    "desc": "다가오는 중요한 일정 하나를 확인하고 적절히 준비합니다.",
    "functionArea": "planning",
    "minutes": 3,
    "evidence": "self_report",
    "basis": "자기조절",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a15",
    "perma": "A",
    "title": "작업에 필요한 자료 모으기",
    "desc": "작은 작업을 시작하는 데 필요한 자료를 준비합니다.",
    "functionArea": "planning",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "환경 조성",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a16",
    "perma": "A",
    "title": "사용하지 않는 파일 정리하기",
    "desc": "필요 여부를 확인하며 안전한 파일 몇 개를 정리합니다.",
    "functionArea": "daily_living",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "생활 관리",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a17",
    "perma": "A",
    "title": "생활 공간 동선 정돈하기",
    "desc": "걸림돌이 없는 안전한 통로를 만드는 작은 정리를 합니다.",
    "functionArea": "daily_living",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "생활 관리",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a18",
    "perma": "A",
    "title": "행동을 가로막는 장애물 살피기",
    "desc": "원하는 행동을 어렵게 하는 요소를 하나 찾고 대안을 생각합니다.",
    "functionArea": "planning",
    "minutes": 5,
    "evidence": "record",
    "basis": "문제 해결",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a19",
    "perma": "A",
    "title": "진행 중인 일의 다음 단계",
    "desc": "완료하지 않아도 지금 할 수 있는 다음 단계 하나를 시작합니다.",
    "functionArea": "planning",
    "minutes": 5,
    "evidence": "self_report",
    "basis": "행동활성화",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  },
  {
    "id": "m_a20",
    "perma": "A",
    "title": "한 주의 계획 조정하기",
    "desc": "지난 계획에서 부담스러웠던 부분 하나를 더 현실적으로 바꿉니다.",
    "functionArea": "planning",
    "minutes": 5,
    "evidence": "record",
    "basis": "자기조절",
    "evidenceStatus": "pending_review",
    "difficulty": 1,
    "d": 1,
    "points": 1,
    "optional": true
  }
]);
// 활동 경험 점수는 심리검사 점수와 별개입니다.
/* 선택형 '쉼' 현실 미션: 피로도를 줄이는 짧은 휴식 활동(PERMA 마음 스탯과는 별개). 수치·목록은 임시, 하루에 같은 미션은 한 번 */
AU.REST_MISSIONS = [
  { id: "r_breath", title: "3분 호흡 가다듬기", desc: "편한 자세로 앉아 숨을 천천히 들이쉬고 내쉬며 3분을 보냅니다.", recover: 25,
    guide: { kind: "breath", secs: 180, intro: ["편한 자세로 앉아 어깨의 힘을 뺍니다.", "코로 4초 들이쉬고, 입으로 6초 천천히 내쉽니다.", "생각이 떠오르면 ‘떠올랐구나’ 하고 알아차린 뒤, 다시 숨으로 돌아옵니다. 잘하려고 애쓰지 않아도 됩니다."] } },
  { id: "r_stretch", title: "몸 풀기 스트레칭", desc: "자리에서 일어나 어깨와 목, 허리를 천천히 풀어 줍니다.", recover: 20,
    guide: { kind: "steps", secs: 120, steps: ["목을 오른쪽·왼쪽으로 천천히 기울입니다.", "어깨를 위로 올렸다가 툭 떨어뜨립니다.", "양팔을 머리 위로 뻗고 깍지 껴서 옆구리를 늘립니다.", "손목과 발목을 천천히 돌립니다."] } },
  { id: "r_water", title: "물 한 잔 마시며 쉬기", desc: "물이나 따뜻한 차를 한 잔 마시며 화면에서 눈을 뗍니다.", recover: 15,
    guide: { kind: "timer", secs: 60, intro: ["물이나 차를 준비해 천천히 마셔 보세요.", "화면에서 눈을 떼고, 먼 곳을 바라봅니다."] } },
  { id: "r_walk", title: "10분 걷기", desc: "가까운 곳을 10분 정도 천천히 걸어 봅니다.", recover: 35,
    guide: { kind: "timer", secs: 600, intro: ["가까운 곳을 천천히 걸어 보세요. 이 창은 닫아 두고 다녀와도 됩니다.", "시간이 지나면 ‘해 봤어요’를 누를 수 있습니다."] } }
];
AU.REST_CATEGORIES={physical:"신체적 쉼",emotional:"정서적 쉼",cognitive:"인지적 쉼",sensory:"자연·감각 쉼",social:"사회적 쉼",sleep:"생활·수면 준비"};
for(const m of AU.REST_MISSIONS){m.category=({r_breath:"emotional",r_stretch:"physical",r_water:"sleep",r_walk:"sensory"})[m.id];m.minutes=Math.ceil(m.guide.secs/60);}
AU.REST_MISSIONS.push(...[
  {
    "id": "r_extra_01",
    "category": "physical",
    "title": "편안한 자세로 쉬기",
    "desc": "앉거나 누워 편한 자세를 찾아 잠시 쉽니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_02",
    "category": "physical",
    "title": "목과 어깨 힘 풀기",
    "desc": "통증 없는 범위에서 어깨를 편하게 내려놓습니다.",
    "minutes": 2,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_03",
    "category": "physical",
    "title": "눈을 감고 잠시 쉬기",
    "desc": "안전한 장소에서 원하면 눈을 감고 쉽니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_04",
    "category": "physical",
    "title": "부드러운 근육 이완",
    "desc": "아픈 부위는 피하고 편한 범위에서 힘을 천천히 풉니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_05",
    "category": "emotional",
    "title": "현재 감정 알아차리기",
    "desc": "감정을 바꾸려 애쓰지 않고 지금의 느낌을 알아차립니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_06",
    "category": "emotional",
    "title": "스스로에게 자비로운 말",
    "desc": "지금 자신에게 필요한 친절한 문장을 떠올립니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_07",
    "category": "emotional",
    "title": "편안했던 순간 떠올리기",
    "desc": "원한다면 안전하고 편안했던 순간을 떠올립니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_08",
    "category": "emotional",
    "title": "느낌을 판단하지 않고 바라보기",
    "desc": "불편하면 중단하고 현재 느껴지는 감정을 살펴봅니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_09",
    "category": "cognitive",
    "title": "하던 일 잠시 멈추기",
    "desc": "잠시 작업을 멈추고 편한 자세로 쉽니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_10",
    "category": "cognitive",
    "title": "화면에서 벗어나기",
    "desc": "가능한 범위에서 화면을 끄고 여유를 갖습니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_11",
    "category": "cognitive",
    "title": "걱정할 일 메모하기",
    "desc": "원하면 나중에 생각할 일을 짧게 적고 메모를 덮습니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_12",
    "category": "cognitive",
    "title": "한 번에 하나만 하기",
    "desc": "여러 일을 내려놓고 가장 편한 한 가지에만 주의를 둡니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_13",
    "category": "cognitive",
    "title": "목표 없는 짧은 쉼",
    "desc": "무언가 해내려 하지 않고 편하게 시간을 보냅니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_14",
    "category": "sensory",
    "title": "자연 풍경 바라보기",
    "desc": "창밖이나 안전한 장소에서 자연을 바라봅니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_15",
    "category": "sensory",
    "title": "자연의 소리 듣기",
    "desc": "편한 음량으로 자연 소리를 들어 봅니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_16",
    "category": "sensory",
    "title": "편안한 음악 감상하기",
    "desc": "원하는 편안한 음악을 낮은 음량으로 듣습니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_17",
    "category": "sensory",
    "title": "조용한 공간에서 쉬기",
    "desc": "가능하다면 소음이 적고 안전한 곳에서 쉽니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_18",
    "category": "social",
    "title": "편안한 사람과 이야기",
    "desc": "서로 원한다면 믿을 만한 사람과 짧게 대화합니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_19",
    "category": "social",
    "title": "혼자만의 시간",
    "desc": "자신이 원할 때 방해 없는 짧은 시간을 마련합니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_20",
    "category": "social",
    "title": "부담되는 부탁의 경계",
    "desc": "안전한 상황에서 무리한 요청을 정중히 거절할 방법을 생각합니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_21",
    "category": "social",
    "title": "사회적 일정에 여유 두기",
    "desc": "필수 약속을 무시하지 않고 선택 일정에서 휴식 시간을 마련합니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_22",
    "category": "social",
    "title": "부담 없는 도움 요청",
    "desc": "원하면 신뢰할 수 있는 사람에게 필요한 작은 도움을 요청합니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_23",
    "category": "sleep",
    "title": "편안한 세안 또는 샤워",
    "desc": "안전하고 편한 온도로 세안하거나 샤워하며 쉽니다.",
    "minutes": 10,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_24",
    "category": "sleep",
    "title": "잠들기 전 조명 낮추기",
    "desc": "이동 안전을 유지하면서 조명을 편안하게 조절합니다.",
    "minutes": 3,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_25",
    "category": "sleep",
    "title": "취침 전 화면 줄이기",
    "desc": "필요한 연락을 유지하며 화면을 잠시 내려놓습니다.",
    "minutes": 10,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  },
  {
    "id": "r_extra_26",
    "category": "sleep",
    "title": "자신에게 맞는 취침 준비",
    "desc": "수면을 강제하지 않고 편한 취침 준비를 하나 선택합니다.",
    "minutes": 5,
    "recover": 15,
    "evidenceStatus": "pending_review",
    "optional": true
  }
]);
AU.MISSION_STATES = {
  locked: "미해금", available: "수행 가능", accepted: "수락", attempted: "시도", partial: "일부 수행", done: "완료", skipped: "건너뛰기"
};
