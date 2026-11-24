/* NPC 머리 위 표시 통일(11-24): 새 의뢰 메인 노란 ?·서브 파란 ?, 완료·보고(결과 알리기 포함) 주황 ▼ */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#btn-start');
  const r = await p.evaluate(() => {
    AU.G.S.quests.q_a1_traces = { state: 'active', prog: [0, 0], spots: { trace_stain: true, trace_crate: true } };
    const done = AU.npcQuestMark('porto_foreman');
    AU.G.S.quests.q_a1_traces = { state: 'active', prog: [0, 0], spots: { trace_stain: true } };
    const mid = AU.npcQuestMark('porto_foreman');
    return { done, mid, q: AU.QMARK };
  });
  const pass = !!(r.done && r.done.mark === '▼' && r.done.color === '#E8772E') && r.q.offer.main === '#E8B52E' && r.q.offer.sub === '#4C8DC6' && !errs.length;
  console.log((pass ? 'PASS ' : 'FAIL ') + JSON.stringify(r), errs); await b.close(); process.exit(pass ? 0 : 1);
})();
