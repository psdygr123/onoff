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
  job_warrior: { path: "assets/job/warrior.webp", optional: true }, job_mage: { path: "assets/job/mage.webp", optional: true }, job_archer: { path: "assets/job/archer.webp", optional: true }, job_rogue: { path: "assets/job/rogue.webp", optional: true }, job_pirate: { path: "assets/job/pirate.webp", optional: true },
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
    area: { x: 16, y: 64, desc: "주인공이 살던 마을입니다. 정식 지역 설명은 스토리 자료가 오면 넣습니다. (TODO)" }
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
    name: "포르투 노바", bg: "harbor", width: 1600, safe: true,
    platforms: [{ x: 0, y: 590, w: 1600 }], ropes: [],
    portals: [{ x: 40, to: "harbor_road", toX: 2330, label: "항구 길" }, { x: 1560, to: "docks", toX: 90, label: "선창 외곽" }, { x: 700, to: "general_store", toX: 90, label: "해풍 잡화점" }, { x: 1060, to: "weapon_store", toX: 90, label: "철파도 무기점" }],
    npcs: [{ id: "porto_dock", x: 330 }, { id: "porto_guild", x: 520 }, { id: "job_npc", x: 900 }, { id: "guide_npc", x: 1220 }, { id: "porto_foreman", x: 1390 }],
    // 길드 목공 시험: 부두 끝에 방치된 고기잡이배(해당 퀘스트 진행 중에만 표시)
    spots: [
      { id: "boat_a", img: "fence", x: 250, kind: "repair", label: "썩은 뱃바닥", done: "썩은 뱃바닥을 쳐내고 새 판자를 맞춰 넣었습니다." },
      { id: "boat_b", img: "fence", x: 1500, kind: "repair", label: "쪼개진 뱃전", done: "쪼개진 뱃전에 쇠징을 박아 단단히 고정했습니다." },
    ],
    spawns: [], start: 160,
    area: { x: 78, y: 40, desc: "중립 항구도시입니다. 선창 길드가 의뢰를 받습니다. (요청서 기준)" }
  },
  general_store: {
    name: "해풍 잡화점", bg: "general_store", width: 1500, safe: true, interior: true, parent: "porto",
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 70, to: "porto", toX: 700, label: "나가기" }],
    npcs: [{ id: "porto_general", x: 960, npcY: 462 }],
    fgSlice: [665, 421, 660, 180],   // 계산대: 상인보다 앞에 다시 그려 상인이 계산대 뒤에 서 있게 함
    spots: [], spawns: [], start: 200,
    area: { x: 74, y: 36, desc: "포르투 노바의 잡화점입니다. 재료를 팔고 회복약을 살 수 있습니다." }
  },
  weapon_store: {
    name: "철파도 무기점", bg: "weapon_store", width: 1500, safe: true, interior: true, parent: "porto",
    platforms: [{ x: 0, y: 590, w: 1500 }], ropes: [],
    portals: [{ x: 70, to: "porto", toX: 1060, label: "나가기" }],
    npcs: [{ id: "porto_armor", x: 400 }, { id: "porto_smith", x: 940, npcY: 462 }],
    fgSlice: [625, 425, 640, 175],
    spots: [], spawns: [], start: 200,
    area: { x: 82, y: 36, desc: "포르투 노바의 무기점입니다. 장비를 제작하고 방어구 상인과 이야기할 수 있습니다." }
  },
  docks: {
    name: "선창 외곽", bg: "storage", width: 1280, safe: false,
    // thin: 위에 올라설 수 있고 ↓+점프로 내려올 수 있는 얇은 발판(임시 그래픽)
    platforms: [{ x: 0, y: 590, w: 1280 }, { x: 300, y: 480, w: 200, thin: true }, { x: 520, y: 430, w: 220, thin: true }],
    ropes: [{ x: 285, top: 465, bottom: 590 }],
    portals: [{ x: 40, to: "porto", toX: 1480, label: "포르투 노바" }],
    npcs: [],
    // 조사·수리 지점: 해당 목표가 진행 중일 때만 표시됩니다(kind: repair=목공 수리 / investigate=조사)
    spots: [
      { id: "fence_a", img: "fence", x: 200, kind: "repair", label: "무너진 방책", done: "방책 기둥을 새로 세워 박았습니다." },
      { id: "fence_b", img: "fence", x: 650, kind: "repair", label: "쪼개진 방책", done: "쪼개진 판자를 갈아 끼웠습니다." },
      { id: "fence_c", img: "fence", x: 1000, kind: "repair", label: "기울어진 방책", done: "기울어진 기둥을 바로 세웠습니다." },
      { id: "trace_stain", img: "ob_trace_stain", x: 440, kind: "investigate", label: "바위틈의 검은 얼룩", lines: ["바위틈에 말라붙은 검은 얼룩이 있습니다. 바닷물에도 씻기지 않은 듯 끈적하게 굳어 있습니다.", "짐승이 지나간 자리마다 이 얼룩이 남아 있습니다. 어둠의 기운이 짐승의 몸을 거쳐 흘러나온 흔적처럼 보입니다."] },
      { id: "trace_crate", img: "ob_trace_crate", x: 1130, kind: "investigate", label: "부서진 짐 상자", lines: ["부서진 짐 상자의 옆면에 불도장이 찍혀 있습니다. 파도 같은 물결무늬입니다.", "어디선가 본 듯한 모양입니다. 상자 안은 비어 있지만 바닥에 검은 가루가 남아 있습니다."] }
    ],
    spawns: [{ type: "crab", x: 360 }, { type: "crab", x: 600 }, { type: "rat", x: 820 }, { type: "crab", x: 1060 }],
    boss: { type: "trial_boss", x: 980 },     // 전직 시험 중에만 등장
    area: { x: 90, y: 64, desc: "항구 바깥 선창 지대입니다. 길드 의뢰의 사냥터입니다." }
  }
};
/* 대륙 지도: 이름은 아직 정해지지 않음(미정). 열리지 않은 권역은 이름 대신 방향만 보여 줌(스포일러 방지). maps는 지역 지도 id */
AU.WORLD_REGIONS = [
  { id: "south", name: "남부 해안", x: 50, y: 82, open: true, maps: ["forest", "harbor_road", "porto", "docks", "jandari", "general_store", "weapon_store"], desc: "대륙 최남단의 해안 지대입니다. 정보와 상인의 자유 항구도시 포르투 노바가 있습니다." },
  { id: "west", name: "서부", x: 20, y: 52, open: false, desc: "아직 가 보지 않은 땅입니다. 이야기가 진행되면 길이 열립니다." },
  { id: "north", name: "북부", x: 48, y: 18, open: false, desc: "아직 가 보지 않은 땅입니다. 이야기가 진행되면 길이 열립니다." },
  { id: "east", name: "동부", x: 80, y: 44, open: false, desc: "아직 가 보지 않은 땅입니다. 이야기가 진행되면 길이 열립니다." }
];
AU.AREA_LINKS = [["forest", "harbor_road"], ["harbor_road", "porto"], ["porto", "docks"], ["porto", "general_store"], ["porto", "weapon_store"]];

