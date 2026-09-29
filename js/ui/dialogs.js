// Every in-page dialog (the browser's own pop-ups are blocked or clumsy on phones): confirmations, the
// watch date, your note, mood tags, restoring from a file or code, Letterboxd and list imports, and the
// image lightbox.
import { $, h } from "./dom.js";
import { StarSlider } from "./stars.js";
import { MOODS, PALETTES } from "../data/catalogue.js";
import { KEYS } from "../compat/keys.js";
import { LEGACY_IDS, LOCAL_LEGACY_IDS } from "../compat/legacy-ids.js";
import { validateProgress, validDate, isCodeOnlyLegacyBackup } from "../compat/validate.js";
import { parseCode, isModernCode } from "../compat/codes.js";
import { buildListDefinition, readCustomLists, writeCustomLists, installListFromBackup } from "../data/lists.js";
import { readBackupFile } from "../storage/files.js";
import { defaultWatchDate } from "../state/dates.js";
import { t, plural, LOCALE } from "../i18n/index.js";

export class Dialogs {
  constructor(app) {
    this.app = app;
    this.pendingRestore = null;
    // Closing with Escape counts as Cancel everywhere.
    for (const d of document.querySelectorAll("dialog")) d.addEventListener("click", (e) => e.target === d && d.id === "lightbox" && d.close());
    this.wireDate();
    this.wireReview();
    this.wireMoods();
    this.wireCode();
    this.wireRestore();
    this.wireLightbox();
  }
  get store() {
    return this.app.store;
  }

  confirm({ title, text, confirm, danger = false }) {
    return new Promise((resolve) => {
      $("confirmTitle").textContent = title;
      $("confirmText").textContent = text;
      $("confirmYes").textContent = confirm;
      $("confirmYes").className = danger ? "btn btn-danger" : "btn btn-primary";
      const dlg = $("confirmDialog");
      const done = (v) => {
        $("confirmYes").onclick = $("confirmNo").onclick = dlg.oncancel = null;
        dlg.close();
        resolve(v);
      };
      $("confirmYes").onclick = () => done(true);
      $("confirmNo").onclick = () => done(false);
      dlg.oncancel = (e) => {
        e.preventDefault();
        done(false);
      };
      dlg.showModal();
      $("confirmNo").focus();
    });
  }

  // ---------------------------------------------------------------- watch date
  wireDate() {
    $("saveDate").addEventListener("click", () => this.setDate(false));
    $("clearDate").addEventListener("click", () => this.setDate(true));
    $("cancelDate").addEventListener("click", () => $("dateDialog").close());
    $("watchDate").addEventListener("input", () => $("watchDate").setCustomValidity(""));
  }
  editDate(id) {
    this.dateId = id;
    $("dateLabel").textContent = this.app.catalog.byId.get(id).t;
    $("watchDate").value = this.store.p.dates[id] || defaultWatchDate();
    $("dateDialog").showModal();
  }
  setDate(clear) {
    const v = $("watchDate").value;
    if (!clear && !validDate(v)) {
      $("watchDate").setCustomValidity(t("Choose a valid date."));
      $("watchDate").reportValidity();
      return;
    }
    const undo = this.store.setDate(this.dateId, clear ? null : v);
    $("dateDialog").close();
    if (undo) this.app.toast.show(t("Watch date updated."), undo);
  }

  // ---------------------------------------------------------------- your note
  wireReview() {
    this.reviewStars = new StarSlider($("reviewStars"), { label: t("Your rating"), size: "md", onChange: (v) => this.setReviewStars(v) });
    $("reviewStars").setAttribute("aria-labelledby", "reviewRatingLabel");
    $("reviewClear").addEventListener("click", () => this.setReviewStars(null));
    for (const r of document.querySelectorAll('input[name="reviewVerdict"]')) r.addEventListener("change", () => this.syncReviewShould());
    $("saveReview").addEventListener("click", () => this.saveReview());
    $("cancelReview").addEventListener("click", () => $("reviewDialog").close());
  }
  setReviewStars(v) {
    this.reviewStars.setValue(v);
    this.reviewRating = v;
    $("reviewClear").hidden = v == null;
  }
  editReview(id) {
    const { catalog } = this.app,
      p = this.store.p,
      f = catalog.byId.get(id);
    if (!f) return;
    this.reviewId = id;
    $("reviewTitle").textContent = f.t;
    // A rating imported from Letterboxd pre-fills the note until you save your own.
    this.setReviewStars(p.reviews[id]?.rating ?? p.lbx[id]?.rating ?? null);
    $("reviewVerdict").hidden = !(catalog.isWinner(f) && p.seen.has(id));
    for (const r of document.querySelectorAll('input[name="reviewVerdict"]')) r.checked = r.value === (p.verdicts[id] || "");
    this.syncReviewShould();
    $("reviewNote").value = p.reviews[id]?.note || "";
    $("reviewDialog").showModal();
  }
  // "Should have won" appears when the verdict is No.
  syncReviewShould() {
    const f = this.app.catalog.byId.get(this.reviewId),
      v = document.querySelector('input[name="reviewVerdict"]:checked')?.value || "";
    this.app.fillShouldHaveWon($("reviewShould"), $("reviewShouldWrap"), f, $("reviewVerdict").hidden ? "" : v);
  }
  saveReview() {
    if (!this.reviewId) return;
    const verdictShown = !$("reviewVerdict").hidden;
    const undo = this.store.saveReview(this.reviewId, {
      note: $("reviewNote").value,
      rating: this.reviewRating ?? null,
      verdict: verdictShown ? document.querySelector('input[name="reviewVerdict"]:checked')?.value || "" : undefined,
      snub: $("reviewShould").value,
    });
    $("reviewDialog").close();
    this.app.toast.show(t("Your movie note was saved."), undo);
  }

