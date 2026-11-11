// Group night on Tonight: the dialog where friends' codes go in, the chip while it's on, and the line
// on the ticket that says whether anyone in the group has seen tonight's film.
import { $, copyText, h, icon } from "../ui/dom.js";
import { plural } from "../state/stats.js";
import { Group } from "../state/group.js";
import { t, listOf } from "../i18n/index.js";

export class GroupNight {
  constructor(app) {
    this.app = app;
    this.group = new Group({ storage: app.storage, store: app.store });
    this.group.addEventListener("change", () => app.renderSoon());
    const dlg = $("groupDialog");
    $("openGroup").addEventListener("click", () => this.open());
    $("groupChip").addEventListener("click", () => this.open());
    $("groupDone").addEventListener("click", () => dlg.close());
    $("groupForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.add($("groupCode").value);
    });
    $("groupFile").addEventListener("click", () => $("groupFileInput").click());
    $("groupFileInput").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) this.add(await file.text());
    });
    $("groupOn").addEventListener("change", (e) => this.group.setOn(e.target.checked));
    // Focus goes back to whichever opened it: the button in Adjust, or the chip beside the filters.
    dlg.addEventListener("close", () => {
      const back = [this.opener, $("groupChip"), $("adjustPreferences")].find((el) => el?.isConnected && el.getClientRects().length);
      back?.focus({ preventScroll: true });
    });
  }
  get on() {
    return this.group.on;
  }
  open() {
    this.opener = document.activeElement;
    $("groupError").textContent = "";
    $("groupMineRow").hidden = true;
    $("groupName").placeholder = this.group.nextName();
    this.renderDialog();
    $("groupDialog").showModal();
    (this.group.people.length ? $("groupDone") : $("groupName")).focus();
  }
  add(text) {
    try {
      const r = this.group.add($("groupName").value, text);
      $("groupError").textContent = "";
      $("groupName").value = "";
      $("groupCode").value = "";
      $("groupName").placeholder = this.group.nextName();
      this.app.announce(t(r.refreshed ? "Updated {name}: {films} watched." : "Added {name}: {films} watched.", { name: r.name, films: plural(r.count, "film") }));
      this.renderDialog();
      $("groupName").focus();
    } catch (e) {
      $("groupError").textContent = t(e.message || "That code couldn't be read.");
    }
  }
  // Your own code, for a friend's group night: copied, or shown to select where copying isn't allowed.
  async copyMine() {
    const code = this.group.code();
    const ok = await copyText(code, null);
    $("groupMineRow").hidden = ok;
    if (!ok) {
      $("groupMine").value = code;
      $("groupMine").focus();
      $("groupMine").select();
    }
    this.app.toast.show(t(ok ? "Friend code copied. Send it to your friends." : "Select and copy your friend code."));
  }
  // How many films are left for everyone, with tonight's filters.
  summary() {
    const { store } = this.app;
    const n = store.units().length;
    if (!this.group.people.length) return t("Add a friend to start.");
    const who = plural(this.group.people.length + 1, "person", "people");
    if (!this.on) return t("Group night is off. The draw uses only your own films.");
    return n ? t("{films} none of the {who} has seen.", { films: plural(n, "film"), who }) : t("Between the {who}, every film that's left has been seen. Try fewer filters, or turn group night off.", { who });
  }
  renderDialog() {
    const g = this.group;
    $("groupPeople").replaceChildren(
      h(
        "li",
        { class: "group-me" },
        h("span", { class: "group-name", text: t("You") }),
        h("span", { class: "group-count", text: t("{films} watched", { films: plural(this.app.store.p.seen.size, "film") }) }),
        h("button", { class: "btn btn-sm", type: "button", dataset: { key: "group-copy" }, on: { click: () => this.copyMine() } }, icon("copy"), t("Copy my friend code")),
      ),
      ...g.people.map((x, i) =>
        h(
          "li",
          {},
          h("input", {
            class: "group-name",
            value: x.name,
            maxLength: 40,
            attrs: { "aria-label": t("Name") },
            on: { change: (e) => g.rename(i, e.target.value) },
          }),
          h("span", { class: "group-count", text: t("{films} watched", { films: plural(x.seen.length, "film") }) }),
          h("button", { class: "btn btn-quiet btn-sm", type: "button", attrs: { "aria-label": t("Remove {name}", { name: x.name }) }, on: { click: () => (g.remove(i), this.renderDialog()) } }, icon("x")),
        ),
      ),
    );
    $("groupOnRow").hidden = !g.people.length;
    $("groupOn").checked = g.on;
    $("groupSummary").textContent = this.summary();
  }
  render() {
    const { stage, store } = this.app,
      g = this.group;
    if ($("groupDialog").open) this.renderDialog();
    $("openGroup").classList.toggle("on", g.on);
    $("openGroup").querySelector("span").textContent = g.on ? this.app.sg("Group night", "Squad") + " · " + (g.people.length + 1) : this.app.sg("Group night", "Squad");
    // The button lives in Adjust; while group night is on, a chip beside the filters says so.
    $("groupChip").hidden = !g.on;
    $("groupChip").textContent = this.app.sg("Group night", "Squad") + " · " + (g.people.length + 1);
    // On tonight's ticket: whether anyone in the group has seen it.
    const f = stage.open && stage.mode === "tonight" ? store.currentFilm : null,
      line = $("groupLine");
    line.hidden = !g.on || !f;
    if (g.on && f) {
      const who = g.seenBy(f.id);
      line.textContent = who.length ? t(who.length === 1 ? "{names} has seen this one." : "{names} have seen this one.", { names: listOf(who) }) : t("Group night: none of you has seen this one.");
      line.classList.toggle("warn", who.length > 0);
    }
  }
}
