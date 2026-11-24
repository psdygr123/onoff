/* 아지트 갱도·실험 구역: 들키지 않으면 처치 없이 완료, 들키면 전투로 이어짐 */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch(),p=await b.newPage();let fail=0;const T=(n,v,x)=>{console.log((v?'PASS ':'FAIL ')+n+(v?'':' :: '+JSON.stringify(x)));if(!v)fail++;};
const ev=(f)=>p.evaluate(f);
try{
await p.goto((process.env.GAME_URL||'http://localhost:8801')+'/index.html?dev=1');await ev(()=>localStorage.clear());await p.reload();await p.click('#btn-start');
for(let i=0;i<2&&await p.$('#job-next');i++)await p.click('#job-next');
if(await p.$('#charsetup')){await p.fill('#sname','시험');await p.click('#setup-ok');}
await ev(()=>AU.Prologue.debugComplete('arche'));
await ev(()=>{const S=AU.G.S;S.level=11;for(const q of['q_a3_jepeto','q_h1a'])S.quests[q]={state:'done',prog:[],spots:{}};AU.G.startQuest('q_h1b');});
// 갱도: 두 지점 조사 후 들키지 않고 실험 구역으로
await ev(()=>{AU.World.enterMap('hide_tunnel',90,true);const r=AU.G.S.quests.q_h1b;r.spots={tun_cages:true,tun_notes:true};AU.G.refreshQuest('q_h1b');});
T('H1','갱도에서 숨는 상자 사용 가능(잠입 활성)',await ev(()=>AU.World.sneakOn()&&AU.World.map.hideSpots.length===3));
await ev(()=>{AU.World.spotted=false;AU.World.travel('hide_lab',90);});
await p.waitForTimeout(1500);
const q=await ev(()=>({st:AU.G.questStatus('q_h1b'),n:AU.G.questStatus('q_h1c')}));
T('H2','안 들키고 갱도 통과 → 갱도 퀘스트 완료·다음 단계 시작',q.st==='done'&&q.n==='active',q);
// 실험 구역: 기록대 조사 후 x≥1750까지 안 들키면 처치 건너뜀
await ev(()=>{const r=AU.G.S.quests.q_h1c;r.spots=Object.assign(r.spots||{},{lab_records:true});AU.World.spotted=false;AU.World.player.x=1800;});
await p.waitForTimeout(800);
T('H3','안 들키고 안쪽 도달 → 감시병 처치 없이 완료',await ev(()=>AU.G.questStatus('q_h1c')==='done'||AU.G.questStatus('q_h1d')==='active'));
// 들키면 건너뛰기 불가
await ev(()=>{const S=AU.G.S;S.flags.hide_lab_clear=false;S.quests.q_h1c={state:'active',prog:[0,0],spots:{lab_records:true}};AU.World.spotted=true;AU.World.player.x=1800;});
await p.waitForTimeout(800);
T('H4','들켰다면 건너뛰기 불가(싸워서 완료해야 함)',await ev(()=>AU.G.questStatus('q_h1c')==='active'));
T('H5','외곽 기둥 없음',await ev(()=>!(AU.MAPS.hide_outer.blockers&&AU.MAPS.hide_outer.blockers.length)));
}finally{await b.close();}process.exit(fail?1:0);})().catch(e=>{console.error(e);process.exit(1);});
