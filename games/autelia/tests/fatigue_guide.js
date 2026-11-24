/* Lv.10 전에는 HP만, 스킬을 배우는 순간 피로도 안내 두 장 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fails = 0; const ck = (k, ok, ev) => { console.log((ok ? 'PASS ' : 'FAIL ') + k + (ev ? ' :: ' + ev : '')); if (!ok) fails++; };
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    const ev = (fn, a) => p.evaluate(fn, a), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await p.goto((process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards'); await ev(() => localStorage.clear()); await p.reload();
    await p.click('#btn-start'); for (let i = 0; i < 2 && await p.$('#job-next'); i++) await p.click('#job-next');
    if (await p.$('#charsetup')) { await p.fill('#sname', '검증'); await p.click('#setup-ok'); }
    await ev(() => AU.Prologue.debugComplete('arche')); await sleep(600);
    const hid0 = await ev(() => getComputedStyle(document.querySelector('.bar.rs')).display);
    ck('F1 스킬을 배우기 전에는 피로도 막대가 숨겨짐(HP만)', hid0 === 'none', hid0);
    await ev(() => { AU.G.S.level = 10; AU.G.awaken(); }); await sleep(3500);
    const m1 = await ev(() => ({ t: (document.querySelector('.rb-intro h3') || {}).textContent, btn: [...document.querySelectorAll('.rb-intro .btn')].map((x) => x.textContent) }));
    ck('F2 각성 직후 피로도 안내 1장', m1.t === '피로도를 알아 두세요' && m1.btn.join() === '다음', JSON.stringify(m1));
    await p.click('.rb-intro .btn.primary'); await sleep(500);
    const m2 = await ev(() => ({ item: !!document.querySelector('.rb-item img'), eff: (document.querySelector('.rb-item div span') || {}).textContent, t: (document.querySelector('.rb-intro h3') || {}).textContent, body: (document.querySelector('.rb-intro .note') || {}).textContent, btn: [...document.querySelectorAll('.rb-intro .btn')].map((x) => x.textContent) }));
    ck('F3 안내 2장: 쉼·피로회복제(그림·회복량 10)', m2.t === '피로도는 이렇게 줄여요' && /쉼/.test(m2.body) && /피로회복제/.test(m2.body) && m2.item && /10/.test(m2.eff || '') && m2.btn.join() === '알겠어요', JSON.stringify(m2));
    await p.screenshot({ path: '/tmp/guide2.png' });
    await p.click('.rb-intro .btn.primary'); await sleep(400);
    const after = await ev(() => ({ seen: AU.G.S.flags.fatigueGuideSeen, vis: getComputedStyle(document.querySelector('.bar.rs')).display, modal: !!document.querySelector('.rb-intro') }));
    ck('F4 안내는 한 번만, 이후 피로도 막대 표시', after.seen && after.vis !== 'none' && !after.modal, JSON.stringify(after));
    ck('F99 오류 없음', errs.length === 0, errs.join(' | '));
  } catch (e) { console.log('FAIL EXC ' + e.message); fails++; } finally { await b.close(); }
  process.exit(fails ? 1 : 0);
})();
