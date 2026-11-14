/* 마음 스탯(PERMA 5) 시험: 미션 완료 → 수치 증가·표시·저장·구 저장 보정 */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1', SH = (process.env.SHOTS || '/tmp/claude-0/shots') + '/';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
  const done = (id) => ev((id) => { AU.G.setMissionState(id, 'accept'); AU.G.setMissionState(id, 'attempt'); return AU.G.setMissionState(id, 'done'); }, id);
  const ms = () => ev(() => Object.assign({}, AU.G.S.mindStats));
  await ev(() => { AU.G.S.flags.missionsUnlocked = true; AU.G.discoverMissions(); });
  note('M1', '시작 시 마음 스탯 5개 모두 0', JSON.stringify(await ms()) === '{"P":0,"E":0,"R":0,"M":0,"A":0}', JSON.stringify(await ms()));
  await done('m_p1'); const a = await ms();
  const toast1 = await ev(() => Array.from(document.querySelectorAll('.toasts > *')).map((e) => e.textContent).join('|'));
  note('M2', 'd1 미션 완료 → 해당 영역 +1', a.P === 1 && a.E === 0, JSON.stringify(a));
  note('M3', '완료 알림에 마음 +N 표시', /마음 \[긍정정서\] \+1/.test(toast1), toast1);
  await done('m_p2'); const b2 = await ms();
  note('M4', 'd2 미션(점수 2) 완료 → +2 (합 3)', b2.P === 3, JSON.stringify(b2));
  await ev(() => { AU.G.setMissionState('m_p1', 'accept'); AU.G.setMissionState('m_p1', 'retry'); AU.G.setMissionState('m_p1', 'done'); });
  note('M5', '같은 미션 반복 보상 없음', (await ms()).P === 3, JSON.stringify(await ms()));
  for (const id of ['m_e1', 'm_r1', 'm_m1']) await done(id);
  const cap = await ev(() => AU.G.S.missions.weekPoints); await done('m_a1'); const c2 = await ms();
  note('M6', '주간 훈련 포인트 한도 도달 후에도 마음 스탯은 오름', cap === 6 && c2.A === 1, 'weekPoints=' + cap + ' ' + JSON.stringify(c2));
  await ev(() => { AU.UI.tab.j = 'record'; AU.UI.open('journal'); }); await sleep(400);
  const inStats = await ev(() => { AU.UI.close(); AU.UI.open('stats'); const n = document.querySelectorAll('.mindbox').length; AU.UI.close(); return n; });
  await ev(() => { AU.UI.tab.j = 'record'; AU.UI.open('journal'); }); await sleep(400);
  const rows = await ev(() => Array.from(document.querySelectorAll('.mindbox .mrow')).map((r) => r.dataset.perma + ':' + r.querySelector('.mv').textContent + (r.classList.contains('fresh') ? '*' : '')));
  note('M7', '모험일지 마음 기록에 5개 영역 수치(최대치 포함)와 방금 오른 표시(스탯 창에는 없음)', inStats === 0 && rows.length === 5 && rows[0] === 'P:3 / 3' && rows.some((r) => r.endsWith('*')), rows.join(' '));
  const up = await ev(() => { const e = Array.from(document.querySelectorAll('.mindbox .mup')).find((x) => x.textContent); return e ? e.textContent : null; });
  note('M7b', '“방금 +N” 배지', up === '방금 +1', String(up));
  await p.screenshot({ path: SH + 'mind_stats.png' });
  await ev(() => AU.UI.close());
  await ev(() => { AU.G.save('test'); }); await p.reload(); await p.waitForSelector('#btn-start,#btn-continue,#btn-replay,.btn', { timeout: 8000 }); await sleep(500);
  const cont = await p.$('#btn-continue'); if (cont) { await cont.click(); await sleep(600); } else { await p.click('#btn-start'); await sleep(600); }
  const r1 = await ev(() => AU.G.S ? Object.assign({}, AU.G.S.mindStats) : null);
  note('M8', '저장 후 다시 열어도 유지', r1 && r1.P === 3 && r1.A === 1, JSON.stringify(r1));
  // 구 저장(마음 스탯 도입 전) 보정
  const mig = await ev(() => { const raw = AU.Store.get('autelia.save'); delete raw.mindStats; if (raw.mind) delete raw.mind.last; AU.Store.set('autelia.save', raw); const s = AU.G.load(); return s.mindStats; });
  note('M9', '구 저장은 보상받은 미션 점수로 계산해 채움', mig && mig.P === 3 && mig.E === 1 && mig.R === 1 && mig.M === 1 && mig.A === 1, JSON.stringify(mig));
  note('Z', '오류 없음', errs.length === 0, JSON.stringify(errs));
  console.log('합계 ' + R.filter((r) => r.ok).length + '/' + R.length + ' 통과'); await b.close(); process.exit(R.every((r) => r.ok) ? 0 : 1);
})();
