/* 프롤로그 「빛의 축제, 그리고 잿더미」 데이터: 맵·아이템·대사·진행 상태 이름.
   배경은 이전 시제품의 그림을 임시로 재사용합니다(BG-01~06). 정식 그림이 오면 bg 키와 파일만 바꾸면 됩니다.
   대사·자막은 개발 요청서(통합 v1.0)의 문장을 그대로 사용합니다. 새로 만든 문장은 없습니다. */
window.AU = window.AU || {};
(function () {
  const G = AU.CONFIG.GROUND;

  /* ---------- 아이템: 본편에서도 유지(사라지면 안 됨) ---------- */
  AU.ITEMS.metal_fragment = { name: "의문의 금속 조각", type: "story", keep: true,
    desc: "은회색 흑철로 만들어진 낯선 조각. 부서진 단면에는 붉고 검은 결이 뒤엉켜 있다. 한쪽 구석에는 검은 물결 모양의 흠집이 새겨져 있다. 아버지가 남긴 마지막 유품." };
  AU.ITEMS.carpenter_bag = { name: "목수 도구 가방", type: "story", keep: true, desc: "목수 일에 쓰는 도구가 들어 있는 가방입니다." };

  /* ---------- 맵 (프롤로그 전용: 월드맵에는 표시하지 않음) ---------- */
  const base = { prologue: true, safe: true, ropes: [], portals: [], npcs: [], spawns: [] };
  const ground = (w) => [{ x: 0, y: G, w }];
  // 정식 그림(프롤로그 아트팩 변환본, tools/build_prologue_art.py). 폭은 이어붙인 결과 폭이며 artmeta.js에 기록됩니다.
  const AR = AU.PRO_ART || { bg: {}, ob: {}, ch: {} }, BW = (k, d) => AR.bg[k] || d;
  const bgKeys = { temple: "pb_temple", road: "pb_road", road_atk: "pb_road_atk", plaza: "pb_plaza", plaza_atk: "pb_plaza_atk", house: "pb_house", house_atk: "pb_house_atk", escape: "pb_escape", port: "pb_port", temple_fire: "pb_fire" };
  for (const [f, k] of Object.entries(bgKeys)) AU.ASSETS[k] = { path: "assets/prologue/bg/" + f + ".webp", optional: true };
  for (const f of Object.keys(AR.ob || {})) AU.ASSETS["po_" + f] = { path: "assets/prologue/ob/" + f + ".webp", optional: true };
  for (const [f, m] of Object.entries(AR.ch || {})) {
    AU.ASSETS["pc_" + f] = { path: "assets/prologue/ch/" + f + ".webp", frames: m.frames, optional: true };
    for (const n of Object.keys(m.separate || {})) AU.ASSETS["pc_" + f.split("_")[0] + "_" + n] = { path: "assets/prologue/ch/" + f.split("_")[0] + "_" + n + ".webp", optional: true };
  }
  // 추가 그림(2차 패키지, tools/build_prologue_art2.py): 장애물·이음 골조·초상화
  for (const f of ["obst_rock", "obst_log", "obst_burnt_beams", "joint_frame"]) AU.ASSETS["po_" + f] = { path: "assets/prologue/ob/" + f + ".webp", optional: true };
  for (const f of ["pt_pro_hero_m", "pt_pro_hero_f", "pt_pro_father", "pt_pro_elder", "pt_pro_baker", "pt_pro_child", "pt_pro_hero_m_surprised", "pt_pro_father_smile"]) AU.ASSETS[f] = { path: "assets/prologue/pt/" + f + ".webp", optional: true };
  AU.ASSETS.fx_fire = { path: "assets/prologue/fx/fire.webp", optional: true }; AU.ASSETS.fx_smoke = { path: "assets/prologue/fx/smoke.webp", optional: true };   // 불꽃 6프레임·연기 4프레임 스트립
  AU.PRO_GENDER = "m"; // 남(m)/여(f) 주인공 시트 선택(성별 선택 기능이 생기면 이 값만 바꿉니다)
  // 장면별 배치 좌표(그림이 바뀌면 여기만 고칩니다)
  const L = AU.PRO_LAY = {
    temple: { w: BW("temple", 1839), start: 250, pile: 470, father: 700, joint: 905, tx: 1215, tBase: 548, tW: 720, limit: 1720, exit: 1790, hammerAt: 1010 },
    road:   { w: BW("road", 2149), start: 90, doorX: 268, end: 2050, obst: [{ x: 800, y: 527, w: 190, h: 63 }, { x: 1270, y: 527, w: 190, h: 63 }], raiders: [[1150, 505, 1000, 1350], [1500, 500, 1350, 1750]] },
    plaza:  { w: BW("plaza", 1279), start: 90, elder: 240, child: 430, vendor: 790, limit: 950, center: 1030, exit: 70, tx: 640, tBase: 520, tW: 520, obst: [{ x: 690, y: 527, w: 190, h: 63 }] },
    house:  { w: BW("house", 1279), start: 170, father: 860, bag: 420, find: 470, exit: 100 },
    escape: { w: BW("escape", 3083), start: 90, recall: 1500, look: 2780, end: 3020 },
    hill:   { w: BW("port", 1849), start: 300 }
  };
  AU.MAPS.pro_temple = Object.assign({}, base, { name: "아르케아 기념 신전 건축 현장", bg: "pb_temple", width: L.temple.w, platforms: ground(L.temple.w), start: L.temple.start });          // BG-01
  AU.MAPS.pro_road   = Object.assign({}, base, { name: "아르케아 마을길", bg: "pb_road", bgAtk: "pb_road_atk", width: L.road.w, platforms: ground(L.road.w), start: L.road.start });   // BG-02 / BG-V01
  AU.MAPS.pro_plaza  = Object.assign({}, base, { name: "아르케아 축제 광장", bg: "pb_plaza", bgAtk: "pb_plaza_atk", width: L.plaza.w, platforms: ground(L.plaza.w), start: L.plaza.start });  // BG-03 / BG-V02
  AU.MAPS.pro_house  = Object.assign({}, base, { name: "주인공의 집", bg: "pb_house_atk", width: L.house.w, platforms: ground(L.house.w), start: L.house.start });                // BG-04(습격 상태)
  AU.MAPS.pro_escape = Object.assign({}, base, { name: "아르케아 외곽 탈출로", bg: "pb_escape", width: L.escape.w, start: L.escape.start,                                          // BG-05
    platforms: [{ x: 0, y: G, w: L.escape.w }, { x: 630, y: 524, w: 170, h: 66 }, { x: 960, y: 538, w: 200, h: 52 }, { x: 1700, y: 538, w: 200, h: 52 }, { x: 2300, y: 524, w: 170, h: 66 }] });   // 장애물(코드로 그린 쓰러진 나무·바위)은 흙길 위에 놓음
  AU.MAPS.pro_hill   = Object.assign({}, base, { name: "포르투 노바 외곽 언덕", bg: "pb_port", width: L.hill.w, platforms: ground(L.hill.w), start: L.hill.start });                    // BG-06
  // 맵 변형(BG-V01~V03)은 같은 배경·같은 지형 위에 코드로 연기·불길·잔해를 얹어 표현합니다.
  for (const id of Object.keys(AU.MAPS)) if (AU.MAPS[id].prologue) AU.MAPS[id].basePlatforms = AU.MAPS[id].platforms.slice();

  /* ---------- 화자(대사창 이름·초상화). 아버지·주민 초상화는 임시로 기존 그림 사용 ---------- */
  AU.PRO_SPEAKERS = {
    // portrait: 정식 초상화(2차 그림), alt: 정식 그림을 불러오지 못했을 때 쓰는 옛 초상화
    hero:   { name: "주인공", portrait: "pt_pro_hero_m", alt: "pt_player_male" },
    heroS:  { name: "주인공", portrait: "pt_pro_hero_m_surprised", alt: "pt_player_male" },     // 놀란 표정(여성형은 기본 표정으로 대체됨: Profile.apply)
    father: { name: "아버지", portrait: "pt_pro_father", alt: "pt_smith" },
    fatherS: { name: "아버지", portrait: "pt_pro_father_smile", alt: "pt_smith" },                // 미소
    vendor: { name: "빵을 나누는 주민", portrait: "pt_pro_baker", alt: "pt_baker" },
    child:  { name: "축제 어린이", portrait: "pt_pro_child", alt: "pt_villager_b" },
    elder:  { name: "나이 든 주민", portrait: "pt_pro_elder", alt: "pt_villager_a" },
    resA:   { name: "주민", portrait: "pt_villager_a" },
    resB:   { name: "주민", portrait: "pt_villager_b" },
    resC:   { name: "주민", portrait: "pt_baker" }
  };

  /* ---------- 자막·대사 (요청서 원문) ---------- */
  AU.PRO_TEXT = {
    cap1: ["빛의 승리 100년 후", "아르케아 마을"],
    cap2: ["빛의 승리 100주년.", "아르케아는 평화로운 미래를 축하하고 있었다."],
    cap6: ["대륙 서쪽 끝.", "중립 항구도시, 포르투 노바."],
    recall: "빛도 어둠도 닿지 않는 중립 구역으로 가야...",
    father1: [["father", "거기 있는 목재 좀 가져다주겠니? 이제 정말 마지막이구나."]],
    father2: [["father", "좋아. 이제 저 이음새만 고정하면 된다."]],
    father3: [["fatherS", "하하, 제법인데? 이젠 나보다 손이 빠르구나."], ["father", "처음엔 망치 하나 제대로 못 잡더니. 벌써 5년이나 지났네."], ["father", "네가 없었다면 이 신전도 제때 완성하지 못했을 거다."]],
    father4: [["father", "먼저 가서 축제를 즐기고 있거라. 연장을 정리하고 금방 뒤따라가마."]],
    vendor: [["vendor", "신전을 완성한 목수 아들이구나!"], ["vendor", "고생 많았어. 오늘만큼은 일 생각 말고 실컷 즐기렴."]],
    child: [["child", "저렇게 큰 신전을 정말 너희가 만든 거야?"], ["child", "나도 크면 저런 걸 만들어보고 싶어!"]],
    elder: [["elder", "전쟁이 끝난 지도 벌써 백 년이라니."], ["elder", "이제 우리 아이들은 전쟁을 모르고 살아가겠지."]],
    attack: [["resA", "불이야!"], ["resB", "신전이 불타고 있어!"], ["resC", "도망쳐! 무장한 놈들이 들어왔다!"]],
    hero_dad: [["heroS", "아버지...!"]],
    will: [["hero", "아버지...?"], ["hero", "아버지!"], ["father", "...왔구나."], ["hero", "말하지 마세요. 지금 사람을 불러올게요."], ["father", "아니... 시간이 없다."]],
    will2: [["father", "도망쳐라..."], ["hero", "그런 말 하지 마세요."], ["father", "이 조각을 들고..."], ["father", "빛도 어둠도 닿지 않는 중립 구역으로 가야... 안전해..."], ["hero", "아버지, 제발..."]],
    will3: [["hero", "...아버지?"]],
    last: [["hero", "...여기서부터 시작이야."]]
  };

  /* ---------- 목표 문구 ---------- */
  AU.PRO_OBJ = {
    s1_talk: "아버지에게 말을 걸어 보세요.", s1_lumber: "아버지에게 목재를 가져다주세요.", s1_joint: "신전의 이음새를 고정하세요.", s1_back: "아버지에게 돌아가세요.", s1_exit: "축제 광장으로 이동하세요.",
    s2_talk: "광장에서 주민과 이야기를 나눠 보세요.", s2_center: "광장 중앙으로 가 보세요.",
    s3_dad: "아버지를 찾아 돌아가세요.", s4_bag: "도구 가방을 챙겨 집을 빠져나가세요.", s4_exit: "집을 빠져나가세요.", s5_escape: "아르케아를 탈출하세요."
  };
})();
