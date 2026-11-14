/* 2026-11-12 시험 피드백 반영 확인: 도입 글·이전 버튼·방향 화살표·퀘스트 추적창·조작 안내·피로도 설명 */
const { chromium } = require('playwright');
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1', SH = (process.env.SHOTS || '/tmp/claude-0/shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); let pass = 0, fail = 0;
const note = (id, name, ok, ev) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (ev ? ' :: ' + ev : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource|fonts/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, a) => p.evaluate(fn, a);
  const fresh = async () => { await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300); if (await p.$('#charsetup')) { await p.fill('#sname', '시험'); await p.click('#setup-ok'); } await sleep(1500); };
  // ===== A. 도입 글 =====
  await fresh();
  const cards = await ev(() => AU.PRO_TEXT.cards);
  note('A1', '도입 글 카드 5장·새 문구', cards.length === 5 && cards[1][0] === '대륙의 잔잔한 계곡 사이에 위치해 있던' && cards[2][0].startsWith('빛의 전쟁 승리 후 100주년') && cards[3][0].startsWith('목수인 아버지를 도와 나 역시'), JSON.stringify(cards.slice(1, 4)));
  note('A2', '카드 규칙(3줄·줄당 28자 이내)', cards.every((c) => c.length <= 3 && c.every((l) => l.length <= 28)), cards.map((c) => c.map((l) => l.length).join('/')).join(' | '));
  note('A3', '불타는 마을 나레이션 문구', (await ev(() => AU.PRO_TEXT.lookNarr)) === '나의 마을, 나의 아르케아가...');
  // ===== B. 이전 버튼(프롤로그 대화) =====
  await ev(() => AU.Prologue.skip && 0); await sleep(300);
  await ev(() => { const P = AU.Prologue; P.skipping = false; AU.UI.say(AU.PRO_SPEAKERS.hero, [{ npc: AU.PRO_SPEAKERS.hero, t: '첫째 줄' }, { npc: AU.PRO_SPEAKERS.father, t: '둘째 줄' }, { npc: AU.PRO_SPEAKERS.hero, t: '셋째 줄' }], { noCancel: true }); });
  const t0 = await ev(() => ({ line: document.querySelector('.dline').textContent, back: !!document.querySelector('.dback') }));
  await p.keyboard.press('Space'); await sleep(100); await p.keyboard.press('Space'); await sleep(100);
  const t2 = await ev(() => ({ line: document.querySelector('.dline').textContent, back: !!document.querySelector('.dback'), name: document.querySelector('.dname').textContent }));
  await p.click('.dback'); await sleep(100); const t1 = await ev(() => ({ line: document.querySelector('.dline').textContent, name: document.querySelector('.dname').textContent }));
  await p.keyboard.press('ArrowLeft'); await sleep(100); const tl = await ev(() => document.querySelector('.dline').textContent);
  note('B1', '첫 줄에는 이전 버튼 없음', t0.line === '첫째 줄' && !t0.back);
  note('B2', '셋째 줄에서 이전 버튼 표시·클릭하면 둘째 줄(말하는 사람도 되돌아감)', t2.line === '셋째 줄' && t2.back && t1.line === '둘째 줄' && t1.name === '아버지', JSON.stringify({ t2, t1 }));
  note('B3', '← 키로도 이전 줄', tl === '첫째 줄', tl);
  await ev(() => { AU.UI.dialog = null; AU.UI.dlgEl.classList.add('hidden'); AU.UI.dlgEl.innerHTML = ''; });
  // ===== C. 목표 방향 화살표 =====
  await ev(() => { AU.Prologue.beginScene(0); }); await sleep(600);
  await ev(() => { const P = AU.Prologue; P.skipping = true; });
  await sleep(2500);
  const state = await ev(() => ({ cs: !!AU.Prologue.cs, mapId: AU.World.mapId, gt: AU.Prologue.guideTarget() }));
  console.log('  (진단)', JSON.stringify(state));
  await ev(() => { const P = AU.Prologue; P.cs = null; P.frozen = false; P.skipping = false; P.fadeS.a = 0; P.cardsEl.classList.remove('on'); AU.World.player.x = 200; });
  const g1 = await ev(() => AU.Prologue.guideTarget());
  note('C1', '기념비가 화면 밖이면 오른쪽 방향 안내', !!g1 && g1.dir === 1, JSON.stringify(g1));
  await ev(() => { AU.Prologue.ents.forEach((e) => { e.mark = false; }); AU.Prologue.triggers.forEach((t) => { if (t.goal != null) t.dead = false; }); AU.Prologue.triggers.push({ id: 'x', goal: 90, dead: false, test: () => false, fn() {} }); AU.World.player.x = 1500; });
  const g2 = await ev(() => AU.Prologue.guideTarget());
  note('C2', '목표가 왼쪽이면 왼쪽 방향 안내', !!g2 && g2.dir === -1, JSON.stringify(g2));
  // ===== D. 퀘스트 추적창·조작 안내 =====
  await fresh(); // 신규 → 프롤로그. 본편 상태로 강제 전환
  await ev(() => { AU.G.S.prologue.state = 'COMPLETED'; AU.Prologue.on = false; AU.Prologue.setHud(false); AU.World.enterMap('porto', 400, true); AU.World.trans = null; AU.Prologue.frozen = false; AU.Prologue.cs = null; });
  await sleep(600);
  const kh = await ev(() => ({ vis: getComputedStyle(document.querySelector('.keyhint')).display, txt: document.querySelector('.keyhint').textContent }));
  note('D1', '초반(Lv.5 미만) 조작 안내가 화면 아래에 상시 표시', kh.vis === 'block' && /공격 Control|공격 Ctrl|공격/.test(kh.txt) && /점프/.test(kh.txt), JSON.stringify(kh));
  const tr0 = await ev(() => document.querySelector('.tracker').innerText);
  note('D2', '퀘스트가 없을 때 새 의뢰·Lv.10 목표 안내', /다음 목표/.test(tr0) && /새 의뢰: 첫 사냥/.test(tr0) && /Lv\.10까지/.test(tr0), tr0.replace(/\n/g, ' / '));
  await ev(() => { AU.G.startQuest('q_first'); }); await sleep(400);
  const tr1 = await ev(() => document.querySelector('.tracker').innerText);
  note('D3', '들여우 퀘스트: 숲길까지 가는 방향(항구 길 포털) 안내', /숲길 방향: ◀ 왼쪽 끝의 '항구 길'/.test(tr1), tr1.replace(/\n/g, ' / '));
  await ev(() => { const S = AU.G.S; S.level = 8; S.quests.q_first = { state: 'done', prog: [3] }; S.quests.q_forest = { state: 'done', prog: [5] }; S.quests.q_guild_talk = { state: 'done', prog: [1] }; S.quests.q_guild_rats = { state: 'done', prog: [8] }; delete S.quests.q_first.state; S.quests.q_first.state = 'done'; AU.G.startQuest('q_guild_crabs'); AU.G.startQuest('q_job'); S.level = 10; AU.G.startQuest('q_job'); S.quests.q_guild_crabs = { state: 'ready', prog: [5] }; });
  await sleep(500);
  const tr2 = await ev(() => ({ t: document.querySelector('.tracker').innerText, n: document.querySelectorAll('.tracker .tq').length }));
  note('D4', '퀘스트 2개(집게 게 완료·전직 시험 진행)가 동시에 보임', tr2.n >= 2 && /집게 게 퇴치/.test(tr2.t) && /전직 시험/.test(tr2.t) && /의뢰인에게 돌아가기: 선창 길드 접수/.test(tr2.t) && /선창 외곽 방향|이 지역/.test(tr2.t), tr2.t.replace(/\n/g, ' / '));
  await ev(() => { AU.G.S.level = 5; });
  await sleep(300);
  const kh2 = await ev(() => getComputedStyle(document.querySelector('.keyhint')).display);
  note('D5', 'Lv.5 이상이면 조작 안내 숨김', kh2 === 'none', kh2);
  // ===== E. NPC 재방문 시 조작 안내 반복 =====
  await ev(() => { const S = AU.G.S; S.level = 1; S.quests = { q_first: { state: 'active', prog: [0] } }; AU.World.enterMap('porto', 330, true); AU.World.trans = null; AU.World.player.x = 330; });
  await sleep(300); await p.keyboard.press('Space'); await sleep(200);
  const lines = []; for (let i = 0; i < 4; i++) { const l = await ev(() => document.querySelector('.dline') && document.querySelector('.dline').textContent); if (!l) break; lines.push(l); await p.keyboard.press('Space'); await sleep(150); }
  note('E1', '진행 중 재방문: 공격·점프 키 안내가 다시 나옴(키 이름 치환)', lines.some((l) => /공격은 .*Control.*|공격은 Ctrl|공격은 /.test(l) && !/\{attack\}/.test(l)) && !lines.some((l) => /\{/.test(l)), JSON.stringify(lines));
  // ===== F. 피로도 설명 =====
  const tip = await ev(() => document.querySelector('.hudbars').children[1].title);
  note('F1', 'HUD 피로도 막대에 설명(마우스를 올리면)', /스킬을 쓸 때마다 쌓이는 수치/.test(tip), tip);
  await ev(() => { AU.G.S.jobChanged = true; AU.G.S.skills.unlocked = ['strike', 'spin', 'focus']; AU.UI.open('skills'); }); await sleep(200);
  const sk = await ev(() => document.querySelector('.note.vigor') && document.querySelector('.note.vigor').textContent);
  note('F2', '스킬 창 상단에 피로도 설명', !!sk && /피로도란/.test(sk), sk);
  await p.screenshot({ path: SH + 'fb_skill.png' });
  note('Z', '오류 없음', errs.length === 0, errs.join(' | '));
  console.log('합계 ' + pass + '/' + (pass + fail) + ' 통과'); await b.close(); process.exit(fail ? 1 : 0);
})();
