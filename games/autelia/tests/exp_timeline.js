// 경험치 타임라인 시뮬레이션: 메인 경로를 순서대로 밟을 때 퀘스트 최소 레벨까지의 추가 사냥량과 레벨을 계산한다.
// 사용: node /tmp/exp_timeline.js <games/autelia 경로> [json]  (추정치: 실제 플레이 시간이 아님)
const load = require("./exp_load.js");
const root = process.argv[2] || "/home/claude/wt-exp/games/autelia";
const AU = load(root); load.applyOV(AU); const C = AU.CONFIG, M = AU.MONSTERS, Q = AU.QUESTS;
const need = (l) => Math.round(C.exp.base * Math.pow(l, C.exp.exponent));
const CAP = C.levels.capWithoutJob;
const gm = (lv, mlv, boss) => { const gap = lv - (mlv || lv); return boss ? 1 : gap <= 0 ? Math.min(1.3, 1 - gap * 0.1) : gap <= 2 ? 1 : gap === 3 ? 0.7 : gap === 4 ? 0.45 : gap === 5 ? 0.25 : 0.1; };
const atk = (l) => 8 + 2 * (5 + Math.min(l, 10) - 1) + 4 + (l > 10 ? 0 : 0); // 견습검(+4) 기준, 11레벨부터는 자유 포인트(가정: 힘에 전부)
const atkAt = (l) => l <= 10 ? atk(l) : atk(10) + 2 * 3 * (l - 10);
const killSec = (m, l) => Math.ceil(m.hp / atkAt(l)) * C.combat.attackCooldown / 0.65 + 4; // 명중률 65% + 이동·조우 4초
const grindMon = (l) => l < 3 ? "fox" : l < 5 ? "snake" : l < 7 ? "rat" : l < 10 ? "crab" : l < 11 ? "wolf" : l < 12 ? "hide_guard" : l < 13 ? "hide_beast" : "hide_keeper";
const SUB = !!process.env.SUB; // SUB=1: 서브 퀘스트(짐 전하기·집게 게 퇴치)도 함께 진행하는 경우
const MAIN = ["q_s1_silver", "q_s1_test", "q_first", "q_forest", "q_guild_talk"].concat(["q_guild_rats", "q_a1_variant"], SUB ? ["q_a1_parcel"] : [], ["q_a1_traces"], SUB ? ["q_guild_crabs"] : [], ["q_a2_secret", "q_a3_scout", "q_a3_jepeto", "q_h1"]);
const st = { L: 1, e: 0, kills: 0 };
function gain(n) { n = Math.round(n); if (st.L >= CAP) return; st.e += n; while (st.L < CAP && st.e >= need(st.L)) { st.e -= need(st.L); st.L++; } if (st.L >= CAP) st.e = Math.min(st.e, need(st.L) - 1); }
function kill(type) { const m = M[type]; const x = Math.max(1, Math.round(m.exp * gm(st.L, m.lv, m.boss))); gain(x); return killSec(m, st.L); }
const rows = []; let tot = 0;
for (const id of MAIN) {
  const q = Q[id]; if (!q) { console.error("퀘스트 없음", id); continue; }
  let grindK = 0, grindS = 0; const before = st.L;
  while (st.L < (q.minLevel || 1) && grindK < 3000) { grindS += kill(grindMon(st.L)); grindK++; }
  // 퀘스트 처치 목표
  let qs = 0;
  for (const o of q.objectives || []) if (o.kind === "kill") for (let i = 0; i < o.count; i++) qs += kill(o.target);
  if (id === "q_a1_variant") { /* 검은 결정 3개: 쥐 드롭 40%라 평균 7.5마리 */ for (let i = 0; i < 7.5; i++) qs += kill("rat"); }
  const lvBeforeReward = st.L, preProg = Math.round((st.e / need(st.L)) * 100) + "%";
  const r = q.reward || {}; gain(r.exp || 0);
  if (r.levelTo) { let g = 0; while (st.L < r.levelTo && g++ < 30) gain(Math.max(1, need(st.L) - st.e)); }
  tot += grindS + qs;
  rows.push({ id, title: q.title, type: q.type, minLv: q.minLevel, 입장Lv: before, 추가사냥: grindK, 추가사냥분: +(grindS / 60).toFixed(1), 퀘스트분: +(qs / 60).toFixed(1), 보상전Lv: lvBeforeReward, 보상전진행: preProg, 완료Lv: st.L, 진행: Math.round((st.e / need(st.L)) * 100) + "%", 보상exp: r.exp || 0 });
}
for (const r of rows) console.log(r.id.padEnd(14), (r.type === "main" ? "메인" : "서브"), "최소Lv" + String(r.minLv).padEnd(2), "입장Lv" + String(r.입장Lv).padEnd(2), "추가사냥 " + String(r.추가사냥).padStart(3) + "마리(" + r.추가사냥분 + "분)", "퀘스트전투 " + r.퀘스트분 + "분", "│ 보상 직전 Lv" + r.보상전Lv + "(" + r.보상전진행 + ") → 완료 Lv" + r.완료Lv + "(" + r.진행 + ")", "보상exp " + r.보상exp);
console.log("필요 경험치(레벨→다음):", Array.from({ length: 15 }, (_, i) => (i + 1) + ":" + need(i + 1)).join(" "));
console.log("총 추정 시간(분):", (tot / 60).toFixed(1));
if (process.argv[3] === "json") console.log(JSON.stringify(rows));
