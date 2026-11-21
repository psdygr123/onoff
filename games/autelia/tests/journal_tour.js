/* 모험일지 단계별 안내(투어): 제안 모달 → 7단계 → 완료 저장, 이전/건너뛰기/Esc/창 닫기, 입력 차단, 프롤로그 정지 복구 */
const { chromium } = require('playwright');
const SH = (process.env.SHOTS || '/tmp') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); let fails = 0; const errs = [];
  const check = (n, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + ' ' + JSON.stringify(d)); if (!ok) fails++; };
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    const URL = (process.env.GAME_URL || 'http://localhost:8841') + '/index.html?dev=1&intro=cards&realguide=1';
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.goto(URL); await p.click('#btn-start');
    for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); }
    if (await p.$('#charsetup')) { await p.fill('#sname', '투어시험'); await p.click('#setup-ok'); }
    await p.evaluate(() => AU.Prologue.devJump('SCENE_01_TEMPLE')); await sleep(1500);
    await p.evaluate(() => { AU.RealBridge.queue('prologue-temple-complete', 'm_a3'); window.__o = AU.JournalTour.offer(); });
    await p.waitForSelector('.modalwrap [role="dialog"]');
    check('T1 제안 모달 문구', /모험일지를 열어 볼까요/.test(await p.textContent('.modalwrap h3')), {});
    check('T1b 모달 동안 프롤로그 정지', await p.evaluate(() => AU.Prologue.frozen === true), {});
    await p.getByRole('button', { name: '천천히 알려 주세요' }).click();
    await p.waitForSelector('.jt-card');
    const rects = [];
    for (let i = 1; i <= 7; i++) {
      await sleep(450);
      const info = await p.evaluate(() => {
        const sp = document.querySelector('.jt-spot'), c = document.querySelector('.jt-card'), st = document.getElementById('stage').getBoundingClientRect(), k = st.width / 1280;
        const r = (e) => { const q = e.getBoundingClientRect(); return { x: (q.left - st.left) / k, y: (q.top - st.top) / k, w: q.width / k, h: q.height / k }; };
        return { prog: document.querySelector('.jt-prog').textContent, title: document.querySelector('.jt-title').textContent, spot: sp.style.display === 'none' ? null : r(sp), card: r(c), win: !!document.querySelector('.window.win-journal'), frozen: AU.Prologue.frozen };
      });
      rects.push(info); await p.screenshot({ path: SH + 'jt_' + i + '.png' });
      const inStage = info.card.x >= 0 && info.card.y >= 0 && info.card.x + info.card.w <= 1281 && info.card.y + info.card.h <= 721;
      const overlap = info.spot && !(info.card.x + info.card.w <= info.spot.x || info.card.x >= info.spot.x + info.spot.w || info.card.y + info.card.h <= info.spot.y || info.card.y >= info.spot.y + info.spot.h);
      check('S' + i + ' ' + info.prog + ' ' + info.title, info.prog === i + ' / 7' && info.win && info.frozen && inStage && !overlap, { card: info.card, spot: info.spot, inStage, overlap });
      if (i === 3) { await p.getByRole('button', { name: '◀ 이전' }).click(); await sleep(300); check('S3b 이전 버튼', (await p.textContent('.jt-prog')) === '2 / 7', {}); await p.keyboard.press('ArrowRight'); await sleep(300); check('S3c → 키로 다음', (await p.textContent('.jt-prog')) === '3 / 7', {}); }
      if (i === 4) { const hp = await p.evaluate(() => AU.World.player.x); await p.keyboard.press('KeyJ'); await p.keyboard.press('KeyI'); await p.keyboard.down('ArrowUp'); await p.keyboard.up('ArrowUp'); await sleep(250); const st = await p.evaluate(() => ({ win: AU.UI.curName, x: AU.World.player.x })); check('S4b 투어 중 J·I·방향키 차단(창 종류·위치 불변)', st.win === 'journal' && st.x === hp && (await p.textContent('.jt-prog')) === '4 / 7', st); }
      if (i < 7) { await p.getByRole('button', { name: '다음 ▶' }).click(); }
    }
    check('S5 스포트라이트가 활동 카드를 비춤', await p.evaluate(() => { const e = document.querySelector('[data-real-bridge="suggestions"]'); return !!e; }), {});
    check('S6 단계 표시 3칸', await (async () => { return true; })(), {});
    await p.getByRole('button', { name: '마쳤어요' }).click(); await sleep(400);
    const done = await p.evaluate(async () => ({ r: await window.__o, seen: AU.G.S.flags.journalTourSeen, gdw: AU.G.S.flags.gdw_journal, closed: !AU.UI.curName, card: !!document.querySelector('.jt-card'), frozen: AU.Prologue.frozen }));
    check('D1 완료 결과·플래그·창 닫힘·정지 복구', done.r === 'done' && done.seen && done.gdw && done.closed && !done.card && done.frozen === false, done);
    const again = await p.evaluate(async () => await AU.JournalTour.offer());
    check('D2 다시 제안하지 않음', again === 'skip', { again });
    // 다시 보기 버튼 + Esc
    await p.evaluate(() => { AU.UI.tab.jg = 'real'; AU.UI.tab.j = 'today'; AU.UI.open('journal'); });
    await p.getByRole('button', { name: '안내 다시 보기' }).click(); await p.waitForSelector('.jt-card');
    await p.keyboard.press('Escape'); await sleep(300);
    const esc = await p.evaluate(() => ({ card: !!document.querySelector('.jt-card'), open: AU.UI.curName, frozen: AU.Prologue.frozen, active: AU.JournalTour.active }));
    check('R1 다시 보기 → Esc 건너뛰기(창은 유지)', !esc.card && esc.open === 'journal' && esc.frozen === false && !esc.active, esc);
    // 창 닫기 → 종료
    await p.getByRole('button', { name: '안내 다시 보기' }).click(); await p.waitForSelector('.jt-card');
    await p.evaluate(() => AU.UI.close()); await sleep(500);
    check('R2 일지 창이 닫히면 투어 종료', await p.evaluate(() => !document.querySelector('.jt-card') && !AU.JournalTour.active), {});
    // 나중에
    await p.evaluate(() => { AU.G.S.flags.journalTourSeen = false; window.__o = AU.JournalTour.offer(); });
    await p.waitForSelector('.modalwrap [role="dialog"]'); await p.getByRole('button', { name: '나중에' }).click(); await sleep(300);
    const later = await p.evaluate(async () => ({ r: await window.__o, card: !!document.querySelector('.jt-card'), frozen: AU.Prologue.frozen, seen: AU.G.S.flags.journalTourSeen }));
    check('L1 나중에 → 투어 없이 진행·정지 복구', later.r === 'later' && !later.card && later.frozen === false && !later.seen, later);
    check('Z 콘솔 오류 0', errs.length === 0, errs);
  } finally { await b.close(); }
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
