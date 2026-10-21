import { $, h } from "../ui/dom.js";
import { t, LOCALE, swedish } from "../i18n/index.js";
import { localFilm, titleParts } from "../i18n/titles.js";
import { exportLibrary } from "../storage/library-backup.js";
import { FILMS } from "../data/catalogue.js";
import { CURATED_COLLECTIONS } from "../data/curated.js";
import { paintedHorse } from "../ui/horse.js";
import { download } from "../storage/files.js";

export function passportRecords(library,{year=null,listId=null}={}) {
  const records=new Map();
  for(const entry of library.lists){
    if(listId && entry.id!==listId)continue;
    const films=entry.definition?.films || FILMS,byId=new Map(films.map(f=>[f.id,f]));
    for(const id of entry.progress.seen){
      const f=byId.get(id);if(!f)continue;
      const date=entry.progress.dates?.[id] || "";
      if(year && !date.startsWith(String(year)+"-"))continue;
      const record={...localFilm(f),date,list:entry.definition?.name || "Kuvert",rating:entry.progress.reviews?.[id]?.rating ?? entry.progress.lbx?.[id]?.rating ?? null,note:entry.progress.reviews?.[id]?.note || "",runtime:entry.progress.runtimes?.[id] || null,rank:(entry.progress.rankings || []).indexOf(id)+1};
      const previous=records.get(id);
      if(!previous || record.date>previous.date || (record.date===previous.date && entry.id===library.activeList))records.set(id,record);
    }
  }
  return [...records.values()].sort((a,b)=>a.date.localeCompare(b.date) || a.y-b.y || a.t.localeCompare(b.t));
}
export function escapeHTML(text){return String(text).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
export const PASSPORT_CSS=`.title-orig{display:block;font:13px/1.3 system-ui,sans-serif;opacity:.7}body{margin:0;background:#f3ebd9;color:#17263a;font:16px/1.55 Georgia,serif}.passport{max-width:900px;margin:0 auto;padding:48px}.passport h1{font-size:56px;line-height:1.1;margin:12px 0}.passport h2{font-size:28px}.passport .kicker{font:12px/1.5 monospace;letter-spacing:.2em;text-transform:uppercase}.passport .passport-cover{border:2px solid #b99b4e;padding:36px;margin-bottom:28px}.passport .passport-cover svg{width:100px;height:90px}.passport .h-wood{fill:#c7a274}.passport .h-grain{fill:none;stroke:#9b7855;stroke-width:.6}.passport .h-coat{fill:#9a3e39}.passport .h-eye{fill:#17263a}.passport .h-harness{fill:none;stroke:#e3c36e}.passport .h-studs{fill:#245b8f}.passport .h-saddle{fill:#245b8f}.passport .h-flowers .petal{fill:#f3ebd9}.passport .h-flowers .heart{fill:#e3c36e}.passport .h-gold{fill:#e3c36e;stroke:#e3c36e}.passport .dala.p0 :is(.h-coat,.h-eye,.h-harness,.h-studs,.h-saddle,.h-flowers,.h-gold){display:none}.passport .dala.p1 :is(.h-harness,.h-studs,.h-saddle,.h-flowers,.h-gold),.passport .dala.p2 :is(.h-saddle,.h-flowers,.h-gold),.passport .dala.p3 :is(.h-flowers,.h-gold),.passport .dala.p4 .h-gold{display:none}.passport-facts{display:flex;flex-wrap:wrap;gap:24px;border-block:1px solid #c8bca2;padding:20px 0;margin:24px 0}.passport-facts strong{font-size:28px;display:block}.passport-stubs{display:grid;grid-template-columns:1fr 1fr;gap:18px}.passport-stub{border:1px solid #c8bca2;border-top:4px solid #9a3e39;padding:20px;break-inside:avoid;overflow-wrap:anywhere}.passport-stub h3{font-size:24px;margin:8px 0}.passport-stub p{margin:8px 0}.passport-stub .note{white-space:pre-wrap;border-top:1px dashed #c8bca2;padding-top:12px}.passport .stamp{color:#9a3e39;font:14px monospace;letter-spacing:.2em}.passport .favourites{padding:20px;border:1px solid #b99b4e;margin:24px 0}.passport .footer{font:12px monospace;margin-top:32px}@media(max-width:600px){.passport{padding:20px}.passport-stubs{grid-template-columns:1fr}.passport h1{font-size:40px}}@media print{@page{size:A4;margin:15mm}body{background:white}.passport{padding:0;max-width:none}.passport-cover{break-after:page}.passport-stubs{grid-template-columns:1fr 1fr}a{color:inherit}}`;

export class Passport {
  constructor(app){this.app=app;$("openPassport").addEventListener("click",()=>this.show());}
  show({listId=null}={}) {
    let library;
    try{library=exportLibrary(this.app.storage,{store:this.app.store});}catch(e){return this.app.toast.show(t(e.message));}
    const all=passportRecords(library,{listId}),years=[...new Set(all.map(f=>f.date.slice(0,4)).filter(Boolean))].sort().reverse();
    const collection=CURATED_COLLECTIONS.find(c=>c.id===listId),entry=library.lists.find(l=>l.id===(listId||library.activeList));
    const progress={watched:entry?.progress.seen.length||0,total:entry?.definition?.films.length||FILMS.length};
    const select=h("select",{id:"passportYear",attrs:{"aria-label":t("Journal period")}},new Option(t("All recorded watches"),""),...years.map(y=>new Option(y,y)));
    const notes=h("input",{type:"checkbox",id:"passportNotes"}),preview=$("passportPrint");
    const paint=()=>{
      const records=passportRecords(library,{listId,year:select.value||null});
      preview.replaceChildren(this.document(records,{year:select.value,notes:notes.checked,collection,progress}));
      $("passportCount").textContent=t("{n} unique films · undated watches appear only in the full journal",{n:records.length});
    };
    select.addEventListener("change",paint);notes.addEventListener("change",paint);
    $("passportControls").replaceChildren(h("label",{class:"field"},h("span",{text:t("Journal period")}),select),h("label",{class:"checkline"},notes,h("span",{text:t("Include my private notes")})),
      h("div",{class:"row"},h("button",{class:"btn btn-primary",text:t("Print / save PDF"),on:{click:()=>window.print()}}),h("button",{class:"btn",text:t("Download journal"),on:{click:()=>{
        const html='<!doctype html><html lang="'+document.documentElement.lang+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Kuvert · '+escapeHTML(t("Cinema passport"))+'</title><style>'+PASSPORT_CSS+'</style><body>'+preview.innerHTML+'</body></html>';
        download(html,"kuvert-journal"+(select.value?"-"+select.value:"")+".html","text/html");
      }}})));
    paint();$("passportDialog").showModal();$("passportClose").onclick=()=>$("passportDialog").close();
  }
  document(records,{year,notes,collection=null,progress=null}) {
    const rated=records.filter(f=>Number.isFinite(f.rating)),average=rated.length?rated.reduce((n,f)=>n+f.rating,0)/rated.length:null;
    const minutes=records.reduce((n,f)=>n+(f.runtime||0),0),known=records.filter(f=>f.runtime).length;
    const favourites=[...rated].sort((a,b)=>b.rating-a.rating || (a.rank||9999)-(b.rank||9999)).slice(0,5);
    const horse=paintedHorse();const total=progress?.total||this.app.catalog.films.length,n=progress?.watched??this.app.store.p.seen.size;
    horse.classList.add("p"+(n===0?0:n>=total?5:n>=total*.75?4:n>=total*.5?3:n>=total*.25?2:1));
    const completion=collection&&n>=total?collection.completion[swedish?"sv":"en"]:null;
    return h("article",{class:"passport"},h("header",{class:"passport-cover"},horse,h("p",{class:"kicker",text:"KUVERT · FILMKVÄLL"}),h("h1",{text:t("Cinema passport")}),h("p",{text:completion || year || t("My watchthrough")}),h("p",{text:t("One envelope. Countless worlds.")}),h("p",{class:"fine",text:collection ? collection.title[swedish?"sv":"en"] : t("Your horse reflects progress in the currently open collection.")})),
      h("div",{class:"passport-facts"},h("div",{},h("strong",{text:String(records.length)}),t("Films watched")),h("div",{},h("strong",{text:average?average.toLocaleString(LOCALE,{maximumFractionDigits:2})+" ★":"—"}),t("Average rating")),h("div",{},h("strong",{text:Math.floor(minutes/60)+" h"}),t("Known running time"))),
      h("p",{text:t("Runtime recorded for {known} of {total} films.",{known,total:records.length})}),
      favourites.length?h("section",{class:"favourites"},h("h2",{text:t("Favorite discoveries")}),h("ol",{},...favourites.map(f=>h("li",{text:f.t+" · "+f.rating+" ★"})))):null,
      h("section",{class:"passport-stubs"},...records.map((f,i)=>h("article",{class:"passport-stub"},h("p",{class:"kicker",text:String(i+1).padStart(3,"0")+" · "+f.list}),h("h3",{},...titleParts(f)),h("p",{text:f.y+" · "+(f.date||t("Date not recorded"))}),h("p",{class:"stamp",text:t("Watched")+(f.rating?" · "+f.rating+" ★":"")}),notes&&f.note?h("p",{class:"note",text:f.note}):null))),
      records.length?null:h("p",{text:t("Your first ticket will appear here after you watch a film.")}),h("p",{class:"footer",text:t("Made from your local Kuvert library. Keep this journal somewhere safe.")}));
  }
}