  // ---------------------------------------------------------------- mood tags
  wireMoods() {
    $("saveMoods").addEventListener("click", () => {
      const undo = this.store.setMoods(this.moodId, [...$("moodChoices").querySelectorAll("input:checked")].map((el) => el.value));
      $("moodDialog").close();
      this.app.toast.show(t("Mood tags saved."), undo);
    });
    $("cancelMoods").addEventListener("click", () => $("moodDialog").close());
  }
  editMoods(id) {
    this.moodId = id;
    $("moodTitle").textContent = t("Moods · {title}", { title: this.app.catalog.byId.get(id).t });
    const selection = new Set(this.store.moodsFor(id));
    $("moodChoices").replaceChildren(...MOODS.map((tag) => h("label", {}, h("input", { type: "checkbox", value: tag, checked: selection.has(tag) }), t(tag))));
    $("moodDialog").showModal();
  }

  // ---------------------------------------------------------------- restoring progress
  wireCode() {
    $("codeRestore").addEventListener("click", () => this.submitCode());
    $("codeCancel").addEventListener("click", () => $("codeDialog").close());
    $("confirmLegacy").addEventListener("click", () => this.finishLegacy(true));
    $("cancelLegacy").addEventListener("click", () => this.finishLegacy(false));
    $("legacyDialog").addEventListener("cancel", (e) => {
      e.preventDefault();
      this.finishLegacy(false);
    });
  }
  openCode() {
    $("codeInput").value = "";
    $("codeError").textContent = "";
    $("codeDialog").showModal();
    $("codeInput").focus();
  }
  async submitCode() {
    const v = $("codeInput").value.trim();
    if (!v) {
      $("codeError").textContent = t("Paste a code first.");
      return;
    }
    try {
      if (!isModernCode(v) && this.app.list.custom) throw Error(t("Older codes only work with the built-in Kuvert list."));
      const data = isModernCode(v) ? parseCode(v, this.app.catalog.ctx) : null;
      $("codeDialog").close();
      const d = data || (await this.chooseLegacy(v));
      if (d) await this.requestRestore(d);
    } catch (e) {
      $("codeError").textContent = t(e.message || "That code could not be read.");
      if (!$("codeDialog").open) this.app.toast.show(t(e.message || "That code could not be read."));
    }
  }
  // Older codes don't say which list made them: ask before reading.
  chooseLegacy(code, doc = null) {
    return new Promise((resolve) => {
      this.legacyPending = { code, doc, resolve };
      $("legacyError").textContent = "";
      $("legacyCatalogue").value = "local";
      $("legacyDialog").showModal();
    });
  }
  finishLegacy(accept) {
    const p = this.legacyPending;
    if (!p) return;
    if (!accept) {
      this.legacyPending = null;
      $("legacyDialog").close();
      return p.resolve(null);
    }
    try {
      const legacyIds = $("legacyCatalogue").value === "original" ? LEGACY_IDS : LOCAL_LEGACY_IDS;
      const d = p.doc ? validateProgress(p.doc, this.app.catalog.ctx, { legacyIds }) : parseCode(p.code, this.app.catalog.ctx, legacyIds);
      this.legacyPending = null;
      $("legacyDialog").close();
      p.resolve(d);
    } catch (e) {
      $("legacyError").textContent = t(e.message);
    }
  }
  wireRestore() {
    $("mergeProgress").addEventListener("click", () => this.finishRestore("merge"));
    $("replaceProgress").addEventListener("click", () => this.finishRestore("replace"));
    $("cancelRestore").addEventListener("click", () => this.finishRestore(null));
    $("restoreDialog").addEventListener("cancel", (e) => {
      e.preventDefault();
      this.finishRestore(null);
    });
  }
  /** Previews a restore: how many films each choice adds or removes. */
  requestRestore(d, handle = null) {
    if (this.pendingRestore) return Promise.resolve(false);
    const p = this.store.p;
    return new Promise((resolve) => {
      this.pendingRestore = { d, handle, resolve };
      const added = [...d.seen].filter((id) => !p.seen.has(id)).length,
        removed = [...p.seen].filter((id) => !d.seen.has(id)).length,
        dateChanges = [...d.seen].filter((id) => p.seen.has(id) && (p.dates[id] || "") !== (d.dates[id] || "")).length;
      $("restoreSummary").textContent = t("Your current progress: {now} watched. Backup: {backup} watched. Merge adds {added}. Replace removes {removed} current marks and changes {dates} existing dates.", { now: p.seen.size, backup: d.seen.size, added, removed, dates: dateChanges });
      $("restoreNote").textContent =
        (d.saved ? t("Backup saved {when}. ", { when: new Date(d.saved).toLocaleString(LOCALE) }) : "") +
        (d.legacy ? t("Original-format backup: movie IDs will be migrated. Older text codes do not include watch dates. ") : "") +
        t("Skipped movies, notes and recent picks are included when present. Merge keeps your existing notes; Replace uses the backup. Credentials are never imported.");
      $("restoreDialog").showModal();
    });
  }
  finishRestore(mode) {
    const pending = this.pendingRestore;
    if (!pending) return;
    this.pendingRestore = null;
    $("restoreDialog").close();
    if (!mode) return pending.resolve(false);
    const undo = this.store.restore(pending.d, mode);
    if (pending.handle) {
      this.app.files.adopt(pending.handle);
      $("reconnect").hidden = true;
    }
    this.app.stage.syncPick();
    this.app.toast.show(t(mode === "merge" ? "Progress merged." : "Progress replaced."), undo);
    pending.resolve(true);
  }
  /** Reads a backup file and previews it; a backup for another list offers to switch first. */
  async readProgress(file, handle = null) {
    const obj = await readBackupFile(file);
    if (await this.offerOtherListBackup(obj)) return false;
    if (isCodeOnlyLegacyBackup(obj)) {
      const d = await this.chooseLegacy(obj.code, obj);
      return d ? this.requestRestore(d, handle) : false;
    }
    return this.requestRestore(validateProgress(obj, this.app.catalog.ctx), handle);
  }
  // A backup made for another list: offer to switch (adding the list if it came with one), then preview there.
  async offerOtherListBackup(obj) {
    const { list, storage } = this.app;
    if (!obj || obj.app !== "kuvert" || obj.catalogue === list.catalogue || list.olderCatalogues.includes(obj.catalogue)) return false;
    const { KUVERT } = await import("../data/catalogue.js");
    const builtIn = [KUVERT.catalogue, ...KUVERT.olderCatalogues].includes(obj.catalogue);
    const def = obj.list && typeof obj.list === "object" ? obj.list : null;
    if (!builtIn && !def) return false;
    const name = builtIn ? KUVERT.name + t(" (built-in)") : def.name + " · " + plural(def.films?.length || 0, "film");
    const ok = await this.confirm({
      title: t("This backup is for another list"),
      text: t(builtIn || readCustomLists(storage)[def.id] ? "It belongs to {name}. Switch to that list and preview the restore there?" : "It belongs to {name}. Switch to that list (it will be added) and preview the restore there?", { name }),
      confirm: t("Switch list"),
    });
    if (!ok) return true;
    const target = builtIn ? "builtin" : installListFromBackup(storage, def).id;
    try {
      sessionStorage.setItem(KEYS.pendingRestore, JSON.stringify(obj));
    } catch {}
    storage.setItem(KEYS.activeList, target);
    location.reload();
    return true;
  }
  resumePendingRestore() {
    let raw = null;
    try {
      raw = sessionStorage.getItem(KEYS.pendingRestore);
      sessionStorage.removeItem(KEYS.pendingRestore);
    } catch {}
    if (!raw) return;
    try {
      this.requestRestore(validateProgress(JSON.parse(raw), this.app.catalog.ctx));
    } catch (e) {
      this.app.toast.show(t(e.message || "That backup could not be restored."));
    }
  }

