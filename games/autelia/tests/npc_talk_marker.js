/* 진행 중 의뢰의 '말 걸기' 대상 NPC 머리 위 ? 배지 안내 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fail = 0;
const T = (l, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + ' :: ' + JSON.stringify(d)); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(300);
  const r0 = await ev(() => AU.npcQuestMark('porto_foreman')); T('시작 전: 카시안에는 표시 없음', !r0, r0);
  await ev(() => { AU.G.startQuest('q_s1_silver'); });
  const r1 = await ev(() => AU.npcQuestMark('porto_foreman')); T('의뢰 진행 중: 말 걸 대상 카시안 머리 위에 ▼ 배지', !!(r1 && r1.mark === '▼' && r1.kind === 'main'), r1);
  const r2 = await ev(() => AU.npcQuestMark('porto_dock')); T('의뢰를 준 니코스에는 표시 없음', !r2, r2);
  await ev(() => { const S = AU.G.S.quests.q_s1_silver; S.state = 'ready'; });
  const r3 = await ev(() => AU.npcQuestMark('porto_foreman')); T('보고 가능해져도 ▼ 유지', !!(r3 && r3.mark === '▼'), r3);
  T('페이지 오류 없음', errs.length === 0, errs);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0);
})();
