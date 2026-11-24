/* K 스킬 창: 5칸 + 안내문 (11-24) */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let fail = 0;
const T = (l, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + ' :: ' + JSON.stringify(d)); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  for (let i = 0; i < 2 && await p.$('#job-next'); i++) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); }
  await sleep(300);
  await ev(() => { AU.G.S.level = 20; AU.G.S.jobChanged = true; AU.G.S.skills.unlocked = ['strike','spin','focus']; AU.G.changed(); AU.UI.open('skills'); }); await sleep(400);
  const L = await ev(() => { const s = [...document.querySelectorAll('.skslots .skslot')]; const r = s.map((e) => e.getBoundingClientRect()); const par = document.querySelector('.skslots').getBoundingClientRect();
    return { n: s.length, keys: s.map((e) => e.querySelector('.skey').textContent).join(','), inside: r.every((q) => q.right <= par.right + 1), note: [...document.querySelectorAll('.note')].map((n) => n.textContent).join('|') }; });
  T('슬롯 5개·키 1~5', L.n === 5 && L.keys === '1,2,3,4,5', L);
  T('칸이 창 밖으로 안 넘침', L.inside, L.inside);
  T('안내문에 4·5번 설명', /4·5번/.test(L.note), L.note.slice(-80));
  T('JS 오류 없음', errs.length === 0, errs);
  await b.close(); process.exit(fail ? 1 : 0);
})();
