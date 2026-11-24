/* 레벨 포인트는 일상 활동과 무관하게 분배 가능, 활동 보상은 선택형 */
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch(),p=await b.newPage();
 let fail=0;const test=(n,v)=>{console.log((v?'PASS ':'FAIL ')+n);if(!v)fail++;};
 try{
 await p.goto((process.env.GAME_URL||'http://localhost:8801')+'/index.html?dev=1&intro=cards');
 await p.evaluate(()=>localStorage.clear());await p.reload();await p.click('#btn-start');
 for(let i=0;i<2&&await p.$('#job-next');i++)await p.click('#job-next');
 if(await p.$('#charsetup')){await p.fill('#sname','시험');await p.click('#setup-ok');}
 await p.evaluate(()=>AU.Prologue.debugComplete('arche'));
 const a=await p.evaluate(()=>{const S=AU.G.S;S.level=10;S.flags.awakened=true;S.freePoints=3;S.trainingPoints=0;return {pool:AU.G.pool(),ok:AU.G.applyAllocation({STR:1}),free:S.freePoints};});
 test('G1 Lv10 기본 포인트 즉시 분배',a.pool===3&&a.ok&&a.free===2);
 await p.evaluate(()=>AU.UI.open('stats'));
 test('G2 잠금 안내 없음',!((await p.locator('.statlayout').innerText()).includes('잠겨 있습니다')));
 const z=await p.evaluate(()=>{const S=AU.G.S;S.level=15;S.freePoints=3;return AU.G.usableFree()===3&&AU.G.gateOpen();});
 test('G3 Lv15도 일상 미션 없이 분배 가능',z);
 const m=await p.evaluate(()=>{AU.UI.close();AU.G.S.flags.missionsUnlocked=true;AU.G.discoverMissions();const id=AU.MISSIONS.find(x=>!x.pre).id;AU.G.setMissionState(id,'accept');AU.G.setMissionState(id,'attempt');AU.G.setMissionState(id,'done');return AU.G.galleryState().tokens>0&&AU.G.S.trainingPoints===0;});
 test('G4 선택 미션은 갤러리 토큰을 지급하고 전투 훈련 포인트는 주지 않음',m);
 }finally{await b.close();}process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
