const { open, sleep } = require('./lib.js');
const R = []; const ok = (n, c, d) => { R.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  ' + d : '')); };
(async () => {
  // ===== T18 장면 도중 저장 → 새로고침 → 이어하기 =====
  { const T = await open(); const { p, ev } = T;
    await T.fresh(); await T.start(); await T.idle();
    await ev(() => AU.Prologue.devJump(3)); await T.idle(); await T.walk(500, 12, 15000); await sleep(500); await T.idle(60000);
    let s = await T.P(); ok('T18a 유언 장면 후 조각 획득', s.inv.includes('metal_fragment') && s.flags.includes('metal_fragment_acquired'), s.inv);
    await ev(() => AU.G.save('test')); await p.reload(); await p.waitForSelector('#btn-start');
    const label = await p.textContent('#btn-start'); ok('T18b 제목 버튼이 프롤로그 이어하기 표기', /프롤로그 이어하기 \(장면 4 \/ 6\)/.test(label), label);
    await T.start(); await T.idle(); s = await T.P(); ok('T18c 장면 4 처음 위치에서 재개', s.st === 'SCENE_04_FATHER' && s.map === 'pro_house' && s.x < 250, JSON.stringify({ st: s.st, x: s.x, map: s.map }));
    ok('T18d 재진입 직후 장면 소유 아이템/플래그 초기화(중복 지급 방지)', !s.inv.includes('metal_fragment') && !s.flags.includes('metal_fragment_acquired'), s.inv + ' ' + s.flags);
    await T.walk(500, 12, 15000); await sleep(500); await T.idle(60000); await T.walk(420, 12, 15000); await p.keyboard.press('Space');
    for (let i = 0; i < 40; i++) { await sleep(150); if ((await T.P()).inv.includes('carpenter_bag')) break; } for (let i = 0; i < 40 && (await T.P()).cs; i++) await sleep(150); await sleep(200); // 가방 줍기 연출(걷기·무릎·들기·마무리) 종료 대기
    s = await T.P(); const inv = JSON.parse(s.inv); ok('T18e 다시 진행해도 조각/가방 각 1개', inv.metal_fragment === 1 && inv.carpenter_bag === 1, s.inv);
    // 장면 5 도중 저장 → 이전 장면 아이템 유지
    await ev(() => AU.Prologue.devJump(4)); await T.idle(); await ev(() => AU.G.save('test')); await p.reload(); await p.waitForSelector('#btn-start'); await T.start(); await T.idle(); s = await T.P();
    const inv5 = JSON.parse(s.inv); ok('T18f 장면 5 재개 시 이전 장면 아이템 유지', s.st === 'SCENE_05_ESCAPE' && inv5.metal_fragment === 1 && inv5.carpenter_bag === 1, s.inv + ' ' + s.st);
    ok('T18 오류 없음', T.errs.length === 0, T.errs.join('|')); await T.b.close(); }

  // ===== T20 기존(프롤로그 이전 v1) 저장 보존 =====
  { const T = await open(); const { p, ev } = T; await T.fresh();
    await ev(() => { const S = AU.newState(); delete S.prologue; S.v = 1; S.level = 5; S.exp = 120; S.silver = 345; S.map = 'forest'; S.x = 800; S.visited = { arche: true, forest: true }; S.inv = { potion: 3 }; S.job = 'apprentice'; AU.Store.set('autelia.save', S); });
    await p.reload(); await p.waitForSelector('#btn-start'); const label = await p.textContent('#btn-start'); ok('T20a 이어하기 표기', /이어하기 \(.*Lv\.5/.test(label), label);
    ok('T20b 프롤로그 다시 보기 버튼 존재', !!(await p.$('#btn-replay')));
    await T.start(); await sleep(400); let s = await ev(() => ({ lv: AU.G.S.level, exp: AU.G.S.exp, ag: AU.G.S.silver, map: AU.World.mapId, x: Math.round(AU.World.player.x), inv: AU.G.S.inv, pro: AU.G.S.prologue.state, on: AU.Prologue.on }));
    ok('T20c 레벨·경험치·은화·위치·소지품 유지, 프롤로그 완료로 간주', s.lv === 5 && s.exp === 120 && s.ag === 345 && s.map === 'forest' && Math.abs(s.x - 800) < 30 && s.inv.potion === 3 && s.pro === 'COMPLETED' && !s.on, JSON.stringify(s));
    // 다시 보기: 진행 기록 비파괴
    await ev(() => { AU.main.running = false; }); await p.reload(); await p.waitForSelector('#btn-replay'); await p.click('#btn-replay'); await sleep(300); await T.idle();
    await ev(() => AU.Prologue.devJump(3)); await T.idle(); await T.walk(500, 12, 15000); await sleep(500); await T.idle(60000);
    s = await ev(() => ({ lv: AU.G.S.level, inv: AU.G.S.inv, pro: AU.G.S.prologue.state, flags: Object.keys(AU.G.S.prologue.flags).length, map: AU.G.S.map, replay: AU.Prologue.replay }));
    ok('T20d 다시 보기 중 본 저장 데이터(레벨·소지품·완료 상태) 변하지 않음', s.lv === 5 && !s.inv.metal_fragment && s.inv.potion === 3 && s.pro === 'COMPLETED' && s.replay, JSON.stringify(s));
    await ev(() => AU.G.save('x')); const raw = await ev(() => AU.Store.get('autelia.save')); ok('T20e 다시 보기 중 저장해도 돌아갈 위치(forest)가 저장됨', raw.map === 'forest' && raw.prologue.state === 'COMPLETED', raw.map + ' ' + raw.prologue.state);
    ok('T20 오류 없음', T.errs.length === 0, T.errs.join('|')); await T.b.close(); }

  // ===== T21 메뉴/Esc/보조키 동작(프롤로그 중) =====
  { const T = await open(); const { p, ev } = T; await T.fresh(); await T.start(); await T.idle();
    await p.keyboard.press('Escape'); await sleep(200); let w = await ev(() => AU.UI.curName); ok('T21a 조작 가능 구간에서 Esc → 메뉴 열림', w === 'menu', 'cur=' + w); await p.keyboard.press('Escape'); await sleep(150);
    // 컷신 중 Esc/Ctrl/Alt 무시
    await ev(() => AU.Prologue.devJump(1)); await T.idle(); await T.walk(790); await p.keyboard.press('Space'); await sleep(300); await T.dialogs(); await T.idle(); await T.walk(1045, 10, 30000); await sleep(1200);
    const cs = await ev(() => !!AU.Prologue.cs); await p.keyboard.press('Escape'); await p.keyboard.press('Control'); await p.keyboard.press('Alt'); await sleep(200);
    const cur = await ev(() => AU.UI.curName); ok('T21b 컷신 중 Esc/Ctrl/Alt가 아무 창도 열지 않음', cs && !cur, 'cs=' + cs + ' cur=' + cur);
    ok('T21 오류 없음', T.errs.length === 0, T.errs.join('|')); await T.b.close(); }

  // ===== T22 플랫폼 임베드(postMessage) =====
  { const T = await open(); const { p } = T;
    await p.goto('http://localhost:8802/harness.html'); await sleep(3000); const fr = p.frames().find((f) => /8801/.test(f.url())); const ns = await fr.evaluate(() => AU.Store.ns); ok('T22a init 수신 후 저장 칸 이름 설정', ns === 'onoff:test-user-1', ns);
    await fr.click('#btn-start'); await sleep(300); await T.setup(fr); await sleep(1200); const msgs = await p.evaluate(() => window.msgs.map((m) => m.type + ':' + JSON.stringify(m.payload || '')));
    ok('T22b ready 전송', msgs.some((m) => m.startsWith('ready')), msgs.join(' | ')); ok('T22c progress에 프롤로그 장면 표기', msgs.some((m) => /progress:.*프롤로그 · 장면 1\/6/.test(m)), msgs.join(' | '));
    ok('T22 오류 없음', T.errs.length === 0, T.errs.join('|')); await T.b.close(); }

  // ===== T23 창 크기 변경 =====
  { const T = await open({ viewport: { width: 1280, height: 720 } }); const { p, ev } = T; await T.fresh(); await T.start(); await T.idle();
    for (const [w, h, n] of [[800, 600, 'r800'], [1920, 1080, 'r1920'], [600, 900, 'r600']]) { await p.setViewportSize({ width: w, height: h }); await sleep(400); const sc = await ev(() => AU.main.scale); const r = await ev(() => { const b = document.getElementById('stage').getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height, iw: innerWidth, ih: innerHeight }; });
      ok('T23 ' + w + 'x' + h + ' 무대가 창 안에 맞게 표시', r.l >= -1 && r.t >= -1 && r.l + r.w <= r.iw + 1 && r.t + r.h <= r.ih + 1, JSON.stringify(r)); await T.shot('t23_' + n); }
    await p.setViewportSize({ width: 1280, height: 720 }); ok('T23 오류 없음', T.errs.length === 0, T.errs.join('|')); await T.b.close(); }

  console.log('\n' + R.filter((r) => r[1]).length + '/' + R.length + ' 통과');
})().catch((e) => { console.log('FAIL', e); process.exit(1); });
