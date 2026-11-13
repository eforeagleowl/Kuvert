import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newContext,openPage,problems} from './helpers.mjs';
test('curated envelope, offline facts, reflection, invitation and private-note journal',async()=>{
 const context=await newContext({welcomed:false});const page=await openPage(context,'/');
 await page.click('a[data-route="journeys"]:visible');assert.equal(await page.locator('#curatedGrid .collection-card:not(.gala-card)').count(),4);
 assert.equal(await page.locator('#curatedGrid .collection-card').first().locator('.collection-films li').count(),7,'the envelope shows its seven films');
 assert.equal(await page.locator('#ceremonySelect').count(),0);assert.equal(await page.locator('#clubTeaser').isVisible(),false,'no club service here, so no club on offer');
 await page.locator('#curatedGrid .collection-card').first().getByRole('button',{name:'Start this envelope',exact:true}).click();
 await page.waitForFunction(()=>window.kuvert?.app?.list.id==='curated-noir');
 await page.evaluate(()=>window.kuvert.app.stage.openFilm('1944-double-indemnity'));
 await page.waitForSelector('#ticket:not([hidden])');await page.waitForFunction(()=>!window.kuvert.app.stage.busy);
 assert.match(await page.textContent('#pickFacts'),/108 min/);
 assert.equal(await page.locator('#filmContext').isVisible(),false);await page.click('#moreDetails > summary');
 assert.match(await page.textContent('#filmContext'),/insurance office/);assert.doesNotMatch(await page.textContent('#filmContext'),/null/);
 await page.click('#shareBtn');await page.getByRole('button',{name:'Sealed invitation',exact:true}).click();await page.fill('#inviteMessage','Friday fika 🍿');await page.getByRole('button',{name:'Create invitation',exact:true}).click();
 const invitation=await page.locator('#inviteOutput textarea').inputValue();assert.equal(await page.locator('#inviteOutput .invite-qr').count(),1);
 const guest=await context.newPage();await guest.goto(invitation);await guest.waitForSelector('#journeyDialog[open]');
 assert.doesNotMatch(await guest.textContent('#journeyDialog'),/Double Indemnity/);await guest.getByRole('button',{name:'Open the invitation',exact:true}).click();assert.match(await guest.textContent('#journeyDialog'),/Double Indemnity/);await guest.close();
 await page.click('#journeyClose');await page.click('#markBtn');await page.waitForSelector('#watchedPanel:not([hidden])');
 await page.waitForFunction(()=>/knowing the narrator/.test(document.getElementById('filmContext').textContent));
 assert.doesNotMatch(await page.textContent('#filmContext'),/null/);
 await page.evaluate(()=>{const app=window.kuvert.app;app.store.saveReview('1944-double-indemnity',{rating:4.5,note:'PRIVATE JOURNAL NOTE'});app.router.show('stats');});
 await page.click('#openPassport');assert.doesNotMatch(await page.textContent('#passportPrint'),/PRIVATE JOURNAL NOTE/);await page.check('#passportNotes');assert.match(await page.textContent('#passportPrint'),/PRIVATE JOURNAL NOTE/);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download journal',exact:true}).click();assert.match((await download).suggestedFilename(),/^kuvert-journal.*\.html$/);
 if(process.env.KUVERT_SCREENSHOT_DIR) await page.screenshot({path:process.env.KUVERT_SCREENSHOT_DIR+'/kuvert-passport.png',fullPage:true});
 assert.deepEqual(await problems(page),[]);await context.close();
});
test('Galan: every Best Picture nominee as an extra mode, with watched films carried both ways',async()=>{
 const context=await newContext();const page=await openPage(context,'/');
 await page.evaluate(()=>{const{store}=window.kuvert.app;for(const id of ['1942-casablanca','1976-rocky','1995-heat'])store.markSeen(id,true);});
 // In from its card on Envelopes.
 await page.evaluate(()=>window.kuvert.app.router.show('journeys'));
 // Its card already counts what's been watched in the main list (Heat is an honorable mention: not on a ballot).
 assert.match(await page.textContent('.gala-card'),/621 films · 2 watched/);
 assert.match(await page.textContent('.gala-card'),/Enter the gala/,'nothing watched in Galan itself yet');
 await Promise.all([page.waitForEvent('load'),page.locator('.gala-card').getByRole('button',{name:'Enter the gala',exact:true}).click()]);await page.waitForFunction(()=>window.kuvert?.app);
 const gala=await page.evaluate(()=>{const{list,catalog,store}=window.kuvert.app;return{list:list.id,films:catalog.films.length,hm:catalog.films.filter(f=>f.s==='H').length,seen:[...store.p.seen].sort(),palette:document.documentElement.dataset.palette,name:document.querySelector('[data-name]').textContent};});
 assert.deepEqual(gala,{list:'gala',films:621,hm:0,seen:['1942-casablanca','1976-rocky'],palette:'gala',name:'Galan'},'Heat is an honorable mention, so it stays behind');
 assert.match(await page.textContent('#toast'),/2 films came along from Kuvert/);
 await page.evaluate(()=>window.kuvert.app.stage.openFilm('1976-taxi-driver'));await page.waitForFunction(()=>!window.kuvert.app.stage.busy);
 assert.match(await page.textContent('#ticket'),/Lost to Rocky at the 49th Academy Awards\./);
 await page.evaluate(()=>window.kuvert.app.store.markSeen('1927-wings',true));
 await page.evaluate(()=>window.kuvert.app.router.show('settings'));const download=page.waitForEvent('download');await page.click('#saveLibrary');
 const backup=JSON.parse(await (await (await download).createReadStream()).toArray().then(c=>Buffer.concat(c).toString()));
 assert.ok(JSON.stringify(backup).includes('"gala"'),'the whole-library backup keeps Galan and its progress');
 await Promise.all([page.waitForEvent('load'),page.click('#galaLeaveFooter')]);await page.waitForFunction(()=>window.kuvert?.app);
 const back=await page.evaluate(()=>({list:window.kuvert.app.list.id,films:window.kuvert.app.catalog.films.length,wings:window.kuvert.app.store.p.seen.has('1927-wings')}));
 assert.deepEqual(back,{list:'builtin',films:275,wings:true});
 assert.deepEqual(await problems(page),[]);await context.close();
});
test('a film watched in one list is watched in every list that has it, and Galan filters like the main list',async()=>{
 const context=await newContext();const page=await openPage(context,'/');
 await page.evaluate(()=>{const{store}=window.kuvert.app;store.markSeen('1940-rebecca',true,{date:'2026-03-01'});store.rate('1940-rebecca',4.5);store.markSeen('1954-rear-window',true,{date:null});});
 // Hitchcock Week has both: its card counts them before the envelope has ever been opened.
 await page.evaluate(()=>window.kuvert.app.router.show('journeys'));
 const card=page.locator('.collection-card',{hasText:'Hitchcock Week'});
 assert.match(await card.textContent(),/7 films · 2 watched/);
 assert.equal(await card.locator('.collection-films li.seen').count(),2);
 await Promise.all([page.waitForEvent('load'),card.getByRole('button',{name:'Start this envelope',exact:true}).click()]);
 await page.waitForFunction(()=>window.kuvert?.app?.list.id==='curated-hitchcock');
 // Opening it brings them in, with the date and the stars.
 await page.waitForFunction(()=>document.getElementById('toastText').textContent==='2 films came along from Kuvert.');
 const there=await page.evaluate(()=>{const p=window.kuvert.app.store.p;return{seen:[...p.seen].sort(),date:p.dates['1940-rebecca'],stars:p.reviews['1940-rebecca'].rating,undated:!('1954-rear-window' in p.dates)};});
 assert.deepEqual(there,{seen:['1940-rebecca','1954-rear-window'],date:'2026-03-01',stars:4.5,undated:true});
 // Vertigo, watched in the envelope, and Rebecca go on to Galan (Rear Window was never on a ballot).
 await page.evaluate(()=>window.kuvert.app.store.markSeen('1958-vertigo',true));
 await page.evaluate(()=>window.kuvert.app.router.show('journeys'));
 await Promise.all([page.waitForEvent('load'),page.locator('.gala-card').getByRole('button',{name:'Enter the gala',exact:true}).click()]);
 await page.waitForFunction(()=>window.kuvert?.app?.list.id==='gala');
 assert.deepEqual(await page.evaluate(()=>[...window.kuvert.app.store.p.seen]),['1940-rebecca']);
 // Every film in Galan has a runtime, a director and moods, so no filter sets any aside for want of details.
 const facts=await page.evaluate(()=>{const{store,catalog}=window.kuvert.app;return{films:catalog.films.length,runtimes:catalog.films.filter(f=>store.p.runtimes[f.id]).length,moods:catalog.films.filter(f=>store.moodsFor(f.id).length).length};});
 assert.deepEqual(facts,{films:621,runtimes:621,moods:621});
 await page.evaluate(()=>window.kuvert.app.store.setTimeMode('120'));
 await page.waitForFunction(()=>/films fit tonight’s filters/.test(document.getElementById('eligibleCount').textContent));
 assert.ok(Number((await page.textContent('#eligibleCount')).match(/^\d+/)[0])>250,await page.textContent('#eligibleCount'));
 assert.equal(await page.isHidden('#metadataTools'),true,'no films waiting for details');
 await page.evaluate(()=>{const{store,stage}=window.kuvert.app;store.setTimeMode('0');store.pick('1929-alibi');stage.syncPick();});
 await page.click('#drawBtn');await page.waitForFunction(()=>!window.kuvert.app.stage.busy&&window.kuvert.app.stage.open);
 assert.match(await page.textContent('#pickFacts'),/90 min · Dir\. Roland West/i);
 assert.deepEqual(await problems(page),[]);await context.close();
});
