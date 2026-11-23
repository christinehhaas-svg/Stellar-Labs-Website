// Numeric entities also preserve punctuation when opening a body fragment
// directly from disk without an HTTP charset or a document-level <meta>.
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character])).replace(/[^\x00-\x7f]/gu, character => `&#${character.codePointAt(0)};`);

export function renderAboutPage(story) {
  if (typeof story.heading !== "string" || !story.heading.trim() ||
      !Array.isArray(story.paragraphs) || !story.paragraphs.length ||
      story.paragraphs.some(text => typeof text !== "string" || !text.trim())) {
    throw new Error("The approved brand story requires a heading and nonempty paragraphs.");
  }
  // The leading asterisk is literal approved copy, not Markdown emphasis.
  return `<article>\n<h2>${escapeHtml(story.heading)}</h2>\n${story.paragraphs.map(text =>
    `<p>${escapeHtml(text)}</p>`).join("\n")}\n</article>\n`;
}

export function renderReturnsPage(markdown) {
  const blocks = markdown.trim().split(/\n\s*\n/);
  if (!blocks[0]?.startsWith("# ") || !blocks.some(block => block.startsWith("## "))) {
    throw new Error("The approved returns policy requires a title and sections.");
  }
  return `<article>\n${blocks.map((block, index) => {
    if (block.startsWith("# ")) {
      if (index !== 0 || block.includes("\n")) throw new Error("Unexpected policy title.");
      return `<h2>${escapeHtml(block.slice(2))}</h2>`;
    }
    if (block.startsWith("## ")) {
      if (block.includes("\n")) throw new Error("Unexpected policy section heading.");
      return `<h3>${escapeHtml(block.slice(3))}</h3>`;
    }
    // Deliberately limited to the approved source's paragraphs and bold text.
    // Fail rather than silently dropping future Markdown syntax.
    if (/^#{1,6} |^\s*[-+>] |^\d+\. |[`_<>\[\]]/m.test(block)) {
      throw new Error("Unsupported policy Markdown; extend the renderer before exporting.");
    }
    const paragraph = block.split(/(\*\*[^*]+\*\*)/g).map(part => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const text = part.slice(2, -2);
        const escaped = escapeHtml(text);
        return `<strong>${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
          ? `<a href="mailto:${escaped}">${escaped}</a>` : escaped}</strong>`;
      }
      if (part.includes("*")) throw new Error("Unsupported policy emphasis.");
      return escapeHtml(part);
    }).join("");
    return `<p>${paragraph}</p>`;
  }).join("\n")}\n</article>\n`;
}
