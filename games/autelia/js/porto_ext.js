/* 포르투 노바 확장: 주택가 → 어시장 → 선착장 → (기존 중앙 부두) → 조선소를 가로로 이어 붙인 큰 항구 맵.
   기존 중앙 부두 좌표는 +OFF 만큼 오른쪽으로 밀렸고, 다른 맵의 포르투 출입구 좌표도 같이 옮깁니다. */
(function () {
  const BG = (n) => ({ path: "assets/bg/" + n + ".webp" });
  Object.assign(AU.ASSETS, {
    harbor_houses: BG("harbor_houses"), harbor_market: BG("harbor_market"), harbor_wharf: BG("harbor_wharf"), harbor_shipyard: BG("harbor_shipyard"), harbor_mid: BG("harbor_mid"),
    npc_fisher: { path: "assets/char/npc_fisher.webp" }, npc_sailor: { path: "assets/char/npc_sailor.webp" }, npc_porter: { path: "assets/char/npc_porter.webp" },
    npc_fishwife: { path: "assets/char/npc_fishwife.webp" }, npc_housewife: { path: "assets/char/npc_housewife.webp" }, npc_townsman: { path: "assets/char/npc_townsman.webp" },
    pt_npc_fisher: { path: "assets/portrait/npc_fisher.webp" }, pt_npc_sailor: { path: "assets/portrait/npc_sailor.webp" }, pt_npc_porter: { path: "assets/portrait/npc_porter.webp" },
    pt_npc_fishwife: { path: "assets/portrait/npc_fishwife.webp" }, pt_npc_housewife: { path: "assets/portrait/npc_housewife.webp" }, pt_npc_townsman: { path: "assets/portrait/npc_townsman.webp" }
  });
  const W = { houses: 1656, market: 1656, wharf: 1656, harbor: 2689, shipyard: 1656 };
  const OFF = W.houses + W.market + W.wharf, TOTAL = OFF + W.harbor + W.shipyard;
  AU.PORTO_OFF = OFF;
  const P = AU.MAPS.porto, sh = (x) => x + OFF;

  P.bgs = ["harbor_houses", "harbor_market", "harbor_wharf", "harbor_mid", "harbor_shipyard"]; P.bg = "harbor_houses"; P.width = TOTAL;
  P.platforms = [{ x: 0, y: 590, w: TOTAL }];
  P.portals = P.portals.map((p) => p.to === "harbor_road" ? p : p.to === "docks" ? Object.assign({}, p, { x: TOTAL - 470, label: "선창 창고 문" }) : Object.assign({}, p, { x: sh(p.x) }));
  // 오른쪽 끝 길: 2막을 위한 출입구만 마련(맵은 아직 없음) — 지나갈 수 없다는 안내만 나옴
  P.portals.push({ x: TOTAL - 70, to: "porto", toX: TOTAL - 70, label: "동쪽 길", lock: "이 길은 아직 이어지지 않았습니다. (다음 이야기에서 열립니다)" });
  P.npcs = P.npcs.map((n) => Object.assign({}, n, { x: sh(n.x) }));
  P.start = sh(P.start);
  P.area = { x: 78, y: 40, desc: "주택가·어시장·선착장·중앙 부두·조선소가 이어진 큰 항구도시입니다. 선창 길드와 부두 창고, 상점이 있습니다." };

  // 다른 맵에서 포르투로 들어오는 위치 옮기기
  const to = (id, from, now) => { for (const p of (AU.MAPS[id].portals || [])) if (p.to === "porto" && p.toX === from) p.toX = now; };
  to("general_store", 2430, sh(2430)); to("weapon_store", 370, sh(370)); to("guild_hall", 1736, sh(1736)); to("warehouse", 2080, sh(2080));
  to("docks", 2540, TOTAL - 470); to("jandari", 260, sh(260));

  // 새 주민: 오가며 일하는 사람들(patrol)과 말을 걸 수 있는 주민
  const L = (a, b) => ({ patrol: [a, b], speed: 34 });
  AU.NPCS.npc_fisher = { name: "마르코스", title: "어부", sprite: "npc_fisher", portrait: "pt_npc_fisher", idle: ["오늘은 청어가 잘 든다네.", "새벽 물때를 놓치면 하루 허탕이지.", "요즘 선창 외곽 쪽에서 이상한 소리가 들린다던데, 바다 일이나 잘 해야지."] };
  AU.NPCS.npc_sailor = { name: "야니스", title: "선원", sprite: "npc_sailor", portrait: "pt_npc_sailor", idle: ["다음 물때에 출항이오. 남쪽 항로는 파도가 거칠지.", "육지는 좋은데 오래 있으면 다리가 근질거려서 말이오."] };
  AU.NPCS.npc_porter = { name: "스텔리오스", title: "짐꾼", sprite: "npc_porter", portrait: "pt_npc_porter", idle: ["비켜 주시오, 무거운 짐이오!", "하루에 통을 쉰 개는 나르지. 어깨가 남아나질 않아."] };
  AU.NPCS.npc_fishwife = { name: "에피", title: "생선 장수", sprite: "npc_fishwife", portrait: "pt_npc_fishwife", idle: ["싱싱한 생선이 왔어요! 오늘 아침 배에서 막 내렸답니다.", "손님, 한 마리 어때요? 소금 간은 서비스예요."] };
  AU.NPCS.npc_housewife = { name: "조에", title: "주민", sprite: "npc_housewife", portrait: "pt_npc_housewife", idle: ["빨래가 마르기 좋은 날이에요.", "우리 동네는 조용해서 좋아요. 부두 쪽은 늘 시끄럽지만요."] };
  AU.NPCS.npc_townsman = { name: "니칸드로스", title: "주민", sprite: "npc_townsman", portrait: "pt_npc_townsman", idle: ["이 우물물이 마을에서 제일 시원하지.", "젊은이, 길드에 들렀나? 일거리는 거기 다 있다네."] };

  // 같은 그림을 쓰는 두 번째 인물: 이름·직업·말투를 따로 두고 키를 조금 달리해 같은 사람이 복제된 것처럼 보이지 않게 함(정식 새 그림이 오면 sprite·portrait만 바꿈)
  AU.NPCS.npc_sailor2 = { name: "리산드로스", title: "갑판장", sprite: "npc_sailor", portrait: "pt_npc_sailor", scale: 0.94, idle: ["밧줄 매듭이 느슨하면 배가 먼저 말해 주지. 꼭 확인하게.", "조선소 쪽 소리가 크지? 새 배가 올라가는 중이라네."] };
  AU.NPCS.npc_porter2 = { name: "아리스토스", title: "부두 짐꾼", sprite: "npc_porter", portrait: "pt_npc_porter", scale: 1.06, idle: ["이쪽 길은 짐수레가 많으니 조심하시오.", "창고로 가는 짐이라면 저쪽 큰 목조 건물이오."] };

  const add = (id, x, extra) => P.npcs.push(Object.assign({ id, x }, extra || {}));
  add("npc_housewife", 420); add("npc_townsman", 1180, L(900, 1500));
  add("npc_fishwife", 2500, L(2350, 2750)); add("npc_fisher", 2980, L(2800, 3200));
  add("npc_sailor", 3600, L(3450, 4000)); add("npc_porter", 4250, L(4050, 4850));
  add("npc_porter2", sh(2689) + 300, L(sh(2689) + 150, sh(2689) + 900)); add("npc_sailor2", sh(2689) + 1250, L(sh(2689) + 1000, sh(2689) + 1550));
})();