  // ---------------------------------------------------------------- Letterboxd preview
  letterboxd(plan, unmatched, onApply) {
    const { found, watchedHere, notYet } = plan;
    $("lbxSummary").textContent =
      t("Found {n} of your Letterboxd films on this list. {watched} are marked watched in Kuvert. ", { n: found.size, watched: watchedHere.length }) +
      (notYet.length ? t("{n} more you've logged but haven't drawn yet: their ratings will pre-fill your note when you watch them. They stay in the draw.", { n: notYet.length }) : "");
    const opts = [
      ["lbxFillRatings", "Fill in {n} missing ratings", plan.missingRating.length, true],
      ["lbxReplaceRatings", "Replace {n} Kuvert ratings that differ from Letterboxd", plan.differentRating.length, false],
      ["lbxFillDates", "Fill in {n} missing watch dates", plan.missingDate.length, true],
      ["lbxReplaceDates", "Use Letterboxd diary dates where they differ ({n})", plan.differentDate.length, false],
      ["lbxKeepPrefill", "Remember ratings for {n} films you haven't drawn yet", plan.prefill.length, true],
    ].filter(([, , n]) => n);
    $("lbxOptions").replaceChildren(
      ...(opts.length
        ? opts.map(([id, label, n, checked]) => h("label", {}, h("input", { type: "checkbox", id, checked }), " " + t(label, { n })))
        : [h("p", { class: "fine", text: t("Everything already matches. Nothing to import.") })]),
    );
    $("lbxApply").disabled = !opts.length;
    $("lbxUnmatchedBox").hidden = !unmatched.length;
    $("lbxUnmatchedSummary").textContent = t("{n} rated or logged films aren't on this list", { n: unmatched.length });
    $("lbxUnmatched").replaceChildren(...unmatched.slice(0, 300).map((name) => h("li", { text: name })));
    const on = (id) => !!$(id)?.checked;
    $("lbxApply").onclick = () => {
      $("lbxDialog").close();
      onApply({
        ratings: [...(on("lbxFillRatings") ? plan.missingRating : []), ...(on("lbxReplaceRatings") ? plan.differentRating : [])].map(([id, e]) => [id, e.rating]),
        dates: [...(on("lbxFillDates") ? plan.missingDate : []), ...(on("lbxReplaceDates") ? plan.differentDate : [])].map(([id, e]) => [id, e.date]),
        prefill: on("lbxKeepPrefill") ? plan.prefill : [],
      });
    };
    $("lbxCancel").onclick = () => $("lbxDialog").close();
    $("lbxDialog").showModal();
  }

