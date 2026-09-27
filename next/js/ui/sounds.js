// Paper sounds, made on the fly with Web Audio (no sound files): the seal cracking, the envelope tearing,
// the year dial ticking, stamps landing, the gold seal's ping and a wooden knock. Off by default,
// remembered on this device only. SEAGAL stays silent.
import { KEYS } from "../compat/keys.js";

let ctx = null;
export function soundsOn(storage) {
  if (document.documentElement.dataset.mode === "seagal") return false;
  try {
    return storage?.getItem(KEYS.sounds) === "on";
  } catch {
    return false;
  }
}
function audio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
// Filtered noise: paper tearing and sliding, the crack of wax.
function noise(c, { at = 0, dur = 0.2, type = "bandpass", freq = 1800, to = freq, q = 0.8, gain = 0.3 } = {}) {
  const t = c.currentTime + at,
    buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate),
    data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(),
    filter = c.createBiquadFilter(),
    g = c.createGain();
  src.buffer = buf;
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}
// A pitched knock: stamp thuds, wood, the gold seal's ping.
function tone(c, { at = 0, dur = 0.15, type = "sine", freq = 120, to = freq, gain = 0.4 } = {}) {
  const t = c.currentTime + at,
    osc = c.createOscillator(),
    g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
const SOUNDS = {
  open(c) {
    noise(c, { dur: 0.05, type: "highpass", freq: 2500, gain: 0.35 });
    tone(c, { dur: 0.06, freq: 220, to: 120, gain: 0.25 });
    noise(c, { at: 0.12, dur: 0.38, freq: 900, to: 3200, q: 1.2, gain: 0.22 });
  },
  crack(c) {
    noise(c, { dur: 0.05, type: "highpass", freq: 2500, gain: 0.35 });
    tone(c, { dur: 0.06, freq: 220, to: 120, gain: 0.25 });
  },
  tear(c) {
    noise(c, { dur: 0.38, freq: 900, to: 3200, q: 1.2, gain: 0.22 });
  },
  close(c) {
    noise(c, { dur: 0.28, type: "lowpass", freq: 1400, to: 500, gain: 0.18 });
  },
  stamp(c) {
    tone(c, { dur: 0.18, freq: 95, to: 45, gain: 0.55 });
    noise(c, { dur: 0.04, type: "lowpass", freq: 1800, gain: 0.3 });
  },
  seal(c) {
    SOUNDS.stamp(c);
    tone(c, { at: 0.05, dur: 0.6, type: "triangle", freq: 1320, gain: 0.08 });
  },
  knock(c) {
    tone(c, { dur: 0.09, type: "triangle", freq: 760, to: 560, gain: 0.3 });
    noise(c, { dur: 0.03, freq: 2400, gain: 0.12 });
  },
  // A relay click as a Nixie digit changes.
  tick(c) {
    noise(c, { dur: 0.012, type: "highpass", freq: 4200, gain: 0.06 });
  },
  settle(c) {
    tone(c, { dur: 0.25, type: "sine", freq: 880, to: 870, gain: 0.05 });
    noise(c, { dur: 0.02, type: "highpass", freq: 3000, gain: 0.08 });
  },
};

export function makeSounds(storage) {
  return function play(name, delay = 0) {
    if (!soundsOn(storage)) return;
    const run = () => {
      try {
        const c = audio();
        if (c) SOUNDS[name](c);
      } catch {}
    };
    delay ? setTimeout(run, delay) : run();
  };
}
