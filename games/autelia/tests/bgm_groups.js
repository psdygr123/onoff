/* 배경음 묶음: 지역별 곡 선택, 묶음 안 이어 재생, 파일 존재 */
const { chromium } = require('playwright'); const fs = require('fs');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const note = (id, name, ok, ev) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ev ? ' :: ' + ev : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); note('A0', '제목·캐릭터 만들기 화면에서는 엔딩 곡(title 묶음)', (await ev(() => AU.Bgm.pick().g)) === 'title' && (await ev(() => AU.Bgm.tracks.title)) === (await ev(() => AU.Bgm.tracks.ending))); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); }
  if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  const files = await ev(() => Object.values(AU.Bgm.tracks)); const missing = [];
  for (const f of files) { const r = await ev(async (u) => (await fetch(u, { method: 'HEAD' })).ok, f); if (!r) missing.push(f); }
  note('A1', '모든 곡 파일이 있음', missing.length === 0, missing.join(','));
  note('A2', '프롤로그 중에는 아르케아(회상) 곡, 도입 영상 중에는 도입 영상 전용 곡', (await ev(() => (AU.Prologue.introOn = false, AU.Bgm.pick().key))) === 'arkea' && (await ev(() => (AU.Prologue.introOn = true, AU.Bgm.pick().key))) === 'intro' && (await ev(() => (AU.Prologue.introOn = false, 1))));
  await ev(() => AU.Prologue.debugComplete('porto')); await sleep(200);
  const at = async (map) => { await ev((m) => AU.World.enterMap(m, AU.MAPS[m].start || 200, true), map); await sleep(80); return ev(() => AU.Bgm.pick()); };
  const t = await at('porto'); note('B1', '포르투 노바: 마을 묶음은 도착곡(모험)부터(1117)', t.g === 'town' && t.key === 'adventure', JSON.stringify(t));
  note('B2', '잡화점 1번·무기점 2번', (await at('general_store')).key === 'store_a' && (await at('weapon_store')).key === 'store_b');
  note('B3', '길드·창고 전용 곡', (await at('guild_hall')).key === 'guild' && (await at('warehouse')).key === 'warehouse');
  const f1 = await at('forest'), f2 = await at('harbor_road'), f3 = await at('docks');
  note('B4', '숲길·항구 길·선창 외곽은 같은 사냥터 묶음(끊김 없이 이어짐)', f1.g === 'field' && f2.g === 'field' && f3.g === 'field' && f1.key === f2.key && f2.key === f3.key, f1.key);
  const nxt = await ev(() => { AU.Bgm.idx.field = 1; return AU.Bgm.pick().key; }); note('B5', '곡이 끝나면 사냥터 2번으로 이어짐', nxt === 'field2', nxt);
  const tw = await ev(() => { AU.Bgm.idx.town = 3; AU.Bgm.idx.town = (AU.Bgm.idx.town + 1) % AU.Bgm.groups.town.length; return AU.Bgm.groups.town[AU.Bgm.idx.town]; }); note('B6', '마을 마지막 곡(포르투 3) 다음은 처음(모험)으로 돌아감', tw === 'adventure', tw);
  await at('docks'); const boss = await ev(() => { const W = AU.World; W.monsters.push({ alive: true, d: { boss: true }, type: 'trial_boss' }); const g = AU.Bgm.pick().g; W.monsters.pop(); return g; });
  note('B7', '보스가 있으면 보스 곡', boss === 'boss', boss);
  note('Z', '페이지 오류 없음', errs.length === 0, errs.join('|'));
  console.log(`합계 ${pass}/${pass + fail} 통과`); await b.close(); process.exit(fail ? 1 : 0);
})();
