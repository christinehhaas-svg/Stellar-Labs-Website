import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Review mockups, not product photography. Embed the supplied front artwork
// unchanged; original front panels and full labels remain separate assets.
const artifact = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(artifact, "source-assets/images/stellar-supplements");
const source = fs.readFileSync(path.join(artifact, "src/pages/stellar/_shared/supplements-data.ts"), "utf8");
const fronts = [...source.matchAll(/front: `\$\{images\}([^`]+)`/g)].map(match => match[1]);
if (fronts.length !== 8) throw new Error("Expected all eight supplied supplement front panels.");
for (const front of fronts) {
  const artwork = fs.readFileSync(path.join(directory, front)).toString("base64");
  const ribs = Array.from({ length: 53 }, (_, i) =>
    `<path d="M${166 + i * 5.15} 87v66" stroke="${i % 2 ? "#fff" : "#c8cbd0"}" stroke-width="2" opacity=".65"/>`
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720">
  <title>Supplement bottle mockup using the supplied front label</title>
  <defs>
    <linearGradient id="body"><stop stop-color="#c8cbcf"/><stop offset=".09" stop-color="#e9eaec"/><stop offset=".3" stop-color="#fff"/><stop offset=".63" stop-color="#f8f9fa"/><stop offset=".91" stop-color="#e0e2e5"/><stop offset="1" stop-color="#bbc0c5"/></linearGradient>
    <linearGradient id="cap"><stop stop-color="#c5c9cf"/><stop offset=".18" stop-color="#f1f2f4"/><stop offset=".48" stop-color="#fff"/><stop offset=".82" stop-color="#eef0f2"/><stop offset="1" stop-color="#b8bec5"/></linearGradient>
    <linearGradient id="curve"><stop stop-color="#333" stop-opacity=".22"/><stop offset=".1" stop-color="#333" stop-opacity=".02"/><stop offset=".4" stop-color="#fff" stop-opacity=".03"/><stop offset=".83" stop-color="#333" stop-opacity=".02"/><stop offset="1" stop-color="#333" stop-opacity=".19"/></linearGradient>
    <linearGradient id="shoulder" x2="0" y2="1"><stop stop-color="#aeb4bc" stop-opacity=".45"/><stop offset=".75" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="shadow" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="9"/></filter>
    <clipPath id="label"><rect x="143" y="274" width="314" height="315" rx="5"/></clipPath>
  </defs>
  <ellipse cx="301" cy="664" rx="154" ry="13" fill="#343942" opacity=".16" filter="url(#shadow)"/>
  <path d="M190 157h220v35c0 15 24 22 34 41 13 23 16 46 16 76v290c0 29-13 48-40 52-68 10-170 10-240 0-27-4-40-23-40-52V309c0-30 3-53 16-76 10-19 34-26 34-41z" fill="url(#body)" stroke="#c5c9cd" stroke-width="1"/>
  <path d="M191 161h218v29c0 17 25 26 35 46l-15 14c-64-18-194-18-258 0l-15-14c10-20 35-29 35-46z" fill="url(#shoulder)"/>
  <rect x="159" y="77" width="282" height="87" rx="12" fill="url(#cap)" stroke="#bfc4c9"/>
  ${ribs}
  <ellipse cx="300" cy="77" rx="140" ry="13" fill="#f6f7f8" stroke="#d8dade"/>
  <path d="M161 155q139 18 278 0v13q-139 15-278 0z" fill="url(#cap)" stroke="#c8cbd0"/>
  <path d="M151 610q150 24 298 0" fill="none" stroke="#fff" stroke-width="5" opacity=".5"/>
  <g clip-path="url(#label)">
    <rect x="143" y="274" width="314" height="315" fill="#fff"/>
    <image x="143" y="274" width="314" height="315" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${artwork}"/>
    <rect x="143" y="274" width="314" height="315" fill="url(#curve)"/>
  </g>
  </svg>`;
  fs.writeFileSync(path.join(directory, front.replace("-front.png", "-bottle.svg")), svg);
}
console.info(`Prepared ${fronts.length} bottle mockups with unchanged supplied label artwork.`);
