/* 설문 기록(PSS) 시험: 기본 꺼짐 → 켜기 → 응답 → 채점 → 제출·중복 → 저장·CSV → 게임 자원 불변 */
const { chromium } = require('playwright');
const BASE = process.env.GAME_URL || 'http://localhost:8801', SH = (process.env.SHOTS || '/tmp/claude-0/shots') + '/';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, a) => p.evaluate(fn, a);
  async function boot(q) {
    await p.goto(BASE + '/index.html' + q); await p.waitForSelector('#btn-start,#btn-continue'); const c = await p.$('#btn-continue');
    if (c) await c.click(); else { await p.click('#btn-start'); await sleep(300); if (await p.$('#job-next')) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); } }
    await sleep(300); await ev(() => AU.Prologue.debugComplete('arche')); await sleep(200);
    await ev(() => { AU.G.S.flags.missionsUnlocked = true; AU.G.discoverMissions(); AU.G.S.flags.guideMet = true; });
  }
  const openRecord = async () => { await ev(() => { AU.UI.close(); AU.UI.tab.j = 'record'; AU.UI.open('journal'); }); await sleep(300); };
  await p.goto(BASE + '/index.html?dev=1'); await ev(() => localStorage.clear());
  // S1 기본 꺼짐
  await boot('?dev=1'); await openRecord();
  note('S1', '기본은 꺼짐: 마음 기록 탭에 설문 영역 없음', (await p.$('.svbox')) === null && (await ev(() => AU.Survey.enabled())) === false, 'svbox=' + !!(await p.$('.svbox')));
  // 데이터 일치
  const meta = await ev(() => { const s = AU.SCALES.pss10_ko; return { n: s.items.length, rev: s.items.filter((i) => i.reversed).map((i) => i.n), neg: s.items.filter((i) => i.subscale === 'neg').map((i) => i.n), range: [s.min, s.max], recall: s.recall, hash: s.source.sourceSha256.slice(0, 8), rights: s.review.rightsStatus }; });
  note('S2', '문항 10개·역채점 4~8·부정 1,2,3,9,10·0~4·지난 한 달', meta.n === 10 && meta.rev.join() === '4,5,6,7,8' && meta.neg.join() === '1,2,3,9,10' && meta.range.join() === '0,4' && meta.recall === '지난 한 달', JSON.stringify(meta));
  note('S2b', '권한 상태는 미확인으로 기록', meta.rights === 'permission_not_recorded', meta.rights);
  // 켜기(개발 패널 토글)
  await ev(() => { AU.UI.close(); AU.UI.open('dev'); }); await sleep(250); await p.click('[data-dev="survey-toggle"]'); await sleep(200);
  await openRecord();
  note('S3', '개발 패널에서 켜면 설문 영역 표시(2척도×3시점)', (await p.$$('.svrow')).length === 6, 'rows=' + (await p.$$('.svrow')).length);
  const before = await ev(() => JSON.stringify({ f: AU.G.S.fatigue, s: AU.G.S.silver, tp: AU.G.S.trainingPoints, ms: AU.G.S.mindStats, hp: AU.G.S.hp }));
  await p.click('[data-scale="pss"] [data-phase="pre"] [data-act="start"]'); await sleep(150);
  await p.screenshot({ path: SH + 'pss_intro.png' });
  note('S4', '시작 전 안내: 도구명·목적·회상기간·문항 수', /10문항/.test(await p.textContent('.svbox')) && /지난 한 달/.test(await p.textContent('.svbox')), (await p.textContent('.svintro')).slice(0, 60));
  await p.click('[data-act="begin"]'); await sleep(150);
  const form = await ev(() => ({ items: document.querySelectorAll('.svitem').length, checked: document.querySelectorAll('.svitem input:checked').length, disabled: document.querySelector('[data-act="review"]').disabled, inst: document.querySelector('.svinst').textContent === AU.SCALES.pss10_ko.instruction, prog: document.querySelector('.svprog').textContent }));
  note('S5', '10문항 표시·초기 선택 없음·제출 버튼 비활성·지시문 원문', form.items === 10 && form.checked === 0 && form.disabled && form.inst && /0 \/ 10/.test(form.prog), JSON.stringify(form));
  const texts = await ev(() => Array.from(document.querySelectorAll('.svitem legend')).map((l) => l.textContent.replace(/^\d+/, '')).join('|') === AU.SCALES.pss10_ko.items.map((i) => i.text).join('|'));
  note('S6', '화면의 문항 문구가 데이터 원문과 동일', texts === true, String(texts));
  // 응답: 0을 포함해 9개만
  const resp = [3, 1, 2, 4, 0, 2, 3, 1, 0, 4];
  for (let i = 0; i < 9; i++) await p.click('label[for="sv-pss10_' + String(i + 1).padStart(2, '0') + '-' + resp[i] + '"]');
  const mid = await ev(() => ({ prog: document.querySelector('.svprog').textContent, dis: document.querySelector('[data-act="review"]').disabled, d: AU.Survey.load().drafts['pss|pre'].responses }));
  note('S7', '응답 0이 유효값으로 저장되고 미응답과 구분(9개 응답 → 제출 불가)', mid.dis && /9 \/ 10/.test(mid.prog) && mid.d.pss10_05 === 0 && mid.d.pss10_09 === 0 && mid.d.pss10_10 === undefined, JSON.stringify(mid));
  // 나중에 → 이어서
  await p.click('[data-act="later"]'); await sleep(100);
  const st1 = await p.textContent('[data-scale="pss"] [data-phase="pre"] .tag');
  await p.click('[data-scale="pss"] [data-phase="pre"] [data-act="start"]'); await sleep(150);
  const keep = await ev(() => document.querySelectorAll('.svitem input:checked').length);
  note('S8', '미완료로 닫아도 응답 유지·이어하기(작성 중 9/10)', /작성 중 \(9\/10\)/.test(st1) && keep === 9, st1 + ' keep=' + keep);
  // 마지막 문항 → 확인 화면에서 고치기(뒤로)
  await p.click('label[for="sv-pss10_10-' + resp[9] + '"]'); await p.click('[data-act="review"]'); await sleep(100);
  note('S9', '확인 화면: 모두 응답, 제출 가능', await ev(() => !document.querySelector('[data-act="submit"]').disabled), (await p.textContent('.svmsg')));
  await p.click('[data-act="back"]'); await p.click('label[for="sv-pss10_01-0"]'); await p.click('[data-act="review"]'); await p.click('[data-act="submit"]'); await sleep(200);
  resp[0] = 0;
  const res = await ev(() => { const s = AU.Survey.load().submissions; return { n: s.length, sc: s[0] && s[0].scores, st: s[0] && s[0].completionStatus, phase: s[0] && s[0].phase, ver: s[0] && s[0].instrumentVersion, ch: document.querySelector('.sv-neg') && document.querySelector('.sv-neg').textContent }; });
  const refTotal = resp.reduce((a, v, i) => a + ([3, 4, 5, 6, 7].includes(i) ? 4 - v : v), 0), refNeg = [0, 1, 2, 8, 9].reduce((a, i) => a + resp[i], 0), refPos = [3, 4, 5, 6, 7].reduce((a, i) => a + resp[i], 0);
  note('S10', '채점이 독립 계산과 일치(부정 합·긍정 원점수·역채점 합계)', res.n === 1 && res.sc.negSum === refNeg && res.sc.posRawSum === refPos && res.sc.total === refTotal && res.phase === 'pre', JSON.stringify(res.sc) + ' ref=' + [refNeg, refPos, refTotal]);
  note('S11', '결과 화면에 점수 표시·진단/기준선 없음 안내', /\/ 20/.test(res.ch || '') && /기준선이 없습니다/.test(await p.textContent('.svbox')), res.ch);
  await p.screenshot({ path: SH + 'pss_result.png' });
  // 중복 제출·수정 불가
  const dup = await ev(() => { const a = AU.Survey.setAnswer('pss', 'pre', 'pss10_01', 4); const r = AU.Survey.submit('pss', 'pre'); return { set: a, r: r.reason, n: AU.Survey.load().submissions.length }; });
  note('S12', '제출 후 수정·재제출 차단(중복 저장 없음)', dup.set === false && dup.n === 1 && dup.r === 'phase-done', JSON.stringify(dup));
  const bad = await ev(() => ({ a: AU.Survey.setAnswer('pss', 'post', 'pss10_01', 7), b: AU.Survey.setAnswer('pss', 'post', 'pss10_01', 1.5), c: AU.Survey.setAnswer('pss', 'post', 'x', 1), d: AU.Survey.submit('pss', 'post').reason }));
  note('S13', '범위 밖·정수 아님·없는 문항 거부, 미완료 제출 거부', bad.a === false && bad.b === false && bad.c === false && bad.d === 'no-draft', JSON.stringify(bad));
  // 사후 설문 + 비교
  await ev(() => { for (let n = 1; n <= 10; n++) AU.Survey.setAnswer('pss', 'post', 'pss10_' + String(n).padStart(2, '0'), 2); AU.Survey.submit('pss', 'post'); });
  await ev(() => { AU.UI.survey.view = 'list'; AU.UI.survey.phase = null; }); await openRecord(); await p.click('[data-scale="pss"] [data-phase="post"] [data-act="result"]'); await sleep(150);
  const cmpTxt = await p.textContent('.svcmp');
  const post = await ev(() => AU.Survey.load().submissions.find((s) => s.phase === 'post').scores);
  note('S14', '시작 전 대비 변화 표시(같은 버전끼리, 판정 문구 없음)', /부정적 지각/.test(cmpTxt) && post.total === 20 && !/호전|악화|위험|정상/.test(cmpTxt), cmpTxt.slice(0, 80));
  const mixed = await ev(() => { const a = AU.Survey.submissionFor('pss', 'pre'), b = JSON.parse(JSON.stringify(AU.Survey.submissionFor('pss', 'post'))); b.scoringVersion = 'other'; return AU.Survey.compare(a, b); });
  note('S15', '다른 채점 버전끼리는 비교하지 않음', mixed === null, String(mixed));
  // 게임 자원 불변
  const after = await ev(() => JSON.stringify({ f: AU.G.S.fatigue, s: AU.G.S.silver, tp: AU.G.S.trainingPoints, ms: AU.G.S.mindStats, hp: AU.G.S.hp }));
  note('S16', '설문 응답·제출이 피로도·은화·훈련 포인트·마음 스탯·HP를 바꾸지 않음', before === after, before + ' → ' + after);
  const inGameSave = await ev(() => JSON.stringify(AU.G.S).includes('pss10_') || JSON.stringify(AU.G.S).includes('negSum'));
  note('S17', '게임 저장 데이터에 설문 응답이 섞이지 않음(별도 저장)', inGameSave === false, String(inGameSave));
  // CSV
  const csv = await ev(() => AU.Survey.csv('pss')); const lines = csv.replace(/^﻿/, '').trim().split('\r\n'); const hdr = lines[0].split(',');
  const row = lines[1].split(',');
  note('S18', 'CSV: BOM·헤더 37열·행당 1건·원응답/역채점 후 구분', csv.charCodeAt(0) === 0xFEFF && lines.length === 3 && hdr.includes('raw_item_10') && hdr.includes('scored_item_04') && hdr.includes('sourceHash') && row[hdr.indexOf('raw_item_04')] === '4' && row[hdr.indexOf('scored_item_04')] === '0' && row[hdr.indexOf('raw_item_05')] === '0', 'cols=' + hdr.length + ' rows=' + (lines.length - 1) + ' raw04=' + row[hdr.indexOf('raw_item_04')] + ' sc04=' + row[hdr.indexOf('scored_item_04')]);
  const inj = await ev(() => { const d = AU.Survey.load(); d.participantId = '=HYPERLINK("x")'; AU.Survey.save(d); const c = AU.Survey.csv('pss'); return c.includes(",\"'=HYPERLINK") || c.includes(",'=HYPERLINK"); });
  note('S19', 'CSV 수식 삽입 방지(= 시작 값에 작은따옴표)', inj === true, String(inj));
  await ev(() => { const d = AU.Survey.load(); d.participantId = 'P-test'; AU.Survey.save(d); AU.Survey.setAnswer('pss', 'followup', 'pss10_01', 0); });
  const c2 = await ev(() => AU.Survey.csv('pss')); const l2 = c2.replace(/^﻿/, '').trim().split('\r\n'); const rr = l2[3].split(','); const h2 = l2[0].split(',');
  note('S20', 'CSV: 미완료는 완료 상태 incomplete·점수 비움, 응답 0과 빈칸 구분', rr[h2.indexOf('completionStatus')] === 'incomplete' && rr[h2.indexOf('raw_item_01')] === '0' && rr[h2.indexOf('raw_item_02')] === '' && rr[h2.indexOf('total')] === '', l2[3].slice(-90));
  // 저장 후 새로고침 유지
  await p.reload(); await p.waitForSelector('#btn-start,#btn-continue'); const keepSub = await ev(() => AU.Survey.load().submissions.length);
  note('S21', '새로고침 후에도 제출 기록 유지', keepSub === 2, String(keepSub));
  // 모바일 폭 가로 넘침
  await p.setViewportSize({ width: 390, height: 780 }); await boot('?survey=1'); await ev(() => { AU.UI.survey.view = 'list'; AU.UI.survey.phase = null; }); await openRecord(); await p.click('[data-scale="pss"] [data-phase="followup"] [data-act="start"]'); await sleep(150); await p.screenshot({ path: SH + 'pss_form_m.png' });
  const ov = await ev(() => { const w = document.querySelector('.svbox'); return { sw: w.scrollWidth, cw: w.clientWidth }; });
  note('S22', '?survey=1 로 켜짐, 390px 폭에서 가로 넘침 없음', ov.sw <= ov.cw + 1, JSON.stringify(ov));
  note('S23', '페이지 오류 없음', errs.length === 0, errs.join(' | ') || 'none');
  await b.close(); const f = R.filter((r) => !r.ok); console.log('\n' + (R.length - f.length) + '/' + R.length + ' PASS'); process.exit(f.length ? 1 : 0);
})();
