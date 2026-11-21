// 데이터 로더: 게임 스크립트를 가짜 window에서 실행해 AU.QUESTS/MONSTERS/MAPS를 얻는다
const vm = require("vm"), fs = require("fs"), path = require("path");
module.exports = function load(root) {
  const stub = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => "" : stub), apply: () => stub, construct: () => stub, set: () => true });
    const ctx = { document: stub, localStorage: stub, navigator: stub, console, Math, Object, Array, JSON, Set, Map, Date, Promise, setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame: () => 0, addEventListener: () => {}, location: { search: "", hash: "" }, Image: function () {}, Audio: function () {}, AudioContext: function () {} };
  ctx.window = ctx.self = ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of ["js/config.js", "js/core.js", "js/data.js", "js/story1.js", "js/story_hideout.js", "js/porto_ext.js"]) {
    try { vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }); } catch (e) { console.error("로드 경고", f, String(e).slice(0, 120)); }
  }
  return ctx.window.AU;
};
// 시뮬레이션용 덮어쓰기: OV='{"mon":{"fox":50},"q":{"q_forest":300}}'
module.exports.applyOV = function (AU) {
  const ov = process.env.OV ? JSON.parse(process.env.OV) : null; if (!ov) return;
  for (const [k, v] of Object.entries(ov.mon || {})) AU.MONSTERS[k].exp = v;
  for (const [k, v] of Object.entries(ov.q || {})) AU.QUESTS[k].reward.exp = v;
};
