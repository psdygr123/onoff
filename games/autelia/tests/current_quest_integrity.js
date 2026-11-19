/* Current 1막 quest data integrity. Supersedes obsolete q_a1_fence test assumptions. */
const { chromium } = require("playwright");
const BASE = process.env.GAME_URL || "http://localhost:8801";
(async () => {
 const browser = await chromium.launch();
 let fails = 0;
 try {
  const page = await browser.newPage({ viewport: {width:1280,height:720} });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(BASE + "/index.html?dev=1&intro=cards");
  await page.waitForFunction(() => !!(window.AU && AU.QUESTS && AU.G && AU.MAPS));
  const checks = await page.evaluate(() => {
    const q = AU.QUESTS, maps = AU.MAPS, npcs = AU.NPCS;
    const errors = [], ids = Object.keys(q);
    for (const [id,quest] of Object.entries(q)) {
      for (const pre of quest.pre || []) if (!q[pre]) errors.push(id + ": nonexistent prerequisite " + pre);
      if (quest.giver && !npcs[quest.giver]) errors.push(id + ": nonexistent giver " + quest.giver);
      if (quest.turnIn && !npcs[quest.turnIn]) errors.push(id + ": nonexistent turnIn " + quest.turnIn);
    }
    const current = ["q_a1_parcel","q_a1_variant","q_a1_traces","q_a2_secret","q_a3_scout","q_a3_jepeto","q_h1"];
    for(const id of current) if(!q[id]) errors.push("missing current quest " + id);
    return {errors,questCount:ids.length,oldFencePresent:!!q.q_a1_fence,knownMaps:!!maps.porto};
  });
  const report = (name,ok,detail) => {console.log((ok?"PASS ":"FAIL ")+name+" :: "+detail);if(!ok) fails++;};
  report("Q1 all quest prerequisites and NPC links",checks.errors.length===0,JSON.stringify(checks));
  report("Q2 old fence quest not current",!checks.oldFencePresent,String(checks.oldFencePresent));
  report("Q3 no page errors",errors.length===0,JSON.stringify(errors));
 } finally {await browser.close();}
 process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
