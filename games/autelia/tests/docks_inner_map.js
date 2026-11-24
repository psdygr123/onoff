/* 선창 안쪽(집게 게 전용 맵): 선창 외곽=쥐만, 오른쪽 끝 포탈 → 안쪽=게만, 퀘스트 구역·곡 */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
let pass = 0, fail = 0; const note = (id, name, ok, ev) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ev ? ' :: ' + ev : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await new Promise((r) => setTimeout(r, 300));
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await new Promise((r) => setTimeout(r, 200)); }
  if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await new Promise((r) => setTimeout(r, 300)); }
  await ev(() => AU.Prologue.debugComplete('porto')); await new Promise((r) => setTimeout(r, 200));
  const d = await ev(() => { const m = AU.MAPS.docks, n = AU.MAPS.docks_inner; return { dt: [...new Set(m.spawns.map((s) => s.type))], nt: [...new Set(n.spawns.map((s) => s.type))], nc: n.spawns.length, dp: m.portals.map((q) => q.to + '@' + q.x), np: n.portals.map((q) => q.to + '@' + q.x), qa: AU.QUESTS.q_guild_crabs.area, ra: AU.QUESTS.q_guild_rats.area, g: AU.Bgm.pick ? 1 : 0 }; });
  note('A1', '선창 외곽에는 부두 쥐만', d.dt.length === 1 && d.dt[0] === 'rat', JSON.stringify(d.dt));
  note('A2', '선창 안쪽에는 집게 게만, 퀘스트 목표(5마리)보다 많음', d.nt.length === 1 && d.nt[0] === 'crab' && d.nc >= 5, JSON.stringify(d.nt) + d.nc);
  note('A3', '외곽 오른쪽 끝 포탈 ↔ 안쪽 왼쪽 포탈', d.dp.includes('docks_inner@1240') && d.np.includes('docks@40'), JSON.stringify([d.dp, d.np]));
  note('A4', '집게 게 퇴치 퀘스트 구역=선창 안쪽, 쥐 퀘스트=선창 외곽', d.qa === 'docks_inner' && d.ra === 'docks', d.qa + '/' + d.ra);
  const g = await ev(() => { AU.World.enterMap('docks', 200, true); const a = AU.Bgm.pickGroup(); AU.World.enterMap('docks_inner', 200, true); return [a, AU.Bgm.pickGroup(), AU.World.monsters.filter((m) => m.d && m.d.crab).length]; });
  note('B1', '안쪽 곡은 선창 외곽(사냥터 묶음)과 동일, 게가 실제로 생성됨', g[0] === 'field' && g[1] === 'field' && g[2] >= 5, JSON.stringify(g));
  note('Z', '페이지 오류 없음', errs.length === 0, errs.join('|'));
  console.log(`합계 ${pass}/${pass + fail} 통과`); await b.close(); process.exit(fail ? 1 : 0);
})();
