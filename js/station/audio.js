// The station's sounds, made on the fly with Web Audio: the flaps' clatter, the three-note chime, the
// ticket printer's chatter and the stamp's thunk. And the announcer, through the browser's own speech.
// Both have their own switch on the station, on until turned off, remembered on this device. Each station
// (js/station/stations.js) sounds its own way: Kuvert C's bell, Union Station's NBC chimes, and the depot's
// radio, digital ticks and dot-matrix printer.
import { audio } from "../ui/sounds.js";
import { KEYS } from "../compat/keys.js";

export class StationAudio {
  constructor(storage, station) {
    this.storage = storage;
    this.st = station;
    this.radio = station.sounds === "radio";
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
  /** A few clicks for however many flaps fell this frame: more flaps, a denser clatter, never a roar. The depot's
   *  terminal ticks instead, quietly, as its letters decrypt. */
  clatter(n) {
    if (!n || !this.ok()) return;
    const k = Math.min(3, 1 + Math.floor(Math.log2(n))),
      t0 = this.ctx.currentTime;
    for (let i = 0; i < k; i++)
      if (this.radio) this.tone(2200 + Math.random() * 1600, t0 + Math.random() * 0.016, 0.012, 0.012, "square");
      else this.click(t0 + Math.random() * 0.016, 1500 + Math.random() * 2600, 0.1 + Math.random() * 0.12);
  }
  /** The station chime. Kuvert C: C, E, G, rung like a bell (each with two quiet overtones). Union Station: the
   *  NBC chimes, G, E, C, as 1940s radio rang them. The depot: radio squelch and a two-tone alert. */
  chime() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime + 0.05;
    if (this.radio) {
      this.squelch(t);
      [880, 660, 880, 660].forEach((f, i) => this.tone(f, t + 0.22 + i * 0.16, 0.12, 0.09, "square"));
      return;
    }
    const notes = this.st.sounds === "nbc" ? [392, 659.25, 523.25] : [523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      const s = t + i * (this.st.sounds === "nbc" ? 0.42 : 0.32);
      this.tone(f, s, 1.8, 0.2);
      this.tone(f * 2, s, 0.8, 0.045);
      this.tone(f * 2.76, s, 0.3, 0.02);
    });
  }
  /** A burst of radio static, as a handset keys up. */
  squelch(t = this.ctx.currentTime) {
    const c = this.ctx,
      len = Math.floor(c.sampleRate * 0.18),
      b = c.createBuffer(1, len, c.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(),
      hp = c.createBiquadFilter(),
      g = c.createGain();
    src.buffer = b;
    hp.type = "highpass";
    hp.frequency.value = 1800;
    g.gain.value = 0.16;
    src.connect(hp).connect(g).connect(this.out);
    src.start(t);
  }
  /** The ticket printer: a second of fast, dry chatter. The depot's is a dot-matrix printer, higher and slower. */
  printer() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    if (this.radio) for (let i = 0; i < 28; i++) this.click(t + i * 0.04 + Math.random() * 0.004, 2200 + Math.random() * 600, 0.06);
    else for (let i = 0; i < 34; i++) this.click(t + i * 0.032 + Math.random() * 0.006, 900 + Math.random() * 500, 0.05);
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
  /** A wooden knock, for patting the horse on the sign. At the depot, the reticle locks on with two blips. */
  knock() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    if (this.radio) {
      this.tone(1400, t, 0.06, 0.07);
      this.tone(1400, t + 0.1, 0.06, 0.07);
      return;
    }
    this.click(t, 600, 0.25);
    this.tone(700, t, 0.09, 0.08, "triangle");
  }

  // ------------------------------------------------------------ the announcer
  loadVoices() {
    try {
      this.voices = speechSynthesis.getVoices() || [];
    } catch {}
  }
  /** The voice to use, or null for the browser's default (still asked for the right language). */
  pick() {
    return this.st.voice.pick(this.voices);
  }
  speak(text) {
    if (!this.voice || !("speechSynthesis" in window)) return;
    const { lang, rate, pitch } = this.st.voice,
      voice = this.pick(),
      want = lang(),
      // A Swedish voice for Swedish; for English, one from the right country (en-GB, en-US).
      fits = new RegExp("^" + (want.startsWith("sv") ? "sv" : want.replace("-", "[-_]")), "i");
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang = fits.test(voice?.lang || "") ? voice.lang : want;
      u.rate = rate;
      u.pitch = pitch;
      // The dispatcher's radio keys up with the alert (chime) and clicks off with a burst of static.
      if (this.radio && this.ok()) u.onend = () => this.ok() && this.squelch();
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

// Union Station's newsreel voice and the depot's dispatcher are American men: Microsoft's and Apple's by
// name, then any American voice that isn't a known woman, then any American voice at all.
const US_MALE = /\b(male|david|guy|christopher|eric|roger|steffan|andrew|brian|davis|tony|jason|alex|fred|tom|aaron|evan|nathan|ralph|reed|rocko|eddy|grandpa)\b/i;
const US_FEMALE = /\b(female|zira|aria|jenny|michelle|samantha|ava|allison|susan|joanna|kendra|kimberly|salli|ivy|emma|nicky|google us english)\b/i;
export function americanVoice(voices) {
  const us = voices.filter((v) => /^en[-_]us/i.test(v.lang || ""));
  return us.find((v) => US_MALE.test(v.name)) || us.find((v) => !US_FEMALE.test(v.name)) || us[0] || voices.find((v) => /^en/i.test(v.lang || "") && US_MALE.test(v.name)) || null;
}

// In Swedish mode she's a Swedish woman, like SJ's announcements: Apple's Alva and Klara, Microsoft's
// Sofie and Hillevi, Google's svenska; then any Swedish voice that isn't a known man.
const SV_FEMALE = /\b(female|alva|klara|sofie|hillevi|astrid|ingrid|elsa|maja)\b/i;
const SV_MALE = /\b(male|oskar|mattias|bengt|erik)\b/i;
export function swedishVoice(voices) {
  const sv = voices.filter((v) => /^sv/i.test(v.lang || ""));
  return sv.find((v) => SV_FEMALE.test(v.name)) || sv.find((v) => !SV_MALE.test(v.name)) || sv[0] || null;
}
