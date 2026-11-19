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
  test('ROOM7 selected concept A panels rendered',await p.locator('.room-a-columns > .room-left').count()===1 && await p.locator('.room-a-columns > .room-center').count()===1 && await p.locator('.room-a-columns > .room-right').count()===1 && await p.locator('.room-radar svg').count()===1,'three panels + PERMA chart');
  const attempted=await p.evaluate(()=>{const G=AU.G;const id='m_e1';const m=G.mission(id);const initial=G.ms(id).state;if(initial==='available')G.setMissionState(id,'accept');if(G.ms(id).state==='accepted')G.setMissionState(id,'attempt');AU.UI.renderWin();return {id,state:G.ms(id).state};});
  test('ROOM8 attempted but unfinished mission remains visible',attempted.state==='attempted'&&await p.locator('.roommemory.attempt').count()>0,attempted);
  const visual = await p.evaluate(async () => {
    const win=document.querySelector('.win-gallery'),stage=document.querySelector('#stage'),center=document.querySelector('.room-center .personalroom');
    const files=[...document.querySelectorAll('.room-a-layout img')];
    await Promise.all(files.map(im => im.decode().catch(()=>{})));
    const wr=win.getBoundingClientRect(),sr=stage.getBoundingClientRect(),cr=center.getBoundingClientRect();
    return {w:wr.width,h:wr.height,shareW:wr.width/sr.width,shareH:wr.height/sr.height,centerH:cr.height,count:files.length,invalid:files.filter(im=>!im.complete||im.naturalWidth===0).map(im=>im.getAttribute('src')),roomBg:getComputedStyle(center).backgroundImage};
  });
  test('ROOM9 gallery occupies most of 1280x720 stage',visual.shareW>=.95&&visual.shareH>=.95&&visual.centerH>=300,visual);
  test('ROOM10 gallery illustrations and original PNG room load',visual.count>=7&&visual.invalid.length===0&&visual.roomBg.includes('personal_gallery_room.png'),visual);
  const clipping = await p.evaluate(() => {
    const body=document.querySelector('.win-gallery .wbody');
    const actions=document.querySelector('.room-a-actions');
    const gallery=document.querySelector('.room-a-columns');
    const br=body.getBoundingClientRect(), ar=actions.getBoundingClientRect(), gr=gallery.getBoundingClientRect();
    return { scrollHeight:body.scrollHeight, clientHeight:body.clientHeight, actionsBottom:ar.bottom, viewportBottom:br.bottom, galleryBottom:gr.bottom };
  });
  test('ROOM11 gallery actions and content fit viewport without outer scrolling',
    clipping.scrollHeight<=clipping.clientHeight+3 && clipping.actionsBottom<=clipping.viewportBottom+2 && clipping.galleryBottom<=clipping.viewportBottom+2,
    clipping);
  const mural = await p.evaluate(async () => {
    const src = 'assets/bg/personal_gallery_room.png';
    const image = new Image();
    image.src = src;
    try { await image.decode(); } catch(e) { return {loaded:false,error:String(e),src}; }
    const response = await fetch(src);
    const bytes = (await response.arrayBuffer()).byteLength;
    const mime = response.headers.get('content-type') || '';
    return {loaded:image.naturalWidth>=1600 && image.naturalHeight>=900 && response.ok,
      width:image.naturalWidth,height:image.naturalHeight,bytes,mime,src};
  });
  test('ROOM12 generated PNG loads as real raster (not vector)',mural.loaded&&mural.bytes>100000&&mural.src.endsWith('.png'),mural);
  const paintings = await p.evaluate(async () => {
    const paths = ['assets/gallery/painting_01.webp','assets/gallery/painting_02.webp','assets/gallery/painting_03.webp','assets/gallery/painting_04.webp','assets/gallery/painting_05.webp'];
    return Promise.all(paths.map(async src => { const im = new Image(); im.src = src;
      try { await im.decode(); return {src,ok:im.naturalWidth >= 100 && im.naturalHeight >= 100}; }
      catch (e) { return {src,ok:false,error:String(e)}; }
    }));
  });
  test('ROOM13 all five original watercolor gallery paintings decode',paintings.every(x=>x.ok),paintings);
      await p.screenshot({path:(process.env.SHOTS||'/tmp/autelia-shots')+'/gallery_layout_corrected.png'});


 }finally{await b.close();}
 process.exit(fail?1:0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
