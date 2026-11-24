/* 포르투 노바 NPC 전원 걷기 + 바로 앞에서만 멈춤 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fail = 0;
const T = (l, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + ' :: ' + JSON.stringify(d)); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => { AU.World.enterMap('porto', 100, true); });
  await sleep(200);
  const sp = await ev(() => AU.MAPS.porto.spots.map((s) => s.id)); T('포르투 노바 조사 지점(게시판·우물·생선·밧줄·닻·등대) 모두 삭제', !sp.includes('porto_anchor') && !sp.includes('porto_lamp') && !sp.includes('porto_rope'), sp);
  const all = await ev(() => AU.MAPS.porto.npcs.map((n) => ({ id: n.id, p: !!n.patrol })));
  T('포르투 노바 NPC 전원에 걷는 범위 있음', all.length >= 10 && all.every((n) => n.p), all.filter((n) => !n.p));
  // 플레이어를 멀리 두고 40초분 시뮬레이션: 모두 범위 안에서 한 번 이상 걷고 범위를 벗어나지 않음
  const r = await ev(() => { const W = AU.World, m = AU.MAPS.porto; W.player.x = 20; const st = m.npcs.map((n) => ({ n, x0: n.x, moved: 0, out: false, w: 0 }));
    for (let t = 0; t < 40 * 60; t++) { W.updateNpcs(1 / 60, false); for (const s of st) { s.moved = Math.max(s.moved, Math.abs(s.n.x - s.x0)); if (s.n.x < s.n.patrol[0] - 2 || s.n.x > s.n.patrol[1] + 2) s.out = true; if (s.n._walk) s.w++; } }
    return st.map((s) => ({ id: s.n.id, moved: Math.round(s.moved), out: s.out, w: s.w })); });
  T('40초 안에 모두 걸음', r.every((s) => s.w > 30), r.filter((s) => s.w <= 30));
  T('범위 밖으로 안 나감', r.every((s) => !s.out), r.filter((s) => s.out));
  const ov = await ev(() => { const W = AU.World, m = AU.MAPS.porto, n = m.npcs; W.player.x = 20; let minGap = 1e9;
    for (let t = 0; t < 120 * 60; t++) { W.updateNpcs(1 / 60, false); if (t % 10) continue; const x = n.map((q) => q.x).sort((a, b) => a - b); for (let i = 1; i < x.length; i++) minGap = Math.min(minGap, x[i] - x[i - 1]); } return Math.round(minGap); });
  T('2분 동안 주민끼리 최소 간격 130px 이상(겹침 없음)', ov >= 130, ov);
  // 가까이: 55 미만이면 멈춤, 100 떨어져 있으면 계속 걸음, 창이 열리면(blocked) 멈춤
  const c = await ev(() => { const W = AU.World, n = AU.MAPS.porto.npcs.find((q) => q.id === 'npc_townsman'); const res = {};
    n._go = true; n._tx = n.x + 150; n._v = 30; n._walk = true; W.player.x = n.x + 100; W.updateNpcs(1 / 60, false); res.far = n._walk;
    W.player.x = n.x + 40; W.updateNpcs(1 / 60, false); res.close = n._walk;
    W.player.x = n.x + 100; n._v = 30; n._go = true; W.updateNpcs(1 / 60, true); res.blocked = n._walk; return res; });
  T('100px 거리에서는 계속 걷는다', c.far === true, c);
  T('40px(바로 앞)에서는 멈춘다', c.close === false, c);
  T('대화·창이 열리면 멈춘다', c.blocked === false, c);
  await sleep(500); T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0);
})();
