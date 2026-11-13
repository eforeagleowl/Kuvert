import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newContext,openPage,problems} from './helpers.mjs';
test('curated envelope, offline facts, reflection, invitation and private-note journal',async()=>{
 const context=await newContext({welcomed:false});const page=await openPage(context,'/');
 await page.click('a[data-route="journeys"]:visible');assert.equal(await page.locator('#curatedGrid .collection-card:not(.gala-card,.award-card)').count(),5);
 // By name: an envelope in season leads the shelf, so which one comes first depends on the day.
 const noir=page.locator('#curatedGrid .collection-card',{hasText:'Seven Nights of Noir'});
 assert.equal(await noir.locator('.collection-films li').count(),7,'the envelope shows its seven films');
 assert.equal(await page.locator('#ceremonySelect').count(),0);assert.equal(await page.locator('#clubTeaser').isVisible(),false,'no club service here, so no club on offer');
 await noir.getByRole('button',{name:'Start this envelope',exact:true}).click();
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
test('BAFTA Best Film: every winner as a list of its own, in the British Academy\'s words, with what was watched elsewhere',async()=>{
 const context=await newContext();const page=await openPage(context,'/');
 // The Apartment won both prizes. Watched in Kuvert's own list, it counts on the BAFTA card before that list is ever opened.
 await page.evaluate(()=>{const{store}=window.kuvert.app;store.markSeen('1960-the-apartment',true,{date:'2026-02-14'});store.markSeen('1995-heat',true);});
 await page.evaluate(()=>window.kuvert.app.router.show('journeys'));
 const card=page.locator('.award-card');
 assert.match(await card.textContent(),/BAFTA Best Film/);assert.match(await card.textContent(),/80 films · 1 watched/);assert.match(await card.textContent(),/1947 – 2025/);
 // Look inside: all eighty, and the way in.
 await card.getByRole('button',{name:'Look inside',exact:true}).click();await page.waitForSelector('#journeyDialog[open]');
 assert.equal(await page.locator('#journeyContent li').count(),80);assert.match(await page.textContent('#journeyContent'),/Bicycle Thieves/);assert.doesNotMatch(await page.textContent('#journeyContent'),/null|— min/);
 assert.equal(await page.locator('#journeyContent').getByRole('button',{name:'Start this list',exact:true}).count(),1);
 await page.click('#journeyClose');
 await Promise.all([page.waitForEvent('load'),card.getByRole('button',{name:'Start this list',exact:true}).click()]);await page.waitForFunction(()=>window.kuvert?.app?.list.id==='bafta');
 const there=await page.evaluate(()=>{const{list,catalog,store}=window.kuvert.app;return{films:catalog.films.length,award:list.award,prize:catalog.prize,seen:[...store.p.seen],date:store.p.dates['1960-the-apartment'],palette:document.documentElement.dataset.palette,name:document.querySelector('[data-name]').textContent,title:document.title};});
 assert.deepEqual(there,{films:80,award:'bafta',prize:'Best Film',seen:['1960-the-apartment'],date:'2026-02-14',palette:'natt',name:'BAFTA Best Film',title:'BAFTA Best Film'},'Heat never won it, so it stays behind');
 assert.match(await page.textContent('#toast'),/1 film came along from Kuvert/);
 // A winner's ticket: the British Academy's ceremony and what the film is about.
 await page.evaluate(()=>window.kuvert.app.stage.openFilm('1982-gandhi'));await page.waitForFunction(()=>!window.kuvert.app.stage.busy&&window.kuvert.app.stage.open);
 assert.match(await page.textContent('#ticket'),/Won at the 36th British Academy Film Awards\./);assert.equal(await page.textContent('#pickMeta'),'1982 · Best Film winner');
 await page.waitForSelector('#pickPremise:not([hidden])');
 // The year two films shared the prize.
 await page.evaluate(()=>window.kuvert.app.stage.openFilm('1961-the-hustler'));await page.waitForFunction(()=>/The Hustler/.test(document.getElementById('pickTitle').textContent));
 assert.equal(await page.textContent('#oscarLine'),'Shared the prize with Ballad of a Soldier at the 15th British Academy Film Awards.');
 // Two of the three Lord of the Rings films won: here they are films of their own, not parts of a series.
 await page.evaluate(()=>window.kuvert.app.stage.openFilm('2003-the-lord-of-the-rings-the-return-of-the-king'));await page.waitForFunction(()=>/Return of the King/.test(document.getElementById('pickTitle').textContent));
 assert.equal(await page.isHidden('#pickNote'),true);
 // Every winner has a runtime and moods, the seventeen that are new to Kuvert too.
 const facts=await page.evaluate(()=>{const{store,catalog}=window.kuvert.app;return{runtimes:catalog.films.filter(f=>store.p.runtimes[f.id]).length,moods:catalog.films.filter(f=>store.moodsFor(f.id).length).length};});
 assert.deepEqual(facts,{runtimes:80,moods:80});
 // Watched here, judged here: the question names the prize, and the film it shared with is not offered as one it beat.
 await page.evaluate(()=>window.kuvert.app.stage.openFilm('1961-the-hustler'));await page.waitForFunction(()=>/The Hustler/.test(document.getElementById('pickTitle').textContent));
 await page.click('#markBtn');await page.waitForSelector('#watchedPanel:not([hidden])');await page.click('#wpMore');
 assert.equal(await page.textContent('#wpVerdictLabel'),'Deserved Best Film?');
 await page.locator('#wpVerdictGroup').getByRole('button',{name:'No',exact:true}).click();
 await page.waitForSelector('#wpShouldWrap:not([hidden])');
 assert.deepEqual(await page.$$eval('#wpShould option',o=>o.map(x=>x.textContent)),['Pick a film…','A nominee not on my list']);
 await page.evaluate(()=>window.kuvert.app.router.show('library'));assert.equal(await page.textContent('#leftline'),'78 winners still to watch.');
 // Its card now leads back to Kuvert, where The Hustler (an Oscar nominee) has come along.
 await page.evaluate(()=>window.kuvert.app.router.show('journeys'));
 assert.match(await page.locator('.award-card').textContent(),/80 films · 2 watched/);
 assert.equal(await page.locator('.award-card').getByRole('button',{name:'Start this list',exact:true}).count(),0);
 await Promise.all([page.waitForEvent('load'),page.locator('.award-card').getByRole('button',{name:'Back to Kuvert',exact:true}).click()]);await page.waitForFunction(()=>window.kuvert?.app?.list.id==='builtin');
 assert.deepEqual(await page.evaluate(()=>{const p=window.kuvert.app.store.p;return{hustler:p.seen.has('1961-the-hustler'),heat:p.seen.has('1995-heat'),films:window.kuvert.app.catalog.films.length};}),{hustler:true,heat:true,films:275});
 assert.match(await page.textContent('#toast'),/1 film came along from BAFTA Best Film/);
 await page.evaluate(()=>window.kuvert.app.router.show('journeys'));
 assert.match(await page.locator('.award-card').textContent(),/Continue this list/,'begun, so its button says so');
 assert.deepEqual(await problems(page),[]);await context.close();
});
test('the Christmas envelope: seven films with a note each, first on the shelf in season and in its place the rest of the year',async()=>{
 const context=await newContext();await context.clock.setFixedTime(new Date('2026-12-10T19:00:00'));
 const page=await openPage(context,'/');
 await page.evaluate(()=>window.kuvert.app.store.markSeen('1960-the-apartment',true));
 await page.evaluate(()=>window.kuvert.app.router.show('journeys'));
 assert.deepEqual(await page.$$eval('#curatedGrid .collection-card h2',h=>h.map(x=>x.textContent)),['The Christmas Envelope','Seven Nights of Noir','A Swedish Winter','First Steps into Silent Cinema','Hitchcock Week','BAFTA Best Film','Galan']);
 const card=page.locator('#curatedGrid .collection-card',{hasText:'The Christmas Envelope'});
 assert.equal(await card.getAttribute('data-theme'),'jul');assert.match(await card.textContent(),/7 films · 1 watched/,'The Apartment, watched in the main list');assert.equal(await card.locator('.collection-films li').count(),7);
 await Promise.all([page.waitForEvent('load'),card.getByRole('button',{name:'Start this envelope',exact:true}).click()]);await page.waitForFunction(()=>window.kuvert?.app?.list.id==='curated-christmas');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.palette),'falu');
 await page.evaluate(()=>window.kuvert.app.stage.openFilm('1940-the-shop-around-the-corner'));await page.waitForFunction(()=>!window.kuvert.app.stage.busy&&window.kuvert.app.stage.open);
 assert.match(await page.textContent('#pickFacts'),/99 min · Dir\. Ernst Lubitsch/i);
 await page.waitForSelector('#pickPremise:not([hidden])');assert.match(await page.textContent('#pickPremise'),/^Two clerks in a Budapest gift shop/);
 await page.click('#moreDetails > summary');assert.match(await page.textContent('#filmContext'),/cigarette box that plays a tune/);assert.doesNotMatch(await page.textContent('#filmContext'),/null/);
 // It's a Wonderful Life: the envelope's own figure and source for the edition it recommends.
 await page.evaluate(()=>window.kuvert.app.stage.openFilm('1946-it-s-a-wonderful-life'));await page.waitForFunction(()=>/Wonderful Life/.test(document.getElementById('pickTitle').textContent));
 assert.match(await page.textContent('#pickFacts'),/131 min · Dir\. Frank Capra/i);
 await page.waitForFunction(()=>/Listed at 131 minutes/.test(document.getElementById('filmContext').textContent));
 assert.deepEqual(await problems(page),[]);await context.close();
 // In July it waits its turn at the end of the shelf.
 const summer=await newContext();await summer.clock.setFixedTime(new Date('2027-07-01T19:00:00'));
 const later=await openPage(summer,'/');await later.evaluate(()=>window.kuvert.app.router.show('journeys'));
 assert.deepEqual(await later.$$eval('#curatedGrid .collection-card h2',h=>h.map(x=>x.textContent)),['Seven Nights of Noir','A Swedish Winter','First Steps into Silent Cinema','Hitchcock Week','The Christmas Envelope','BAFTA Best Film','Galan']);
 assert.deepEqual(await problems(later),[]);await summer.close();
});
