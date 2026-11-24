/* 안내 문장 단축키 강조: [E] → 색 글쇠, [장착] 같은 한글 버튼 이름은 그대로, **굵게** 유지 */
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); let fail = 0;
  const T = (l, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + l + ' :: ' + JSON.stringify(d)); if (!ok) fail++; };
  await p.goto((process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1&intro=cards'); await p.waitForFunction(() => window.AU && AU.keyRich);
  const r = await p.evaluate(() => { const d = document.createElement('div'); AU.keyRich('장비창은 [E] 키, [Shift] 이동, [장착] 버튼, **굵게**').forEach((n) => d.append(n)); return { keys: [...d.querySelectorAll('.gkey')].map((x) => x.textContent), em: [...d.querySelectorAll('.rb-em')].map((x) => x.textContent), text: d.textContent }; });
  T('단축키만 글쇠로 분리', JSON.stringify(r.keys) === '["E","Shift"]', r.keys); T('한글 [장착]은 버튼 이름으로 분리(대괄호 제거)', /장착 버튼/.test(r.text) && !/\[장착\]/.test(r.text), r.text); T('**굵게** 유지', r.em[0] === '굵게', r.em);
    const q = await p.evaluate(() => { const d = document.createElement('div'); AU.keyRich('칸이 {{비어 있음}}이고 {{+끼고 있어요}}').forEach((n) => d.append(n)); return { warn: [...d.querySelectorAll('.gstat.warn')].map((x) => x.textContent), ok: [...d.querySelectorAll('.gstat.ok')].map((x) => x.textContent), text: d.textContent }; });
  T('상태 글씨: 경고·좋음 색 구분', q.warn[0] === '비어 있음' && q.ok[0] === '끼고 있어요' && !/[{}]/.test(q.text), q);
  const g = await p.evaluate(() => { const d = document.createElement('div'); AU.keyRich('[장착]을 누르고 [해제]로 뺍니다, [사용]').forEach((n) => d.append(n)); return { on: [...d.querySelectorAll('.gact.on')].map((x) => x.textContent), off: [...d.querySelectorAll('.gact.off')].map((x) => x.textContent), all: [...d.querySelectorAll('.gact')].length }; });
  T('버튼 이름: 장착=초록, 해제=빨강', g.on[0] === '장착' && g.off[0] === '해제' && g.all === 3, g);
  console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0); })();
