/* 온앤오프 플랫폼 독립 진입: RPG 실행 없이 갤러리 사용 후 게임에서 동일 기록 조회 */
const { chromium } = require('playwright');
(async () => {
 const b=await chromium.launch(); const p=await b.newPage();
 let failures=0;const test=(label,ok,detail)=>{console.log((ok?'PASS ':'FAIL ')+label+' :: '+JSON.stringify(detail));if(!ok)failures++;};
 try {
  await p.goto('http://localhost:8803/#home');
  await p.waitForFunction(()=>window.OnOff && OnOff.App && OnOff.State);
  await p.evaluate(()=>{ OnOff.State.demoLogin(); location.hash = '#space-autelia'; });
  await p.waitForSelector('#space-stage iframe');
  const f=p.frameLocator('#space-stage iframe');
  await f.locator('.win-gallery .personalroom').waitFor({timeout:30000});
  const one=await f.locator('#ui').evaluate(()=>({gallery:AU.UI.curName,running:AU.main.running,ns:AU.Store.ns}));
  test('PLATFORM1 platform independent gallery loads with RPG paused',one.gallery==='gallery'&&!one.running&&one.ns==='onoff:demo:autelia',one);
  await f.getByRole('button',{name:/오늘 방문 기록하기/}).click();
  const token1=await f.locator('.roomwallet b').innerText();
  test('PLATFORM2 gallery action from portal works',/갤러리 토큰 1/.test(token1),token1);
  await p.evaluate(()=>{location.hash='#play-autelia';});
  await p.waitForSelector('#stage iframe');
  const f2=p.frameLocator('#stage iframe');
  await f2.locator('#btn-start').waitFor({timeout:30000});
  const two=await f2.locator('#ui').evaluate(()=>({tokens:AU.G.galleryState().tokens,ns:AU.Store.ns,running:AU.main.running}));
  test('PLATFORM3 RPG shares portal gallery state',two.tokens===1&&two.ns==='onoff:demo:autelia'&&!two.running,two);
 }finally{await b.close();}
 process.exit(failures?1:0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
