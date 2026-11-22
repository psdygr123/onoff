/* 1막 개편 Lv1~5: 도착 안내 → 길드 면담 → 입단 시험 3단계 → 정식 등록 → 쥐 소탕 → 변형의 흔적(검은 결정) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const note = (id, name, ok, ev) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ev ? ' :: ' + ev : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); }
  if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('porto')); await sleep(200);
  const st = (id) => ev((i) => AU.G.questStatus(i), id);
  note('A1', '시작: 안내 의뢰만 열림, 길드 시험은 잠김', (await st('q_s1_silver')) === 'available' && (await st('q_s1_test')) === 'locked');
  await ev(() => AU.G.startQuest('q_s1_silver'));
  await ev(() => { AU.UI.talkNpc('porto_foreman'); }); await sleep(100);
  const lines = await ev(() => AU.UI.dialog && AU.UI.dialog.lines.map((l) => (typeof l === 'string' ? l : l.t)));
  note('A2', '클레안드로스 면담: 이름·입단 테스트 문구(이름 치환)', (await st('q_s1_silver')) === 'ready' && !!lines && lines.length >= 4, JSON.stringify(lines).slice(0, 120));
  const shown = await ev(() => AU.Profile.fmt(AU.QUESTS.q_s1_silver.done[1]));
  note('A3', '이름 호칭이 대사에 들어감', /시험용/.test(shown) && !/\{/.test(shown), shown);
  await ev(() => { AU.UI.dialog = null; AU.UI.dlgEl.classList.add('hidden'); AU.G.turnIn('q_s1_silver'); });
  note('A4', '면담 완료로 검 지급·시험 1 열림', (await ev(() => AU.G.count('sword_a'))) === 1 && (await st('q_s1_test')) === 'available');
  const chain = [['q_s1_test', 'snake', 1], ['q_first', 'snake', 3], ['q_forest', 'fox', 5]];
  for (const [q, m, n] of chain) { await ev(() => { AU.G.S.level = Math.max(AU.G.S.level, 3); }); await ev((i) => AU.G.startQuest(i), q); for (let k = 0; k < n; k++) await ev((t) => AU.G.onKill(t), m); await ev((i) => AU.G.turnIn(i), q); }
  note('A5', '입단 시험 1·2·3 순서대로 완료', (await st('q_forest')) === 'done' && (await st('q_guild_talk')) === 'available');
  await ev(() => { AU.G.startQuest('q_guild_talk'); AU.G.onTalk('porto_guild'); });
  const rd = await st('q_guild_talk'); note('A6', '정식 등록은 다프네에게 말 걸면 준비됨', rd === 'ready');
  await ev(() => { AU.G.turnIn('q_guild_talk'); AU.G.S.level = 4; });
  note('A7', '정식 등록 후 쥐 소탕(서브) 수락 가능, 변형의 흔적(메인)은 Lv5 전까지 잠김', (await st('q_guild_rats')) === 'available' && (await st('q_a1_variant')) === 'locked');
  await ev(() => { AU.G.S.level = 5; AU.G.startQuest('q_guild_rats'); for (let k = 0; k < 8; k++) AU.G.onKill('rat'); AU.G.turnIn('q_guild_rats'); });
  note('A8', 'Lv5가 되면 변형의 흔적 열림(쥐 소탕과 무관)', (await st('q_a1_variant')) === 'available');
  await ev(() => AU.G.startQuest('q_a1_variant'));
  const noDrop = await ev(() => { AU.G.S.quests.q_a1_variant.state = 'done'; const r = AU.G.questStatus('q_a1_variant'); AU.G.S.quests.q_a1_variant.state = 'active'; return r; });
  await ev(() => { for (let k = 0; k < 3; k++) AU.G.giveItem('black_crystal', 1); AU.G.refreshCollectQuests(); });
  note('A9', '검은 결정 3개로 완료 준비', (await st('q_a1_variant')) === 'ready');
  await ev(() => { AU.G.turnIn('q_a1_variant'); AU.G.S.level = 6; });
  note('A10', '제출 시 결정 소모·창고의 흔적 열림', (await ev(() => AU.G.count('black_crystal'))) === 0 && (await st('q_a1_traces')) === 'available');
  note('A11', '목공 작업대 없음', (await ev(() => AU.MAPS.guild_hall.spots.length)) === 0);
  note('Z', '페이지 오류 없음', errs.length === 0, errs.join('|'));
  console.log(`합계 ${pass}/${pass + fail} 통과`); await b.close(); process.exit(fail ? 1 : 0);
})();
