/* 선택형 활동 보조 기록. 실제 행동의 독립적 검증이 아님. 사진은 IndexedDB에만 저장. */
window.AU=window.AU||{};
(function(){
"use strict";
const E=AU.MissionEvidence={
 labels:{self_report:"자기보고",timer:"타이머 경과 시간",record:"활동 내용",photo:"기기 내 사진"},
 kind(m){return !m?"record":m.evidence==="self_report"||!m.evidence?"record":m.evidence},   // 자기보고형 활동은 한 줄 기록으로 인증
 clean(x,m){
  if(!x||!m||x.method!==this.kind(m))return null;
  if(x.method==="timer"&&Number.isInteger(x.seconds)&&x.seconds>0&&x.seconds<=86400)return {method:"timer",seconds:x.seconds};
  if(x.method==="record"&&typeof x.text==="string"&&x.text.trim())return {method:"record",text:x.text.trim().slice(0,200)};
  if(x.method==="photo"&&typeof x.photoId==="string"&&/^[a-z0-9-]{10,100}$/.test(x.photoId))return {method:"photo",photoId:x.photoId};
  return null;
 },
 db(){return new Promise((resolve,reject)=>{const q=indexedDB.open("autelia-private-activity-photos",1);q.onupgradeneeded=()=>q.result.createObjectStore("photos");q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});},
 async op(mode,fn){const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction("photos",mode),q=fn(tx.objectStore("photos"));tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||Error("사진 저장 실패"))};});},
 async put(file){if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>2000000)throw Error("JPG, PNG, WebP 사진만 2MB 이하로 선택해 주세요.");const id=crypto.randomUUID();await this.op("readwrite",s=>s.add(file,id));return id;},
 get(id){return this.op("readonly",s=>s.get(id))},
 remove(id){return this.op("readwrite",s=>s.delete(id))},
 panel(m){
  const root=document.createElement("div");root.className="note";let start=0,seconds=0,timer=null,file=null;
  const add=(tag,txt)=>{const e=document.createElement(tag);if(txt)e.textContent=txt;root.append(e);return e};
  add("p","인증 · "+(this.labels[this.kind(m)]||"활동 내용")+" — 인증하면 보상을 전부 받고, 지금 건너뛰어도 나중에 일지에서 인증하면 나머지를 받아요.");
  let input=null;
  if(this.kind(m)==="timer"){const clock=add("p","0초");const b=add("button","타이머 시작");b.type="button";b.className="btn";const update=()=>{clock.textContent=(seconds+(start?Math.floor((Date.now()-start)/1000):0))+"초"};b.onclick=()=>{if(start){seconds+=Math.floor((Date.now()-start)/1000);start=0;clearInterval(timer);b.textContent="다시 시작"}else{start=Date.now();timer=setInterval(update,500);b.textContent="타이머 멈춤"}update()};add("p","활동 시간은 참고 기록이며 최소 시간 조건이 없습니다.");}
  if(this.kind(m)==="record"){input=add("textarea");input.maxLength=200;input.rows=2;input.placeholder="선택: 무엇을 했는지 한 줄로 기록";}
  if(this.kind(m)==="photo"){add("p","선택: 사람이나 개인정보가 없는 결과물만 첨부하세요. 사진은 이 기기의 브라우저에만 보관됩니다.");input=add("input");input.type="file";input.accept="image/jpeg,image/png,image/webp";input.onchange=()=>{file=input.files[0]||null};}
  return {root,dispose(){clearInterval(timer)},async value(){if(E.kind(m)==="timer")return E.clean({method:"timer",seconds:seconds+(start?Math.floor((Date.now()-start)/1000):0)},m);if(E.kind(m)==="record")return E.clean({method:"record",text:input.value},m);if(m.evidence==="photo"&&file)return {method:"photo",photoId:await E.put(file)};return null}};
 },
 display(e){const x=e.supplementary;if(!x)return null;const div=document.createElement("div");div.className="note";div.textContent=this.labels[x.method]||"보조 기록";
 if(x.method==="timer")div.textContent+=" · "+x.seconds+"초";
 if(x.method==="record")div.textContent+=" · "+x.text;
 if(x.method==="photo"){const view=document.createElement("button"),del=document.createElement("button"),out=document.createElement("div");for(const b of [view,del]){b.type="button";b.className="btn mini";}view.textContent="기기 사진 보기";del.textContent="사진 삭제";let url=null;view.onclick=async()=>{try{const blob=await E.get(x.photoId);if(!blob){out.textContent="사진이 없거나 삭제되었습니다.";return}if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);const img=document.createElement("img");img.src=url;img.style.maxWidth="160px";img.onload=()=>{URL.revokeObjectURL(url);url=null};out.replaceChildren(img)}catch{out.textContent="사진을 불러올 수 없습니다."}};del.onclick=async()=>{try{await E.remove(x.photoId);e.supplementary=null;AU.G.save("delete-private-photo");div.textContent="사진 삭제됨"}catch{out.textContent="삭제하지 못했습니다."}};div.append(view,del,out)}return div;
 }
};
})();
