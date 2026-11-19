/* Optional reality missions: self-assessment bonus, low-friction rest, saved data and non-coercive allocation. */
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch(); let failed=0;
 const check=(name,valid,detail)=>{console.log((valid?'PASS ':'FAIL ')+name+' '+JSON.stringify(detail));if(!valid)failed++;};
 try {
  const page = await browser.newPage();
  await page.goto((process.env.GAME_URL||'http://localhost:8801')+'/index.html?dev=1&intro=cards');
  await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.click('#btn-start');
  for(let i=0;i<2&&await page.$('#job-next');i++)await page.click('#job-next');
  if(await page.$('#charsetup')){await page.fill('#sname','테스트'); await page.click('#setup-ok');}
  await page.evaluate(()=>AU.Prologue.debugComplete('arche'));
  const s=await page.evaluate(()=>{
   const G=AU.G,S=G.S; S.level=10; S.flags.awakened=true;S.freePoints=3;S.trainingPoints=0;S.flags.missionsUnlocked=true;S.flags.guideMet=true;G.discoverMissions();
   const first=AU.MISSIONS.find(m=>!m.pre),bad={challenge:6,meaning:3,satisfaction:1},good={challenge:4,meaning:1,satisfaction:1,note:'어려웠지만 의미를 찾으려고 했어요'};
   const canAllocate=G.pool()===3;
   G.setMissionState(first.id,'accept');G.setMissionState(first.id,'attempt');
   const rejected=!G.validMissionFeedback(bad), valid=G.validMissionFeedback(good);
   const done=G.setMissionState(first.id,'done',good);
   const growth=S.mindStats[first.perma],expected=first.points+1;
   const repeated=G.setMissionState(first.id,'done',good)===false&&S.mindStats[first.perma]===growth;
   const refl=S.missions.log.at(-1).reflection;
   S.skills.unlocked=['strike'];S.fatigue=50;
   const restBad=G.doRestMission('r_breath',{feeling:'invalid'})===false;
   const restOk=G.doRestMission('r_breath',{feeling:'same',note:''});
   const restLog=S.rest.log.at(-1);
   G.save('test');
   return {canAllocate,rejected,valid,done,growth,expected,repeated,reflect:refl,restBad,restOk,restLog,perma:first.perma};
  });
  check('V1 basic stat points usable without mission',s.canAllocate,s.canAllocate);
  check('V2 feedback range validation',s.rejected&&s.valid,s);
  check('V3 reflective reward not tied to positive ratings',s.done&&s.growth===s.expected&&s.repeated,s);
  check('V4 structured activity reflection captured',s.reflect&&s.reflect.meaning===1&&s.reflect.satisfaction===1,s.reflect);
  check('V5 rest check-in accepts non-improvement and optional note',s.restBad&&s.restOk&&s.restLog.feeling==='same'&&s.restLog.note==='',s.restLog);
  await page.reload();await page.waitForSelector('#title:not(.hidden) #btn-start'); await page.click('#btn-start');
  const recovered=await page.evaluate((k)=>({mind:AU.G.S.mindStats[k],reflection:AU.G.S.missions.log.at(-1).reflection,rest:AU.G.S.rest.log.at(-1)}),s.perma);
  check('V6 feedback and growth survive reload',recovered.mind===s.growth&&recovered.reflection?.challenge===4&&recovered.rest?.feeling==='same',recovered);
 } finally {await browser.close();}
 process.exit(failed?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
