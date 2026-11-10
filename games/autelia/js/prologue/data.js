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
  AU.MAPS.pro_temple = Object.assign({}, base, { name: "아르케아 기념 신전 건축 현장", bg: "forest_road", width: 2000, platforms: ground(2000), start: 360 });          // BG-01 (임시: 숲길 그림 + 코드로 그린 건축 골조)
  AU.MAPS.pro_road   = Object.assign({}, base, { name: "아르케아 마을길", bg: "harbor_road", bgFlip: true, width: 2450, platforms: ground(2450), start: 90 });             // BG-02 (임시: 항구 길 그림 좌우 반전, 끝의 집이 주인공의 집)
  AU.MAPS.pro_plaza  = Object.assign({}, base, { name: "아르케아 축제 광장", bg: "plaza", width: 2484, platforms: ground(2484), start: 90 });                                // BG-03
  AU.MAPS.pro_house  = Object.assign({}, base, { name: "주인공의 집", bg: "storage", width: 1280, platforms: ground(1280), start: 170 });                                    // BG-04 (임시: 창고 그림)
  AU.MAPS.pro_escape = Object.assign({}, base, { name: "아르케아 외곽 탈출로", bg: "forest_road", width: 3000, start: 90,                                                      // BG-05
    platforms: [{ x: 0, y: G, w: 3000 }, { x: 630, y: 542, w: 100, h: 48 }, { x: 900, y: 520, w: 110, h: 70 }, { x: 1700, y: 530, w: 120, h: 60 }, { x: 2300, y: 520, w: 130, h: 70 }] });
  AU.MAPS.pro_hill   = Object.assign({}, base, { name: "포르투 노바 외곽 언덕", bg: "harbor", width: 1600, platforms: ground(1600), start: 420 });                              // BG-06 (임시: 항구 그림)
  // 맵 변형(BG-V01~V03)은 같은 배경·같은 지형 위에 코드로 연기·불길·잔해를 얹어 표현합니다.
  for (const id of Object.keys(AU.MAPS)) if (AU.MAPS[id].prologue) AU.MAPS[id].basePlatforms = AU.MAPS[id].platforms.slice();

  /* ---------- 화자(대사창 이름·초상화). 아버지·주민 초상화는 임시로 기존 그림 사용 ---------- */
  AU.PRO_SPEAKERS = {
    hero:   { name: "주인공", portrait: "pt_player_male" },
    father: { name: "아버지", portrait: "pt_smith" },
    vendor: { name: "빵을 나누는 주민", portrait: "pt_baker" },
    child:  { name: "축제 어린이", portrait: "pt_villager_b" },
    elder:  { name: "나이 든 주민", portrait: "pt_villager_a" },
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
    father3: [["father", "하하, 제법인데? 이젠 나보다 손이 빠르구나."], ["father", "처음엔 망치 하나 제대로 못 잡더니. 벌써 5년이나 지났네."], ["father", "네가 없었다면 이 신전도 제때 완성하지 못했을 거다."]],
    father4: [["father", "먼저 가서 축제를 즐기고 있거라. 연장을 정리하고 금방 뒤따라가마."]],
    vendor: [["vendor", "신전을 완성한 목수 아들이구나!"], ["vendor", "고생 많았어. 오늘만큼은 일 생각 말고 실컷 즐기렴."]],
    child: [["child", "저렇게 큰 신전을 정말 너희가 만든 거야?"], ["child", "나도 크면 저런 걸 만들어보고 싶어!"]],
    elder: [["elder", "전쟁이 끝난 지도 벌써 백 년이라니."], ["elder", "이제 우리 아이들은 전쟁을 모르고 살아가겠지."]],
    attack: [["resA", "불이야!"], ["resB", "신전이 불타고 있어!"], ["resC", "도망쳐! 무장한 놈들이 들어왔다!"]],
    hero_dad: [["hero", "아버지...!"]],
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
