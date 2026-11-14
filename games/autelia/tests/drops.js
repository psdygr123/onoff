/* 드롭 체계 시험: 바닥에 떨어짐 → Space로 줍기 → 판매·제작(마을만) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1', SH = (process.env.SHOTS || '/tmp/claude-0/shots') + '/';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  if (await p.$('#job-next')) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
  // 사냥터(숲길)로 이동
  await ev(() => { AU.World.enterMap('forest', 300, true); }); await sleep(300);
  const mapId = await ev(() => AU.World.mapId);
  note('D0', '숲길 입장', mapId === 'forest', mapId);
  // 여우 한 마리를 플레이어 앞에 세우고, 드롭 확률을 100%로 만들어 처치
  const r = await ev(() => {
    const W = AU.World, m = W.spawn('fox', W.player.x + 40, W.player.y, 100, 600, 'tst');
    m.d = Object.assign({}, m.d, { drops: [['fur', 1, 2, 2], ['fox_tail', 1]] });
    const before = Object.assign({}, AU.G.S.inv); W.killMonster(m);
    return { before, after: Object.assign({}, AU.G.S.inv), drops: W.drops.map((d) => d.id + '×' + d.n) };
  });
  note('D1', '처치하면 바닥에 아이템이 떨어짐(가방은 그대로)', r.drops.length === 2 && JSON.stringify(r.before) === JSON.stringify(r.after), JSON.stringify(r));
  await sleep(1500);
  const land = await ev(() => AU.World.drops.every((d) => d.onGround));
  note('D2', '떨어진 아이템이 바닥에 안착', land, String(land));
  await p.screenshot({ path: SH + 'drops_ground.png' });
  // 멀리 있으면 못 줍는다
  const far = await ev(() => { const W = AU.World; W.player.x = W.drops[0].x + 400; W.scan(); return { prompt: W.prompt, near: !!W.nearDrop }; });
  note('D3', '멀리서는 줍기 안내가 뜨지 않음', !far.near && !/줍기/.test(far.prompt), JSON.stringify(far));
  // 가까이 가서 Space
  const near = await ev(() => { const W = AU.World, d = W.drops[0]; W.player.x = d.x; W.player.y = d.gy; W.scan(); return { prompt: W.prompt, id: d.id }; });
  note('D4', '가까이 가면 “Space 줍기” 안내', /^Space 줍기: /.test(near.prompt), near.prompt);
  await p.keyboard.press('Space'); await sleep(200);
  const inv1 = await ev(() => ({ inv: Object.assign({}, AU.G.S.inv), left: AU.World.drops.length }));
  note('D5', 'Space로 줍자 가방에 들어가고 바닥에서 사라짐', inv1.left === 1 && (inv1.inv[near.id] || 0) >= 1, JSON.stringify(inv1));
  await ev(() => { const W = AU.World, d = W.drops[0]; W.player.x = d.x; W.scan(); W.pickupNear(); });
  const inv2 = await ev(() => Object.assign({}, AU.G.S.inv));
  note('D6', '나머지도 줍기: 가죽×2·꼬리털×1', (inv2.fur || 0) >= 2 && (inv2.fox_tail || 0) === 1, JSON.stringify(inv2));
  // 사라짐(90초) · 지도 이동 시 정리
  const exp = await ev(() => { const W = AU.World; W.drops.push({ id: 'fur', n: 1, x: W.player.x + 200, y: W.player.y, gy: W.player.y, vx: 0, vy: 0, age: 89.9, onGround: true }); W.updateDrops(0.5); return W.drops.length; });
  note('D7', '90초 지나면 사라짐', exp === 0, String(exp));
  const clr = await ev(() => { const W = AU.World; W.drops.push({ id: 'fur', n: 1, x: 10, y: 10, gy: 10, vx: 0, vy: 0, age: 0, onGround: true }); W.enterMap('forest', 300, true); return W.drops.length; });
  note('D8', '지도를 옮기면 바닥 아이템 정리', clr === 0, String(clr));
  // 희귀 드롭 그리기(오류 없는지) + 화면
  await ev(() => { const W = AU.World; W.spawnDrops({ x: W.player.x + 80, y: W.player.y, d: { h: 40, drops: [['fox_scarf', 1], ['fox_tail', 1], ['fur', 1]] } }); }); await sleep(1500);
  await p.screenshot({ path: SH + 'drops_rare.png' });
  // 마을 밖: 팔기·제작 불가
  await ev(() => { const G = AU.G; G.S.inv.fox_tail = 3; G.S.inv.fur = 8; G.S.silver = 100; });
  const unsafe = await ev(() => ({ sell: AU.G.sellItem('fox_tail', 1), craft: AU.G.craft('cr_fox_scarf'), tail: AU.G.S.inv.fox_tail, silver: AU.G.S.silver }));
  note('D9', '마을 밖에서는 판매·제작 거절', !unsafe.sell && !unsafe.craft && unsafe.tail === 3 && unsafe.silver === 100, JSON.stringify(unsafe));
  // 마을에서: 상인과 이야기해야 팔기·제작 가능
  await ev(() => AU.World.enterMap('porto', 300, true)); await sleep(300);
  const noNpc = await ev(() => ({ sell: AU.G.sellItem('fox_tail', 1), craft: AU.G.craft('cr_fox_scarf'), tail: AU.G.S.inv.fox_tail }));
  note('D10', '마을이어도 상인과 이야기하기 전에는 판매·제작 불가', !noNpc.sell && !noNpc.craft && noNpc.tail === 3, JSON.stringify(noNpc));
  const npcs = await ev(() => AU.MAPS.porto.npcs.map((n) => n.id + ':' + (AU.NPCS[n.id].shop || '-')).join(','));
  note('D10b', '포르투 노바에 잡화상인·무기상인 NPC', /porto_general:general/.test(npcs) && /porto_smith:smith/.test(npcs), npcs);
  await ev(() => AU.UI.talkNpc('porto_general')); await sleep(200);
  const dlg = await ev(() => Array.from(document.querySelectorAll('.choices button')).map((x) => x.textContent.trim()));
  note('D10c', '잡화상인 대화에 “사고 팔기” 선택지', dlg.some((t) => /사고 팔기/.test(t)), JSON.stringify(dlg));
  await ev(() => { const c = Array.from(document.querySelectorAll('.choices button')).find((x) => /사고 팔기/.test(x.textContent)); c.click(); }); await sleep(300);
  const shop1 = await ev(() => ({ win: AU.UI.curName, shop: AU.G.shop }));
  note('D10d', '상점 창이 열림', shop1.win === 'shop' && shop1.shop === 'general', JSON.stringify(shop1));
  await p.screenshot({ path: SH + 'shop_sell.png' });
  const art = await ev(() => ['porto_general', 'porto_smith', 'pt_porto_general', 'pt_porto_smith'].map((k) => k + ':' + AU.Img.has(k)).join(','));
  note('D10e', '상인 그림 4장이 불러와짐', !/false/.test(art), art);
  const safe = await ev(() => { const G = AU.G; const s0 = G.S.silver; const ok = G.sellItem('fox_tail', 1); return { ok, gain: G.S.silver - s0, tail: G.S.inv.fox_tail }; });
  note('D11', '잡화상인에게 판매: 은화 +10', safe.ok && safe.gain === 10 && safe.tail === 2, JSON.stringify(safe));
  const buy = await ev(() => { const G = AU.G; const s0 = G.S.silver, p0 = G.count('potion'); const ok = G.buyItem('potion', 2); return { ok, spent: s0 - G.S.silver, got: G.count('potion') - p0 }; });
  note('D11b', '회복약 2개 구매: 은화 -30', buy.ok && buy.spent === 30 && buy.got === 2, JSON.stringify(buy));
  const noCraft = await ev(() => AU.G.craft('cr_fox_scarf'));
  note('D11c', '잡화상인 앞에서는 제작 불가', noCraft === false, String(noCraft));
  await ev(() => AU.UI.close());
  const closed = await ev(() => AU.G.shop);
  note('D11d', '창을 닫으면 상점 상태 해제', closed === null, String(closed));
  await ev(() => { AU.G.S.silver = 100; });
  await ev(() => AU.UI.talkNpc('porto_smith')); await sleep(200);
  await ev(() => { Array.from(document.querySelectorAll('.choices button')).find((x) => /장비 만들기/.test(x.textContent)).click(); }); await sleep(300);
  await p.screenshot({ path: SH + 'shop_smith.png' });
  const cr = await ev(() => { const G = AU.G; const before = G.canCraft('cr_fox_scarf'); const ok = G.craft('cr_fox_scarf'); return { before, ok }; });
  note('D12', '재료가 모자라면(꼬리털 2<3) 제작 불가', cr.before === false && cr.ok === false, JSON.stringify(cr));
  await ev(() => { AU.G.S.inv.fox_tail = 3; AU.G.S.silver = 100; });
  const cr2 = await ev(() => { const G = AU.G; const ok = G.craft('cr_fox_scarf'); return { ok, scarf: G.S.inv.fox_scarf, fur: G.S.inv.fur, tail: G.S.inv.fox_tail, silver: G.S.silver }; });
  note('D12b', '무기상인에게서 제작: 재료·은화 차감, 장비 획득', cr2.ok && cr2.scarf === 1 && !cr2.fur && !cr2.tail && cr2.silver === 70, JSON.stringify(cr2));
  const noSell = await ev(() => AU.G.sellItem('snake_skin', 1)); await ev(() => AU.UI.close());
  note('D12c', '무기상인 앞에서는 재료 판매 불가', noSell === false, String(noSell));
  // 가방 화면: 팔기 버튼 없이 안내만, 제작법 탭
  await ev(() => { AU.G.S.inv.snake_skin = 5; AU.G.S.inv.rat_tooth = 3; AU.G.S.inv.crab_claw = 6; AU.G.S.inv.crab_shell = 2; AU.UI.tab.inv = 'bag'; AU.UI.selected.inv = 'snake_skin'; AU.UI.open('inventory'); }); await sleep(400);
  await p.screenshot({ path: SH + 'drops_bag.png' });
  const bag = await ev(() => ({ sellBtn: Array.from(document.querySelectorAll('button')).filter((x) => /팔기/.test(x.textContent)).length, note: /잡화상인/.test(document.body.textContent) }));
  note('D13', '가방에는 판매 버튼 없이 “잡화상인에게” 안내', bag.sellBtn === 0 && bag.note, JSON.stringify(bag));
  await ev(() => { AU.UI.tab.inv = 'craft'; AU.UI.renderWin(); }); await sleep(300);
  const recipes = await ev(() => ({ n: document.querySelectorAll('.recipe').length, dis: Array.from(document.querySelectorAll('.recipe button')).every((x) => x.disabled) }));
  note('D14', '제작법 탭: 레시피 3개, 상인 없이는 만들기 비활성', recipes.n === 3 && recipes.dis, JSON.stringify(recipes));
  note('Z', '오류 없음', errs.length === 0, JSON.stringify(errs));
  console.log('합계 ' + R.filter((r) => r.ok).length + '/' + R.length + ' 통과'); await b.close(); process.exit(R.every((r) => r.ok) ? 0 : 1);
})();
