/* 5레벨 구간마다 현실 미션을 완료해야 레벨 포인트를 분배할 수 있음 */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fail = 0;
const note = (id, name, ok, ev) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  if (await p.$('#job-next')) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
  await ev(() => { const S = AU.G.S; S.level = 10; S.jobChanged = true; S.freePoints = 3; S.flags.missionsUnlocked = true; S.flags.guideMet = true; AU.G.changed(); });
  note('G1', 'Lv.10: 미션 전에는 레벨 포인트 분배 불가', await ev(() => AU.G.pool() === 0 && !AU.G.applyAllocation({ STR: 1 })), 'pool=' + await ev(() => AU.G.pool()));
  await ev(() => { AU.UI.open('stats'); }); await sleep(300);
  const txt = await ev(() => document.body.innerText); note('G2', '스탯창에 잠금 안내', /잠겨 있습니다/.test(txt), '');
  await ev(() => AU.UI.close());
  const id = await ev(() => AU.MISSIONS.find((m) => !m.pre).id);
  await ev((id) => { AU.G.initMissions(); AU.G.S.missions.states[id].state = 'available'; AU.G.setMissionState(id, 'accept'); AU.G.setMissionState(id, 'attempt'); AU.G.setMissionState(id, 'done'); }, id);
  const g3 = await ev(() => ({ gb: AU.G.S.gateBand, st: AU.G.S.missions.states[AU.MISSIONS.find((m) => !m.pre).id].state, pool: AU.G.pool() })); note('G3', '현실 미션 1개 완료 후 분배 가능', g3.pool >= 3 && await ev(() => AU.G.applyAllocation({ STR: 3 })), JSON.stringify(g3));
  await ev(() => { const S = AU.G.S; S.level = 15; S.freePoints = 3; });
  note('G4', 'Lv.15 구간은 다시 잠김', await ev(() => AU.G.usableFree() === 0), '');
  await ev(() => { const r = AU.REST_MISSIONS[0].id; AU.G.doRestMission(r); });
  note('G5', '쉼 미션으로도 해제(대체 경로)', await ev(() => AU.G.usableFree() === 3), '');
  note('G6', '오류 없음', errs.length === 0, JSON.stringify(errs)); await b.close(); process.exit(fail ? 1 : 0);
})();
