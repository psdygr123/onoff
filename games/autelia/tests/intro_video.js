/* 도입 영상 시험: 재생·자막·처음 보는 사람은 건너뛰기 불가·본 사람은 건너뛰기 가능·영상 실패 시 글 카드 대체 */
const { chromium } = require('playwright');
const BASE = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=0';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function begin(p, url) {
  await p.goto(url); await p.evaluate(() => { const seen = localStorage.getItem('__keepSeen'); localStorage.clear(); }); await p.goto(url); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  if (await p.$('#job-next')) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
}
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const errs = [];
  // 1) 처음 보는 사람
  let ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); let p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await begin(p, BASE); await sleep(4500);
  const a = await p.evaluate(() => { const v = document.querySelector('.introv video'); return { box: !!document.querySelector('.introv.on'), t: v ? v.currentTime : -1, skip: !!document.querySelector('.introskip'), paused: v ? v.paused : null, src: v ? v.currentSrc.split('/').pop() : '' }; });
  note('V1', '영상이 재생됨', a.box && a.t > 1 && a.paused === false, JSON.stringify(a));
  note('V2', '처음 보는 사람에게는 건너뛰기 버튼 없음', !a.skip, String(a.skip));
  await sleep(1500);
  const sub = await p.evaluate(() => ({ show: document.querySelector('.introsub').classList.contains('show'), txt: document.querySelector('.introsub').textContent }));
  note('V3', '자막이 영상 시간에 맞춰 나옴', sub.show && /이름도 모양도/.test(sub.txt), JSON.stringify(sub));
  await p.keyboard.press('Enter'); await sleep(400);
  note('V4', '처음 보는 사람은 Enter로도 못 건너뜀', await p.evaluate(() => !!document.querySelector('.introv') && !document.querySelector('.introv video').paused), 'still playing');
  // 끝 근처로 이동해 끝까지 재생 → 본 기록 저장
  await p.evaluate(() => { const v = document.querySelector('.introv video'); v.playbackRate = 16; });   // 시험용 서버는 구간 이동을 지원하지 않아 배속으로 끝까지 재생
  await sleep(15000);
  const e = await p.evaluate(() => ({ gone: !document.querySelector('.introv'), seen: AU.Store.get('autelia.introSeen') }));
  note('V5', '끝까지 보면 영상이 닫히고 본 기록이 남음', e.gone && !!e.seen, JSON.stringify(e));
  const nxt = await p.evaluate(() => AU.Prologue.sceneIdx);
  note('V6', '영상 뒤에 프롤로그 첫 장면이 이어짐', nxt === 0, String(nxt));
  await ctx.close();
  // 2) 본 적 있는 사람 (같은 브라우저 기록)
  ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); p = await ctx.newPage(); p.on('pageerror', (e2) => errs.push(e2.message));
  await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.goto(BASE); await p.evaluate(() => AU.Store.set('autelia.introSeen', 1)); await p.reload(); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  if (await p.$('#job-next')) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await sleep(3000);
  const s = await p.evaluate(() => ({ skip: !!document.querySelector('.introskip'), on: !!document.querySelector('.introv.on') }));
  note('V7', '본 적 있는 사람에게는 건너뛰기 버튼이 보임', s.skip && s.on, JSON.stringify(s));
  await p.click('.introskip'); await sleep(1200);
  note('V8', '건너뛰기를 누르면 영상이 닫히고 게임이 이어짐', await p.evaluate(() => !document.querySelector('.introv') && AU.Prologue.on), 'closed');
  await ctx.close();
  // 3) 영상 실패 → 글 카드
  ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); p = await ctx.newPage(); p.on('pageerror', (e2) => errs.push(e2.message));
  await p.route('**/assets/video/**', (r) => r.abort());
  await begin(p, BASE); await sleep(1500);
  const c = await p.evaluate(() => ({ cards: document.querySelector('.procards').classList.contains('on') }));
  note('V9', '영상을 못 불러오면 글 카드로 대체됨', c.cards, JSON.stringify(c));
  note('Z', '페이지 오류 없음', errs.length === 0, errs.slice(0, 2).join('||') || '0건');
  await b.close(); const f = R.filter((x) => !x.ok); console.log('\n' + (R.length - f.length) + '/' + R.length + ' PASS'); process.exit(f.length ? 1 : 0);
})();
