/* 나의 마음 점검: 선택 메모·점 눌러 보기·미션 수 집계 */
const { chromium } = require('playwright');
const BASE = process.env.GAME_URL || 'http://localhost:8801';
const R = []; const note = (id, name, ok, ev) => { R.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(BASE + '/index.html?dev=1&intro=cards'); await ev(() => localStorage.clear()); await p.goto(BASE + '/index.html?dev=1');
  await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await sleep(300); await ev(() => { AU.Prologue.debugComplete('arche'); AU.G.S.flags.missionsUnlocked = true; AU.G.discoverMissions(); });
  const sub = (v, memo, daysAgo) => ev(([v, memo, daysAgo]) => { const S = AU.Survey; S.scale('pss').items.forEach((it) => S.setAnswer('pss', 'check', it.itemId, v)); const r = S.submit('pss', 'check', memo); const d = S.load(); const t = new Date(Date.now() - daysAgo * 864e5).toISOString(); d.submissions.find((s) => s.submissionId === r.submission.submissionId).submittedAt = t; S.save(d); return r.ok; }, [v, memo, daysAgo]);
  await sub(3, '첫 메모', 14); await sub(2, '', 7); await sub(1, '  셋째 메모  ', 0);
  const h = await ev(() => AU.Survey.history('pss').map((s) => s.memo || null));
  note('T1', '메모는 선택(비어 있으면 저장 안 함, 공백 제거)', h[0] === '첫 메모' && h[1] === null && h[2] === '셋째 메모', JSON.stringify(h));
  const csv = await ev(() => AU.Survey.toCsv ? AU.Survey.toCsv('pss') : (AU.Survey.csv ? AU.Survey.csv('pss') : ''));
  note('T2', '개인 메모는 연구용 CSV에 나가지 않음', !/셋째 메모|첫 메모/.test(csv || ''), String((csv || '').length));
  // 미션 2개를 중간 구간(7일 전 ~ 오늘 사이)에 완료한 것으로 기록
  await ev(() => { const day = (n) => AU.dateStr(new Date(Date.now() - n * 864e5)); AU.G.S.missions.log.push({ t: day(3), id: 'x', perma: 'P', state: 'done' }, { t: day(2), id: 'y', perma: 'R', state: 'done' }, { t: day(10), id: 'z', perma: 'E', state: 'done' }); AU.UI.close(); AU.UI.tab.jg = 'real'; AU.UI.tab.j = 'record'; AU.UI.open('journal'); });
  await sleep(300);
  const first = await ev(() => document.querySelector('.svdetail').textContent);
  note('T3', '기본 선택은 최근 점: 직전 이후 미션 2개 + 메모', /미션 2개/.test(first) && /셋째 메모/.test(first), first);
  await ev(() => document.querySelectorAll('.svpt[data-i="0"]')[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(200);
  const t0 = await ev(() => document.querySelector('.svdetail').textContent);
  note('T4', '첫 점을 누르면 첫 기록·메모 표시', /첫 기록/.test(t0) && /첫 메모/.test(t0), t0);
  await ev(() => document.querySelectorAll('.svpt[data-i="1"]')[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(200);
  const t1 = await ev(() => document.querySelector('.svdetail').textContent);
  note('T5', '메모 없는 점은 안내 표시·구간 미션 1개(10일 전 것)', /메모 없음/.test(t1) && /미션 1개/.test(t1), t1);
  note('T6', '화면 오류 없음', errs.length === 0, errs.join('|'));
  await b.close(); process.exit(R.every(Boolean) ? 0 : 1);
})();
