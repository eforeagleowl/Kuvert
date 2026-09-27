// Group night on Tonight: the dialog where friends' codes go in, the chip while it's on, and the line
// on the ticket that says whether anyone in the group has seen tonight's film.
import { $, h, icon } from "../ui/dom.js";
import { plural } from "../state/stats.js";
import { Group } from "../state/group.js";

export class GroupNight {
  constructor(app) {
    this.app = app;
    this.group = new Group({ storage: app.storage, store: app.store });
    this.group.addEventListener("change", () => app.renderSoon());
    const dlg = $("groupDialog");
    $("openGroup").addEventListener("click", () => this.open());
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
    dlg.addEventListener("close", () => $("openGroup").focus({ preventScroll: true }));
  }
  get on() {
    return this.group.on;
  }
  open() {
    $("groupError").textContent = "";
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
      this.app.announce((r.refreshed ? "Updated " : "Added ") + r.name + ": " + plural(r.count, "film") + " watched.");
      this.renderDialog();
      $("groupName").focus();
    } catch (e) {
      $("groupError").textContent = e.message || "That code couldn't be read.";
    }
  }
  // How many films are left for everyone, with tonight's filters.
  summary() {
    const { store } = this.app;
    const n = store.units().length;
    if (!this.group.people.length) return "Add a friend to start.";
    const who = plural(this.group.people.length + 1, "person", "people");
    if (!this.on) return "Group night is off. The draw uses only your own films.";
    return n ? n + (n === 1 ? " film" : " films") + " none of the " + who + " has seen." : "Between the " + who + ", every film that's left has been seen. Try fewer filters, or turn group night off.";
  }
  renderDialog() {
    const g = this.group;
    $("groupPeople").replaceChildren(
      h("li", { class: "group-me" }, h("span", { class: "group-name", text: "You" }), h("span", { class: "group-count", text: plural(this.app.store.p.seen.size, "film") + " watched" })),
      ...g.people.map((x, i) =>
        h(
          "li",
          {},
          h("input", {
            class: "group-name",
            value: x.name,
            maxLength: 40,
            attrs: { "aria-label": "Name" },
            on: { change: (e) => g.rename(i, e.target.value) },
          }),
          h("span", { class: "group-count", text: plural(x.seen.length, "film") + " watched" }),
          h("button", { class: "btn btn-quiet btn-sm", type: "button", attrs: { "aria-label": "Remove " + x.name }, on: { click: () => (g.remove(i), this.renderDialog()) } }, icon("x")),
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
    // On tonight's ticket: whether anyone in the group has seen it.
    const f = stage.open && stage.mode === "tonight" ? store.currentFilm : null,
      line = $("groupLine");
    line.hidden = !g.on || !f;
    if (g.on && f) {
      const who = g.seenBy(f.id);
      line.textContent = who.length ? who.join(", ").replace(/, ([^,]*)$/, " and $1") + (who.length === 1 ? " has" : " have") + " seen this one." : "Group night: none of you has seen this one.";
      line.classList.toggle("warn", who.length > 0);
    }
  }
}
