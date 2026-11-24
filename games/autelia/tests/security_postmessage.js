/* 보안: 출처/발신자 검증 — 플랫폼 아닌 창이 보낸 init은 무시, 개발용 주소는 localhost에서만 */
const { chromium } = require('playwright');
(async () => {
 const b = await chromium.launch(); const p = await b.newPage(); let failures = 0;
 const test = (l, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + ' :: ' + JSON.stringify(d)); if (!ok) failures++; };
 try {
  await p.goto('http://localhost:8803/#home'); await p.waitForFunction(() => window.OnOff && OnOff.App && OnOff.State);
  await p.evaluate(() => { OnOff.State.demoLogin(); location.hash = '#space-autelia'; });
  await p.waitForSelector('#space-stage iframe'); await p.waitForTimeout(2500);
  const f = p.frames().find((x) => /games\/autelia/.test(x.url()));
  const key = await f.evaluate(() => AU.Store.ns);
  test('S1 플랫폼 init으로 저장 칸 이름이 정해짐', /^onoff:/.test(key), key);
  // 같은 페이지(부모가 아닌 창)에서 가짜 init 전송 → 무시되어야 함
  await f.evaluate(() => { window.postMessage({ source: 'onoff-platform', type: 'init', saveKey: 'HACKED' }, '*'); });
  await p.waitForTimeout(300);
  const key2 = await f.evaluate(() => AU.Store.ns);
  test('S2 부모가 아닌 곳에서 온 init은 무시', key2 === key && !/HACKED/.test(key2), key2);
  test('S3 localhost에서는 개발용 주소 허용', await f.evaluate(() => AU.main.isLocalHost()), 1);
  const bad = await f.evaluate(() => { const o = AU.main.isLocalHost; return /^(localhost|127\.0\.0\.1|\[::1\])$/.test('example.com'); });
  test('S4 그 밖의 도메인은 거부', bad === false, bad);
 } catch (e) { console.log('ERR', e.message); failures++; }
 await b.close(); console.log(failures ? failures + ' FAIL' : 'ALL PASS'); process.exit(failures ? 1 : 0);
})();
