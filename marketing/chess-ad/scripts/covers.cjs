// Renders every cover and post image in the Social folder to out/social/<id>.png,
// bundling once. Run: npm run social:covers
const path = require("path");
const { bundle } = require("@remotion/bundler");
const { getCompositions, renderStill } = require("@remotion/renderer");
(async () => {
  const serveUrl = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), rspack: true });
  const all = await getCompositions(serveUrl);
  for (const composition of all.filter((c) => /^(Cover|Post)-/.test(c.id))) {
    const output = path.resolve(__dirname, `../out/social/${composition.id}.png`);
    await renderStill({ serveUrl, composition, frame: 0, output, imageFormat: "png" });
    console.log(path.relative(process.cwd(), output));
  }
})().catch((e) => { console.error(e); process.exit(1); });
