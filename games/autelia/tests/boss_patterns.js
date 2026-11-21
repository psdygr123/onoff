/* 전투 시험: 맞는 중에도 몬스터 공격 진행 / 보스 다중 패턴·예고 / 피해 상한 / 처치 가능 시간
   (게임 시간은 updateMonsters(dt)를 직접 돌려 빠르게 진행하는 시뮬레이션이며 실제 키 입력 시험이 아님) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
  await ev(() => { AU.World.enterMap('forest', 300, true); }); await sleep(300);

  // B1: 일반 몬스터(여우)가 계속 맞는 중에도 공격(돌진)이 나간다
  const b1 = await ev(() => {
    const W = AU.World, pl = W.player; W.monsters = []; pl.invuln = 0;
    const m = W.spawn('fox', pl.x + 50, pl.y, 0, 5000, 'b1'); m.hp = m.maxHp = 99999; m.cd = 0; m.state = 'chase'; const seen = new Set();
    for (let i = 0; i < 240; i++) { pl.invuln = 9; AU.G.S.hp = 9999; if (i % 20 === 0) W.hurtMonster(m, 0.01, pl.dir, 120); W.updateMonsters(1 / 60); seen.add(m.state); }
    return [...seen];
  });
  note('B1', '맞는 중에도 몬스터가 준비→돌진까지 진행', b1.includes('windup') && b1.includes('lunge'), JSON.stringify(b1));

  // B2: 전직 시험 보스 패턴 3종 + 예고
  const sim = (type, lvl, hpFrac, secs) => ev(([type, lvl, hpFrac, secs]) => {
    const W = AU.World, pl = W.player, S = AU.G.S; W.monsters = []; W.projs = []; S.level = lvl; pl.x = 600; pl.dead = false; pl.invuln = 0;
    const m = W.spawn(type, pl.x + 200, pl.y, 0, 5000, 'bs'); m.hp = Math.round(m.maxHp * hpFrac); m.cd = 0; m.state = 'chase';
    const pats = {}, wts = {}; let proj = 0, ring = 0, last = '';
    for (let i = 0; i < secs * 60; i++) { pl.invuln = 9; S.hp = 99999; pl.x = 600; pl.y = m.y; W.updateMonsters(1 / 60); proj = Math.max(proj, W.projs.length); if (W.fx.some((f) => f.kind === 'ring')) ring++; W.fx = []; if (m.state === 'windup' && last !== 'windup') { pats[m.pat] = (pats[m.pat] || 0) + 1; wts[m.pat] = Math.min(wts[m.pat] || 9, m.wt); } last = m.state; }
    return { pats, wts, proj, ring };
  }, [type, lvl, hpFrac, secs]);
  const t1 = await sim('trial_boss', 10, 1, 60);
  note('B2', '전직 시험 움브라: 서로 다른 패턴 3종 이상 발동', ['lunge', 'slam', 'wave'].every((k) => t1.pats[k] > 0), JSON.stringify(t1.pats));
  note('B3', '모든 패턴 예고 0.5초 이상', Object.values(t1.wts).every((w) => w >= 0.5), JSON.stringify(t1.wts));
  note('B4', '충격파 투사체·내려치기 이펙트 생성', t1.proj > 0 && t1.ring > 0, 'proj=' + t1.proj + ' ring=' + t1.ring);
  const t2 = await sim('trial_boss', 10, 0.4, 60);
  note('B5', '체력 50% 이하에서 연속 돌진(chain) 추가', t2.pats.chain > 0, JSON.stringify(t2.pats));
  const u1 = await sim('umbra_boss', 10, 1, 60);
  note('B6', '최종 움브라도 패턴 3종 이상', ['lunge', 'slam', 'wave'].every((k) => u1.pats[k] > 0), JSON.stringify(u1.pats));

  // B7: 보스 피해 상한(최대 HP의 40%)
  const cap = await ev(() => { const W = AU.World, pl = W.player, S = AU.G.S; const m = W.spawn('umbra_boss', pl.x + 100, pl.y, 0, 5000, 'cap'); m.d = Object.assign({}, m.d, { atk: 99999 }); pl.invuln = 0; pl.dead = false; const mx = AU.G.d().maxHp; S.hp = mx; W.hurtPlayer(m, 1); return { dmg: mx - S.hp, mx, alive: !pl.dead }; });
  note('B7', '보스 한 번 피해는 최대 HP의 40% 이하(한 방에 안 죽음)', cap.alive && cap.dmg <= Math.round(cap.mx * 0.4) + 1, JSON.stringify(cap));

  // B8: 처치 가능: 현재 능력치(공 18, 실제 Lv10보다 약함)로 0.45초마다 기본 공격(적중 65%), 결의의 일격 없이 처치
  const kill = (type, lvl) => ev(([type, lvl]) => {
    const W = AU.World, pl = W.player, S = AU.G.S; W.monsters = []; W.projs = []; S.level = lvl; pl.dead = false; const m = W.spawn(type, pl.x + 90, pl.y, 0, 5000, 'k'); m.cd = 0; m.state = 'chase'; let t = 0, hits = 0; const atk = AU.G.d().atk;
    for (let i = 0; i < 300 * 60 && m.alive; i++) { t += 1 / 60; pl.invuln = 9; S.hp = 99999; pl.x = m.x - 90; pl.y = m.y; W.updateMonsters(1 / 60); if (i % 27 === 0 && (hits++ % 20) < 13) W.hurtMonster(m, 1, 1, 120); }
    return { alive: m.alive, sec: Math.round(t), atk, hpMax: m.maxHp };
  }, [type, lvl]);
  const k1 = await kill('trial_boss', 10), k2 = await kill('umbra_boss', 10);
  note('B8', '전직 시험 움브라 처치 가능(기본 공격만, 30~150초)', !k1.alive && k1.sec >= 30 && k1.sec <= 150, JSON.stringify(k1));
  note('B9', '최종 움브라 처치 가능(기본 공격만, 60~240초)', !k2.alive && k2.sec >= 60 && k2.sec <= 240, JSON.stringify(k2));
  note('B10', '콘솔·페이지 오류 없음', errs.length === 0, errs.join(' | ') || 'none');
  await b.close(); const f = R.filter((r) => !r.ok); console.log(f.length ? 'FAILED ' + f.map((r) => r.id).join(',') : 'ALL PASS'); process.exit(f.length ? 1 : 0);
})();