/* ---------- 적 ---------- */
// sprite/sw: 정식 그림(assets/monster/*.webp, 투명 배경, 오른쪽을 보는 옆모습 1장)이 있으면 그 그림을 sw(가로 px)로 그리고, 없으면 임시 도형으로 표시합니다.
// 이전 아스텔리아 기획의 사냥터 구성(들짐승→부두 쥐→게→거대 적)을 규칙으로만 재사용. 모두 임시 수치.
AU.MONSTERS = {
  fox:   { motion: "pounce", name: "들여우", lv: 1, hp: 51, atk: 8, speed: 70, chase: 130, w: 72, h: 50, exp: 34, silver: [2, 5], drops: [["fur", 0.55, 1, 2], ["fox_tail", 0.18], ["potion", 0.08], ["fox_scarf", 0.015]], color: "#F5A25D", ear: true, sprite: "mon_fox", sw: 92 },
  snake: { motion: "coil", name: "뱀", lv: 3, hp: 88, atk: 14, speed: 85, chase: 150, w: 90, h: 34, exp: 62, silver: [4, 8], drops: [["snake_skin", 0.5], ["snake_fang", 0.16], ["potion", 0.1], ["snake_ring", 0.015]], color: "#7DBE6B", snake: true, sprite: "mon_snake", sw: 128 },
  rat:   { motion: "scurry", name: "부두 쥐", lv: 5, hp: 144, atk: 21, speed: 100, chase: 160, w: 70, h: 46, exp: 90, silver: [6, 12], drops: [["rat_tooth", 0.55, 1, 2], ["potion", 0.12]], color: "#A79C94", ear: true, sprite: "mon_rat", sw: 88 },
  crab:  { motion: "sidestep", name: "집게 게", lv: 8, hp: 272, atk: 36, speed: 60, chase: 150, w: 92, h: 56, exp: 132, silver: [10, 18], drops: [["crab_claw", 0.5, 1, 2], ["crab_shell", 0.2], ["potion", 0.15], ["crab_vest", 0.015]], color: "#E9777A", crab: true, sprite: "mon_crab", sw: 116 },
  trial_boss: { name: "움브라", lv: 10, hp: 700, atk: 40, speed: 75, chase: 420, w: 240, h: 150, exp: 600, silver: [60, 80], drops: [], color: "#9B7FD1", boss: true, motion: "swing",
    sprite: "mon_umbra_base", sw: 300, refW: 345, poses: { idle: "mon_umbra_base", walkA: "mon_umbra_walkA", walkB: "mon_umbra_walkB", windup: "mon_umbra_windup", attack: "mon_umbra_attack", hurt: "mon_umbra_hurt", down: "mon_umbra_down" } }
};

