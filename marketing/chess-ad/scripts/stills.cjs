// Renders stills of a composition at chosen seconds, bundling once (for checking an edit).
//   node scripts/stills.cjs Chess2-Teaser out/stills 1.5 30 72.2 ...
const path = require("path");
const { bundle } = require("@remotion/bundler");
const { selectComposition, renderStill } = require("@remotion/renderer");
(async () => {
  const [id, outDir, ...times] = process.argv.slice(2);
  const serveUrl = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), rspack: true });
  const composition = await selectComposition({ serveUrl, id });
  for (const t of times) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(t) * composition.fps));
    const output = path.resolve(outDir, `${id}_${String(t).replace(".", "_")}.jpeg`);
    await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", scale: 0.5 });
    console.log(output);
  }
})().catch((e) => { console.error(e); process.exit(1); });
