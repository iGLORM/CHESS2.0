// Brings a rendered teaser's sound to -14 LUFS (what YouTube, TikTok, Instagram and X play
// at) without re-encoding the picture. Needs ffmpeg on the PATH.
//   node scripts/master.cjs out/chess-2-teaser.mp4   ->   out/chess-2-teaser-final.mp4
const { spawnSync } = require("child_process");
const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/master.cjs <video.mp4>");
const output = input.replace(/\.mp4$/, "-final.mp4");
const target = "I=-14:TP=-1.5:LRA=11";

// Two passes: measure, then correct linearly so the music keeps its dynamics.
const pass1 = spawnSync("ffmpeg", ["-hide_banner", "-i", input, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"], {
  encoding: "utf8",
});
const json = pass1.stderr.slice(pass1.stderr.lastIndexOf("{"));
const m = JSON.parse(json.slice(0, json.indexOf("}") + 1));
const filter =
  `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
  `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
const pass2 = spawnSync(
  "ffmpeg",
  ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-c:v", "copy", "-af", filter, "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", output],
  { stdio: "inherit" },
);
if (pass2.status !== 0) process.exit(pass2.status || 1);
console.log(`${output} (was ${m.input_i} LUFS)`);