/* ---------- 아이템 ---------- */
AU.ITEMS = {
  sword_a: { name: "견습용 검", type: "equip", slot: "weapon", stats: { atk: 4 }, desc: "견습 모험가가 쓰는 기본 검입니다." },
  cloth_a: { name: "견습용 작업복", type: "equip", slot: "armor", stats: { hp: 20 }, desc: "움직이기 편한 작업복입니다." },
  charm_a: { name: "작은 부적", type: "equip", slot: "accessory", stats: { dodge: 1, crit: 1 }, desc: "작은 행운이 깃들었다는 부적입니다." },
  potion:  { name: "작은 회복약", type: "use", heal: 50, buy: 15, desc: "HP를 50 회복합니다." },
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
  guild_token: { name: "선창 길드 증표", type: "quest", desc: "선창 길드의 의뢰를 받았다는 표시입니다." },
  guild_parcel: { name: "길드 짐 꾸러미", type: "quest", desc: "선창 길드가 전해 달라고 맡긴 작은 꾸러미입니다." }
};
// 상점: 잡화상인은 재료를 사고 소비 아이템을 팔며, 무기상인은 장비를 만들어 줌
AU.SHOP = { general: { buy: ["potion"] } };
AU.RARITY = { common: { label: "흔함", color: "#D9C79A" }, uncommon: { label: "드묾", color: "#7FC8A9" }, rare: { label: "희귀", color: "#F2C14E" } };
// 제작: 안전한 곳(마을)에서 재료와 은화로 희귀 장비를 직접 만듦(드롭보다 확실하지만 재료가 많이 듦)
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
AU.JOB_LINES = [
  { id: "warrior", name: "전사", open: true, job: "warrior", desc: "검과 방패로 가까이에서 버티며 싸웁니다.", icon: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>' },
  { id: "mage", name: "마법사", open: false, icon: '<path d="M12 2l2.6 6.2 6.7.5-5.1 4.3 1.6 6.5L12 16l-5.8 3.5 1.6-6.5L2.7 8.7l6.7-.5z"/>' },
  { id: "archer", name: "궁수", open: false, icon: '<path d="M5 3c8 3 8 15 0 18M5 3v18M3 12h17m-4-3 4 3-4 3" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "rogue", name: "도적", open: false, icon: '<path d="M12 2c4 2 6 6 6 10l2 9H4l2-9c0-4 2-8 6-10z"/>' },
  { id: "pirate", name: "해적", open: false, icon: '<path d="M12 3a2 2 0 110 4 2 2 0 010-4zm-1 5h2v9c3-.5 5-2.5 5.5-5l2 1c-1 4-4.5 7-8.5 7s-7.5-3-8.5-7l2-1c.5 2.5 2.5 4.5 5.5 5z"/>' }
];
AU.JOB_TIERS = [
  { level: 10, name: "1차 전직: 전사" },
  { level: 30, name: "2차 전직 (미정)" },
  { level: 50, name: "3차 전직 (미정)" }
];

/* ---------- 스킬 (전사, 임시) ---------- */
AU.SKILLS = {
  strike: { name: "결의의 일격", cost: 15, cd: 3, mult: 2.2, range: 135, desc: "마음을 모아 앞쪽의 적에게 강한 일격을 가합니다. (공격력 220%)" },
  spin:   { name: "소용돌이 베기", cost: 25, cd: 6, mult: 1.5, radius: 150, desc: "몸을 돌리며 주변 양쪽의 적을 한꺼번에 벱니다. (공격력 150%)" },
  focus:  { name: "마음 다잡기", cost: 20, cd: 10, heal: 0.35, desc: "숨을 고르고 마음을 다잡아 HP를 최대 HP의 35% 회복합니다." }
};
AU.WARRIOR_SKILLS = ["strike", "spin", "focus"];

/* ---------- 퀘스트 (전부 임시 테스트 콘텐츠) ---------- */
// kind: kill(처치) / collect(아이템 수집) / talk(대화) / deliver(물건 전달: item→target NPC) / investigate(조사 지점 targets) / repair(목공 수리 지점 targets) / choice(선택: 정답 없는 갈림길, target NPC에게 말 걸기)
// 선택지에는 정답·오답이 없고 보상 차이도 없습니다. 고른 값은 flags["choice_<id>"]에 기록해 이후 이야기에서 쓸 수 있습니다.
AU.QUESTS = {
  q_s1_silver: {
    title: "빈 주머니", type: "main", giver: "porto_dock", minLevel: 1, pre: [],
    area: "jandari", desc: "잔다리 골목의 정보상 바르샤를 찾아가 쇳조각의 출처를 묻습니다.", objectives: [{ kind: "talk", target: "barsha" }],
    offer: ["그 쇳조각... 내 눈엔 평범한 쇠가 아니군. 이런 건 잔다리 골목의 정보상 영감이 밝지.", "다만 그 영감은 은화 냄새가 나야 입을 열어. 믿기 어려우면 가서 직접 물어보게. 골목 입구는 이 길 왼쪽 끝일세."],
    reminder: ["잔다리 골목은 이 길 왼쪽 끝에 있네. 영감은 공방 안쪽에 있어."],
    done: ["거절당했나? 그럴 줄 알았네. 은화부터 벌어야 하는 게 이 도시의 법이거든.", "손재주 있는 일꾼을 찾는 곳이 있네. 선창 길드 십장을 찾아가 보게. 부두 오른쪽 끝에 있다네."],
    reward: { exp: 20, silver: 0, items: [] }
  },
  q_s1_test: {
    title: "길드의 시험", type: "main", giver: "porto_foreman", minLevel: 1, pre: ["q_s1_silver"],
    area: "porto", desc: "부두에 방치된 고기잡이배 두 곳을 목공으로 고칩니다.", objectives: [{ kind: "repair", targets: ["boat_a", "boat_b"] }],
    offer: ["이봐, 신참. 여긴 남의 집 땔감이나 팰 풋내기가 올 곳이 아니야.", "정 일하고 싶다면 손재주부터 보여 보게. 부두 양끝에 쪼개진 고기잡이배가 있네. 고쳐 놓으면 얘기를 들어 주지."],
    reminder: ["배에 다가가 {interact}를 누르고 있으면 수리하네. 뱃바닥과 뱃전, 두 곳일세."],
    done: ["...나무 결을 볼 줄 아는 놈이군. 제대로 배운 손이야.", "창고 구석의 이 검을 빌려주지. 값은 보수에서 깎을 걸세. 이제 일을 맡겨도 되겠어."],
    reward: { exp: 120, silver: 30, items: [["sword_a", 1]] }
  },
  q_first: {
    title: "해안의 짐승", type: "main", giver: "porto_foreman", minLevel: 1, pre: ["q_s1_test"],
    desc: "숲길에서 내려오는 오염된 들여우를 3마리 처치합니다.", objectives: [{ kind: "kill", target: "fox", count: 3 }],
    area: "forest",
    offer: ["요즘 어둠의 경계에서 흘러나온 오염된 짐승들이 항구 쪽으로 내려와 방책과 창고를 갉아먹네.", "먼저 항구 길 너머 숲길의 들여우 세 마리만 쫓아내 주게. 몸 푸는 셈 치고.", "공격은 {attack}, 점프는 {jump}일세. 서툴러도 목수의 눈이 있으니 해낼 걸세."],
    reminder: ["공격은 {attack}, 점프는 {jump}, 말 걸기·줍기는 {interact}라네.", "항구 길을 따라 왼쪽으로 쭉 가면 숲길일세. 들여우에게 가까이 가 공격 키를 눌러 보게."],
    done: ["벌써 해냈나. 수고했네. 이건 보수일세."],
    reward: { exp: 80, silver: 30, items: [] }
  },
  q_forest: {
    title: "숲길 정리", type: "main", giver: "porto_foreman", minLevel: 2, pre: ["q_first"],
    desc: "숲길의 뱀을 5마리 처치합니다.", objectives: [{ kind: "kill", target: "snake", count: 5 }],
    area: "forest",
    offer: ["이번에는 숲길 안쪽의 뱀일세. 짐승 소동이 숲에서부터 번지는 모양이야.", "가는 길에도 뱀이 있으니 조심하게."],
    done: ["고생했네. 작업복이 낡았더군. 이거라도 걸치게."],
    reward: { exp: 300, silver: 60, items: [["cloth_a", 1]] }
  },
  q_guild_talk: {
    title: "선창 길드 장부", type: "sub", giver: "porto_foreman", minLevel: 3, pre: ["q_forest"],
    desc: "포르투 노바의 선창 길드 접수에서 이름을 장부에 올립니다.", objectives: [{ kind: "talk", target: "porto_guild" }],
    offer: ["이 정도 일했으면 길드 장부에 이름을 올려 두게. 접수에 가서 등록하면 정식 의뢰를 받을 수 있네."],
    done: ["등록했나? 이제 길드 사람이 됐군."],
    reward: { exp: 150, silver: 20, items: [] }
  },
  q_guild_rats: {
    title: "부두 쥐 소탕", type: "sub", giver: "porto_guild", minLevel: 4, pre: ["q_guild_talk"],
    area: "harbor_road", desc: "항구 길의 부두 쥐를 8마리 처치합니다.", objectives: [{ kind: "kill", target: "rat", count: 8 }],
    offer: ["선창 길드의 의뢰입니다. 항구 길의 쥐를 8마리 줄여 주세요."],
    done: ["확인했습니다. 보수와 증표를 드립니다."],
    reward: { exp: 600, silver: 120, items: [["charm_a", 1], ["guild_token", 1]] }
  },
  q_guild_crabs: {
    title: "집게 게 퇴치", type: "sub", giver: "porto_guild", minLevel: 7, pre: ["q_guild_rats"],
    area: "docks", desc: "선창 외곽의 집게 게를 5마리 처치합니다.", objectives: [{ kind: "kill", target: "crab", count: 5 }],
    offer: ["선창 외곽의 집게 게가 짐을 상하게 합니다. 5마리를 부탁합니다."],
    done: ["수고하셨습니다. 이번 보수입니다."],
    reward: { exp: 1200, silver: 200, items: [] }
  },
  q_a1_fence: {
    title: "방책 수리", type: "main", giver: "porto_foreman", minLevel: 4, pre: ["q_guild_talk"],
    area: "docks", desc: "선창 외곽의 무너진 방책 세 곳을 고치고, 기어드는 게를 4마리 쫓아냅니다.",
    objectives: [{ kind: "repair", targets: ["fence_a", "fence_b", "fence_c"] }, { kind: "kill", target: "crab", count: 4 }],
    offer: ["...나무 결을 볼 줄 아는 눈이군. 연장을 다루는 손이 제대로 배운 손이야.", "선창 외곽의 방책이 여기저기 부서졌네. 고치면서 기어드는 게도 쫓아내 주게. 보수는 세 배로 쳐주지."],
    reminder: ["방책에 다가가 {interact}를 누르고 있으면 수리합니다. 게는 방책을 갉아먹으니 보이는 대로 쫓아내게."],
    done: ["방책이 말끔하군. 못 박는 소리가 일정한 게 마음에 들어.", "약속한 보수일세. 받아 가게."],
    reward: { exp: 900, silver: 180, items: [] }
  },
  q_a1_parcel: {
    title: "길드 짐 전하기", type: "sub", giver: "porto_foreman", minLevel: 5, pre: ["q_a1_fence"],
    desc: "길드 짐 꾸러미를 포르투 노바의 잡화상인에게 전합니다.", startItems: [["guild_parcel", 1]],
    objectives: [{ kind: "deliver", item: "guild_parcel", target: "porto_general" }],
    offer: ["심부름을 하나 부탁하겠네. 이 꾸러미를 잡화상인에게 전해 주게.", "마을 안이니 멀지 않을 걸세."],
    reminder: ["꾸러미는 잡화상인에게 전하면 되네."],
    deliver: { porto_general: ["선창 길드에서 온 꾸러미군요. 기다리고 있었어요. 고맙습니다.", "(꾸러미를 건넸습니다.)"] },
    done: ["전했나? 수고했네. 수고비일세."],
    reward: { exp: 250, silver: 50, items: [["potion", 2]] }
  },
  q_a1_traces: {
    title: "방파제의 흔적", type: "main", giver: "porto_foreman", minLevel: 6, pre: ["q_a1_parcel"],
    area: "docks", desc: "선창 외곽에서 짐승이 남긴 이상한 흔적 두 곳을 조사하고, 십장에게 알립니다.",
    objectives: [{ kind: "investigate", targets: ["trace_stain", "trace_crate"] }, { kind: "choice", id: "traces", target: "porto_foreman" }],
    offer: ["요즘 방파제에 이상한 흔적이 남는다는 말이 돌아. 짐승이 지나간 자리라는데, 직접 보고 와 주겠나?", "바위틈과 부서진 짐 상자 쪽일세."],
    reminder: ["선창 외곽의 바위틈과 부서진 상자를 살펴보고 오게."],
    choice: {
      prompt: ["다녀왔나? 뭘 보았는지 말해 보게.", "...듣고 보니 심상치 않군. 이 일을 어떻게 하면 좋겠나?"],
      options: [
        { label: "길드에 알린다", flag: "report", reply: ["그래, 길드가 알고 있어야 대비를 하지. 내가 장부에 올려 두겠네."] },
        { label: "일단 혼자 알아본다", flag: "alone", reply: ["혼자서 말인가. 위험한 일일세. 그래도 먼저 확인해 보겠다면 말리진 않겠네.", "다만 무슨 일이든 알게 되면 귀띔은 해 주게."] }
      ]
    },
    done: ["수고했네. 자네 덕에 방파제 일이 한결 분명해졌어."],
    reward: { exp: 800, silver: 100, items: [] }
  },
  q_job: {
    title: "전직 시험", type: "main", giver: "job_npc", minLevel: 10, pre: [],
    area: "docks", desc: "선창 외곽에 나타나는 움브라를 처치합니다.",
    objectives: [{ kind: "kill", target: "trial_boss", count: 1 }],
    offer: ["10레벨이 되었군요. 전직 시험을 치르겠습니까? 선창 외곽에 움브라가 나타납니다."],
    done: ["시험을 통과했습니다. 이제 전사의 길로 들어섭니다."],
    reward: { exp: 0, silver: 100, items: [] },
    jobChange: "warrior"
  }
};

/* ---------- NPC (전부 임시 이름·대사) ---------- */
AU.NPCS = {
  porto_dock: { name: "니코스", sprite: "villager_a", portrait: "pt_villager_a", quests: ["q_s1_silver"],
    idle: ["쇳조각 얘기는 잔다리 골목의 정보상이 밝지. 은화는 챙겨 가게.", "부두는 새벽부터 바쁘다네."] },
  arche_guide: { name: "엘레니", sprite: "villager_a", portrait: "pt_villager_a", quests: [],
    idle: ["오늘도 평화로운 마을이에요.", "다친 곳은 없나요? 쉬어 가면서 하세요."] },
  porto_foreman: { name: "테오도로스", sprite: "porto_foreman", portrait: "pt_porto_foreman", quests: ["q_s1_test", "q_first", "q_forest", "q_guild_talk", "q_a1_fence", "q_a1_parcel", "q_a1_traces"],
    idle: ["방파제는 자네 덕에 한시름 놨네.", "바닷바람이 거세니 몸조심하게."] },
  porto_guild: { name: "다프네", sprite: "villager_b", portrait: "pt_villager_b", quests: ["q_guild_rats", "q_guild_crabs"],
    idle: ["선창 길드입니다. 의뢰가 필요하면 말씀하세요.", "오늘은 부두가 조용하군요."] },
  job_npc: { name: "레오니다스", sprite: "smith", portrait: "pt_smith", quests: ["q_job"],
    idle: ["10레벨이 되면 다시 오세요.", "준비가 되면 말을 걸어 주세요."] },
  porto_armor: { name: "이리스", sprite: "porto_armor", portrait: "pt_porto_armor", quests: [],
    idle: ["방어구는 몸에 맞는 게 제일이에요. 천천히 구경하세요.", "무기점 주인이 망치를 잡으면 저는 갑옷을 손봅니다."] },
  porto_general: { name: "페넬로페", sprite: "porto_general", portrait: "pt_porto_general", shop: "general",
    idle: ["어서 오세요. 모험에서 주워 온 재료, 제가 사들입니다.", "회복약도 있어요. 필요하면 말씀하세요."] },
  porto_smith: { name: "데메트리오스", sprite: "porto_smith", portrait: "pt_porto_smith", shop: "smith",
    idle: ["재료와 은화만 있으면 쓸 만한 장비를 만들어 드리죠.", "희귀한 재료는 늘 환영이오."] },
  guide_npc: { name: "알렉시오스", sprite: "baker", portrait: "pt_baker", special: "missionGuide",
    idle: ["모험은 잘 되어 가나요?"] }
};

/* ---------- 알림(기능 해금) ---------- */
AU.UNLOCKS = [
  { level: 2, text: "스탯창(S)에서 현재 능력치를 볼 수 있습니다." },
  { level: 4, text: "항구 길의 의뢰를 받을 수 있습니다. 선창 길드를 찾아보세요." },
  { level: 10, text: "전직 조건을 충족했습니다. 포르투 노바의 레오니다스에게 가 보세요." }
];

/* ---------- 현실 미션 (임시 목록, [미정]) ---------- */
// 'PERMA' 영역: P 긍정정서, E 몰입, R 긍정적 관계, M 의미, A 성취. 전투 스탯과 일대일로 묶지 않음.
// 쉬운 것(d1)부터 시작하고, d2는 같은 영역의 d1을 완료하면 열립니다. 성찰 질문·설명 팝업은 두지 않습니다.
AU.PERMA = { P: "긍정정서", E: "몰입", R: "긍정적 관계", M: "의미", A: "성취" };
AU.MISSIONS = [
  { id: "m_p1", perma: "P", d: 1, points: 1, title: "좋아하는 노래 한 곡 끝까지 듣기", desc: "하던 일을 잠시 멈추고, 좋아하는 노래 한 곡을 끝까지 들어 봅니다." },
  { id: "m_p2", perma: "P", d: 2, points: 2, title: "기분 좋아지는 일 하나 해 보기", desc: "산책, 간식, 취미 등 오늘 기분이 좋아질 만한 일을 하나 골라 해 봅니다.", pre: "m_p1" },
  { id: "m_e1", perma: "E", d: 1, points: 1, title: "10분 동안 한 가지에만 집중하기", desc: "휴대폰을 잠시 두고, 하나의 활동에 10분간 집중해 봅니다." },
  { id: "m_e2", perma: "E", d: 2, points: 2, title: "시간 가는 줄 모르는 활동 해 보기", desc: "빠져들 수 있는 활동을 골라 30분 이상 해 봅니다.", pre: "m_e1" },
  { id: "m_r1", perma: "R", d: 1, points: 1, title: "가까운 사람에게 안부 메시지 보내기", desc: "가족이나 친구 한 사람에게 짧은 안부를 보냅니다." },
  { id: "m_r2", perma: "R", d: 2, points: 2, title: "누군가와 함께 시간 보내기", desc: "가까운 사람과 식사나 통화 등 함께하는 시간을 가져 봅니다.", pre: "m_r1" },
  { id: "m_m1", perma: "M", d: 1, points: 1, title: "작은 도움 하나 건네기", desc: "주변 사람에게 부담 없는 작은 도움을 하나 건넵니다." },
  { id: "m_m2", perma: "M", d: 2, points: 2, title: "소중한 일에 시간 쓰기", desc: "내게 의미 있다고 느끼는 일에 20분을 써 봅니다.", pre: "m_m1" },
  { id: "m_a1", perma: "A", d: 1, points: 1, title: "미뤄 둔 작은 일 하나 끝내기", desc: "5분 안에 끝낼 수 있는 미뤄 둔 일을 하나 처리합니다." },
  { id: "m_a2", perma: "A", d: 2, points: 2, title: "목표 하나 정하고 시작해 보기", desc: "이번 주에 해 볼 작은 목표를 하나 정하고 첫 걸음을 뗍니다.", pre: "m_a1" }
];
/* 선택형 '쉼' 현실 미션: 피로도를 줄이는 짧은 휴식 활동(PERMA 마음 스탯과는 별개). 수치·목록은 임시, 하루에 같은 미션은 한 번 */
AU.REST_MISSIONS = [
  { id: "r_breath", title: "3분 호흡 가다듬기", desc: "편한 자세로 앉아 숨을 천천히 들이쉬고 내쉬며 3분을 보냅니다.", recover: 25 },
  { id: "r_stretch", title: "몸 풀기 스트레칭", desc: "자리에서 일어나 어깨와 목, 허리를 천천히 풀어 줍니다.", recover: 20 },
  { id: "r_water", title: "물 한 잔 마시며 쉬기", desc: "물이나 따뜻한 차를 한 잔 마시며 화면에서 눈을 뗍니다.", recover: 15 },
  { id: "r_walk", title: "10분 걷기", desc: "가까운 곳을 10분 정도 천천히 걸어 봅니다.", recover: 35 }
];
AU.MISSION_STATES = {
  locked: "미해금", available: "수행 가능", accepted: "수락", attempted: "시도", partial: "일부 수행", done: "완료", skipped: "건너뛰기"
};
