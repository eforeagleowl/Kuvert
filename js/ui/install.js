// "Put Kuvert on your Home Screen": shown on Tonight after your first watched film, on a phone or tablet
// that isn't already running Kuvert as an app. Where the browser can install it (Chrome, Android), one tap
// does it; on an iPhone or iPad it says where Safari keeps the button. "Got it" puts it away for good.
import { $ } from "./dom.js";
import { KEYS } from "../compat/keys.js";
import { t } from "../i18n/index.js";

const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const apple = () => /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export class InstallHint {
  constructor(app) {
    this.app = app;
    this.prompt = null; // the browser's own install prompt, kept for the Install button
    addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.prompt = e;
      app.renderSoon();
    });
    addEventListener("appinstalled", () => this.dismiss());
    $("installNow").addEventListener("click", async () => {
      const prompt = this.prompt;
      this.prompt = null;
      if (!prompt) return;
      prompt.prompt();
      try {
        if ((await prompt.userChoice).outcome === "accepted") this.dismiss();
      } catch {}
      app.renderSoon();
    });
    $("installLater").addEventListener("click", () => {
      this.dismiss();
      $("drawBtn").focus({ preventScroll: true });
    });
  }
  get dismissed() {
    try {
      return this.app.storage?.getItem(KEYS.installHint) === "1";
    } catch {
      return true;
    }
  }
  dismiss() {
    try {
      this.app.storage?.setItem(KEYS.installHint, "1");
    } catch {}
    $("installHint").hidden = true;
  }
  /** Shown or not, on every render of Tonight (js/views/evening.js). */
  render({ stageOpen }) {
    const touch = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;
    const show = !stageOpen && !this.dismissed && !standalone() && touch && this.app.store.p.seen.size > 0 && (!!this.prompt || apple());
    $("installHint").hidden = !show;
    if (!show) return;
    $("installNow").hidden = !this.prompt;
    $("installText").textContent = this.prompt
      ? t("It opens full screen, like an app, and works offline.")
      : t("In Safari, tap Share, then Add to Home Screen. It opens full screen, like an app, and works offline.");
  }
}
