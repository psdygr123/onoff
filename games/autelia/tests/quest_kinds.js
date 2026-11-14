/* 퀘스트 종류 확장 시험: 수리(시간 걸림·취소)·조사·전달·선택 + 십장 NPC 흐름 */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  if (await p.$('#job-next')) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
  const key = async (k, ms = 60) => { await p.keyboard.down(k); await sleep(ms); await p.keyboard.up(k); };
  // 준비: 선행 퀘스트 완료, 레벨 6
  await ev(() => { const G = AU.G; G.S.level = 6; for (const id of ['q_first', 'q_forest', 'q_guild_talk']) G.S.quests[id] = { state: 'done', prog: [], spots: {} }; G.save('t'); });
  const st = (id) => ev((id) => AU.G.questStatus(id), id);
  note('K0', '십장 퀘스트 수락 가능', (await st('q_a1_fence')) === 'available', await st('q_a1_fence'));
  await ev(() => AU.G.startQuest('q_a1_fence'));
  note('K1', '시작하면 수리 목표 0/3 + 처치 0/4', await ev(() => { const r = AU.G.S.quests.q_a1_fence; return JSON.stringify(r.prog) === '[0,0]' && !!r.spots; }), await ev(() => JSON.stringify(AU.G.S.quests.q_a1_fence)));
  // 부두 외곽으로
  await ev(() => { AU.World.enterMap('docks', 200, true); AU.World.monsters = []; AU.World.spawn = () => null; }); await sleep(400);   // 시험 중 몬스터에게 맞아 수리가 끊기지 않도록 몬스터를 비움
  const near = await ev(() => { AU.World.scan(); const w = AU.World; return { s: w.nearSpot && w.nearSpot.id, prompt: w.prompt }; });
  note('K2', '방책 앞에서 “Space 수리” 안내', near.s === 'fence_a' && /수리/.test(near.prompt), JSON.stringify(near));
  // 수리 시작 후 움직이면 취소
  await key('Space'); await sleep(200);
  const w1 = await ev(() => !!AU.World.work); note('K3', 'Space로 수리 작업 시작', w1, String(w1));
  await key('ArrowRight', 300); await sleep(250);
  const w2 = await ev(() => ({ work: !!AU.World.work, done: AU.G.S.quests.q_a1_fence.prog[0] }));
  note('K4', '움직이면 수리 취소(진행 없음)', !w2.work && w2.done === 0, JSON.stringify(w2));
  // 다시 시작 후 가만히 있으면 완료
  await ev(() => { AU.World.player.x = 200; AU.World.player.vx = 0; }); await sleep(150);
  await key('Space'); await sleep(2200);
  const w3 = await ev(() => ({ work: !!AU.World.work, prog: AU.G.S.quests.q_a1_fence.prog[0], spot: AU.G.S.quests.q_a1_fence.spots.fence_a }));
  note('K5', '가만히 있으면 수리 완료 → 1/3', !w3.work && w3.prog === 1 && w3.spot === true, JSON.stringify(w3));
  const again = await ev(() => { AU.World.scan(); return AU.World.nearSpot; });
  note('K6', '고친 방책에는 다시 수리 안내가 안 뜸', !again, JSON.stringify(again && again.id));
  // 피격 시 취소
  await ev(() => { AU.World.player.x = 650; AU.World.player.vx = 0; AU.World.scan(); }); await sleep(100);
  await key('Space'); await sleep(200); await ev(() => { AU.World.player.invuln = 0; AU.World.hurtPlayer({ d: { atk: 1 }, x: AU.World.player.x + 5, dir: 1 }); }).catch(() => {});
  const w4 = await ev(() => !!AU.World.work); note('K7', '맞으면 수리 취소', !w4, String(w4));
  await ev(() => { AU.G.completeSpot('fence_b'); AU.G.completeSpot('fence_c'); });
  note('K8', '3곳 완료 시 수리 목표 완료(3/3)', await ev(() => AU.G.S.quests.q_a1_fence.prog[0] === 3), await ev(() => JSON.stringify(AU.G.S.quests.q_a1_fence.prog)));
  await ev(() => { for (let i = 0; i < 4; i++) AU.G.onKill('crab'); });
  note('K9', '게 4마리 처치하면 완료 가능(ready)', (await st('q_a1_fence')) === 'ready', await st('q_a1_fence'));
  // 십장에게 보고 → 보상
  const before = await ev(() => AU.G.S.silver);
  await ev(() => { AU.World.enterMap('porto', 1390, true); AU.UI.talkNpc('porto_foreman'); }); await sleep(300);
  for (let i = 0; i < 6 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(150); }
  note('K10', '보고하면 완료·은화 +180', (await st('q_a1_fence')) === 'done' && (await ev(() => AU.G.S.silver)) - before === 180, (await st('q_a1_fence')) + ' ' + ((await ev(() => AU.G.S.silver)) - before));
  // 전달 퀘스트
  note('K11', '전달 퀘스트 수락 가능', (await st('q_a1_parcel')) === 'available', await st('q_a1_parcel'));
  await ev(() => AU.G.startQuest('q_a1_parcel'));
  note('K12', '시작하면 길드 꾸러미를 받음', await ev(() => AU.G.count('guild_parcel') === 1), await ev(() => AU.G.count('guild_parcel')));
  await ev(() => AU.UI.talkNpc('porto_general')); await sleep(300);
  for (let i = 0; i < 6 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(150); }
  note('K13', '잡화상인에게 전하면 꾸러미가 사라지고 완료 가능', (await ev(() => AU.G.count('guild_parcel'))) === 0 && (await st('q_a1_parcel')) === 'ready', (await st('q_a1_parcel')));
  await ev(() => AU.UI.talkNpc('porto_foreman')); await sleep(300);
  for (let i = 0; i < 6 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(150); }
  note('K14', '십장에게 보고하면 전달 퀘스트 완료', (await st('q_a1_parcel')) === 'done', await st('q_a1_parcel'));
  // 조사 + 선택
  await ev(() => AU.G.startQuest('q_a1_traces'));
  await ev(() => { AU.World.enterMap('docks', 440, true); AU.World.scan(); }); await sleep(300);
  const n1 = await ev(() => AU.World.nearSpot && AU.World.nearSpot.id); note('K15', '흔적 앞에서 조사 안내', n1 === 'trace_stain', String(n1));
  await key('Space'); await sleep(300);
  for (let i = 0; i < 6 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(150); }
  note('K16', '조사 대화를 끝내면 1/2', await ev(() => AU.G.S.quests.q_a1_traces.prog[0] === 1), await ev(() => JSON.stringify(AU.G.S.quests.q_a1_traces.prog)));
  await ev(() => AU.G.completeSpot('trace_crate'));
  // 선택은 조사를 모두 마친 뒤 십장에게서만
  note('K17', '조사 끝나기 전에는 선택 못 함', await ev(() => { const a = AU.G.pendingChoice('porto_foreman'); return !!a; }), 'pending after investigate');
  await ev(() => { AU.World.enterMap('porto', 1390, true); AU.UI.talkNpc('porto_foreman'); }); await sleep(300);
  for (let i = 0; i < 4 && !(await p.$('.choices button')); i++) { await key('Space'); await sleep(150); }   // 마지막 대사에서 선택지가 나타남
  const opts = await ev(() => Array.from(document.querySelectorAll('.choices button')).map((x) => x.textContent.trim()));
  note('K18', '갈림길 선택지 2개 표시', opts.some((t) => /길드에 알린다/.test(t)) && opts.some((t) => /혼자 알아본다/.test(t)), JSON.stringify(opts));
  const btn = await p.$('.choices button:has-text("길드에 알린다")'); await btn.click(); await sleep(300);
  for (let i = 0; i < 8 && (await ev(() => !!AU.UI.dialog)); i++) { await key('Space'); await sleep(150); }
  const fin = await ev(() => ({ flag: AU.G.S.flags.choice_traces, s: AU.G.questStatus('q_a1_traces') }));
  note('K19', '선택이 기록되고 퀘스트 완료', fin.flag === 'report' && fin.s === 'done', JSON.stringify(fin));
  // 저장 후 다시 불러와도 유지
  await p.reload(); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(500);
  const re = await ev(() => ({ f: AU.G.S.flags.choice_traces, q: AU.G.questStatus('q_a1_traces') }));
  note('K20', '새로고침 후에도 선택·완료 유지', re.f === 'report' && re.q === 'done', JSON.stringify(re));
  note('Z', '오류 없음', errs.length === 0, JSON.stringify(errs));
  console.log('합계 ' + R.filter((r) => r.ok).length + '/' + R.length + ' 통과'); await b.close(); process.exit(R.every((r) => r.ok) ? 0 : 1);
})();
