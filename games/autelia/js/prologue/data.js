/* 프롤로그 「빛의 축제, 그리고 무너진 신전」 데이터: 맵·아이템·대사·진행 상태 이름.
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
  // 목공 동작 시트(새 그림): 목재 안아 들기·건네기·망치 내리치기 (주인공 남/여, 아버지). tools로 만든 변환본이라 메타를 여기서 등록
  AR.ch = AR.ch || {};
  AR.ch.player_m_work = { frames: 4, names: ["carry", "give", "swing_up", "swing_dn"], separate: {}, cw: 300, ch: 330, standH: 300, foot: 150 };
  AR.ch.player_f_work = { frames: 4, names: ["carry", "give", "swing_up", "swing_dn"], separate: {}, cw: 300, ch: 345, standH: 300, foot: 150 };
  AR.ch.player_m_bag = { frames: 7, names: ["stand", "walk1", "walk2", "walk3", "walk4", "jump_up", "jump_down"], separate: {}, cw: 210, ch: 310, standH: 300, foot: 105 };   // 가방을 멘 이동 시트(남)
  AR.ch.player_f_bag = { frames: 7, names: ["stand", "walk1", "walk2", "walk3", "walk4", "jump_up", "jump_down"], separate: {}, cw: 210, ch: 310, standH: 300, foot: 105 };   // 가방을 멘 이동 시트(여)
  AR.ch.raider_officer_walk = { frames: 4, names: ["walk1", "pass1", "walk2", "pass2"], separate: {}, cw: 193, ch: 250, standH: 249, foot: 248 };   // 간부 걷기(가슴에 작은 검은 고리 문장, 확정 34)
  for (const [w, cw, ch] of [["axe", 198, 295], ["spear", 199, 301], ["mace", 206, 295]]) AR.ch["raider_" + w + "_walk"] = { frames: 4, names: ["walk1", "pass1", "walk2", "pass2"], separate: {}, cw, ch, standH: ch - 1, foot: ch - 2 };   // 습격자 병사 걷기
  AR.ch.raider_officer = { frames: 3, names: ["raise", "slash", "ready"], separate: {}, cw: 384, ch: 299, standH: 250, foot: 294 };   // 간부의 검 동작(준비·치켜듦·내리침)
  AR.ch.father_hit = { frames: 3, names: ["guard", "hit", "fall"], separate: {}, cw: 277, ch: 284, standH: 275, foot: 279 };   // 아버지가 막아서고 맞고 무너지는 동작
  for (const [w, ch] of [["axe", 300], ["spear", 306], ["mace", 300]]) AR.ch["raider_" + w] = { frames: 3, names: ["stand", "walk1", "walk2"], separate: {}, cw: 240, ch, standH: 295, foot: ch - 5 };   // 습격자 무기 변형(도끼·창·철퇴). 허리 검을 찬 기본형은 raider_actions
  AR.ch.player_m_climb = { frames: 4, names: ["up1", "up2", "up3", "up4"], separate: {}, cw: 210, ch: 310, standH: 300, foot: 5 };   // 밧줄 오르내리기(뒷모습 4단계, 남)
  AR.ch.player_f_climb = { frames: 4, names: ["up1", "up2", "up3", "up4"], separate: {}, cw: 210, ch: 310, standH: 300, foot: 5 };   // 밧줄 오르내리기(뒷모습 4단계, 여)
  AR.ch.player_m_combat = { frames: 6, names: ["attack1", "attack2", "strike", "spin", "hurt", "down"], separate: {}, cw: 463, ch: 394, standH: 300, foot: 231 };   // 본편 전투 동작
  AR.ch.player_f_combat = { frames: 6, names: ["attack1", "attack2", "strike", "spin", "hurt", "down"], separate: {}, cw: 453, ch: 389, standH: 300, foot: 226 };
  AR.ch.father_work = { frames: 4, names: ["reach", "hold", "walk1", "walk2"], separate: {}, cw: 300, ch: 330, standH: 300, foot: 150 };
  for (const [k, cw, ch] of [["a", 186, 300], ["b", 188, 303], ["c", 156, 297], ["d", 199, 317], ["e", 148, 275], ["f", 160, 293], ["g", 160, 265], ["h", 138, 262], ["i", 220, 321], ["j", 148, 293], ["k", 156, 287], ["l", 111, 210], ["m", 182, 299]]) AR.ch["villager_" + k + "_walk"] = { frames: 4, names: ["walk1", "pass1", "walk2", "pass2"], separate: {}, cw, ch, standH: ch - 1, foot: ch - 2 };   // 마을 주민 걷기 시트(걷기 4칸)
  // 달리기 시트(정식 그림이 오면 자동 사용 · 없으면 걷기 그림을 빠르게 재생): 칸 크기·발 위치는 이동 시트(걷기)와 같게 맞춘 6프레임(run1~run6)
  for (const g of ["m", "f"]) if (AR.ch["player_" + g + "_locomotion"]) AR.ch["player_" + g + "_run"] = Object.assign({}, AR.ch["player_" + g + "_locomotion"], { frames: 6, names: ["run1", "run2", "run3", "run4", "run5", "run6"] });
  for (const [f, m] of Object.entries(AR.ch || {})) {
    AU.ASSETS["pc_" + f] = { path: "assets/prologue/ch/" + f + ".webp", frames: m.frames, optional: true };
    for (const n of Object.keys(m.separate || {})) AU.ASSETS["pc_" + f.split("_")[0] + "_" + n] = { path: "assets/prologue/ch/" + f.split("_")[0] + "_" + n + ".webp", optional: true };
  }
  // 쓰러진 아이(정식 그림이 오면 자동 사용, 없으면 임시 표시): kid_down=누운 모습, kid_run1/2=일으켜 세운 뒤 달려가는 모습
  for (const f of ["kid_down", "kid_run1", "kid_run2"]) AU.ASSETS["pc_" + f] = { path: "assets/prologue/ch/" + f + ".webp", optional: true };
  // 추가 그림(2차 패키지, tools/build_prologue_art2.py): 장애물·이음 골조·초상화
  for (const f of ["obst_rock", "obst_log", "obst_burnt_beams", "joint_frame", "monument", "flagpole", "flag_0", "flag_1", "flag_2"]) AU.ASSETS["po_" + f] = { path: "assets/prologue/ob/" + f + ".webp", optional: true };
  for (const f of ["pt_pro_hero_m", "pt_pro_hero_f", "pt_pro_father", "pt_pro_elder", "pt_pro_baker", "pt_pro_child", "pt_pro_hero_m_surprised", "pt_pro_hero_f_surprised", "pt_pro_father_smile", "pt_pro_farmer", "pt_pro_priest", "pt_pro_musician", "pt_pro_scribe", "pt_pro_traveler", "pt_pro_florist", "pt_pro_officer", "pt_pro_raider"]) AU.ASSETS[f] = { path: "assets/prologue/pt/" + f + ".webp", optional: true };
  AU.ASSETS.fx_fire = { path: "assets/prologue/fx/fire.webp", optional: true }; AU.ASSETS.fx_smoke = { path: "assets/prologue/fx/smoke.webp", optional: true };   // 불꽃 6프레임·연기 4프레임 스트립
  AU.PRO_GENDER = "m"; // 남(m)/여(f) 주인공 시트 선택(성별 선택 기능이 생기면 이 값만 바꿉니다)
  // 장면별 배치 좌표(그림이 바뀌면 여기만 고칩니다)
  const L = AU.PRO_LAY = {
    temple: { w: BW("temple", 1839), start: 250, pile: 470, father: 700, joint: 905, tx: 1215, tBase: 548, tW: 720, limit: 1720, exit: 1790, hammerAt: 1010 },
    road:   { w: BW("road", 2149), start: 90, doorX: 268, end: 2050, m: { start: 300, farmer: 820, child: 560, baker: 1080, elder: 1320, priest: 1550, stele: 1700, limit: 1780 }, b: { elder: 430, musician: 640, baker: 1000, scribe: 1520, poles: [800, 1300, 1750], limit: 2050 }, obst: [{ x: 540, y: 527, w: 190, h: 63 }, { x: 1330, y: 527, w: 190, h: 63 }], raiders: [[1150, 505, 1000, 1350], [1500, 500, 1350, 1750]] },
    plaza:  { w: BW("plaza", 2160), start: 120, elder: 380, child: 640, vendor: 1700, limit: 1860, center: 1080, exit: 70, tx: 1080, tBase: 520, tW: 520, obst: [{ x: 780, y: 527, w: 190, h: 63 }, { x: 1640, y: 527, w: 170, h: 63 }] },   // 와이드 광장(2160px): 신전·이벤트 지점이 맵 정중앙(1080)
    house:  { w: BW("house", 1279), start: 170, father: 860, bag: 420, find: 470, exit: 100 },
    escape: { w: BW("escape", 3083), start: 90, recall: 1500, look: 2780, end: 3020 },
    hill:   { w: BW("port", 1849), start: 300 }
  };
  AU.MAPS.pro_temple = Object.assign({}, base, { name: "아르케아 기념 신전 건축 현장", bg: "pb_temple", width: L.temple.w, platforms: ground(L.temple.w), start: L.temple.start });          // BG-01
  AU.MAPS.pro_road   = Object.assign({}, base, { name: "아르케아 마을길", bg: "pb_road", bgAtk: "pb_road_atk", width: L.road.w, platforms: ground(L.road.w), start: L.road.start });   // BG-02 / BG-V01
  AU.MAPS.pro_plaza  = Object.assign({}, base, { name: "아르케아 축제 광장", bg: "pb_plaza", bgAtk: "pb_plaza_atk", width: L.plaza.w, platforms: ground(L.plaza.w), start: L.plaza.start });  // BG-03 / BG-V02
  AU.MAPS.pro_house  = Object.assign({}, base, { name: "주인공의 집", bg: "pb_house_atk", width: L.house.w, platforms: ground(L.house.w), start: L.house.start });                // BG-04(습격 상태)
  AU.MAPS.pro_escape = Object.assign({}, base, { name: "아르케아 외곽 탈출로", bg: "pb_escape", width: L.escape.w, start: L.escape.start,                                          // BG-05
    platforms: [{ x: 0, y: G, w: L.escape.w }, { x: 560, y: 524, w: 170, h: 66 }, { x: 1230, y: 538, w: 200, h: 52 }, { x: 1930, y: 538, w: 200, h: 52 }, { x: 2600, y: 524, w: 170, h: 66 }] });   // 장애물(코드로 그린 쓰러진 나무·바위)은 흙길 위에 놓음
  AU.MAPS.pro_hill   = Object.assign({}, base, { name: "포르투 노바 외곽 언덕", bg: "pb_port", width: L.hill.w, platforms: ground(L.hill.w), start: L.hill.start });                    // BG-06
  // 맵 변형(BG-V01~V03)은 같은 배경·같은 지형 위에 코드로 연기·불길·잔해를 얹어 표현합니다.
  for (const id of Object.keys(AU.MAPS)) if (AU.MAPS[id].prologue) AU.MAPS[id].basePlatforms = AU.MAPS[id].platforms.slice();

  /* ---------- 화자(대화창 이름·초상화). 아버지·주민 초상화는 임시로 기존 그림 사용 ---------- */
  AU.PRO_SPEAKERS = {
    // portrait: 정식 초상화(2차 그림), alt: 정식 그림을 불러오지 못했을 때 쓰는 옛 초상화
    hero:   { name: "주인공", portrait: "pt_pro_hero_m", alt: "pt_player_male" },
    heroS:  { name: "주인공", portrait: "pt_pro_hero_m_surprised", alt: "pt_player_male" },     // 놀란 표정(여성형은 pt_pro_hero_f_surprised: Profile.apply)
    officer: { name: "???", portrait: "pt_pro_officer" },
    raider: { name: "???", portrait: "pt_pro_raider" },
    father: { name: "아버지", portrait: "pt_pro_father", alt: "pt_smith" },
    fatherS: { name: "아버지", portrait: "pt_pro_father_smile", alt: "pt_smith" },                // 미소
    vendor: { name: "소피아", portrait: "pt_pro_baker", alt: "pt_baker" },
    child:  { name: "야니스", portrait: "pt_pro_child" },
    elder:  { name: "마노스", portrait: "pt_pro_elder", alt: "pt_villager_a" },
    traveler: { name: "먼 마을에서 온 할머니", portrait: "pt_pro_traveler", alt: "pt_villager_a" },   // 광장 전용 인물(그림 도착 전에는 기존 주민 얼굴로 대체)
    florist:  { name: "꽃 심부름 온 사내아이", portrait: "pt_pro_florist", alt: "pt_villager_b" },
    stele:  { name: "기념비", portrait: "po_monument" },
    farmer: { name: "스타브로스", portrait: "pt_pro_farmer" }, priest: { name: "신관", portrait: "pt_pro_priest" }, musician: { name: "악사", portrait: "pt_pro_musician" }, scribe: { name: "서기", portrait: "pt_pro_scribe" },
    resA:   { name: "주민", portrait: "pt_villager_a" },
    resB:   { name: "주민", portrait: "pt_villager_b" },
    resC:   { name: "주민", portrait: "pt_baker" }
  };

  /* ---------- 자막·대사 (요청서 원문) ---------- */
  AU.PRO_TEXT = {
    cap1: ["빛의 승리 천 년 후", "아르케아 마을"],
    cap2: ["빛의 승리 천 년 기념제.", "아르케아는 평화로운 미래를 축하하고 있었다."],
    cap6: ["대륙 서쪽 끝.", "중립 항구도시, 포르투 노바."],
    recall: "빛도 어둠도 닿지 않는 중립 구역으로 가야...",
    father1: [["father", "거기 있는 목재 좀 가져다주겠니? 이제 정말 마지막이구나."]],
    father2: [["father", "좋아. 이제 저 이음새만 고정하면 된다."]],
    father3: [["fatherS", "하하, 제법인데? 이젠 나보다 손이 빠르구나."], ["father", "처음엔 망치 하나 제대로 못 잡더니. 벌써 5년이나 지났네."], ["father", "무엇이든 결을 읽어야 한다. 힘으로만 누르면 부러지지."], ["father", "네가 없었다면 이 신전도 제때 완성하지 못했을 거다."]],
    father4: [["father", "먼저 가서 축제를 즐기고 있거라. 연장을 정리하고 금방 뒤따라가마."]],
    vendor: [["vendor", "신전을 완성한 목수네 {자녀}이구나!"], ["vendor", "고생 많았어. 오늘만큼은 일 생각 말고 실컷 즐기렴."]],                                                       // 빵 장수를 처음 만나는 경우(마을길에서 말을 안 건 경우)
    vendor2: [["vendor", "또 만났구나! 아침에도 저녁에도 봤는데, 신전 앞에서 보니 더 반갑네."], ["vendor", "신전이 정말 다 올라갔어. {성별:사내 녀석이|아가씨가} 큰일을 해냈구나. 목수네 {자녀} 덕이지."], ["vendor", "고생 많았어. 오늘만큼은 일 생각 말고 실컷 즐기렴."]],   // 마을길에서 이미 두 번 인사했으면 첫인사를 반복하지 않음
    vendor1: [["vendor", "어서 와라, 아침에 인사했던 목수네 {자녀}! 드디어 신전이 다 올라갔구나."], ["vendor", "{성별:사내 녀석이|아가씨가} 큰일을 해냈어. 고생 많았다. 오늘만큼은 일 생각 말고 실컷 즐기렴."]],
    child: [["child", "저렇게 큰 신전을 정말 네가 만든 거야?"], ["child", "나도 크면 저런 걸 만들어보고 싶어!"]],
    elder: [["elder", "전쟁이 끝난 지도 벌써 천 년이라니."], ["elder", "이제 우리 아이들은 어둠을 옛이야기로만 알고 살아가겠지."]],
    plaza_traveler: [["traveler", "먼 마을에서 구경하러 왔는데, 이 신전이 제일 크다고들 하더구나."], ["traveler", "우리 마을에서도 천 년 기념 신전을 짓고 있지만, 이렇게 아름다운 곳은 처음 보는구나."], ["traveler", "요즘은 길드에 들어가 모험가가 되는 아이들도 많다더구나. 다섯 용사처럼 되고 싶은 게지."]],
    plaza_florist: [["florist", "축제 날에는 신전 앞에 꽃을 놓는 게 이 마을 풍습이래요!"], ["florist", "저도 엄마 심부름으로 꽃을 가져왔어요. 오늘은 정말 신나는 날이에요!"]],
    order: [["officer", "이 마을 어딘가에 용사의 후예가 숨어 있다. 낙인을 가진 자를 찾아내라."], ["officer", "빛의 신전을 무너뜨려라. 눈에 띄는 자는 하나도 살려 두지 마라. 불을 질러라!"]],
    attack: [["resA", "불이야!"], ["resB", "신전이 불타고 있어!"], ["resC", "도망쳐! 무장한 놈들이 들어왔다!"], ["raider", "불을 질러라! 이 마을에 용사의 피가 숨어 있다!"]],
    hero_dad: [["heroS", "아버지...!"]],
    will: [["hero", "아버지...?"], ["hero", "아버지!"], ["father", "...괜찮니, 내 {자녀}야."], ["hero", "말하지 마세요. 지금 사람을 불러올게요."], ["father", "아니... 시간이 없다."]],
    officer: [["officer", "...낙인이군. 천 년을 숨어 산 용사의 피가 정말 여기 있었나."], ["heroS", "당신들이... 아버지를!"], ["officer", "그 늙은이의 핏줄이로군. 용사의 후예는 한 명도 남기지 않는다. 여기서 끝내 주마."]],
    officer2: [["officer", "...잘 가라, 목수의 {자녀}."]],
    officer2b: [["father", "...내 {자녀}에게... 손대지 마라!"]],
    officer3: [["officer", "...쓸데없는 짓을."], ["raider", "대장, 불길이 번집니다!"], ["officer", "...가자. 도망쳐 봐라, 목수의 {자녀}. 그 피가 이어지는 한 우리는 반드시 다시 만난다."]],
    will_brand: [["father", "이 조각은... 천 년 전, 우리 선조들이 어둠을 봉인할 때 쓰인 봉인석의 조각이다."], ["hero", "봉인...석? 선조라니, 아버지, 그게 무슨..."], ["father", "우리는... 다섯 용사의 피를 이은 후예다."], ["father", "내 손목에 새겨진 이 검은 고리 낙인이 그 증거다."], ["father", "천 년을 숨어 살았는데... 그들이 끝내 우리를 찾아냈구나. 미안하다... 숨기지 못해서."]],
    will2: [["father", "도망쳐라..."], ["hero", "그런 말 하지 마세요."], ["father", "이 조각을 들고..."], ["father", "빛도 어둠도 닿지 않는 중립 구역으로 가야... 안전해..."], ["hero", "아버지, 제발..."]],
    will3: [["hero", "...아버지?"]],
    brand_hero: [["hero", "(...어? 손목이...)"], ["hero", "(희미한 검은 고리가 비친다. 아버지 손목에 있던 고리와 같다.)"], ["hero", "(...나한테도 있었던 거야?)"]],
    last: [["hero", "(...여기서부터 시작이야.)"]]
  };

  /* ---------- 목표 문구 ---------- */
  AU.PRO_OBJ = {
    s0_walk: "마을길을 따라 걸어 보세요. 길 끝에 기념비가 있습니다.", s0_stele: "길 끝의 기념비를 읽어 보세요.", s0_exit: "신전 건축 현장으로 이동하세요.",
    s1b_talk: "마을 사람에게 말을 걸어 보세요.", s1b_flags: "깃대에 축제 깃발을 달아 주세요. ({n}/3)", s1b_exit: "축제 광장으로 이동하세요.",
    s1_talk: "아버지에게 말을 걸어 보세요.", s1_lumber: "아버지에게 목재를 가져다주세요.", s1_joint: "신전의 이음새를 고정하세요.", s1_back: "아버지와 신전 만들기를 마무리하세요.", s1_exit: "축제 광장으로 이동하세요.",
    s2_talk: "광장에서 주민과 이야기를 나눠 보세요.", s2_center: "광장 중앙으로 가 보세요.",
    s3_dad: "아버지를 찾아 돌아가세요.", s4_bag: "도구 가방을 챙겨 집을 빠져나가세요.", s4_exit: "집을 빠져나가세요.", s5_escape: "아르케아를 탈출하세요."
  };
})();
