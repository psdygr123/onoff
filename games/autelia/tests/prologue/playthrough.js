const { open, sleep } = require('./lib.js');
(async () => {
  const T = await open(); const { p, ev } = T; const log = (...a) => console.log(...a); const t = {}; let tm = Date.now(); const lap = (n) => { t[n] = Math.round((Date.now() - tm) / 1000); tm = Date.now(); };
  // 막히면 점프하며 이동
  T.walkJ = async (x, tol = 14, max = 60000) => {
    const t0 = Date.now(); let last = -1e9, lastT = Date.now();
    while (Date.now() - t0 < max) {
      const s = await T.P(); if (s.cs || s.frozen) { if (SK && s.cs) await p.keyboard.press('Enter'); await sleep(100); continue; }
      const px = s.x; if (Math.abs(px - x) <= tol) break;
      const key = px < x ? 'ArrowRight' : 'ArrowLeft'; await p.keyboard.down(key);
      for (let i = 0; i < 12; i++) { await sleep(40); const q = await ev(() => ({ x: AU.World.player.x, g: AU.World.player.onGround, cs: !!AU.Prologue.cs, fr: AU.Prologue.frozen })); if (q.cs || q.fr) break; if (key === 'ArrowRight' ? q.x >= x - tol : q.x <= x + tol) break; }
      await p.keyboard.up(key);
      const q2 = await ev(() => AU.World.player.x);
      if (Math.abs(q2 - last) < 4 && Date.now() - lastT > 250) { // 막힘 → 점프
        await p.keyboard.down(key); await p.keyboard.down('Alt'); await sleep(120); await p.keyboard.up('Alt'); await sleep(700); await p.keyboard.up(key); lastT = Date.now(); }
      else if (Math.abs(q2 - last) >= 4) { last = q2; lastT = Date.now(); }
    }
    return ev(() => AU.World.player.x);
  };
  if (process.env.SKIP) { T.idle = async (max = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { const s = await T.P(); if (s.dlg) { await p.keyboard.press('Space'); await sleep(130); continue; } if (s.cs) { await p.keyboard.press('Enter'); await sleep(120); continue; } if (!s.frozen && s.fade < 0.05) return true; await sleep(100); } return false; }; }
  if (process.env.SKIP) { T.until = async (cond, max = 40000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if (await ev(cond, arg)) return true; const d = await ev(() => ({ dlg: !!AU.UI.dialog, cs: !!AU.Prologue.cs })); if (d.dlg) await p.keyboard.press('Space'); else if (d.cs) await p.keyboard.press('Enter'); await sleep(110); } return false; }; }
  const SK = !!process.env.SKIP; const SS = (n) => SK ? 0 : T.shot(n); T.shot = async (n) => { if (!SK) await p.screenshot({ path: (process.env.SHOTS || '/tmp/claude-0/shots') + '/' + n + '.png' }); };
  await T.fresh(); await T.start(); await T.idle();
  // ---- S1 ----
  await T.walk(900); await p.keyboard.press('Space'); await sleep(250); await T.dialogs(); await T.idle();
  await T.walk(640); await p.keyboard.press('Space'); await sleep(200);
  await T.walk(930); await p.keyboard.press('Space'); await T.until(() => !AU.Prologue.cs, 20000); await T.idle();
  await T.walk(1050); await p.keyboard.press('Space'); await T.until(() => AU.Prologue.v.done, 20000); await T.idle();
  await T.walk(960); await p.keyboard.press('Space'); await sleep(400); await T.dialogs(); await T.idle();
  await T.walk(1950, 12, 20000); await T.idle(); await T.walk(2400, 12, 40000); await T.idle(); log('S1 end', JSON.stringify(await T.P())); lap('S1');
  // ---- S2 ----
  await T.shot('r2_s2_start');
  await T.walk(1150, 12, 15000); log('limit test x=', (await T.P()).x, '(<=1000 expected)'); await T.shot('r2_s2_limit');
  await T.walk(360); log('elder prompt:', (await T.P()).prompt); await T.shot('r2_s2_elder'); await p.keyboard.press('Space'); await sleep(300); await T.shot('r2_s2_elder_dlg'); await T.dialogs(); await T.idle();
  await T.walk(620); log('child prompt:', (await T.P()).prompt); await p.keyboard.press('Space'); await sleep(300); await T.dialogs(); await T.idle();
  await T.walk(880); log('vendor prompt:', (await T.P()).prompt); await p.keyboard.press('Space'); await sleep(300); await T.shot('r2_s2_vendor'); await T.dialogs(); await T.idle(); log('after vendor', JSON.stringify(await T.P()));
  await T.walk(1245, 10, 20000); await sleep(1500); await T.shot('r2_s2_cs_a'); await sleep(3000); await T.shot('r2_s2_cs_b'); 
  await T.until(() => AU.Prologue.st().state === 'SCENE_03_ATTACK', 30000); await sleep(1200); await T.shot('r2_s3_a'); await T.idle(30000); log('S3 control', JSON.stringify(await T.P())); await T.shot('r2_s3_control'); lap('S2');
  // ---- S3 ----
  await T.walkJ(900, 14, 30000); await T.shot('r2_s3_stall'); log('after stall', JSON.stringify(await T.P()));
  await T.walkJ(60, 14, 40000); await T.idle(); log('road attack', JSON.stringify(await T.P())); await T.shot('r2_s3_road');
  await T.walkJ(300, 14, 60000); await T.idle(30000); log('house', JSON.stringify(await T.P())); lap('S3');
  // ---- S4 ----
  await T.shot('r2_s4_a'); await T.walkJ(500, 12, 15000); await sleep(3500); await T.shot('r2_s4_will_a'); await T.idle(60000); log('after will', JSON.stringify(await T.P())); await T.shot('r2_s4_after');
  await T.walk(420, 12, 15000); log('bag prompt', (await T.P()).prompt); await p.keyboard.press('Space'); await sleep(400); await T.shot('r2_s4_bag'); log('after bag', JSON.stringify(await T.P()));
  await T.walk(90, 12, 15000); await T.idle(30000); log('S5 start', JSON.stringify(await T.P())); lap('S4');
  // ---- S5 ----
  await T.shot('r2_s5_a'); await T.walkJ(1520, 14, 90000); await T.shot('r2_s5_mid'); await T.walkJ(2720, 14, 90000); await sleep(3000); await T.shot('r2_s5_vista'); await T.idle(30000);
  await T.walkJ(2950, 14, 30000); await sleep(3000); await T.shot('r2_s5_montage1'); await sleep(4000); await T.shot('r2_s5_montage2'); await sleep(4000); await T.shot('r2_s5_montage3');
  await T.until(() => AU.Prologue.st().state === 'SCENE_06_PORT_VIEW', 30000); lap('S5');
  // ---- S6 ----
  await sleep(6000); await T.shot('r2_s6_a'); await sleep(5000); await T.shot('r2_s6_b'); await T.until(() => !AU.Prologue.endEl.classList.contains('hidden'), 40000); await sleep(800); await T.shot('r2_end'); log('END', JSON.stringify(await T.P())); lap('S6');
  await p.click('#btn-main'); await sleep(1500); await T.shot('r2_main'); log('MAIN', JSON.stringify(await T.P()), JSON.stringify(await ev(() => ({ lv: AU.G.S.level, inv: AU.G.S.inv, map: AU.G.S.map, pro: AU.G.S.prologue })))); 
  log(JSON.stringify(t)); log(T.errs.join('\n') || 'no errors'); await T.b.close();
})().catch((e) => { console.log('FAIL', e); process.exit(1); });
