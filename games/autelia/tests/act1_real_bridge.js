/* Verifies actual quest start/turn-in hooks, recommendations, optional status, persistence. */
const { chromium }=require("playwright");
(async()=>{const b=await chromium.launch();let fail=0;const check=(name,ok,detail)=>{console.log((ok?"PASS ":"FAIL ")+name+" "+JSON.stringify(detail));if(!ok)fail++};
try{const p=await b.newPage();await p.goto((process.env.GAME_URL||"http://localhost:8801")+"/index.html?dev=1&intro=cards");await p.click("#btn-start");for(let i=0;i<2&&await p.$("#job-next");i++)await p.click("#job-next");if(await p.$("#charsetup")){await p.fill("#sname","연계검증");await p.click("#setup-ok")}
await p.evaluate(()=>AU.Prologue.debugComplete("porto"));
const a=await p.evaluate(()=>{
 const G=AU.G,S=G.S,B=AU.RealBridge;S.level=20;S.silver=10000;
 const expected=[{"id":"q_s1_silver","phase":"start","missionId":"m_m3"},{"id":"q_guild_talk","phase":"done","missionId":"m_e6"},{"id":"q_a1_variant","phase":"start","missionId":"m_e4"},{"id":"q_a2_secret","phase":"done","missionId":"m_m6"},{"id":"q_a3_jepeto","phase":"start","missionId":"m_m1"},{"id":"q_h1f","phase":"done","missionId":"m_m4"}];
 const donePrereq=id=>{for(const pre of AU.QUESTS[id].pre){if(G.questStatus(pre)!=="done"){donePrereq(pre);S.quests[pre]={state:"done",prog:AU.QUESTS[pre].objectives.map(o=>o.count||1),spots:{}}}}};
 const logs=[];
 for(const x of expected){
  donePrereq(x.id);delete S.quests[x.id];const key="act1-"+x.id+"-"+x.phase;
  const premature=B.questEvent(x.id,x.phase);
  const started=G.startQuest(x.id);
  const afterStart=!!B.suggestions()[key];
  if(x.phase==="done"){S.quests[x.id].state="ready";G.turnIn(x.id)}
  const q=G.qs(x.id),row=B.suggestions()[key];
  logs.push({key,premature,started,afterStart,correct:row?.missionId===x.missionId,mission:G.ms(x.missionId).state,quest:q?.state,duplicate:B.questEvent(x.id,x.phase)});
 }
 const before=Object.keys(B.suggestions()).length;
 const unrelated=B.questEvent("q_guild_rats","start");
 const beforeQuest=JSON.stringify(S.quests); const accepted=B.acceptSuggested("act1-q_s1_silver-start"); const unchanged=beforeQuest===JSON.stringify(S.quests);
 G.save("bridge-test");
 return {logs,before,unrelated,accepted,unchanged,quest:G.qs("q_s1_silver").state,mission:G.ms("m_m3").state,modal:AU.UI.modal};
});
check("ACTBR1 six actual quest hooks and phase guards",a.logs.every(x=>!x.premature&&x.started&&x.correct&&!x.duplicate&&x.mission==="available"&&(x.key.endsWith("-start")?x.afterStart&&!["done"].includes(x.quest):!x.afterStart&&x.quest==="done")),a.logs);
check("ACTBR2 side quests excluded; no blocking modal",!a.unrelated&&!a.modal,a);
check("ACTBR3 optional acceptance does not complete main quest",a.accepted&&a.unchanged&&a.mission==="accepted",a);
await p.reload();await p.waitForSelector("#btn-start");await p.click("#btn-start");const restored=await p.evaluate(()=>({count:Object.keys(AU.RealBridge.suggestions()).filter(k=>k.startsWith("act1-")).length,state:AU.G.ms("m_m3").state}));
check("ACTBR4 saved recommendations survive reload",restored.count===6&&restored.state==="accepted",restored);
}finally{await b.close()}process.exit(fail?1:0)})().catch(e=>{console.error("FAIL",e);process.exit(1)});
