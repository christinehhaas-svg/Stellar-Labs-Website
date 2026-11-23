import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execute = promisify(execFile);
const normalize = value => value.normalize("NFKC").replace(/\s|\u00ad/g, "");
const decode = value => value.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (_, number, entity) =>
  number ? String.fromCodePoint(number[0] === "x" ? parseInt(number.slice(1), 16) : Number(number))
    : ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[entity]);
const attributes = tag => Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map(([, key, value]) => [key, Number(value)]));

// Poppler reads the actual printed file, not the DOM or the offline HTML.
// Bound both runtime and output so corrupt/oversized files fail predictably.
export async function readClaimsFlyerPdf(filename) {
  const options = { timeout: 15_000, maxBuffer: 8 * 1024 * 1024, encoding: "utf8" };
  const { stdout: info } = await execute("pdfinfo", [filename], options);
  const pageCount = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
  assert.ok(pageCount > 0, "PDF has no pages");
  const { stdout: xml } = await execute("pdftotext", ["-bbox-layout", filename, "-"], options);
  const pages = [...xml.matchAll(/<page\b([^>]*)>([\s\S]*?)<\/page>/g)].map(([, tag, body]) => ({
    ...attributes(tag),
    words: [...body.matchAll(/<word\b([^>]*)>([\s\S]*?)<\/word>/g)].map(([, box, text]) => ({
      ...attributes(box), text: decode(text),
    })),
  }));
  assert.equal(pages.length, pageCount, "PDF text extraction lost pages");
  return pages;
}

const textOf = words => normalize(words.map(word => word.text).join(" "));
const inBox = (words, box) => words.filter(word =>
  word.xMin >= box.x - 1 && word.xMax <= box.x + box.width + 1 &&
  word.yMin >= box.y - 1 && word.yMax <= box.y + box.height + 1);
function contains(words, value, message) {
  assert.ok(textOf(words).includes(normalize(value)), message);
}

export function verifyClaimsFlyerPdf(pages, expected) {
  assert.equal(pages.length, expected.totalPages, "Printed PDF page count differs from flyer");
  for (const [index, page] of pages.entries()) {
    assert.ok(Math.abs(page.width - 612) < 1 && Math.abs(page.height - 792) < 1,
      `PDF page ${index + 1}: expected Letter dimensions`);
    const footers = page.words.filter(word => word.yMin > page.height * 0.65);
    const numbers = [...footers.map(word => word.text).join(" ").matchAll(/(?:^|\s)(\d+)\s*\/\s*(\d+)(?=\s|$)/g)]
      .map(match => `${match[1]}/${match[2]}`);
    assert.deepEqual(numbers, [`${index + 1}/${expected.totalPages}`], `PDF page ${index + 1}: missing/wrong page numbering`);
    assert.ok(page.words.every(word => word.xMin >= 0 && word.yMin >= 0 &&
      word.xMax <= page.width + 1 && word.yMax <= page.height + 1), `PDF page ${index + 1}: text outside page`);
    if (index < 2) contains(page.words, expected.disclaimer, `PDF page ${index + 1}: incomplete FODMAP disclaimer`);
    assert.ok(!/(?:5|five)\s*Major\s*Electrolytes/i.test(page.words.map(word => word.text).join(" ")),
      `PDF page ${index + 1}: prohibited 5 Major Electrolytes promotional claim`);
  }
  for (const group of expected.groups ?? []) {
    for (const value of [group.name, ...group.claims]) {
      contains(pages[0].words, value, `Claims overview: missing ${value}`);
    }
  }
  assert.equal(expected.cards.length, expected.products.length, "Missing facts-card PDF regions");
  const seen = new Set();
  for (const card of expected.cards) {
    const product = expected.products.find(product => product.id === card.id);
    assert.ok(product && !seen.has(card.id), `Duplicate/unknown PDF product: ${card.id}`);
    seen.add(card.id);
    const page = pages[card.page - 1];
    assert.ok(card.page >= 3 && page, `${card.id}: not on a facts page`);
    const words = inBox(page.words, card.box);
    // 6pt is the smallest existing facts/disclaimer type; disallow shrinking to fit.
    assert.ok(words.length && words.every(word => word.yMax - word.yMin >= 5.5),
      `${card.id}: unreadably small PDF text`);
    for (const value of [product.name, `Serving size: ${product.servingSize}`, product.servingsPerContainer,
      ...product.facts, ...product.claims, expected.disclaimer,
      product.upc, product.upcNote, ...(product.ingredients ?? []).flatMap(item => [item.heading, item.text])].filter(Boolean)) {
      contains(words, value, `${card.id}: printed PDF missing ${value.slice(0, 100)}`);
    }
    assert.equal(card.metrics.length, product.metrics.length, `${card.id}: missing metric regions`);
    product.metrics.forEach((metric, index) => {
      const metricWords = inBox(page.words, card.metrics[index]);
      contains(metricWords, metric.label, `${card.id}: PDF missing nutrient label ${metric.label}`);
      contains(metricWords, metric.value, `${card.id}: PDF missing ${metric.label} value ${metric.value}`);
      assert.equal(textOf(metricWords), normalize(`${metric.value} ${metric.label}`),
        `${card.id}: PDF nutrient amount/label mismatch for ${metric.label}`);
    });
  }
  if (expected.references) {
    for (const product of expected.products) {
      const references = expected.references.filter(reference => reference.id === product.id);
      assert.equal(references.length, 1 + new Set(product.labels).size, `${product.id}: missing printed website pages`);
      for (const reference of references) {
        const words = pages[reference.page - 1]?.words;
        assert.ok(words?.length, `${product.id}: empty website reference page`);
        contains(words, product.name, `${product.id}: printed label has incorrect product heading`);
        if (!reference.label) {
          for (const value of [...product.benefits, ...product.claims, product.suggestedUse,
            ...product.warnings, product.upc, product.price].filter(Boolean)) {
            contains(words, value, `${product.id}: printed website details missing ${value.slice(0, 100)}`);
          }
        }
      }
    }
  }
  return { pages: pages.length, products: seen.size };
}