  // ---------------------------------------------------------------- importing a list
  listDraft(rows) {
    const { storage } = this.app;
    const def = buildListDefinition({ ...rows, name: rows.name || t("My list") });
    const series = Object.keys(def.series).length;
    $("listSummaryText").textContent =
      plural(def.films.length, "film") + t(def.shelves ? " with award shelves" : "") + (series ? t(" and {n} series", { n: series }) : "") + ", " + Math.min(...def.films.map((f) => f.y)) + "–" + Math.max(...def.films.map((f) => f.y)) + ".";
    $("listName").value = def.name;
    $("listSubtitle").value = rows.subtitle || t("Drawn at random");
    $("listError").textContent = "";
    const chosen = PALETTES[rows.palette] ? rows.palette : "kuvert";
    $("paletteChoices").replaceChildren(
      ...Object.entries(PALETTES).map(([key, p]) =>
        h(
          "label",
          {},
          h("input", { type: "radio", name: "listPalette", value: key, checked: key === chosen }),
          h("span", { class: "swatch", style: { background: "linear-gradient(135deg," + p.house + " 0 50%," + p.velvet + " 50% 75%," + p.brass + " 75%)" } }),
          t(p.label),
        ),
      ),
    );
    $("listSave").onclick = () => {
      try {
        const palette = document.querySelector('input[name="listPalette"]:checked')?.value || "kuvert";
        const clean = buildListDefinition({ ...rows, name: $("listName").value.trim() || t("My list"), subtitle: $("listSubtitle").value.trim(), palette });
        const lists = readCustomLists(storage);
        lists[clean.id] = clean;
        writeCustomLists(storage, lists);
        storage.setItem(KEYS.activeList, clean.id);
        $("listDialog").close();
        location.reload();
      } catch (e) {
        $("listError").textContent = t(e.message);
      }
    };
    $("listCancel").onclick = () => $("listDialog").close();
    $("listDialog").showModal();
    $("listName").focus();
  }

  // ---------------------------------------------------------------- lightbox
  wireLightbox() {
    $("closeLight").addEventListener("click", () => $("lightbox").close());
    $("lightbox").addEventListener("close", () => {
      $("lightImg").removeAttribute("src");
      this.lightOpener?.focus();
    });
  }
  lightbox(el) {
    if (!el.dataset.big) return;
    this.lightOpener = el.closest("button") || el;
    $("lightImg").crossOrigin = "anonymous";
    $("lightImg").src = el.dataset.big;
    $("lightImg").alt = el.alt;
    $("lightbox").showModal();
    $("closeLight").focus();
  }
}
