/* 퀘스트 종류 확장 시험: 전달·조사·선택 (십장 수리·처치 퀘스트 q_a1_fence는 스토리 개편으로 삭제되어 시험에서 제외) */
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
  const key = async (k, ms = 60) => { await p.keyboard.down(k); await sleep(ms); await p.keyboard.up(k); };
  // 준비: 선행 퀘스트 완료, 레벨 6
  await ev(() => { const G = AU.G; G.S.level = 6; for (const id of ['q_s1_silver', 'q_s1_test', 'q_first', 'q_forest', 'q_guild_talk']) G.S.quests[id] = { state: 'done', prog: [], spots: {} }; G.save('t'); });
  const st = (id) => ev((id) => AU.G.questStatus(id), id);
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
  await ev(() => { AU.G.S.level = 7; AU.G.S.quests.q_a1_variant = { state: 'done', prog: [], spots: {} }; AU.G.startQuest('q_a1_traces'); });
  await ev(() => { AU.World.enterMap('warehouse', 540, true); AU.World.scan(); }); await sleep(300);
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
