/* Main-story bridge stays optional and preserves the flag-raising objective. */
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch();let fails=0;
 const check=(name,yes,data)=>{console.log((yes?'PASS ':'FAIL ')+name+' '+JSON.stringify(data));if(!yes)fails++;};
 try{
  const p=await browser.newPage();
  await p.goto((process.env.GAME_URL||'http://localhost:8801')+'/index.html?dev=1&intro=cards&realguide=1');
  await p.evaluate(()=>localStorage.clear());await p.reload();await p.click('#btn-start');
  for(let i=0;i<2&&await p.$('#job-next');i++)await p.click('#job-next');
  if(await p.$('#charsetup')){await p.fill('#sname','연계 검증');await p.click('#setup-ok');}
  await p.evaluate(()=>AU.Prologue.devJump('SCENE_01B_BANNERS'));
  await p.waitForFunction(()=>AU.Prologue.sceneIdx===2&&!AU.Prologue.cs,null,{timeout:20000});
  const a=await p.evaluate(async()=>{
    const G=AU.G,S=G.S,P=AU.Prologue;
    const before=P.flag('banners_done');
    const offer=AU.RealBridge.offer('bridge-test-later','m_a4');
    return {before,mission:G.mission('m_a4').title,offer:!!offer};
  });
  await p.waitForSelector('.modalwrap [role="dialog"]');
  check('BRIDGE1 banner suggestion exists',a.offer&&a.mission==='오늘 할 수 있는 작은 일 정하기',a);
  await p.getByRole('button',{name:'게임만 진행하기'}).click();
  const afterSkip=await p.evaluate(()=>({flag:AU.Prologue.flag('banners_done'),mission:AU.G.ms('m_a4').state,shown:AU.G.S.flags.realBridgeOffers['bridge-test-later'],unlocked:AU.G.S.flags.missionsUnlocked}));
  check('BRIDGE2 decline never completes or blocks game story',afterSkip.shown&&afterSkip.unlocked&&!afterSkip.flag&&afterSkip.mission==='available',afterSkip);
  await p.evaluate(()=>{ void AU.RealBridge.offer('bridge-test-accept','m_a4'); });
  await p.waitForSelector('.modalwrap [role="dialog"]');
  await p.getByRole('button',{name:'현실 미션도 수락'}).click();
  const accepted=await p.evaluate(()=>({mission:AU.G.ms('m_a4').state,flag:AU.Prologue.flag('banners_done'),st:AU.G.S.prologue.state}));
  check('BRIDGE3 accepting reality mission does not change story objective',accepted.mission==='accepted'&&!accepted.flag&&accepted.st==='SCENE_01B_BANNERS',accepted);
  await p.evaluate(()=>AU.G.save('bridge-test'));
  await p.reload();await p.waitForSelector('#btn-start');await p.click('#btn-start');
  const resumed=await p.evaluate(()=>({mission:AU.G.ms('m_a4').state,shown:AU.G.S.flags.realBridgeOffers['bridge-test-accept']}));
  check('BRIDGE4 independent choice survives save and reload',resumed.mission==='accepted'&&resumed.shown,resumed);
 }finally{await browser.close();}
 process.exit(fails?1:0);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
