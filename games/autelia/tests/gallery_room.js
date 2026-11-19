/* Personal room gallery, legacy save compatibility, non-compulsive daily attendance. */
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(),p=await b.newPage();
 let fail=0;const test=(id,ok,detail)=>{console.log((ok?'PASS ':'FAIL ')+id+' '+JSON.stringify(detail));if(!ok)fail++;};
 try{
  await p.goto((process.env.GAME_URL||'http://localhost:8801')+'/index.html?dev=1&intro=cards');
  await p.evaluate(()=>localStorage.clear());await p.reload();await p.click('#btn-start');
  for(let i=0;i<2&&await p.$('#job-next');i++)await p.click('#job-next');
  if(await p.$('#charsetup')){await p.fill('#sname','전시실');await p.click('#setup-ok');}
  await p.evaluate(()=>AU.Prologue.debugComplete('arche'));
  await p.evaluate(()=>AU.UI.open('gallery'));
  test('ROOM1 gallery opens from game UI',await p.locator('.win-gallery .personalroom').count()===1,await p.locator('.wtitle').innerText());
  const a=await p.evaluate(()=>{const G=AU.G,S=G.S;const before=S.trainingPoints;const first=G.galleryCheckin();const second=G.galleryCheckin();return {first,second,tokens:G.galleryState().tokens,training:S.trainingPoints,unchanged:before===S.trainingPoints}});
  test('ROOM2 once-per-day attendance without streak requirement',a.first&&a.second===false&&a.tokens===1&&a.unchanged,a);
  const z=await p.evaluate(()=>{const G=AU.G,S=G.S; S.flags.missionsUnlocked=true;S.flags.guideMet=true;G.discoverMissions();const m=AU.MISSIONS.find(x=>!x.pre);G.setMissionState(m.id,'accept');G.setMissionState(m.id,'attempt');G.setMissionState(m.id,'done');const after=G.galleryState().tokens;const old=S.trainingPoints;const again=G.setMissionState(m.id,'done');return {tokens:after,old,again,perma:S.mindStats[m.perma]};});
  test('ROOM3 activity earns gallery token, not combat points',z.tokens===2&&z.old===0&&z.again===false&&z.perma>0,z);
  const buy=await p.evaluate(()=>{const G=AU.G;const result=G.galleryBuy('frame');const g=G.galleryState();return {result,tokens:g.tokens,selected:g.selected,repeat:G.galleryBuy('frame')};});
  test('ROOM4 buy once and equip decoration',buy.result&&buy.tokens===0&&buy.selected.includes('frame')&&!buy.repeat,buy);
  await p.reload();await p.waitForSelector('#title:not(.hidden) #btn-start');await p.click('#btn-start');
  const saved=await p.evaluate(()=>{const g=AU.G.galleryState();return {tokens:g.tokens,selected:g.selected,attendance:g.attendance.length,log:AU.G.S.missions.log.length,oldTraining:AU.G.S.trainingPoints};});
  test('ROOM5 gallery data survives reload',saved.tokens===0&&saved.selected.includes('frame')&&saved.attendance===1&&saved.log>0&&saved.oldTraining===0,saved);
  await p.evaluate(()=>AU.UI.open('gallery'));
  test('ROOM6 purchase and memory frame appear in room',await p.locator('.roomdecors span').count()===1&&await p.locator('.roomframein strong').count()>0,await p.locator('.roomframein').allTextContents());
 }finally{await b.close();}
 process.exit(fail?1:0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
