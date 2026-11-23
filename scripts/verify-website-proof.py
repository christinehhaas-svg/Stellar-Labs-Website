"""Check the actual printed website copy and add PDF navigation bookmarks."""
import json
import pathlib
import unicodedata
import pymupdf as fitz

output = pathlib.Path("generated-artifacts/website-proof")
capture = json.loads((output / "website-proof.json").read_text())
target = output / "stellar-labs-whole-website-proof.pdf"
document = fitz.open(target)
assert len(document) == 1 + len(capture["chunks"]) + capture["labelImages"]


def normalized(text):
    return "".join(unicodedata.normalize("NFKC", text).split()).replace("\u200b", "")


toc = [[1, "Whole website proofreading copy", 1]]
for index, chunk in enumerate(capture["chunks"]):
    printed = normalized(document[index + 1].get_text())
    assert normalized(chunk["text"]) in printed, f"Missing printed content: {chunk['title']} / {index+2}"
    if not chunk["continued"]:
        toc.append([1, chunk["title"], index + 2])

labels_start = 1 + len(capture["chunks"])
for index in range(labels_start, len(document)):
    assert document[index].get_images(), f"Missing label artwork on page {index+1}"
if capture["labelImages"]:
    toc.append([1, "Original label images displayed on the website", labels_start + 1])
document.set_toc(toc)
document.set_metadata({
    "title": "Stellar Labs — Whole Website Proofreading Copy",
    "subject": "Read-only current website wording and displayed label images",
    "author": "Stellar Labs",
})
staging = output / "verified-website-proof.pdf"
document.save(staging, garbage=4, deflate=True)
document[0].get_pixmap(matrix=fitz.Matrix(1.2, 1.2)).save(output / "preview-cover.png")
document[1].get_pixmap(matrix=fitz.Matrix(1.2, 1.2)).save(output / "preview-page-copy.png")
if capture["labelImages"]:
    document[labels_start].get_pixmap(matrix=fitz.Matrix(1.2, 1.2)).save(output / "preview-label.png")
report = {
    "pages": len(document),
    "websiteSections": len(capture["pages"]),
    "copyPages": len(capture["chunks"]),
    "labelImages": capture["labelImages"],
    "printedTextVerified": True,
    "labelImagesVerified": True,
    "bookmarks": len(toc),
    "capturedAt": capture["capturedAt"],
}
document.close()
staging.replace(target)
(output / "verification.json").write_text(json.dumps(report, indent=2))
print(json.dumps(report))
