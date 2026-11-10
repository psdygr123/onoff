// 폭이 넓은 장애물(정식 그림 크기)을 점프로 올라서서 건너갈 수 있는지(윗면에 착지, 옆으로 튕겨 나가지 않음)
const { open, sleep } = require('./lib.js');
const R = []; const ok = (n, c, d) => { R.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  ' + d : '')); };
(async () => {
  const T = await open(); const { p, ev } = T; await T.fresh(); await T.start(); await T.idle();
  await ev(() => AU.Prologue.devJump(2)); await T.idle(); await sleep(800);
  const ob = await ev(() => AU.PRO_LAY.plaza.obst[0]); await ev((o) => { AU.World.player.x = o.x + o.w + 120; AU.World.player.y = 590; }, ob); await sleep(200);
  await p.keyboard.down('ArrowLeft'); let jumped = false, onTop = false, passed = false;
  for (let i = 0; i < 120; i++) { await sleep(40); const s = await ev(() => ({ x: AU.World.player.x, y: AU.World.player.y, g: AU.World.player.onGround }));
    if (!jumped && s.x < ob.x + ob.w + 60 && s.g) { await p.keyboard.down('Alt'); await sleep(30); await p.keyboard.up('Alt'); jumped = true; }
    if (s.g && Math.abs(s.y - ob.y) < 1 && s.x > ob.x && s.x < ob.x + ob.w) onTop = true;
    if (s.x < ob.x - 30 && s.g) { passed = true; break; } }
  await p.keyboard.up('ArrowLeft');
  ok('O01 장애물 윗면에 착지(옆으로 튕겨 나가지 않음)', onTop); ok('O02 윗면을 걸어 건너 반대편 바닥으로 내려옴', passed);
  ok('오류 없음', T.errs.length === 0, T.errs.join('|')); await T.b.close();
  const bad = R.filter((r) => !r[1]); console.log('\n합계 ' + (R.length - bad.length) + '/' + R.length + ' 통과'); process.exit(bad.length ? 1 : 0);
})();
