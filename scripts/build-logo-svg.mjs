import fs from "fs";
import sharp from "sharp";
import ImageTracer from "imagetracerjs";

const size = 128;
const { data, info } = await sharp("public/thesisx-mark.png")
  .resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const imageData = { width: info.width, height: info.height, data };
const raw = ImageTracer.imagedataToSVG(imageData, {
  ltres: 1,
  qtres: 1,
  pathomit: 4,
  colorsampling: 0,
  numberofcolors: 3,
  mincolorratio: 0.02,
  colorquantcycles: 2,
  scale: 1,
  strokewidth: 0,
  linefilter: true,
  blurradius: 0,
  blurdelta: 0,
  rightangleenhance: false,
});

const paths = [];
for (const tag of raw.match(/<path[^>]+\/>/g) ?? []) {
  const d = tag.match(/d="([^"]+)"/)?.[1];
  const fill = tag.match(/fill="rgb\((\d+),(\d+),(\d+)\)"/);
  const opacity = Number(tag.match(/opacity="([^"]+)"/)?.[1] ?? "1");
  if (!d || !fill) continue;
  const r = Number(fill[1]);
  if (r < 80 || opacity < 0.2) continue;
  paths.push(d);
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="tx-gold" x1="10" y1="8" x2="118" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F2D48A"/>
      <stop offset="45%" stop-color="#D4AF5A"/>
      <stop offset="100%" stop-color="#9A7228"/>
    </linearGradient>
  </defs>
  <g fill="url(#tx-gold)">
${paths.map((d) => `    <path d="${d}"/>`).join("\n")}
  </g>
</svg>`;

fs.writeFileSync("public/thesisx-mark.svg", svg);
console.log(`Wrote public/thesisx-mark.svg (${paths.length} paths, ${svg.length} bytes)`);
