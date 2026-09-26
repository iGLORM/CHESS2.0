// Original 150 BPM trailer score and sound design, authored for this edit.
// No samples or third-party recordings. Deterministic stereo synthesis.
const fs = require("fs");
const path = require("path");
const RATE = 48000,
  SECONDS = 32,
  BEAT = 0.4,
  N = RATE * SECONDS;
const music = [new Float32Array(N), new Float32Array(N)];
const fx = [new Float32Array(N), new Float32Array(N)];
let seed = 993;
const rand = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
function add(bus, start, length, signal, gain = 1, pan = 0) {
  const offset = Math.round(start * RATE),
    count = Math.ceil(length * RATE);
  const l = Math.sqrt((1 - pan) / 2),
    r = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < count && offset + i < N; i++) {
    if (offset + i < 0) continue;
    const t = i / RATE,
      a = signal(t, i) * gain;
    bus[0][offset + i] += a * l;
    bus[1][offset + i] += a * r;
  }
}
function note(start, midi, length, gain, kind = "pluck", pan = 0) {
  const f = hz(midi);
  const waveform = (t) => {
    const a = Math.sin(2 * Math.PI * f * t);
    if (kind === "bass")
      return (
        (a +
          0.22 * Math.sin(4 * Math.PI * f * t) +
          0.1 * Math.sin(6 * Math.PI * f * t)) *
        Math.min(1, t / 0.007) *
        Math.exp(-t * 4)
      );
    if (kind === "pad")
      return (
        (a +
          0.2 * Math.sin(2 * Math.PI * (f * 1.003) * t) +
          0.12 * Math.sin(4 * Math.PI * f * t)) *
        Math.min(1, t / 0.12) *
        Math.min(1, (length - t) / 0.25) *
        0.7
      );
    return (
      (a +
        0.25 * Math.sin(4 * Math.PI * f * t) +
        0.15 * Math.sin(6 * Math.PI * f * t)) *
      Math.min(1, t / 0.004) *
      Math.exp(-t * (kind === "bell" ? 4 : 13))
    );
  };
  add(music, start, length, waveform, gain, pan);
  if (kind !== "bass")
    add(music, start + 0.3, length, waveform, gain * 0.2, -pan);
}
function kick(start, gain = 0.65) {
  add(
    music,
    start,
    0.38,
    (t) =>
      Math.sin(2 * Math.PI * (45 * t + 2.8 * (1 - Math.exp(-t * 28)))) *
        Math.exp(-t * 13) +
      rand() * Math.exp(-t * 120) * 0.1,
    gain,
  );
}
function snare(start, gain = 0.22) {
  let prev = 0;
  add(
    music,
    start,
    0.19,
    (t) => {
      const n = rand(),
        h = n - prev;
      prev = n;
      return (
        (h * 0.6 + Math.sin(2 * Math.PI * 180 * t) * 0.3) * Math.exp(-t * 22)
      );
    },
    gain,
  );
}
function hat(start, gain = 0.055) {
  let prev = 0;
  add(
    music,
    start,
    0.055,
    (t) => {
      const n = rand(),
        h = n - prev;
      prev = n;
      return h * Math.exp(-t * 90);
    },
    gain,
    0.3,
  );
}
const progression = [47, 43, 50, 45];
const riff = [0, 7, 12, 7, 10, 7, 3, 5, 0, 7, 14, 12, 10, 7, 5, 3];
for (let beat = 0; beat < 80; beat++) {
  const t = beat * BEAT;
  const bridge = t >= 16 && t < 19.2,
    drop = t >= 3.2 && t < 27.2;
  const root = progression[Math.floor(beat / 8) % 4];
  if (t >= 2.4 && t < 3.2) continue;
  if (beat % 4 === 0)
    for (const [j, interval] of [0, 3, 7].entries())
      note(
        t,
        root + 12 + interval,
        2.2,
        bridge ? 0.06 : 0.033,
        "pad",
        (j - 1) * 0.5,
      );
  if (drop) {
    if (!bridge || beat % 2 === 0) kick(t, bridge ? 0.28 : 0.62);
    if (!bridge && beat % 2 === 1) snare(t, 0.25);
    for (let k = 0; k < 2; k++) hat(t + k * 0.2, bridge ? 0.018 : 0.046);
    note(
      t,
      root - 12 + (beat % 4 === 3 ? 12 : 0),
      0.3,
      bridge ? 0.12 : 0.27,
      "bass",
    );
    if (!bridge) note(t + 0.2, root - 12, 0.18, 0.13, "bass");
    for (let k = 0; k < 2; k++)
      note(
        t + k * 0.2,
        root + 24 + riff[(beat * 2 + k) % 16],
        0.3,
        bridge ? 0.045 : 0.08,
        "pluck",
        k ? 0.35 : -0.35,
      );
    if (t >= 22.4) {
      hat(t + 0.1, 0.045);
      hat(t + 0.3, 0.045);
    }
  } else if (t < 2.4) {
    if (beat % 2 === 0) kick(t, 0.27);
    note(t, 83 + (beat % 2) * 7, 0.08, 0.065, "bell", beat % 2 ? 0.4 : -0.4);
  } else {
    if (beat % 4 === 0) kick(t, 0.3);
    if (beat % 2 === 0) note(t, 71 + riff[beat % 16], 0.8, 0.055, "bell", 0.2);
  }
}
// The title resolves into a B-minor chord instead of abruptly ending a loop.
for (const [j, n] of [47, 59, 62, 66, 71].entries())
  note(27.2, n, 4.8, 0.075, "pad", (j - 2) * 0.2);
