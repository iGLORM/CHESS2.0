const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../../..");
const output = path.resolve(__dirname, "../public");
function copy(source, destination) {
  const dest = path.join(output, destination);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, source), dest);
  if (dest.endsWith(".txt")) {
    const text = fs.readFileSync(dest, "utf8").split(/\r?\n/).map(line => line.trimEnd()).join("\n");
    fs.writeFileSync(dest, text);
  }
}
for (const name of ["crystal", "mistymoors", "royalpalace"]) {
  copy(`assets/textures/backgrounds/${name}_bg.png`, `art/${name}.png`);
}
for (const name of ["grandmasterx", "queenie", "knightsade"]) {
  copy(`assets/textures/characters/${name}.png`, `art/${name}.png`);
}
copy("icon_512.png", "art/icon.png");
for (const name of [
  "Silkscreen-Regular.woff2",
  "PixelifySans-600.woff2",
  "OFL-Silkscreen.txt",
  "OFL-PixelifySans.txt",
]) {
  copy(`src/vendor/fonts/${name}`, `fonts/${name}`);
}
