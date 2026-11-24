/* 안내 문장 단축키 강조: [E] → 색 글쇠, [장착] 같은 한글 버튼 이름은 그대로, **굵게** 유지 */
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); let fail = 0;
  const T = (l, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + ' :: ' + JSON.stringify(d)); if (!ok) fail++; };
  await p.goto((process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards'); await p.waitForFunction(() => window.AU && AU.keyRich);
  const r = await p.evaluate(() => { const d = document.createElement('div'); AU.keyRich('장비창은 [E] 키, [Shift] 이동, [장착] 버튼, **굵게**').forEach((n) => d.append(n)); return { keys: [...d.querySelectorAll('.gkey')].map((x) => x.textContent), em: [...d.querySelectorAll('.rb-em')].map((x) => x.textContent), text: d.textContent }; });
  T('단축키만 글쇠로 분리', JSON.stringify(r.keys) === '["E","Shift"]', r.keys); T('한글 [장착]은 글자 그대로', /\[장착\]/.test(r.text), r.text); T('**굵게** 유지', r.em[0] === '굵게', r.em);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0); })();