function impact(start, gain = 0.5) {
  add(
    fx,
    start,
    0.65,
    (t) =>
      Math.sin(2 * Math.PI * (37 * t + 1.9 * (1 - Math.exp(-t * 23)))) *
        Math.exp(-t * 7) +
      rand() * Math.exp(-t * 45) * 0.4,
    gain,
  );
}
function whoosh(end, length = 0.22, gain = 0.15) {
  let low = 0;
  add(
    fx,
    end - length,
    length,
    (t) => {
      low = low * 0.7 + rand() * 0.3;
      return low * Math.sin((Math.PI * t) / length) ** 2 * (0.8 + t / length);
    },
    gain,
    -0.3,
  );
}
function click(start) {
  add(
    fx,
    start,
    0.055,
    (t) =>
      (rand() * 0.5 + Math.sin(2 * Math.PI * 950 * t) * 0.5) *
      Math.exp(-t * 90),
    0.2,
  );
}
const cuts = [
  0, 1.6, 2.4, 3.2, 4.8, 6.4, 8, 8.8, 9.6, 10.4, 11.2, 12, 12.8, 14.4, 16, 17.6,
  19.2, 20, 20.8, 21.6, 22.4, 24, 25.6, 26.4, 27.2,
];
for (const t of cuts) {
  whoosh(t);
  if ([0, 2.4, 3.2, 6.4, 12.8, 16, 19.2, 22.4, 27.2].includes(t))
    impact(t, t === 3.2 || t === 27.2 ? 0.6 : 0.35);
  else click(t);
}
// A tape-stop chirp creates a small pocket of silence before the gameplay drop.
add(
  fx,
  2.35,
  0.32,
  (t) => Math.sin(2 * Math.PI * (700 * t - 950 * t * t)) * Math.exp(-t * 12),
  0.15,
);
// Ascending saved-piece arpeggio.
for (const [i, m] of [71, 74, 78, 83].entries())
  add(
    fx,
    6.4 + i * 0.085,
    0.65,
    (t) => Math.sin(2 * Math.PI * hz(m) * t) * Math.exp(-t * 8),
    0.16,
    i % 2 ? 0.35 : -0.35,
  );
// Low-to-high riser and accelerating ticks lead into the logo reveal.
add(
  fx,
  26,
  1.2,
  (t) =>
    (Math.sin(2 * Math.PI * (110 * t + 160 * t * t)) + rand() * 0.2) *
    (t / 1.2) ** 2,
  0.095,
);
for (let t = 26; t < 27.2; t += 0.1) click(t);
let peak = 0,
  energy = 0;
const mix = [new Float32Array(N), new Float32Array(N)];
for (let i = 0; i < N; i++)
  for (let c = 0; c < 2; c++) {
    const t = i / RATE;
    const gap = t > 2.7 && t < 3.15 ? 0.05 : 1;
    const fade = Math.min(1, t / 0.008, (SECONDS - t) / 0.65);
    const value = Math.tanh((music[c][i] * gap + fx[c][i]) * 1.25) * fade;
    mix[c][i] = value;
    peak = Math.max(peak, Math.abs(value));
    energy += value * value;
  }
const output = Buffer.alloc(44 + N * 4);
output.write("RIFF");
output.writeUInt32LE(output.length - 8, 4);
output.write("WAVEfmt ", 8);
output.writeUInt32LE(16, 16);
output.writeUInt16LE(1, 20);
output.writeUInt16LE(2, 22);
output.writeUInt32LE(RATE, 24);
output.writeUInt32LE(RATE * 4, 28);
output.writeUInt16LE(4, 32);
output.writeUInt16LE(16, 34);
output.write("data", 36);
output.writeUInt32LE(N * 4, 40);
const gain = 0.92 / peak;
for (let i = 0; i < N; i++)
  for (let c = 0; c < 2; c++)
    output.writeInt16LE(
      Math.round(mix[c][i] * gain * 32767),
      44 + (i * 2 + c) * 2,
    );
const dest = path.resolve(__dirname, "../public");
fs.writeFileSync(path.join(dest, "trailer-mix.wav"), output);
fs.writeFileSync(
  path.join(dest, "trailer-audio.json"),
  JSON.stringify(
    {
      seconds: SECONDS,
      bpm: 150,
      sampleRate: RATE,
      peak: 0.92,
      rms: Math.sqrt(energy / (N * 2)) * gain,
      cuts,
    },
    null,
    2,
  ),
);
console.log(
  "Scored 32 seconds at 150 BPM; music + impacts + whooshes + stop + riser. Peak -0.72 dBFS.",
);
