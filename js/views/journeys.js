import { $, h, s, icon, copyText, keepFocus } from "../ui/dom.js";
import { t, swedish, LOCALE } from "../i18n/index.js";
import { CURATED_COLLECTIONS, CURATED_METADATA } from "../data/curated.js";
import { BASIC_METADATA } from "../data/basics.js";
import { buildListDefinition, readCustomLists, writeCustomLists } from "../data/lists.js";
import { KEYS } from "../compat/keys.js";
import { invitationURL, decodeInvitation } from "../journeys/invitations.js";
import { qrSVG } from "../journeys/qr.js";
import { download } from "../storage/files.js";
import { exportLibrary, readLibraryBackup, previewLibraryRestore, restoreLibrary } from "../storage/library-backup.js";
import { Passport } from "../journeys/passport.js";

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
    $("openJourneys").addEventListener("click", () => app.router.show("journeys"));
    $("sendInvite").addEventListener("click", () => this.invite(app.stage.shown));
    $("saveLibrary").addEventListener("click", () => this.backup());
    $("loadLibrary").addEventListener("click", () => $("libraryBackupInput").click());
    $("libraryBackupInput").addEventListener("change", e => this.restore(e.target));
    this.contextKey = null;
  }
  open(title, ...children) {
    $("journeyTitle").textContent = title;
    $("journeyContent").replaceChildren(...children);
    if (!this.dialog.open) this.dialog.showModal();
  }
  progress(id) {
    if (this.app.list.id === id) return this.app.store.p.seen;
    try { return new Set(JSON.parse(this.app.storage?.getItem(KEYS.list(id)) || "{}").seen || []); } catch { return new Set(); }
  }
  start(definition, pickId = null) {
    const storage = this.app.storage;
    if (!storage) return this.app.toast.show(t("Browser storage is unavailable. Save a backup before changing lists."));
    if (this.app.store.writeLocked) return this.app.toast.show(t("Restore a backup or start fresh first: Kuvert couldn't read this browser's save."));
    if (this.app.store.dirty || !this.app.store.persist()) return this.app.toast.show(t("Progress could not be saved. Download a backup before changing lists."));
    try {
      const lists = readCustomLists(storage);
      if (!lists[definition.id]) { lists[definition.id] = buildListDefinition(definition); writeCustomLists(storage, lists); }
      storage.setItem(KEYS.activeList, definition.id);
      if (pickId) sessionStorage.setItem("kuvert:invitedFilm", pickId);
      location.hash = "tonight";
      location.reload();
    } catch(e) { this.app.toast.show(t(e.message)); }
  }
  render() {
    if (this.app.seagal) return;
    keepFocus(() => {
      $("curatedGrid").replaceChildren(...CURATED_COLLECTIONS.map((pack, index) => {
        const seen = this.progress(pack.id), count = pack.films.filter(f => seen.has(f.id)).length;
        const title = localized(pack.title || pack.name);
        return h("article", {class:"collection-card", dataset:{theme:pack.palette || "kuvert"}},
          h("div", {class:"collection-art",attrs:{"aria-hidden":"true"}}, h("span",{class:"collection-number",text:"0"+(index+1)}), icon("mail"), h("span",{class:"collection-seal",text:index===0?"NATT":index===1?"VINTER":"STUM"})),
          h("div",{class:"collection-copy"},h("p",{class:"kicker",text:t("Curated envelope")}),h("h3",{text:title}),
            h("p",{text:localized(pack.tagline || pack.introduction || pack.description || pack.subtitle)}),
            h("p",{class:"fine",text:t("{n} films · {seen} watched",{n:pack.films.length,seen:count})}),
            h("progress",{max:pack.films.length,value:count,attrs:{"aria-label":t("Collection progress")}}),
            count === pack.films.length ? h("p",{class:"completion-stamp",text:localized(pack.completion)}) : null,
            h("div",{class:"row"},button(count ? "Continue this envelope" : "Start this envelope",()=>this.start(pack),"btn btn-primary"),button("Look inside",()=>this.preview(pack))),
            count === pack.films.length ? button("Print your keepsake",()=>this.passport.show({listId:pack.id})) : null));
      }));
      $("clubTeaser").hidden = !this.app.club?.available;
    });
  }
  preview(pack) {
    this.open(localized(pack.title || pack.name),h("p",{text:localized(pack.curatorNote || pack.introduction || pack.subtitle)}),
      h("ol",{class:"journey-film-list"},...pack.films.map(f=>h("li",{},h("strong",{text:f.t}),h("span",{text:f.y+" · "+(metadataFor(f.id)?.runtime || "—")+" min"})))),
      button("Start this envelope",()=>this.start(pack),"btn btn-primary"));
  }
  context(f) {
    const data = f && metadataFor(f.id), key = f?.id+":"+this.app.store.p.seen.has(f?.id)+":"+this.app.stage.open;
    $("sendInvite").hidden=!f || this.app.stage.finale;
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
  invite(f) {
    if(!f) return;
    const date=h("input",{type:"date",id:"inviteDate"}),message=h("textarea",{id:"inviteMessage",maxLength:180,rows:2});
    const output=h("div",{id:"inviteOutput",class:"invite-output"});
    this.open(t("Send a sealed invitation"),h("p",{text:t("Your friend opens an envelope to reveal the film. Only this film, date and message go into the link.")}),
      h("label",{class:"field"},h("span",{text:t("Film night date (optional)")}),date),
      h("label",{class:"field"},h("span",{text:t("Personal message (optional)")}),message),
      button("Create invitation",()=>{
        try {
          const url=invitationURL(location.href,{v:1,film:f,date:date.value,message:message.value});
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
          this.open(t("Your invited film"),h("p",{class:"kicker",text:t("Kuvert · Filmkväll")}),h("h3",{class:"invited-title",text:f.t}),h("p",{text:String(f.y)}),
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
  async restore(input) {
    const file=input.files?.[0];input.value="";if(!file)return;
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
