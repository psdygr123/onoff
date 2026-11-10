const { chromium } = require('playwright');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = (process.env.GAME_URL || 'http://localhost:8801') + '/index.html?dev=1', SH = (process.env.SHOTS || '/tmp/claude-0/shots') + '/';
async function open(opts = {}) {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: opts.viewport || { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ev = (fn, arg) => p.evaluate(fn, arg);
  const T = {
    b, ctx, p, ev, errs, sleep,
    shot: (n) => p.screenshot({ path: SH + n + '.png' }),
    P: () => ev(() => { const P = AU.Prologue, w = AU.World; return { st: P.st().state, on: P.on, cs: !!P.cs, frozen: P.frozen, fade: +P.fadeS.a.toFixed(2), dlg: !!AU.UI.dialog, obj: P.objEl.textContent, x: Math.round(w.player.x), y: Math.round(w.player.y), map: w.mapId, prompt: w.prompt, flags: Object.keys(P.st().flags).filter((k) => P.st().flags[k]), inv: JSON.stringify(AU.G.S.inv), end: !P.endEl.classList.contains('hidden'), err: AU.main.lastError || null }; }),
    async fresh() { await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); },
    async start() { await p.click('#btn-start'); await sleep(200); },
    async idle(max = 40000) { const t0 = Date.now(); while (Date.now() - t0 < max) { const s = await T.P(); if (s.dlg) { await p.keyboard.press('Space'); await sleep(130); continue; } if (!s.cs && !s.frozen && s.fade < 0.05) return true; await sleep(100); } return false; },
    async until(cond, max = 40000, arg) { const t0 = Date.now(); while (Date.now() - t0 < max) { const s = await ev(cond, arg); if (s) return true; const d = await ev(() => !!AU.UI.dialog); if (d) { await p.keyboard.press('Space'); await sleep(130); } else await sleep(80); } return false; },
    async walk(x, tol = 12, max = 25000) {
      const t0 = Date.now();
      while (Date.now() - t0 < max) {
        const px = await ev(() => AU.World.player.x); if (Math.abs(px - x) <= tol) break;
        const key = px < x ? 'ArrowRight' : 'ArrowLeft'; await p.keyboard.down(key);
        while (Date.now() - t0 < max) { await sleep(25); const q = await ev(() => AU.World.player.x); if (key === 'ArrowRight' ? q >= x - tol : q <= x + tol) break; }
        await p.keyboard.up(key); await sleep(60);
      }
      return ev(() => AU.World.player.x);
    },
    async dialogs(n = 1) { for (let i = 0; i < 12; i++) { const d = await ev(() => !!AU.UI.dialog); if (!d) { await sleep(120); const d2 = await ev(() => !!AU.UI.dialog); if (!d2) return; } await p.keyboard.press('Space'); await sleep(140); } },
    async jumpOver(x) { // x 앞에서 점프하며 지나가기: 방향키를 누른 채 Alt
      const px = await ev(() => AU.World.player.x), key = px < x ? 'ArrowRight' : 'ArrowLeft'; await p.keyboard.down(key); await p.keyboard.down('Alt'); await sleep(700); await p.keyboard.up('Alt'); await sleep(400); await p.keyboard.up(key);
    }
  };
  return T;
}
module.exports = { open, sleep, SH };
