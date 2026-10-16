// Component logic in an isolated DOM model. This does not replace real browser/layout checks.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
let dom,app,Journeys,Club,collections,messages=[];
before(async()=>{
 dom=new JSDOM(await readFile(new URL('../../index.html',import.meta.url),'utf8'),{url:'https://kuvert.example/'});
 for(const name of ['window','document','Node','Option','sessionStorage','localStorage','history'])Object.defineProperty(globalThis,name,{value:name==='window'?dom.window:dom.window[name],configurable:true});
 Object.defineProperty(globalThis,'location',{value:{href:'https://kuvert.example/',origin:'https://kuvert.example',hash:'#tonight',reload(){}},configurable:true});
 globalThis.CSS={escape:x=>String(x).replace(/["\\]/g,'\\$&')};
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const {resolveList}=await import('../../js/data/lists.js'),{makeCatalog}=await import('../../js/state/catalog.js'),{Store}=await import('../../js/state/store.js');
 ({Journeys}=await import('../../js/views/journeys.js'));({Club}=await import('../../js/views/club.js'));
 ({CURATED_COLLECTIONS:collections}=await import('../../js/data/curated.js'));
 const list=resolveList(localStorage),catalog=makeCatalog(list),store=new Store({list,catalog,storage:localStorage});store.load();
 app={list,catalog,store,storage:localStorage,seagal:false,stage:{shown:null,open:false,openFilm(){}},router:{page:'journeys',show(page){this.page=page;}},toast:{show(message){messages.push(message);}},confetti(){},share:{deliver:async()=>{}},dialogs:{confirm:async()=>false},settings:{}};
 app.journeys=new Journeys(app);
});
after(()=>dom.window.close());
test('new controller IDs exist, collections render, and without a club service the club stays out of sight',()=>{
 app.journeys.render();assert.equal(document.querySelectorAll('.collection-card').length,3);assert.equal(document.querySelector('#ceremonySelect'),null,'re-running the Oscars became Galan (js/fun/gala.js)');
 assert.equal(document.querySelector('#clubTeaser').hidden,true);
 const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);assert.equal(ids.length,new Set(ids).size,'IDs unique');
});
test('curator context is spoiler-gated, and all questions are proper list items',()=>{
 const f=collections[0].films[1];app.stage.open=true;app.journeys.context(f);assert.equal(document.querySelector('#filmContext').hidden,false);assert.equal(document.querySelectorAll('#filmContext details li').length,0);
 app.store.p.seen.add(f.id);app.journeys.context(f);assert.equal(document.querySelectorAll('#filmContext details li').length,2);app.store.p.seen.delete(f.id);
});
test('journal notes require explicit choice, with text injection escaped by DOM construction',()=>{
 const f=app.catalog.films[0];app.store.markSeen(f.id,true);app.store.saveReview(f.id,{rating:4.5,note:'<script>PRIVATE JOURNAL NOTE</script>'});app.journeys.passport.show();
 assert.doesNotMatch(document.querySelector('#passportPrint').textContent,/PRIVATE JOURNAL NOTE/);const box=document.querySelector('#passportNotes');box.checked=true;box.dispatchEvent(new dom.window.Event('change'));
 assert.match(document.querySelector('#passportPrint').textContent,/PRIVATE JOURNAL NOTE/);assert.equal(document.querySelector('#passportPrint script'),null);document.querySelector('#passportDialog').close();
});
test('sealed invitation title appears only after recipient opens it; no progress is changed',async()=>{
 const {encodeInvitation}=await import('../../js/journeys/invitations.js'),seen=app.store.p.seen.size;
 app.journeys.receive(encodeInvitation({v:1,film:{id:'2000-test',t:'SECRET FILM',y:2000},message:'<img src=x>'}));assert.doesNotMatch(document.querySelector('#journeyDialog').textContent,/SECRET FILM/);assert.equal(document.querySelector('#journeyDialog img'),null);
 [...document.querySelectorAll('#journeyContent button')].find(b=>b.textContent==='Open the invitation').click();assert.match(document.querySelector('#journeyDialog').textContent,/SECRET FILM/);assert.equal(app.store.p.seen.size,seen);app.journeys.dialog.close();
});
test('club UI preserves drafts across refresh, hides other private ratings, and handles corrupt saved endpoint',()=>{
 localStorage.setItem('kuvert:club:v1',JSON.stringify({endpoint:'javascript:bad'}));app.router.page='club';app.club=new Club(app);assert.match(app.club.status,/could not be read/);
 app.club.client.credential={roomId:'abcdefghijklmnop',memberId:'abcdefghijklmnop',memberToken:'a'.repeat(43),inviteToken:'b'.repeat(43)};
 const me={id:'abcdefghijklmnop',name:'Host',host:true,active:true,constraints:{maxMinutes:null,services:[],watchedIds:[],requireStreaming:false}},film={id:'1927-wings',title:'Wings',year:1927};
 const session={id:'session123456789',film,filmId:film.id,state:'watching',participants:[{id:me.id,name:me.name,participating:true,submitted:false,agreed:true}],ownRating:null};
 app.club.client.room={name:'Test club',expiresAt:'2027-01-01',members:[me],eligible:[],catalogue:[film],sessions:[session]};app.club.render();
 me.constraints.watchedIds=['1994-the-shawshank-redemption'];assert.ok(app.club.constraints().watchedIds.includes('1994-the-shawshank-redemption'),'updating time keeps server-side club watch history');
 const note=document.querySelector('[data-key="note-'+session.id+'"]');note.value='DRAFT';app.club.render();assert.equal(document.querySelector('[data-key="note-'+session.id+'"]')?.value,'DRAFT');assert.equal(document.querySelectorAll('.club-ratings').length,0);
 clearInterval(app.club.timer);
});
test('restore dialog offers Replace when a corrupt current library cannot be merged',async()=>{
 const {exportLibrary}=await import('../../js/storage/library-backup.js');const snapshot=exportLibrary(localStorage,{store:app.store});
 const raw=localStorage.getItem('kuvert:v4');localStorage.setItem('kuvert:v4','BROKEN');app.store.writeLocked=true;
 await app.journeys.restore({files:[new File([JSON.stringify(snapshot)],'library.json',{type:'application/json'})],value:''});
 assert.equal(app.journeys.dialog.open,true);const mode=document.querySelector('#journeyContent select');assert.ok(mode);assert.match(document.querySelector('#journeyContent').textContent,/Choose Replace entire library/);
 mode.value='replace';mode.dispatchEvent(new dom.window.Event('change'));assert.equal([...document.querySelectorAll('#journeyContent button')].find(b=>b.textContent==='Restore library').disabled,false);
 localStorage.setItem('kuvert:v4',raw);app.store.writeLocked=false;app.journeys.dialog.close();
});
