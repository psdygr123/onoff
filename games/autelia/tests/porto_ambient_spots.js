/* 포르투 노바 분위기 조사 지점 6개: 퀘스트 없이도 Space로 글이 나오고, 퀘스트·저장 상태는 바뀌지 않음 */
const { chromium } = require("playwright");
const URL = (process.env.GAME_URL || "http://localhost:8802") + "/index.html?dev=1&intro=cards", sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(), errs = []; let ok = 0, n = 0;
  p.on("pageerror", (e) => errs.push(e.message));
  const T = (id, name, c, d) => { n++; if (c) ok++; console.log((c ? "PASS " : "FAIL ") + id + " " + name + " :: " + JSON.stringify(d)); };
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto(URL); await ev(() => localStorage.clear()); await p.goto(URL); await p.waitForSelector("#btn-start"); await p.click("#btn-start"); await sleep(300);
  for (let i = 0; i < 2 && await p.$("#job-next"); i++) { await p.click("#job-next"); await sleep(200); }
  if (await p.$("#charsetup")) { await p.fill("#sname", "시험용"); await p.click("#setup-ok"); await sleep(300); }
  await ev(() => AU.Prologue.debugComplete("arche")); await sleep(300);
  await ev(() => { AU.World.enterMap("porto", 160, true); AU.World.trans = null; }); await sleep(200);
  const ids = await ev(() => AU.MAPS.porto.spots.map((s) => s.id));
  T("P1", "포르투 지점 1개 이상", ids.length >= 1 && ids.every((i) => /^porto_/.test(i)), ids);
  const q0 = await ev(() => JSON.stringify(AU.G.S.quests));
  await ev(() => { const W = AU.World, sp = AU.MAPS.porto.spots[0]; W.player.x = sp.x; W.player.onGround = true; W.updatePlayer(0.016, false); });
  T("P2", "가까이 가면 조사 안내(Space)", await ev(() => !!AU.World.nearSpot && AU.World.nearSpot.id === "porto_board"), null);
  await p.keyboard.press("Space"); await sleep(250);
  const opened = await ev(() => !!document.querySelector("#dialog, .dialog, #dlg") && /게시판|쪽지/.test(document.body.innerText));
  T("P3", "Space로 글이 표시됨", opened, null);
  T("P4", "퀘스트 상태는 바뀌지 않음", (await ev(() => JSON.stringify(AU.G.S.quests))) === q0, null);
  T("P5", "콘솔 오류 없음", errs.length === 0, errs);
  console.log(`${ok}/${n}`); await b.close(); process.exit(ok === n ? 0 : 1);
})();
