/* Smoke: resume starts at scene checkpoint before narrative rewards are granted. */
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch(),page=await browser.newPage();
 let failed=0;const test=(id,pass,data)=>{console.log((pass?'PASS ':'FAIL ')+id+' :: '+JSON.stringify(data));if(!pass)failed++;};
 try{
 await page.goto((process.env.GAME_URL||'http://localhost:8801')+'/index.html?dev=1&intro=cards');
 await page.evaluate(()=>localStorage.clear());await page.reload();await page.click('#btn-start');
 for(let i=0;i<2&&await page.$('#job-next');i++)await page.click('#job-next');
 if(await page.$('#charsetup')){await page.fill('#sname','진행 검사');await page.click('#setup-ok');}
 await page.evaluate(()=>AU.Prologue.devJump('SCENE_04_FATHER'));
 await page.waitForFunction(()=>AU.World.mapId==='pro_house'&&!!AU.Prologue.cs,null,{timeout:25000});
 await page.evaluate(()=>AU.G.save('test'));await page.reload();
 await page.waitForSelector('#title:not(.hidden) #btn-start');
 await page.click('#btn-start');
 await page.waitForFunction(()=>AU.World.mapId==='pro_house'&&!!AU.Prologue.cs,null,{timeout:25000});
 const a=await page.evaluate(()=>({state:AU.G.S.prologue.state,map:AU.World.mapId,x:AU.World.player.x,start:AU.PRO_LAY.house.start,inv:AU.G.S.inv,flags:AU.G.S.prologue.flags}));
 test('PRESUME1 re-enter same scene at starting checkpoint',a.state==='SCENE_04_FATHER'&&a.map==='pro_house'&&Math.abs(a.x-a.start)<50,a);
 test('PRESUME2 no duplicated scene-owned rewards at re-entry',!a.inv.metal_fragment&&!a.inv.carpenter_bag&&!a.flags.metal_fragment_acquired,a);
 }finally{await browser.close();}
 process.exit(failed?1:0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
