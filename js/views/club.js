import { $, h, copyText, keepFocus } from "../ui/dom.js";
import { t } from "../i18n/index.js";
import { ClubClient, readClubInvite } from "../club/client.js";
import { CLUB_SERVICE } from "../club/service.js";
import { availabilityFresh } from "../state/draw.js";
import { qrSVG } from "../journeys/qr.js";
import { download } from "../storage/files.js";

export const CLUB_KEY="kuvert:club:v1";
const btn=(text,action,cls="btn")=>h("button",{type:"button",class:cls,text:t(text),on:{click:action}});
const field=(label,input)=>h("label",{class:"field"},h("span",{text:t(label)}),input);

export class Club {
  constructor(app){
    this.app=app;this.available=false;this.status="";this.pendingInvite=null;this.refreshing=false;
    let saved;try{saved=JSON.parse(app.storage?.getItem(CLUB_KEY)||"null");}catch{}
    try { this.client=new ClubClient({endpoint:saved?.endpoint || CLUB_SERVICE,credential:saved?.credential || null}); }
    catch { this.client=new ClubClient({endpoint:CLUB_SERVICE});this.status=t("Saved club access could not be read. Join again using the guest invitation."); }
    this.client.addEventListener?.("change",()=>this.render());
    $("openClub").addEventListener("click",()=>app.router.show("club"));
    document.addEventListener("visibilitychange",()=>!document.hidden&&app.router.page==="club"&&this.refresh());
    this.timer=setInterval(()=>!document.hidden&&app.router.page==="club"&&this.client.credential&&this.refresh(),5000);
    window.addEventListener("pagehide",()=>clearInterval(this.timer));
  }
  async check(){
    try{const health=await this.client.health();this.available=health.club===true;if(health.metadata){this.app.details.proxy=true;this.app.details.proxyClient=this.client;this.app.settings.renderTmdb();this.app.settings.loadCountries();if(this.app.stage.shown)this.app.stage.showInfo(this.app.stage.shown);}if(this.client.credential)await this.refresh();}
    catch{this.available=false;}
    if(this.app.router.page==="club")this.render();
    // The Envelopes page offers a club only where a club service answered.
    if(this.app.router.page==="journeys")this.app.journeys.render();
  }
  catalogue(){
    const {store,catalog}=this.app,region=store.settings.country;
    return catalog.films.filter(f=>f.kind!=="album").map(f=>({id:f.id,title:f.orig??f.t,year:f.y,runtime:store.p.runtimes[f.id]||null,
      services:[...(store.caches.availability[region]?.[f.id]?.ids||[]).map(String),...(store.p.shelf.has(f.id)?["disc"]:[])],
      servicesKnown:availabilityFresh(store.caches,f.id,region)||store.p.shelf.has(f.id)}));
  }
  constraints(maxMinutes=0,requireStreaming=false){
    const {store}=this.app,member=this.client.room?.members.find(m=>m.id===this.client.credential?.memberId);return {maxMinutes:Number(maxMinutes)||null,requireStreaming,
      services:[...(store.settings.selectedServices[store.settings.country]||[]).map(String),"disc"],watchedIds:[...new Set([...store.p.seen,...(member?.constraints?.watchedIds||[])])]};
  }
  persist(){try{if(this.client.credential)this.app.storage?.setItem(CLUB_KEY,JSON.stringify({endpoint:this.client.endpoint,credential:this.client.credential}));else this.app.storage?.removeItem(CLUB_KEY);}catch{this.status=t("Club access could not be saved on this device. Keep this tab open.");}}
  async act(fn){
    if(this.busy)return;this.refreshController?.abort();this.busy=true;$("clubStatus").textContent=t("Updating the club…");
    try{await fn();this.persist();this.status="";}
    catch(e){this.status=t(e.message || "The club could not be reached. Try again.");}
    finally{this.busy=false;this.render();}
  }
  async refresh(){if(this.refreshing||this.busy||!this.client.credential)return;this.refreshing=true;const controller=this.refreshController=new AbortController();
    try{await this.client.refresh(controller.signal);if(controller.signal.aborted)return;this.available=true;this.status="";this.persist();if(this.app.router.page==="club")this.render();}
    catch(e){if(controller.signal.aborted)return;this.status=t("Connection paused. Your local film progress is safe. Try refreshing the club.");if(this.app.router.page==="club")$("clubStatus").textContent=this.status;}
    finally{this.refreshing=false;}}
  receive(url){try{const invite=readClubInvite(url);if(!invite)throw Error(t("That invitation could not be read."));this.pendingInvite=invite;}catch(e){this.status=t("That invitation could not be read.");}history.replaceState({page:"club"},"","#club");this.app.router.show("club",{push:false});this.render();}
  render(){
    if(this.app.router.page!=="club")return;
    $("clubStatus").textContent=this.status;
    const room=this.client.room;
    if(!room){this.setup();return;}
    keepFocus(()=>this.room(room));
  }
  setup(){
    // No club service answered (GitHub Pages has none): say so, rather than offer a form that can't work.
    if(!this.available){$("clubBody").replaceChildren(h("div",{class:"club-setup card"},h("aside",{class:"notice"},h("strong",{text:t("Film clubs are not available on this site yet.")}),h("p",{text:t("You can still draw films, explore envelopes and keep your progress on this device.")}))));return;}
    const name=h("input",{id:"clubMemberName",type:"text",maxLength:40,autocomplete:"nickname",required:true});
    const roomName=h("input",{id:"clubRoomName",type:"text",maxLength:80,value:t("Friday film club")});
    const code=h("input",{id:"clubInviteCode",type:"text",value:this.pendingInvite?.inviteToken||"",maxLength:200,autocomplete:"off"});
    const endpoint=h("input",{id:"clubEndpoint",type:"url",value:this.pendingInvite?.endpoint||this.client.endpoint||location.origin});
    const limit=h("select",{id:"clubMaxMinutes"},new Option(t("Any length"),"0"),new Option(t("90 minutes or less"),"90"),new Option(t("2 hours or less"),"120"),new Option(t("3 hours or less"),"180"));
    const streaming=h("input",{id:"clubStreaming",type:"checkbox"});
    const valid=()=>{if(!name.value.trim()){name.setCustomValidity(t("Enter your name."));name.reportValidity();return false;}name.setCustomValidity("");return true;};name.addEventListener("input",()=>name.setCustomValidity(""));
    $("clubBody").replaceChildren(h("div",{class:"club-setup card"},h("p",{class:"kicker",text:t("A private table for your friends")}),h("h2",{text:t("Start or join a film club")}),
      h("p",{text:t("Agree on a film together, then reveal your ratings at the same moment.")}),
      h("p",{class:"fine",text:t("Joining shares your name, watched-film IDs, time and service choices with this club. Your private journal is not included.")}),
      field("Your name",name),field("Time available",limit),h("label",{class:"checkline"},streaming,h("span",{text:t("Use my streaming services and discs from Settings")})),
      h("p",{class:"fine",text:t("Availability is checked in the host’s selected country. Unknown availability and runtimes are excluded when those filters apply.")}),
      field("Club name",roomName),btn("Create private club",()=>{if(!valid())return;this.act(async()=>{this.client=new ClubClient({endpoint:endpoint.value});await this.client.create({name:roomName.value,memberName:name.value,catalogue:this.catalogue(),constraints:this.constraints(limit.value,streaming.checked)});this.available=true;});},"btn btn-primary"),
      h("hr"),field("Guest invitation code",code),btn("Join club",()=>{if(!valid())return;this.act(async()=>{this.client=new ClubClient({endpoint:endpoint.value});await this.client.join({inviteToken:code.value.trim(),memberName:name.value,constraints:this.constraints(limit.value,streaming.checked)});this.pendingInvite=null;this.available=true;});}),
      h("details",{class:"help"},h("summary",{text:t("Club service address")}),field("Service address",endpoint),h("p",{class:"fine",text:t("Use the Kuvert service on this site. External service origins must be allowed by the site’s security policy.")}))));
  }
  room(room){
    const me=room.members.find(m=>m.id===this.client.credential.memberId),active=room.members.filter(m=>m.active);
    const limit=h("select",{dataset:{key:"club-limit"}},new Option(t("Any length"),"0"),new Option(t("90 minutes or less"),"90"),new Option(t("2 hours or less"),"120"),new Option(t("3 hours or less"),"180"));limit.value=String(me?.constraints?.maxMinutes||0);
    const streaming=h("input",{type:"checkbox",checked:!!me?.constraints?.requireStreaming,dataset:{key:"club-streaming"}});
    const options=h("select",{id:"clubFilmChoice",dataset:{key:"club-film"},attrs:{"aria-label":t("Eligible film")}},...room.eligible.map(f=>new Option(f.title+" · "+f.year+(f.runtime?" · "+f.runtime+" min":""),f.id)));
    const previous=$("clubFilmChoice")?.value;if(room.eligible.some(f=>f.id===previous))options.value=previous;
    const current=room.sessions.filter(s=>!["cancelled","revealed"].includes(s.state));
    $("clubBody").replaceChildren(h("section",{class:"card club-room"},h("p",{class:"kicker",text:t("Filmklubb")}),h("h2",{text:room.name}),
      h("p",{class:"fine",text:t("{n} people at the table · access expires {date}",{n:active.length,date:new Date(room.expiresAt).toLocaleDateString()})}),
      h("ul",{class:"club-members"},...active.map(m=>h("li",{},h("strong",{text:m.name}),h("span",{text:(m.host?t("Host"):t("Guest"))+(m.constraints.maxMinutes?" · "+m.constraints.maxMinutes+" min":"")})))),
      h("div",{class:"club-constraints"},field("My time available",limit),h("label",{class:"checkline"},streaming,h("span",{text:t("Use my streaming services and discs from Settings")})),btn("Update my choices",()=>this.act(()=>this.client.updateMember({constraints:this.constraints(limit.value,streaming.checked)})))),
      h("div",{class:"row"},me?.host?btn("Invite friends",()=>this.invite()):null,btn("Refresh club",()=>this.refresh()),me?.host?btn("Use my current collection",()=>this.act(()=>this.client.setCatalogue(this.catalogue()))):null,
        btn(me?.host?"Close club":"Leave club",async()=>{const ok=await this.app.dialogs.confirm({title:t(me?.host?"Close this club?":"Leave this club?"),text:t(me?.host?"This closes the club for everyone. Download the scrapbook first if you want to keep it.":"Your local watch history stays. Your club membership will become inactive."),confirm:t(me?.host?"Close club":"Leave club")});if(ok)this.act(async()=>{if(me?.host)await this.client.close();else await this.client.leave();this.client.credential=null;this.client.room=null;});}))),
      h("section",{class:"card club-draw"},h("h2",{text:t("Find a film for everyone")}),h("p",{text:t("{n} films fit everyone’s choices and watch history.",{n:room.eligible.length})}),
        room.eligible.length?field("Eligible film",options):h("p",{class:"fine",text:t("No shared films fit. Increase the time, adjust services, or refresh the host’s movie details.")}),
        me?.host&&room.eligible.length&&!current.length?btn("Propose this film",()=>this.act(()=>this.client.propose({filmId:options.value})),"btn btn-primary"):null),
      ...current.map(session=>this.session(session,me)),
      h("section",{class:"card club-scrapbook"},h("h2",{text:t("Our scrapbook")}),...room.sessions.filter(s=>s.state==="revealed").map(session=>this.session(session,me)),
        room.sessions.some(s=>s.state==="revealed")?btn("Download scrapbook",()=>{
          const safe={club:room.name,sessions:room.sessions.filter(s=>s.state==="revealed").map(({film,ratings,createdAt,revealedAt})=>({film,ratings,createdAt,revealedAt}))};
          download(JSON.stringify(safe,null,2),"kuvert-club-scrapbook.json");
        }):h("p",{text:t("Your first shared film night will appear here after the ratings reveal.")})));
  }
  session(session,me){
    const film=session.film||this.client.room.catalogue.find(f=>f.id===session.filmId),title=film?.title||session.filmId;
    const participant=session.participants.find(p=>p.id===me.id),cards=[];
    cards.push(h("p",{class:"kicker",text:t(session.state==="proposed"?"At the table":session.state==="watching"?"Time to watch":"The ratings are open")}));
    cards.push(h("h3",{text:title}));
    if(session.note)cards.push(h("p",{text:session.note}));
    cards.push(h("p",{class:"fine",text:session.participants.filter(p=>p.participating).map(p=>p.name+" · "+t(session.state==="proposed"?(p.agreed===true?"Agreed":p.agreed===false?"Suggest another film":"Waiting"):p.submitted?"Submitted":"Waiting")).join(" / ")}));
    if(session.state==="proposed"&&participant?.participating)cards.push(h("div",{class:"row"},btn("I’m in",()=>this.act(()=>this.client.agree(session.id,true)),"btn btn-primary"),btn("Suggest another film",()=>this.act(()=>this.client.agree(session.id,false)))));
    if(session.state==="proposed"&&me.host)cards.push(btn("Cancel proposal",()=>this.act(()=>this.client.cancel(session.id))));
    if(session.state==="watching"&&participant?.participating){
      const rating=h("select",{dataset:{key:"rating-"+session.id},attrs:{"aria-label":t("Your private rating")}},new Option(t("Choose stars…"),""),...Array.from({length:10},(_,i)=>new Option((i+1)/2+" ★",String((i+1)/2))));
      const note=h("textarea",{maxLength:500,rows:2,dataset:{key:"note-"+session.id},attrs:{"aria-label":t("Your note for the club")}});
      rating.value=$("clubBody").querySelector('[data-key="rating-'+session.id+'"]')?.value || session.ownRating?.stars || "";
      note.value=$("clubBody").querySelector('[data-key="note-'+session.id+'"]')?.value ?? session.ownRating?.note ?? "";
      cards.push(h("p",{text:t("Your rating stays private until every participating member submits.")}),field("Your private rating",rating),field("Your note for the club",note),btn("Seal my rating",()=>{
        if(!rating.value)return this.app.toast.show(t("Choose your stars first."));this.act(()=>this.client.rate(session.id,{stars:Number(rating.value),note:note.value}));
      },"btn btn-primary"));
    }
    if(session.state==="revealed")cards.push(h("ul",{class:"club-ratings"},...session.ratings.map(r=>h("li",{},h("strong",{text:r.name+" · "+r.stars+" ★"}),r.note?h("p",{text:r.note}):null))));
    if(this.app.catalog.byId.has(session.filmId)&&session.state!=="proposed")cards.push(btn("Open in my library",()=>{this.app.router.show("tonight");this.app.stage.openFilm(session.filmId);}));
    return h("article",{class:"club-session"},...cards);
  }
  invite(){
    const url=this.client.inviteURL(location.href),input=h("textarea",{value:url,readOnly:true,rows:3,attrs:{"aria-label":t("Club invitation link")}});
    this.app.journeys.open(t("Invite friends to the club"),qrSVG(url,t("Scan to join the film club")),input,
      btn("Copy link",async()=>{if(await copyText(url,input))this.app.toast.show(t("Club invitation copied."));}),h("p",{class:"fine",text:t("Anyone with this guest invitation can join. Keep it within your group; host access is never included.")}));
  }
}
