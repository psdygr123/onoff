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
  const required = missing.filter((f) => !/elegy\.mp3/.test(f));   // elegy(아버지 사후 장면)는 선택 곡: 파일이 있을 때만 사용
  note('A1', '모든 곡 파일이 있음(선택 곡 elegy 제외)', required.length === 0, required.join(','));
  note('A2', '프롤로그 중에는 아르케아(회상) 곡, 도입 영상 중에는 도입 영상 전용 곡', (await ev(() => (AU.Prologue.introOn = false, AU.Bgm.pick().key))) === 'arkea' && (await ev(() => (AU.Prologue.introOn = true, AU.Bgm.pick().key))) === 'intro' && (await ev(() => (AU.Prologue.introOn = false, 1))));
  note('A3', '습격(03)과 이어지는 격투(04, brawl)는 raid, 격투 후 유언(04)은 슬픈 곡(elegy, 파일이 없으면 아르케아)', (await ev(() => { AU.G.S.prologue.state = 'SCENE_03_ATTACK'; return AU.Bgm.pick().key; })) === 'raid' && (await ev(() => { AU.G.S.prologue.state = 'SCENE_04_FATHER'; AU.Prologue.v.brawl = true; return AU.Bgm.pick().key; })) === 'raid' && (await ev(() => { AU.Prologue.v.brawl = false; return AU.Bgm.pick().key === (AU.Bgm.hasElegy ? 'elegy' : 'arkea'); })) && (await ev(() => AU.Bgm.tracks.raid.indexOf('raid.mp3') >= 0)));
  await ev(() => AU.Prologue.debugComplete('porto')); await sleep(200);
  const at = async (map) => { await ev((m) => AU.World.enterMap(m, AU.MAPS[m].start || 200, true), map); await sleep(80); return ev(() => AU.Bgm.pick()); };
  const t = await at('porto'); note('B1', '포르투 노바: 마을 묶음은 새 항구 곡 1곡(1125)', t.g === 'town' && t.key === 'porto', JSON.stringify(t));
  note('B2', '잡화점 1번·무기점 2번', (await at('general_store')).key === 'store_a' && (await at('weapon_store')).key === 'store_b');
  note('B3', '길드·창고 전용 곡', (await at('guild_hall')).key === 'guild' && (await at('warehouse')).key === 'warehouse');
  const f1 = await at('forest'), f2 = await at('harbor_road'), f3 = await at('docks');
  note('B4', '멧돼지 숲·뱀길·선창 외곽은 같은 사냥터 묶음(끊김 없이 이어짐)', f1.g === 'field' && f2.g === 'field' && f3.g === 'field' && f1.key === f2.key && f2.key === f3.key, f1.key);
  const nxt = await ev(() => { AU.Bgm.idx.field = 1; return AU.Bgm.pick().key; }); note('B5', '곡이 끝나면 사냥터 2번으로 이어짐', nxt === 'field2', nxt);
  const tw = await ev(() => AU.Bgm.groups.town.length); note('B6', '포르투 노바는 1곡만 반복(단일 곡 묶음은 loop)', tw === 1, tw);
  const ps = await ev(() => { AU.Prologue.on = true; AU.G.S.prologue.state = 'SCENE_06_PORT_VIEW'; const r = AU.Bgm.pick(); AU.Prologue.on = false; return r; }); note('B8', '프롤로그 마지막 포르투 노바 소개(SCENE_06)도 같은 항구 곡', ps.g === 'town' && ps.key === 'porto', JSON.stringify(ps));
  const hid = await at('hide_outer'); note('B9', '다른 맵(은신처)은 기존 곡 유지', hid.key === 'adventure', JSON.stringify(hid));
  await at('docks'); const boss = await ev(() => { const W = AU.World; W.monsters.push({ alive: true, d: { boss: true }, type: 'trial_boss' }); const g = AU.Bgm.pick().g; W.monsters.pop(); return g; });
  note('B7', '보스가 있으면 보스 곡', boss === 'boss', boss);
  note('Z', '페이지 오류 없음', errs.length === 0, errs.join('|'));
  console.log(`합계 ${pass}/${pass + fail} 통과`); await b.close(); process.exit(fail ? 1 : 0);
})();
