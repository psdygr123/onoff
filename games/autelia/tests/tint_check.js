const { chromium } = require('playwright'); const fs=require('fs');
const OUT='/tmp/claude-0/-home-claude/da2de105-dc9f-59b4-b5e6-d8cdc86a8fe4/scratchpad/mk/';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1280,height:720}})).newPage(); const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8801/index.html?dev=1&intro=cards'); await p.waitForSelector('#btn-start'); await sleep(2500);
 const res=await p.evaluate(async()=>{ const out={}; const look={hair:2,vest:4,pants:1};
  for(const k of ['pc_player_m_work','pc_player_f_work','pc_player_m_bag']){ if(!AU.Img.map[k]) {out[k]='nomap';continue;} await new Promise(r=>{const t=setInterval(()=>{if(AU.Img.map[k].orig){clearInterval(t);r();}},100);setTimeout(r,8000)}); const c=await AU.Tint.paint(k,look); out[k]=c?c.toDataURL():'null'; } return out;});
 for(const [k,v] of Object.entries(res)){ console.log(k, v.slice(0,20)); if(v.startsWith('data:')) fs.writeFileSync(OUT+'tint_'+k+'.png',Buffer.from(v.split(',')[1],'base64')); }
 console.log('errs',errs); await b.close(); })();
