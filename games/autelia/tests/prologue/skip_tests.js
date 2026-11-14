// 컷신 건너뛰기: 처음 하는 사람(일반 주소)에게는 없고, 프롤로그 다시 보기에서만 있음
const { chromium } = require('playwright');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html';   // dev=1 없음 = 실제 이용자와 같은 주소
const R = []; const ok = (n, c, d) => { R.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  ' + d : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(BASE); await ev(() => localStorage.clear()); await p.goto(BASE); await p.waitForSelector('#btn-start');
  await p.click('#btn-start'); await sleep(250); await p.click('#job-next'); await sleep(200); await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(700);
  let s = await ev(() => ({ cs: AU.Prologue.cs, dev: AU.UI.devVisible, vis: !document.querySelector('.skipbtn').classList.contains('hidden') }));
  ok('S01 처음 플레이: 오프닝 컷신 중이며 건너뛰기 버튼 없음', s.cs && !s.dev && !s.vis && s.cs.skip === false, JSON.stringify(s));
  await p.keyboard.press('Enter'); await sleep(300);
  s = await ev(() => ({ cs: !!AU.Prologue.cs, skipping: AU.Prologue.skipping }));
  ok('S02 처음 플레이: Enter를 눌러도 건너뛰지 않음', s.cs && !s.skipping, JSON.stringify(s));
  // 다른 컷신(완공)도 확인: 개발 점프 없이 일반 흐름에서 컷신 id만 검사하기 위해, 함수 직접 호출
  s = await ev(() => { AU.Prologue.skip(); return { skipping: AU.Prologue.skipping }; }); ok('S03 skip() 직접 호출해도 무시', !s.skipping);
  // 완료 후 다시 보기: 건너뛰기 허용
  await ev(() => { AU.Prologue.debugComplete('porto'); }); await sleep(400); await ev(() => AU.G.save('test')); await ev(() => { AU.main.running = false; });
  await p.reload(); await p.waitForSelector('#btn-replay'); await p.click('#btn-replay'); await sleep(900);
  s = await ev(() => ({ replay: AU.Prologue.replay, cs: AU.Prologue.cs, vis: !document.querySelector('.skipbtn').classList.contains('hidden') }));
  ok('S04 다시 보기: 건너뛰기 버튼 표시', s.replay && s.cs && s.cs.skip === true && s.vis, JSON.stringify(s));
  await p.keyboard.press('Enter'); await sleep(500); s = await ev(() => ({ cs: !!AU.Prologue.cs }));
  ok('S05 다시 보기: Enter로 건너뛰기 동작', !s.cs, JSON.stringify(s));
  ok('오류 없음', errs.length === 0, errs.join('|')); await b.close();
  const bad = R.filter((r) => !r[1]); console.log('\n합계 ' + (R.length - bad.length) + '/' + R.length + ' 통과'); process.exit(bad.length ? 1 : 0);
})();
