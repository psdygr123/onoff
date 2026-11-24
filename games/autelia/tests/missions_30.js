/* 30 PERMA missions, optional choices and legacy save migration without resetting history. */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch(); let fails = 0;
  const check=(key,yes,detail)=>{ console.log((yes?'PASS ':'FAIL ')+key+' '+JSON.stringify(detail)); if(!yes) fails++; };
  try {
    const page=await browser.newPage();
    await page.goto((process.env.GAME_URL||'http://localhost:8801')+'/index.html?dev=1&intro=cards');
    await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.click('#btn-start');
    for(let i=0;i<2&&await page.$('#job-next');i++) await page.click('#job-next');
    if(await page.$('#charsetup')) { await page.fill('#sname','검증'); await page.click('#setup-ok'); }
    await page.evaluate(()=>AU.Prologue.debugComplete('arche'));
    const data=await page.evaluate(()=>{
      const G=AU.G,S=G.S;
      const all=AU.MISSIONS,counts=Object.fromEntries('PERMA'.split('').map(k=>[k,all.filter(m=>m.perma===k).length]));
      const unique=new Set(all.map(m=>m.id)).size===all.length; const rest=AU.REST_MISSIONS; const restOk=rest.length===30&&new Set(rest.map(m=>m.id)).size===30&&Object.keys(AU.REST_CATEGORIES).every(k=>rest.filter(m=>m.category===k).length===5);
      const hasMeta=all.every(m=>AU.MISSION_FUNCTION_AREAS[m.functionArea]&&[1,2,3].includes(m.difficulty)&&m.minutes>0&&m.points>0);
      // Simulate a legacy save: old mission IDs, completed record, no fragments key, old locked mission.
      S.flags.missionsUnlocked=true;S.flags.guideMet=true;
      G.initMissions();
      S.missions.states.m_p1={state:'done',rewarded:true,tries:1};
      S.missions.states.m_p2={state:'locked',rewarded:false,tries:0};
      S.missions.log.push({t:'2026-10-18',id:'m_p1',perma:'P',state:'done',points:1});
      delete G.galleryState().fragments;
      G.initMissions();
      const preserved=S.missions.states.m_p1.state==='done'&&S.missions.log.at(-1).id==='m_p1';
      const unlocked=S.missions.states.m_p2.state==='locked'&&S.missions.states.m_a6.state==='locked';
      const hasFragmentDefault=G.galleryState().fragments===0;
      const first=G.setMissionState('m_a3','accept')&&G.setMissionState('m_a3','attempt')&&G.setMissionState('m_a3','partial');
      const fragments=G.galleryState().fragments;
      const noDup=G.setMissionState('m_a3','retry')&&G.setMissionState('m_a3','attempt')&&G.setMissionState('m_a3','partial')&&G.galleryState().fragments===fragments;
      const done=G.setMissionState('m_a3','done');
      const once=G.setMissionState('m_a3','done')===false;
      G.save('test');
      return {count:all.length,counts,restOk,unique,hasMeta,preserved,unlocked,hasFragmentDefault,first,fragments,noDup,done,once,log:S.missions.log.length};
    });
    check('M30-1 all 100 missions, twenty per PERMA',data.count===100&&Object.values(data.counts).every(n=>n===20),data);
    check('M30-2 unique ids and complete metadata',data.unique&&data.hasMeta&&data.restOk,data);
    check('M30-3 old progress survives and missions open gradually (slots)',data.preserved&&data.unlocked&&data.hasFragmentDefault,data);
    check('M30-4 partial attempt has one-time fragment reward',data.first&&data.fragments===1&&data.noDup,data);
    check('M30-5 completing after partial rewards only once',data.done&&data.once,data);
    await page.reload();await page.waitForSelector('#title:not(.hidden) #btn-start');await page.click('#btn-start');
    const saved=await page.evaluate(()=>({old:AU.G.S.missions.states.m_p1.state,latest:AU.G.S.missions.states.m_a3.state,fragments:AU.G.galleryState().fragments}));
    check('M30-6 saved game persists old and new states',saved.old==='done'&&saved.latest==='done'&&saved.fragments===1,saved);
  } finally { await browser.close(); }
  process.exit(fails?1:0);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
