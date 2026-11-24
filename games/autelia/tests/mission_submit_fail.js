// 현실 미션 제출이 거부될 때: 사용자 안내가 나오고 첨부 사진이 남지 않는지 확인
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://localhost:8801';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fail = 0; const T = (n, ok, d) => { if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); };
  await p.goto(URL + '/?dev=1&intro=cards'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#btn-start'); await p.click('#job-next'); await p.click('#job-next'); await p.fill('#sname', '시험'); await p.click('#setup-ok');
  await p.waitForTimeout(500); await p.evaluate(() => AU.Prologue.debugComplete('porto'));
  await p.evaluate(() => { AU.G.discoverMissions(); AU.G.setMissionState('m_e5', 'accept'); AU.UI.missionReview(AU.G.mission('m_e5'), 'done', (f, e) => AU.G.setMissionState('m_e5', 'done', f, e)); });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await p.setInputFiles('.modal input[type=file]', { name: 'a.png', mimeType: 'image/png', buffer: png });
  const sels = await p.$$('.modal select'); for (const s of sels) await s.selectOption('3');
  await p.evaluate(() => AU.G.setMissionState('m_e5', 'skip'));   // 제출 직전에 상태가 바뀐 상황
  await p.click('text=기록하고 완료하기'); await p.waitForTimeout(600);
  const r = await p.evaluate(async () => {
    const db = await AU.MissionEvidence.db(); const n = await new Promise(res => { const q = db.transaction('photos').objectStore('photos').count(); q.onsuccess = () => res(q.result); });
    return { state: AU.G.ms('m_e5').state, photos: n, toast: document.body.innerText.includes('기록할 수 없습니다'), modalOpen: !document.querySelector('.modal') };
  });
  T('상태 skipped 유지', r.state === 'skipped', r.state); T('안내 표시', r.toast); T('남은 사진 0장', r.photos === 0, r.photos);
  // 정상 경로: 수락 후 사진 첨부 제출 → 사진 1장 보관
  await p.evaluate(() => { AU.G.setMissionState('m_e5', 'retry'); AU.UI.missionReview(AU.G.mission('m_e5'), 'done', (f, e) => AU.G.setMissionState('m_e5', 'done', f, e)); });
  await p.setInputFiles('.modal input[type=file]', { name: 'a.png', mimeType: 'image/png', buffer: png });
  for (const s of await p.$$('.modal select')) await s.selectOption('4');
  await p.click('text=기록하고 완료하기'); await p.waitForTimeout(600);
  const r2 = await p.evaluate(async () => { const db = await AU.MissionEvidence.db(); const n = await new Promise(res => { const q = db.transaction('photos').objectStore('photos').count(); q.onsuccess = () => res(q.result); }); return { state: AU.G.ms('m_e5').state, photos: n }; });
  T('정상 완료', r2.state === 'done', r2); T('정상 경로 사진 1장 보관', r2.photos === 1, r2.photos);
  T('페이지 오류 없음', errs.length === 0, errs); console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0);
})();
