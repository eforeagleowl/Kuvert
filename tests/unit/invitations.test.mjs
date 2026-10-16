import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeInvitation,decodeInvitation,invitationURL} from '../../js/journeys/invitations.js';
import {passportRecords,escapeHTML} from '../../js/journeys/passport.js';
test('sealed invitation round-trips Unicode without including progress or secrets',()=>{
 const input={v:1,film:{id:'1921-the-phantom-carriage',t:'Körkarlen',y:1921},message:'Filmkväll 🍿',date:'2026-10-23',token:'private',reviews:{private:'notes'}};
 const decoded=decodeInvitation(encodeInvitation(input));assert.equal(decoded.film.t,'Körkarlen');assert.equal(decoded.message,input.message);assert.equal(decoded.token,undefined);assert.equal(decoded.reviews,undefined);
 const url=new URL(invitationURL('https://kuvert.example/path/?private=yes#stats',input));assert.equal(url.search,'');assert.match(url.hash,/^#invite=/);
});
test('untrusted invitations refuse invalid identities, dates, giant inputs and executable URLs',()=>{
 assert.throws(()=>decodeInvitation('a'.repeat(4001)));assert.throws(()=>decodeInvitation('!!'));
 const value={v:1,film:{id:'x',t:'Test',y:2000},date:'2026-02-30'};assert.throws(()=>encodeInvitation(value));
 assert.throws(()=>encodeInvitation({...value,date:'',film:{...value.film,id:'<script>'}}));
 assert.throws(()=>invitationURL('javascript:alert(1)',{...value,date:''}));
});
test('passport years exclude undated films and duplicate lists do not inflate the count',()=>{
 const film={id:'2000-test',t:'A <film>',y:2000};
 const entry=(id,date)=>({id,definition:{name:id,films:[film]},progress:{seen:[film.id],dates:{[film.id]:date},reviews:{[film.id]:{rating:4,note:'<script>private</script>'}},runtimes:{[film.id]:90}}});
 const library={activeList:'b',lists:[entry('a',''),entry('b','2026-10-13')]};
 assert.equal(passportRecords(library).length,1);assert.equal(passportRecords(library,{year:2026}).length,1);assert.equal(passportRecords(library,{year:2025}).length,0);
 assert.equal(escapeHTML('<script>'), '&lt;script&gt;');
});
