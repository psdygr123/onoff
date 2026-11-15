const { chromium } = require('playwright');
const OUT='/tmp/claude-0/-home-claude/da2de105-dc9f-59b4-b5e6-d8cdc86a8fe4/scratchpad/shots/'; require('fs').mkdirSync(OUT,{recursive:true});
const URL='http://localhost:8801/index.html?dev=1&intro=cards'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1280,height:720}})).newPage(); const errs=[];
 p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load/.test(m.text()))errs.push(m.text())});
 await p.goto(URL); await p.evaluate(()=>localStorage.clear()); await p.goto(URL); await p.waitForSelector('#btn-start'); await p.click('#btn-start'); await sleep(400);
 if(await p.$('#job-next')){await p.click('#job-next');await sleep(200);} if(await p.$('#charsetup')){await p.fill('#sname','시험용');await p.click('#setup-ok');await sleep(300);} await p.evaluate(()=>AU.Prologue.debugComplete('arche')); await sleep(300);
 const go=(m,x)=>p.evaluate(([m,x])=>{AU.World.enterMap(m,x,true);AU.World.trans=null;AU.UI&&AU.UI.closeDialog&&0;},[m,x]);

 for(const [m,x,n] of [['porto',700,'porto_gate'],['porto',1060,'porto_gate2'],['general_store',860,'general'],['weapon_store',860,'weapon'],['weapon_store',480,'armor']]){ await go(m,x); await sleep(700); await p.screenshot({path:OUT+n+'.png'}); }
 // boss
 await go('docks',700); await p.evaluate(()=>{const W=AU.World; W.monsters=[]; W.spawn('trial_boss',950,undefined,undefined,undefined,'b'); const m=W.monsters.find(q=>q.type==='trial_boss'); m.state='patrol'; m.dir=-1;}); 
 for(const [st,n] of [['patrol','b1'],['windup','b_windup'],['lunge','b_attack']]){ await p.evaluate((st)=>{const m=AU.World.monsters.find(q=>q.type==='trial_boss'); m.state=st; m.st=st==='windup'?0.3:0.15; m.x=900; m.cd=9; m.flash=0; AU.World.player.x=600;},st); await sleep(150); await p.screenshot({path:OUT+n+'.png'}); }
 await p.evaluate(()=>{const m=AU.World.monsters.find(q=>q.type==='trial_boss'); m.flash=0.3; m.state='chase';}); await sleep(50); await p.screenshot({path:OUT+'b_hurt.png'});
 await p.evaluate(()=>{const W=AU.World; const m=W.monsters.find(q=>q.type==='trial_boss'); m.flash=0; W.killMonster(m);}); await sleep(250); await p.screenshot({path:OUT+'b_down.png'});
 console.log('errs',JSON.stringify(errs)); await b.close();
})();
