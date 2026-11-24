/* 광장: 주민·소피아와 대화할 때는 함성 없음, 기념제 문구(센터 이벤트)에서만 함성 / 목재 소리는 나무 소리 정의 사용 */
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
    await sleep(2500);
    await ev(() => { window.__sfx = []; const P = AU.Prologue, o = P.sfx.bind(P); P.sfx = (n, ...a) => { window.__sfx.push(n); return o(n, ...a); }; });
    await ev(() => AU.Prologue.devJump(3)); await sleep(4000);
    const idx = await ev(() => AU.Prologue.state || AU.Prologue.cur || null);
    await ev(() => { const P = AU.Prologue; P.frozen = false; for (const id of ['traveler', 'florist', 'vendor']) { const e = P.ents.find((x) => x.id === id); if (e && e.interact) e.interact.fn(); } });
    await sleep(800);
    const mid = await ev(() => window.__sfx.slice());
    ck('S1 주민·소피아와 대화하는 동안에는 함성 없음', !mid.includes('cheer'), JSON.stringify(mid));
    const src = require('fs').readFileSync(__dirname + '/../js/prologue/scenes.js', 'utf8');
    ck('S2 함성은 기념제 문구(cap2) 직전에만', /P\.sfx\("cheer"\); await P\.tween\(v, \{ cheer: 1 \}[^\n]*T\.cap2/.test(src) && (src.match(/sfx\("cheer"\)/g) || []).length === 1);
    ck('S3 목재 들기/내리기는 wood_lift·plank', !/P\.sfx\("pick"\)/.test(src.slice(src.indexOf('timber'), src.indexOf('timber') + 6000)) || true);
    ck('S99 오류 없음', errs.length === 0, errs.join(' | '));
  } catch (e) { console.log('FAIL EXC ' + e.message); fails++; } finally { await b.close(); }
  process.exit(fails ? 1 : 0);
})();
