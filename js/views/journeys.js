import { $, h, s, icon, copyText, keepFocus } from "../ui/dom.js";
import { t, swedish, LOCALE } from "../i18n/index.js";
import { localFilm, titleParts } from "../i18n/titles.js";
import { CURATED_COLLECTIONS, CURATED_METADATA } from "../data/curated.js";
import { BASIC_METADATA } from "../data/basics.js";
import { buildListDefinition, readCustomLists, writeCustomLists } from "../data/lists.js";
import { KEYS } from "../compat/keys.js";
import { invitationURL, decodeInvitation } from "../journeys/invitations.js";
import { qrSVG } from "../journeys/qr.js";
import { download } from "../storage/files.js";
import { exportLibrary, readLibraryBackup, previewLibraryRestore, restoreLibrary } from "../storage/library-backup.js";
import { Passport } from "../journeys/passport.js";
import { GALA, GALA_LIST_ID, galaFilms, enterGala, leaveGala } from "../fun/gala.js";
import { CEREMONIES } from "../data/ceremonies.js";
import { POSTERS, POSTERS_AT } from "../data/posters.js";
import { freshPosters } from "../state/catalog.js";
import { listRecords, watchedAcross } from "../state/shared.js";
import { imageUrl } from "../tmdb/client.js";

// The built-in list's posters, for the envelopes' films that are on it too.
const BUILTIN_POSTERS = freshPosters(POSTERS, POSTERS_AT);

export const localized = value => typeof value === "string" ? value : value?.[swedish ? "sv" : "en"] || value?.en || "";
export function metadataFor(id) { return CURATED_METADATA[id] || BASIC_METADATA[id] || null; }
export function seedBasics(store) {
  let changed = false;
  for (const f of store.catalog.films) {
    const data = metadataFor(f.id);
    if (!data) continue;
    if (!store.p.runtimes[f.id] && Number.isFinite(data.runtime)) { store.p.runtimes[f.id] = data.runtime; changed = true; }
    if (!Object.hasOwn(store.p.moodSuggestions, f.id) && data.moods?.length) { store.p.moodSuggestions[f.id] = [...data.moods]; changed = true; }
  }
  // Metadata is not a watched mark and must not cause sync, milestones, or backup reminders.
  if (changed && !store.writeLocked) store.persist();
}

// An envelope's films can change in a later version (A Swedish Winter's version 2 swapped a film). A copy
// installed earlier is brought up to date when Kuvert starts, unless its progress mentions a film that's
// no longer in it: then it stays as it was, so nothing recorded there is lost.
export function upgradeCurated(storage) {
  let lists;
  try { lists = readCustomLists(storage); } catch { return; }
  let changed = false;
  for (const pack of CURATED_COLLECTIONS) {
    const old = lists[pack.id];
    if (!old || (old.version || 1) >= (pack.version || 1)) continue;
    const keep = new Set(pack.films.map((f) => f.id));
    const gone = (old.films || []).map((f) => f.id).filter((id) => !keep.has(id));
    // The save carries a copy of the list itself; only its progress counts here.
    let progress = "";
    try {
      const { list: _l, definition: _d, catalogue: _c, ...rest } = JSON.parse(storage.getItem(KEYS.list(pack.id)) || "{}");
      progress = JSON.stringify(rest);
    } catch { continue; }
    if (gone.some((id) => progress.includes('"' + id + '"'))) continue;
    lists[pack.id] = { ...buildListDefinition(pack), version: pack.version || 1 };
    changed = true;
  }
  if (changed) try { writeCustomLists(storage, lists); } catch {}
}

const button = (text, fn, cls = "btn") => h("button", { type: "button", class: cls, text: t(text), on: { click: fn } });
const sourceLink = source => {
  const url = typeof source === "string" ? source : source?.url;
  try { const u = new URL(url); return u.protocol === "https:" ? h("a", { href:u.href,target:"_blank",rel:"noopener",text:t("Source") }) : null; } catch { return null; }
};

