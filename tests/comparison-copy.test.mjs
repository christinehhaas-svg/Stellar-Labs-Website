import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const filename = "artifacts/stellar-review/src/pages/stellar/_shared/homepage-comparisons.ts";
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports });
const { comparisonSections, visibleComparisonColumns, initializeHomepageComparisons } = exports;

function render() {
  let html;
  const readMore = { textContent: "Read More", closest: () => ({}), hasAttribute: () => false, setAttribute() {}, addEventListener() {} };
  const doc = {
    getElementById: () => null,
    querySelectorAll: () => [readMore],
    querySelector: () => ({ replaceChildren(node) { html = node.innerHTML; } }),
    head: { append() {} },
    createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {}, append() {} }),
  };
  initializeHomepageComparisons(doc, path => path, true);
  return html;
}

test("electrolytes appear first, sodium is highlighted, and unavailable amounts are Not listed", () => {
  const html = render();
  assert(html.indexOf('aria-labelledby="stellar-comparison-lemon-lime-electrolyte"') <
    html.indexOf('aria-labelledby="stellar-comparison-whey-protein-isolate"'));
  assert.match(html, /class="stellar-sodium-row"><th scope="row">Sodium<\/th><td>80mg<\/td><td>330mg<\/td><td>750mg<\/td>/);
  assert.match(html, /<th scope="row">Calcium<\/th><td>47mg<\/td><td>Not listed<\/td><td>Not listed<\/td>/);
  assert.match(html, /<th scope="row">Chloride<\/th><td>Not listed<\/td><td>Not listed<\/td><td>Not listed<\/td>/);
  const electrolyteHtml = html.split('aria-labelledby="stellar-comparison-lemon-lime-electrolyte"')[1].split("</section>")[0];
  assert.match(electrolyteHtml, /Compared at the same powder weight: 4.5 g\./);
  assert.match(electrolyteHtml, /not necessarily each brand’s recommended serving/);
  assert.match(electrolyteHtml, /stellar-comparison-brand">Stellar Labs/);
  assert.doesNotMatch(electrolyteHtml, /stellar-comparison-why|stellar-comparison-highlights|<th scope="row">Weight<\/th>|N\/A/);
  assert.match(html, /<th scope="row">Major electrolytes<\/th><td>5<\/td><td>4<\/td><td>4<\/td>/);
  const electrolyte = comparisonSections.find(section => section.id === "lemon-lime-electrolyte");
  const calories = electrolyte.columns.indexOf("Calories");
  assert.equal(electrolyte.rows[2][calories], "4");
  assert(!electrolyte.highlights.some(claim => /SUGAR/.test(claim)));
});

test("Naked Vanilla Whey replaces Six Star and NOW Sports with merchant-supplied values", () => {
  const blend = comparisonSections.find(section => section.id === "whey-protein-blend");
  assert.equal(JSON.stringify(blend.rows[2]), JSON.stringify(["Naked Vanilla Whey", "32g", "130", "21.6g", "7g", "4.3g", "2.6g"]));
  assert(!blend.columns.includes("Total Fat"));
  assert(!JSON.stringify(comparisonSections).match(/Six Star|NOW Sports/));
  for (const section of comparisonSections) {
    for (const row of section.rows) assert.equal(row.length, section.columns.length);
  }
});

test("sugar is omitted when Stellar is higher, but retained when it is lower", () => {
  const columns = ["Product", "Calories", "Total Sugars"];
  const metrics = rows => Array.from(visibleComparisonColumns({ columns, rows }), column => column.metric);
  assert.deepEqual(metrics([["Stellar", "130", "3g"], ["Other", "120", "2g"]]), ["Calories"]);
  assert.deepEqual(metrics([["Stellar", "130", "2g"], ["Other", "130", "4.3g"]]), ["Calories", "Total Sugars"]);
  assert.deepEqual(metrics([["Stellar", "130", "3g"], ["Other", "130", "N/A"]]), ["Calories", "Total Sugars"]);
});

test("both whey charts compare total and added sugars, including equal or lower competitor values", () => {
  for (const id of ["whey-protein-isolate", "whey-protein-blend"]) {
    const section = comparisonSections.find(section => section.id === id);
    const metrics = Array.from(visibleComparisonColumns(section), column => column.metric);
    assert(metrics.includes("Total Sugars"));
    assert(metrics.includes("Added Sugars"));
    assert.equal(section.rows[0][section.columns.indexOf("Added Sugars")], "0g");
    const hypothetical = { ...section, rows: [["Stellar", "3g", "0g"], ["Other", "1g", "0g"]], columns: ["Product", "Total Sugars", "Added Sugars"] };
    assert.equal(visibleComparisonColumns(hypothetical).length, 2);
  }
  const html = render();
  assert.equal((html.match(/<th scope="row">Added Sugars<\/th>/g) ?? []).length, 2);
  assert.match(html, /<th scope="row">Total Sugars<\/th><td>2g<\/td><td>2.2g<\/td><td>4.3g<\/td>/);
  assert.match(html, /<th scope="row">Added Sugars<\/th><td>0g<\/td><td>0g<\/td><td>2.6g<\/td>/);
});
