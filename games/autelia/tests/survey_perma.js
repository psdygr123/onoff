/* 설문 기록(K-PERMA) 시험: 문항·채점(독립 계산)·화면·비교·CSV */
const { chromium } = require('playwright');
const BASE = process.env.GAME_URL || 'http://localhost:8801', SH = (process.env.SHOTS || '/tmp/claude-0/shots') + '/';
const R = []; const note = (id, name, ok, ev) => { R.push({ id, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + ' :: ' + ev); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.goto(BASE + '/index.html?survey=1'); await ev(() => localStorage.clear()); await p.goto(BASE + '/index.html?survey=1'); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(300);
  if (await p.$('#job-next')) { await p.click('#job-next'); await sleep(200); } if (await p.$('#charsetup')) { await p.fill('#sname', '시험용'); await p.click('#setup-ok'); await sleep(300); }
  await ev(() => { AU.Prologue.debugComplete('arche'); AU.G.S.flags.missionsUnlocked = true; AU.G.discoverMissions(); }); await sleep(200);
  const openRecord = async () => { await ev(() => { AU.UI.close(); AU.UI.survey.view = 'list'; AU.UI.survey.key = null; AU.UI.survey.phase = null; AU.UI.tab.j = 'record'; AU.UI.open('journal'); }); await sleep(300); };
  const meta = await ev(() => { const s = AU.SCALES.perma_ko; const g = {}; s.items.forEach((i) => (g[i.subscale] = g[i.subscale] || []).push(i.n)); return { n: s.items.length, g, range: [s.min, s.max], rev: s.items.filter((i) => i.reversed).length, ch: s.choices.length, anch: s.choices.some((c) => c.label), rights: s.review.rightsStatus, first: s.items[0].text, last: s.items[22].text }; });
  note('P1', '문항 23개·0~10(11칸)·역채점 없음·응답 설명 임의 생성 없음', meta.n === 23 && meta.range.join() === '0,10' && meta.rev === 0 && meta.ch === 11 && !meta.anch, JSON.stringify({ n: meta.n, ch: meta.ch, anch: meta.anch }));
  const exp = { P: [3, 13, 22], E: [2, 10, 17], R: [8, 19, 21], M: [7, 9, 20], A: [1, 5, 15], N: [4, 14, 16], H: [6, 12, 18], L: [11], T: [23] };
  note('P2', '하위요인 문항 번호가 논문 표 1과 일치', JSON.stringify(meta.g) === JSON.stringify(Object.fromEntries(Object.entries(exp).sort((a, b) => 'AEPNHMRLT'.indexOf(a[0]) - 'AEPNHMRLT'.indexOf(b[0])).map(([k, v]) => [k, v]))) || Object.keys(exp).every((k) => meta.g[k].join() === exp[k].join()), JSON.stringify(meta.g));
  note('P2b', '첫·끝 문항 원문', meta.first === '자신의 목표 달성을 위해 나아가고 있다고 느끼는 시간이 얼마나 됩니까?' && meta.last === '모든 것들을 종합해서 당신은 얼마나 행복하다고 말할 수 있습니까?', meta.first.slice(0, 20) + ' … ' + meta.last.slice(0, 14));
  // 채점: 같은 값 k → 모든 지표 k, 부정정서가 섞이지 않음
  const same = await ev(() => { const s = AU.SCALES.perma_ko, out = []; for (const k of [0, 5, 10]) { const r = {}; s.items.forEach((i) => (r[i.itemId] = k)); const x = AU.Survey.score(r, s).scores; out.push([k, x.P, x.E, x.R, x.M, x.A, x.N, x.H, x.L, x.T, x.permaMean15, x.overall16].every((v, i) => i === 0 || v === k)); } return out.every(Boolean); });
  note('P3', '모든 응답이 k일 때 모든 지표가 k(k=0,5,10)', same === true, String(same));
  const mix = await ev(() => { const s = AU.SCALES.perma_ko, r = {}; s.items.forEach((i) => (r[i.itemId] = 5)); [4, 14, 16, 11].forEach((n) => (r['perma_' + String(n).padStart(2, '0')] = 10)); const x = AU.Survey.score(r, s).scores; return { pm: x.permaMean15, ov: x.overall16, N: x.N, L: x.L }; });
  note('P4', '부정정서·외로움이 PERMA 평균·전반 웰빙에 섞이지 않음', mix.pm === 5 && mix.ov === 5 && mix.N === 10 && mix.L === 10, JSON.stringify(mix));
  const resp = [7, 5, 8, 2, 6, 9, 4, 10, 3, 7, 1, 8, 6, 0, 5, 2, 9, 7, 8, 4, 6, 10, 5]; // 1~23번
  const ind = await ev((rs) => { const s = AU.SCALES.perma_ko, r = {}; rs.forEach((v, i) => (r[s.items[i].itemId] = v)); const x = AU.Survey.score(r, s).scores; return x; }, resp);
  const avg = (ns) => ns.reduce((a, n) => a + resp[n - 1], 0) / ns.length, core = [3, 13, 22, 2, 10, 17, 8, 19, 21, 7, 9, 20, 1, 5, 15];
  const near = (a, b) => Math.abs(a - b) < 1e-5;
  note('P5', '독립 계산과 일치(5영역·참고 4개·15문항 평균·16문항 평균)', Object.entries(exp).every(([k, ns]) => near(ind[k], avg(ns))) && near(ind.permaMean15, avg(core)) && near(ind.overall16, avg(core.concat([23]))), JSON.stringify(ind));
  const part = await ev(() => { const s = AU.SCALES.perma_ko, r = {}; s.items.forEach((i) => (r[i.itemId] = 5)); delete r.perma_23; const x = AU.Survey.score(r, s); return { valid: x.valid, sc: x.scores, miss: x.missing }; });
  note('P6', '한 문항이라도 비면 점수를 만들지 않음', part.valid === false && part.sc === null && part.miss.join() === '23', JSON.stringify(part));
  // 화면
  await openRecord();
  const lst = await ev(() => ({ scales: Array.from(document.querySelectorAll('.svlist')).map((e) => e.dataset.scale).join(), rows: document.querySelectorAll('.svrow').length }));
  note('P7', '목록에 PSS·PERMA 두 척도, 각각 3시점', lst.scales === 'pss,perma' && lst.rows === 6, JSON.stringify(lst));
  await p.click('[data-scale="perma"] [data-phase="pre"] [data-act="start"]'); await sleep(120); await p.click('[data-act="begin"]'); await sleep(150);
  const form = await ev(() => ({ items: document.querySelectorAll('.svitem').length, opts: document.querySelectorAll('.svitem:first-of-type input').length, checked: document.querySelectorAll('.svitem input:checked').length, dis: document.querySelector('[data-act="review"]').disabled, hasInst: !!document.querySelector('.svinst'), hint: /가장 낮은 쪽/.test(document.querySelector('.svbox .note').textContent) }));
  note('P8', '23문항·문항당 0~10 11칸·초기 선택 없음·제출 비활성·가짜 지시문 없음·방향 안내(게임 문구) 표시', form.items === 23 && form.opts === 11 && form.checked === 0 && form.dis && !form.hasInst && form.hint, JSON.stringify(form));
  const same2 = await ev(() => Array.from(document.querySelectorAll('.svitem legend')).map((l) => l.textContent.replace(/^\d+/, '')).join('|') === AU.SCALES.perma_ko.items.map((i) => i.text).join('|'));
  note('P9', '화면 문항 문구 = 데이터 원문', same2 === true, String(same2));
  for (let i = 0; i < 23; i++) await p.click('label[for="sv-perma_' + String(i + 1).padStart(2, '0') + '-' + resp[i] + '"]');
  await p.screenshot({ path: SH + 'perma_form.png' });
  const dr = await ev(() => ({ n: Object.keys(AU.Survey.load().drafts['perma|pre'].responses).length, zero: AU.Survey.load().drafts['perma|pre'].responses.perma_14 }));
  note('P10', '23개 응답 저장(0점 응답 포함)', dr.n === 23 && dr.zero === 0, JSON.stringify(dr));
  await p.click('[data-act="review"]'); await p.click('[data-act="submit"]'); await sleep(200);
  const res = await ev(() => ({ bars: document.querySelectorAll('.svbar').length, pm: document.querySelector('.sv-pm').textContent, extras: Array.from(document.querySelectorAll('.sv-x')).map((e) => e.textContent).join(' '), sub: AU.Survey.submissionFor('perma', 'pre').scores }));
  note('P11', '결과: 5영역 막대·PERMA 평균·참고 4개', res.bars === 5 && /\/ 10/.test(res.pm) && /외로움/.test(res.extras) && near(res.sub.permaMean15, avg(core)), res.pm + ' | ' + res.extras);
  await p.screenshot({ path: SH + 'perma_result.png' });
  // 사후 + 비교
  await ev(() => { const s = AU.SCALES.perma_ko; s.items.forEach((i, k) => AU.Survey.setAnswer('perma', 'post', i.itemId, [7, 6, 9, 2, 7, 9, 5, 10, 4, 7, 1, 8, 7, 0, 6, 2, 9, 8, 8, 5, 7, 10, 6][k])); AU.Survey.submit('perma', 'post'); });
  await openRecord(); await p.click('[data-scale="perma"] [data-phase="post"] [data-act="result"]'); await sleep(150);
  const cmp = await ev(() => ({ prev: document.querySelectorAll('.svbar .prev').length, bd: document.querySelector('.svbar[data-perma="P"] .bd').textContent, txt: document.querySelector('.svbox').textContent }));
  note('P12', '시작 전 대비: 이전 표식 5개, 차이 표시, 판정 문구 없음', cmp.prev === 5 && /이전/.test(cmp.bd) && !/호전|악화/.test(cmp.txt), cmp.bd);
  await p.screenshot({ path: SH + 'perma_compare.png' });
  // CSV
  const csv = await ev(() => AU.Survey.csv('perma')); const L = csv.replace(/^﻿/, '').trim().split('\r\n'), H = L[0].split(','), Rw = L[1].split(',');
  note('P13', 'CSV(PERMA): 별도 열 사전·raw 23열·역채점 열 없음·행 2건', H.includes('raw_item_23') && !H.some((c) => c.startsWith('scored_item')) && H.includes('perma_mean15') && H.includes('overall16_with_happiness') && L.length === 3 && Rw[H.indexOf('raw_item_14')] === '0' && Rw[H.indexOf('instrumentId')] === 'perma_kperma_shim_kim_2019', 'cols=' + H.length + ' rows=' + (L.length - 1));
  const pss = await ev(() => AU.Survey.csv('pss')); note('P14', 'PSS CSV에 PERMA 행이 섞이지 않음', pss.replace(/^﻿/, '').trim().split('\r\n').length === 1, 'pss rows=' + (pss.trim().split('\r\n').length - 1));
  const sav = await ev(() => JSON.stringify(AU.G.S).includes('perma_0')); note('P15', '게임 저장에 설문 응답이 섞이지 않음', sav === false, String(sav));
  note('P16', '페이지 오류 없음', errs.length === 0, errs.join(' | ') || 'none');
  await b.close(); const f = R.filter((r) => !r.ok); console.log('\n' + (R.length - f.length) + '/' + R.length + ' PASS'); process.exit(f.length ? 1 : 0);
})();
