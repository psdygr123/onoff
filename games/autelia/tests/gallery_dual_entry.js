/* 동일 캐릭터 공간: standalone ?space=1 / RPG 내부 메뉴가 한 저장 데이터를 공유 */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  let fail = 0; const check = (name, pass, data) => { console.log((pass ? 'PASS ' : 'FAIL ') + name + ' :: ' + JSON.stringify(data)); if (!pass) fail++; };
  const base = process.env.GAME_URL || 'http://localhost:8801';
  try {
    await page.goto(base + '/index.html?space=1');
    await page.waitForFunction(() => window.AU && AU.G && AU.UI && AU.UI.curName === 'gallery');
    const first = await page.evaluate(() => ({ running: AU.main.running, standalone: AU.main.galleryOnly, titleHidden: document.querySelector('#title').classList.contains('hidden'), slot: AU.main.slot, startingTokens: AU.G.galleryState().tokens }));
    check('DUAL1 standalone access without RPG start', !first.running && first.standalone && first.titleHidden, first);
    await page.getByRole('button', { name: /오늘 방문 \+1/ }).click();
    const saved = await page.evaluate(() => ({ token: AU.G.galleryState().tokens, date: AU.G.galleryState().attendance.at(-1) }));
    check('DUAL2 standalone attendance saved', saved.token === first.startingTokens + 1 && !!saved.date, saved);
    await page.goto(base + '/index.html?dev=1&intro=cards');
    await page.waitForFunction(() => window.AU && AU.G && AU.main && AU.UI);
    const beforeRpg = await page.evaluate(() => ({ token: AU.G.galleryState().tokens, date: AU.G.galleryState().attendance.at(-1), galleryMode: AU.main.galleryOnly }));
    check('DUAL3 same save is visible from RPG entry', beforeRpg.token === saved.token && beforeRpg.date === saved.date && !beforeRpg.galleryMode, beforeRpg);
    await page.click('#btn-start');
    for (let i = 0; i < 2 && await page.$('#job-next'); i++) { await page.click('#job-next'); }
    if (await page.locator('#charsetup').isVisible()) {
      await page.click('#sg-m'); await page.fill('#sname', '검사자'); await page.click('#setup-ok');
    }
    await page.waitForFunction(() => AU.main.running);
    await page.evaluate(() => AU.UI.open('gallery'));
    const inGame = await page.evaluate(() => ({ name: AU.UI.curName, tokens: AU.G.galleryState().tokens }));
    check('DUAL4 RPG opens identical gallery', inGame.name === 'gallery' && inGame.tokens === saved.token, inGame);
  } finally { await browser.close(); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL ', e); process.exit(1); });
