// The station's sounds, made on the fly with Web Audio: the flaps' clatter, the three-note chime, the
// ticket printer's chatter and the stamp's thunk. And the announcer, through the browser's own speech.
// Both have their own switch on the station, on until turned off, remembered on this device.
import { audio } from "../ui/sounds.js";
import { KEYS } from "../compat/keys.js";

export class StationAudio {
  constructor(storage) {
    this.storage = storage;
    this.sound = this.pref("sound");
    this.voice = this.pref("voice");
    this.ctx = null;
    this.out = null;
    this.burst = null;
    this.primed = false;
    this.voices = [];
    if ("speechSynthesis" in window) {
      this.loadVoices();
      try {
        speechSynthesis.addEventListener("voiceschanged", () => this.loadVoices());
      } catch {}
    }
  }
  pref(k) {
    try {
      return this.storage?.getItem(KEYS.station(k)) !== "off";
    } catch {
      return true;
    }
  }
  set(k, on) {
    this[k] = on;
    try {
      this.storage?.setItem(KEYS.station(k), on ? "on" : "off");
    } catch {}
    if (on) this.unlock();
    else if (k === "voice") this.hush();
  }
  // Browsers only make sound after a tap or a key: called from every one on the station.
  unlock() {
    if (this.sound && !this.ctx) {
      try {
        const c = audio();
        if (c) {
          const comp = c.createDynamicsCompressor(),
            g = c.createGain();
          g.gain.value = 0.55;
          g.connect(comp).connect(c.destination);
          // One short burst of decaying noise, replayed at different pitches for every click.
          const len = Math.floor(c.sampleRate * 0.04),
            b = c.createBuffer(1, len, c.sampleRate),
            d = b.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5);
          this.ctx = c;
          this.out = g;
          this.burst = b;
        }
      } catch {}
    }
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
    // Safari speaks later only if it has spoken once in answer to a tap.
    if (this.voice && !this.primed && "speechSynthesis" in window) {
      try {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        speechSynthesis.speak(u);
        this.primed = true;
      } catch {}
    }
  }
  ok() {
    return this.sound && this.ctx && this.ctx.state === "running";
  }
  click(t, freq, vol) {
    const c = this.ctx,
      src = c.createBufferSource(),
      bp = c.createBiquadFilter(),
      g = c.createGain();
    src.buffer = this.burst;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 1.1;
    g.gain.value = vol;
    src.connect(bp).connect(g).connect(this.out);
    src.start(t);
  }
  tone(freq, t, dur, vol, type = "sine") {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  /** A few clicks for however many flaps fell this frame: more flaps, a denser clatter, never a roar. */
  clatter(n) {
    if (!n || !this.ok()) return;
    const k = Math.min(3, 1 + Math.floor(Math.log2(n))),
      t0 = this.ctx.currentTime;
    for (let i = 0; i < k; i++) this.click(t0 + Math.random() * 0.016, 1500 + Math.random() * 2600, 0.1 + Math.random() * 0.12);
  }
  /** The station chime: C, E, G, rung like a bell (each with two quiet overtones). */
  chime() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime + 0.05;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const s = t + i * 0.32;
      this.tone(f, s, 1.8, 0.2);
      this.tone(f * 2, s, 0.8, 0.045);
      this.tone(f * 2.76, s, 0.3, 0.02);
    });
  }
  /** The ticket printer: a second of fast, dry chatter. */
  printer() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 34; i++) this.click(t + i * 0.032 + Math.random() * 0.006, 900 + Math.random() * 500, 0.05);
  }
  /** The rubber stamp coming down. */
  thunk() {
    if (!this.ok()) return;
    const c = this.ctx,
      t = c.currentTime,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.2);
    this.click(t, 500, 0.3);
  }
  /** A wooden knock, for patting the horse on the sign. */
  knock() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    this.click(t, 600, 0.25);
    this.tone(700, t, 0.09, 0.08, "triangle");
  }

  // ------------------------------------------------------------ the announcer
  loadVoices() {
    try {
      this.voices = speechSynthesis.getVoices() || [];
    } catch {}
  }
  /** The voice to use, or null for the browser's default (still asked to speak British English). */
  pick() {
    return britishVoice(this.voices);
  }
  speak(text) {
    if (!this.voice || !("speechSynthesis" in window)) return;
    const voice = this.pick();
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = /^en[-_]gb/i.test(voice?.lang || "") ? voice.lang : "en-GB";
      u.rate = 0.95;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {}
  }
  hush() {
    try {
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    } catch {}
  }
}

// The announcer is a British woman, like a UK station announcement. Browsers don't say which voices are
// female, so she's found by name: Chrome's, Windows' and Apple's British women first, then any British
// voice that isn't one of the known men. With no British voice on the device, a woman's English voice
// (Windows' Zira, Apple's Samantha…) still speaking as en-GB, rather than the default man.
const GB_FEMALE = /\b(female|hazel|libby|sonia|maisie|mia|susan|kate|serena|stephanie|martha|flo|sandy|shelley|emily|amy)\b/i;
const GB_MALE = /\b(male|george|ryan|thomas|oliver|alfie|daniel|arthur|rocko|eddy|grandpa|reed)\b/i;
const EN_FEMALE = /\b(female|zira|aria|jenny|michelle|samantha|karen|moira|tessa|victoria|allison|ava|susan|catherine|natasha|emily)\b/i;
export function britishVoice(voices) {
  const gb = voices.filter((v) => /^en[-_]gb/i.test(v.lang || ""));
  return (
    gb.find((v) => GB_FEMALE.test(v.name)) ||
    gb.find((v) => !GB_MALE.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang || "") && EN_FEMALE.test(v.name)) ||
    gb[0] ||
    null
  );
}