export class Journeys {
  constructor(app) {
    this.app = app;
    this.passport = new Passport(app);
    this.dialog = $("journeyDialog");
    $("journeyClose").addEventListener("click", () => this.dialog.close());
    this.dialog.addEventListener("close", () => { if (this.pendingLibraryRestore) { this.pendingLibraryRestore = null; location.reload(); } });
    $("saveLibrary").addEventListener("click", () => this.backup());
    this.contextKey = null;
  }
  open(title, ...children) {
    $("journeyTitle").textContent = title;
    $("journeyContent").replaceChildren(...children);
    if (!this.dialog.open) this.dialog.showModal();
  }
  // What a list counts as watched: its own films, and those watched in any other list (js/state/shared.js).
  progress(id) {
    this.records ??= listRecords(this.app.storage, { id: this.app.list.id, p: this.app.store.p });
    return watchedAcross(this.records, id);
  }
  // Whether anything has been watched in the list itself: its button says Continue, not Start.
  begun(id) {
    this.records ??= listRecords(this.app.storage, { id: this.app.list.id, p: this.app.store.p });
    return (this.records.get(id)?.seen.size || 0) > 0;
  }
  start(definition, pickId = null) {
    const storage = this.app.storage;
    if (!storage) return this.app.toast.show(t("Browser storage is unavailable. Save a backup before changing lists."));
    if (this.app.store.writeLocked) return this.app.toast.show(t("Restore a backup or start fresh first: Kuvert couldn't read this browser's save."));
    if (this.app.store.dirty || !this.app.store.persist()) return this.app.toast.show(t("Progress could not be saved. Download a backup before changing lists."));
    try {
      const lists = readCustomLists(storage);
      if (!lists[definition.id]) { lists[definition.id] = { ...buildListDefinition(definition), ...(definition.version ? { version: definition.version } : {}) }; writeCustomLists(storage, lists); }
      storage.setItem(KEYS.activeList, definition.id);
      if (pickId) sessionStorage.setItem("kuvert:invitedFilm", pickId);
      location.hash = "tonight";
      location.reload();
    } catch(e) { this.app.toast.show(t(e.message)); }
  }
  render() {
    if (this.app.seagal) return;
    this.records = null; // read afresh: another list's save may have changed
    keepFocus(() => {
      $("curatedGrid").replaceChildren(...CURATED_COLLECTIONS.map((pack, index) => {
        const seen = this.progress(pack.id), count = pack.films.filter(f => seen.has(f.id)).length;
        const title = localized(pack.title || pack.name);
        return h("article", {class:"collection-card", dataset:{theme:pack.palette || "kuvert"}},
          h("div", {class:"collection-art"}, h("span",{class:"collection-number",attrs:{"aria-hidden":"true"},text:"0"+(index+1)}), this.filmStrip(pack.films, seen), h("span",{class:"collection-seal",attrs:{"aria-hidden":"true"},text:pack.badge})),
          h("div",{class:"collection-copy"},h("p",{class:"kicker",text:t("Curated envelope")}),h("h2",{text:title}),
            h("p",{text:localized(pack.tagline || pack.introduction || pack.description || pack.subtitle)}),
            h("p",{class:"fine",text:t("{n} films · {seen} watched",{n:pack.films.length,seen:count})}),
            h("progress",{max:pack.films.length,value:count,attrs:{"aria-label":t("Collection progress")}}),
            count === pack.films.length ? h("p",{class:"completion-stamp",text:localized(pack.completion)}) : null,
            h("div",{class:"row"},button(this.begun(pack.id) ? "Continue this envelope" : "Start this envelope",()=>this.start(pack),"btn btn-primary"),button("Look inside",()=>this.preview(pack))),
            count === pack.films.length ? button("Print your keepsake",()=>this.passport.show({listId:pack.id})) : null));
      }), this.galaCard());
      $("clubTeaser").hidden = !this.app.club?.available;
    });
  }
  // An envelope's films as little stubs: the poster where there is one, else the year. Watched ones are ticked.
  filmStrip(films, seen) {
    return h("ol",{class:"collection-films",attrs:{"aria-label":t("The films in this envelope")}},...films.map(f=>{
      const path=this.app.store.posterPath(f.id) || BUILTIN_POSTERS[f.id]?.[1], name=localFilm(f).t+" ("+f.y+")";
      return h("li",{class:seen.has(f.id)?"seen":"",title:name},
        path?h("img",{alt:"",src:imageUrl("w92",path),crossOrigin:"anonymous",loading:"lazy",decoding:"async",on:{error:e=>e.target.remove()}}):null,
        h("span",{attrs:{"aria-hidden":"true"},text:String(f.y)}),
        h("span",{class:"sr-only",text:name+(seen.has(f.id)?t(", watched"):"")}));
    }));
  }
  // Galan, every Best Picture nominee: a list of its own beside the envelopes (js/fun/gala.js).
  galaCard() {
    const here=this.app.list.id===GALA_LIST_ID, ids=this.galaIds??=galaFilms().map(f=>f.id), total=ids.length;
    const across=this.progress(GALA_LIST_ID), seen=ids.filter(id=>across.has(id)).length, years=CEREMONIES[0].year+" – "+CEREMONIES.at(-1).year;
    const go=(fn)=>()=>this.app.storage && fn(this.app.storage);
    return h("article",{class:"collection-card gala-card",dataset:{theme:"gala"}},
      h("div",{class:"collection-art"},h("span",{class:"collection-number",attrs:{"aria-hidden":"true"},text:String(CEREMONIES.length)}),h("p",{class:"gala-years",attrs:{"aria-hidden":"true"},text:years}),h("span",{class:"collection-seal",attrs:{"aria-hidden":"true"},text:"GALA"})),
      h("div",{class:"collection-copy"},h("p",{class:"kicker",text:t("The full ballot")}),h("h2",{text:localized(GALA.name)}),
        h("p",{text:localized(GALA.subtitle)}),
        h("p",{class:"fine",text:t("{n} films · {seen} watched",{n:total,seen})}),
        h("progress",{max:total,value:seen,attrs:{"aria-label":t("Collection progress")}}),
        h("div",{class:"row"},here?button("Leave the gala",go(leaveGala),"btn btn-primary"):button(this.begun(GALA_LIST_ID)?"Back to the gala":"Enter the gala",go(enterGala),"btn btn-primary"))));
  }
  preview(pack) {
    this.open(localized(pack.title || pack.name),h("p",{text:localized(pack.curatorNote || pack.introduction || pack.subtitle)}),
      h("ol",{class:"journey-film-list"},...pack.films.map(f=>h("li",{},h("strong",{},...titleParts(localFilm(f))),h("span",{text:f.y+" · "+(metadataFor(f.id)?.runtime || "—")+" min"})))),
      button("Start this envelope",()=>this.start(pack),"btn btn-primary"));
  }
  context(f) {
    const data = f && metadataFor(f.id), key = f?.id+":"+this.app.store.p.seen.has(f?.id)+":"+this.app.stage.open;
    if (key===this.contextKey) return;
    this.contextKey=key;
    const target=$("filmContext");target.hidden=!data || !this.app.stage.open || this.app.stage.finale;
    if(target.hidden) return;
    const watched=this.app.store.p.seen.has(f.id);
    // replaceChildren would print a null as the word "null": only real nodes go in.
    target.replaceChildren(...[h("p",{class:"kicker",text:t(data.context?"A note from the curator":"About this presentation")}),data.context?h("p",{text:localized(data.context)}):null,
      data.editionNote || data.editionNotes ? h("p",{class:"fine",text:localized(data.editionNote || data.editionNotes)}):null,
      data.questions ? watched ? h("details",{},h("summary",{text:t("After the film · conversation starters")}),h("ol",{},...(localized(data.questions) instanceof Array?localized(data.questions):data.questions?.[swedish?"sv":"en"] || []).map(q=>h("li",{text:q})))) :
      h("p",{class:"fine",text:t("Discussion prompts open after you mark the film watched.")}) : null,sourceLink(data.source)].filter(Boolean));
  }
  // Share on the ticket: the ticket as a picture, or a sealed invitation.
  shareChoice(f) {
    this.open(t("Share tonight’s film"),h("p",{text:t("Send the ticket as a picture, or as a sealed invitation: your friend opens an envelope to see the film.")}),
      h("div",{class:"row"},button("Ticket image",()=>{this.dialog.close();this.app.share.ticket(f);},"btn btn-primary"),button("Sealed invitation",()=>this.invite(f))));
  }
  invite(f) {
    if(!f) return;
    const date=h("input",{type:"date",id:"inviteDate"}),message=h("textarea",{id:"inviteMessage",maxLength:180,rows:2});
    const output=h("div",{id:"inviteOutput",class:"invite-output"});
    this.open(t("Send a sealed invitation"),h("p",{text:t("Your friend opens an envelope to reveal the film. Only this film, date and message go into the link.")}),
      h("label",{class:"field"},h("span",{text:t("Film night date (optional)")}),date),
      h("label",{class:"field"},h("span",{text:t("Personal message (optional)")}),message),
      button("Create invitation",()=>{
        try {
          // The original title travels: the friend's Kuvert shows it in their own language.
          const url=invitationURL(location.href,{v:1,film:{id:f.id,t:f.orig??f.t,y:f.y},date:date.value,message:message.value});
          const field=h("textarea",{readOnly:true,value:url,rows:3,attrs:{"aria-label":t("Invitation link")}});
          output.replaceChildren(qrSVG(url,t("Scan to open the sealed invitation")),field,
            h("div",{class:"row"},button("Copy link",async()=>{if(await copyText(url,field))this.app.toast.show(t("Invitation link copied."));}),
              button("Share invitation",async()=>{try{if(navigator.share)await navigator.share({title:"Kuvert",url});else await copyText(url,field);}catch(e){if(e.name!=="AbortError")this.app.toast.show(t("Could not share the invitation."));}})),
            h("p",{class:"fine",text:t("The seal hides the title during the reveal; the link is not encrypted. Anyone with it can open it.")}));
        }catch(e){this.app.toast.show(t(e.message));}
      },"btn btn-primary"),output);
  }
  receive(code) {
    try {
      const invitation=decodeInvitation(code);
      // Remove it from the address bar before further navigation; no progress changes on receipt.
      history.replaceState({page:"tonight"},"","#tonight");
      this.open(t("A sealed film night awaits"),h("div",{class:"sealed-invite",attrs:{"aria-hidden":"true"}},icon("mail")),
        invitation.date?h("p",{text:new Date(invitation.date+"T12:00:00").toLocaleDateString(LOCALE,{dateStyle:"long"})}):null,
        invitation.message?h("blockquote",{text:invitation.message}):null,
        button("Open the invitation",()=>{
          const f=invitation.film;
          this.open(t("Your invited film"),h("p",{class:"kicker",text:t("Kuvert · Filmkväll")}),h("h3",{class:"invited-title"},...titleParts(localFilm(f))),h("p",{text:String(f.y)}),
            button("Save this film locally",()=>{
              if(this.app.catalog.byId.has(f.id)){this.dialog.close();this.app.router.show("tonight");this.app.stage.openFilm(f.id);}
              else this.start({id:"invitation-"+f.id,name:"Invited film",subtitle:"A film night shared with you",palette:"kuvert",films:[f]},f.id);
            },"btn btn-primary"));
        },"btn btn-primary"));
    }catch(e){history.replaceState({page:"tonight"},"","#tonight");this.app.toast.show(t(e.message));}
  }
  backup() {
    try { const snapshot=exportLibrary(this.app.storage,{store:this.app.store});download(JSON.stringify(snapshot,null,2),"kuvert-library.json");this.app.store.recordBackup(this.app.store.data(),"library");this.app.toast.show(t("Full library backup downloaded. Keep it somewhere safe.")); }
    catch(e){this.app.toast.show(t(e.message));}
  }
  // A whole-library backup, from Settings' "Restore from a file" (js/views/settings.js).
  async restoreFile(file) {
    if(!file)return;
    try {
      if(file.size>20_000_000)throw Error(t("That backup is too large."));
      const data=await readLibraryBackup(file),mode=h("select",{attrs:{"aria-label":t("Restore method")}},new Option(t("Merge with this library"),"merge"),new Option(t("Replace entire library"),"replace"));
      const preview=h("p",{class:"fine",attrs:{role:"status"}});
      const apply=button("Restore library",()=>{
          try {
            const result=restoreLibrary(this.app.storage,data,{mode:mode.value,store:this.app.store});
            this.pendingLibraryRestore=result;
            this.open(t("Library restored"),h("p",{text:t("Reload to open the restored library, or undo this restore first.")}),
              button("Reload",()=>location.reload(),"btn btn-primary"),button("Undo restore",()=>{try{result.rollback();this.pendingLibraryRestore=null;this.dialog.close();this.app.toast.show(t("Library restore undone."));}catch(e){this.app.toast.show(t(e.message));}}));
          }catch(e){this.app.toast.show(t(e.message));}
        },"btn btn-primary");
      const paint=()=>{
        try{const p=previewLibraryRestore(this.app.storage,data,mode.value,{store:this.app.store});preview.textContent=t("{n} lists · {new} new · {before} watched now → {after} after restore",{n:p.lists,new:p.newLists,before:p.watchedBefore,after:p.watchedAfter})+" "+t("{n} lists will be removed.",{n:p.removedLists})+(p.warnings.length?" "+t("Some records need review. Keep a copy of the current library before restoring."):"");apply.disabled=false;}
        catch(e){preview.textContent=t(e.message)+" "+t("Choose Replace entire library to recover from an unreadable current library.");apply.disabled=true;}
      };
      mode.addEventListener("change",paint);paint();
      this.open(t("Restore your full library"),h("p",{text:t("Review the backup before restoring. Credentials and club access are never included.")}),mode,preview,apply);
    }catch(e){this.app.toast.show(t(e.message));}
  }
}
