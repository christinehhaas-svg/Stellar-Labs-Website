"""Combine verified claims/labels with current website copy; inspect real PDF text."""
import json
import pathlib
import sys
import unicodedata
import pymupdf as fitz

output = pathlib.Path(sys.argv[1])
capture = json.loads((output / "website-copy.json").read_text())
claims = fitz.open(output / "claims/stellar-labs-claims-and-nutrition-facts.pdf")
copy = fitz.open(output / "website-copy.pdf")
homepage = fitz.open(output / "homepage-rebuild.pdf")
homepage_data = json.loads((output / "homepage-rebuild.json").read_text())
assert len(copy) == len(capture["chunks"]), "Copy pagination changed during printing"


def normalized(value):
    return "".join(unicodedata.normalize("NFKC", value).split()).replace("\u200b", "")


for index, chunk in enumerate(capture["chunks"]):
    assert normalized(chunk["text"]) in normalized(copy[index].get_text()), f"Missing printed wording: {chunk['title']} / {index + 1}"

homepage_text = "\n".join(page.get_text() for page in homepage)
for index, section in enumerate(homepage_data["sections"]):
    title = f"{index + 1:02d} {section['title']}"
    assert normalized(title) in normalized(homepage_text), f"Missing homepage section: {title}"
    # PDF page breaks may interrupt long sections; verify individual copy lines.
    for line in section["text"].splitlines():
        if line.strip():
            assert normalized(line) in normalized(homepage_text), f"Missing homepage wording: {line}"
    for link in section["links"]:
        assert normalized(link["href"]) in normalized(homepage_text), f"Missing homepage destination: {link['href']}"
    for asset in section["assets"]:
        assert (output / asset["filename"]).is_file(), f"Missing rebuild asset: {asset['filename']}"

document = fitz.open()
entries = [(index, chunk) for index, chunk in enumerate(capture["chunks"]) if not chunk["continued"]]
index_pages = (len(entries) + 23) // 24
homepage_start = 2 + index_pages
claims_start = homepage_start + len(homepage)
copy_start = claims_start + len(claims)
cover = document.new_page(width=612, height=792)
cover.insert_text((42, 57), "STELLAR LABS", fontsize=23, fontname="hebo", color=(0, .4, .46))
cover.insert_text((42, 88), "Complete web-team handoff", fontsize=21, fontname="hebo")
intro = (
    "Homepage rebuild guide, current website claims, nutrition facts, complete product label artwork, and page-by-page website wording.\n\n"
    "Includes the homepage's Why Stellar Labs? section, collection pages, product pages, comparison, About, "
    "Contact, Store Locator, Shipping & Returns, Recipes and individual recipes. Shared header and footer copy is included.\n\n"
    "The website wording is a read-only capture of the local review version. Expandable information is included. "
    "This document does not activate or promise live checkout, and is not certification documentation.\n\n"
    f"CONTENTS\nPDF pages 2-{index_pages + 1}\n\n"
    f"PART 1 - HOMEPAGE REBUILD GUIDE\nPDF pages {homepage_start}-{claims_start - 1}\n\n"
    f"PART 2 - CLAIMS, NUTRITION & ORIGINAL LABELS\nPDF pages {claims_start}-{copy_start - 1}\n\n"
    f"PART 3 - WEBSITE PAGE COPY\nPDF pages {copy_start}-{copy_start + len(copy) - 1}\n\n"
    "Use the contents list or PDF bookmarks to find each website page, including Why Stellar Labs?. "
    "The accompanying text file provides editable wording for your web team.\n\n"
    "Original printed label wording is preserved as artwork and can differ from approved website copy. "
    "Use the website copy section for current page wording; do not silently rewrite original labels.\n\n"
    f"Captured: {capture['capturedAt'][:10]}"
)
remaining = cover.insert_textbox(fitz.Rect(42, 120, 570, 730), intro, fontsize=11.5, lineheight=1.4)
assert remaining >= 0, "Cover text overflow"
contents_links = []
for start in range(0, len(entries), 24):
    index_page = document.new_page(width=612, height=792)
    index_page.insert_text((42, 55), "Website copy - contents", fontsize=19, fontname="hebo", color=(0, .4, .46))
    index_page.insert_text((42, 77), "Page numbers below refer to this complete PDF.", fontsize=10)
    for row, (index, chunk) in enumerate(entries[start:start + 24]):
        top = 101 + row * 26
        title = chunk["title"].replace("\u2014", "-").replace("\u2019", "'")
        available = index_page.insert_textbox(fitz.Rect(42, top, 530, top + 25), title, fontsize=10)
        assert available >= 0, f"Contents title overflow: {title}"
        index_page.insert_text((545, top + 11), str(copy_start + index), fontsize=10)
        contents_links.append((index_page.number, fitz.Rect(42, top, 570, top + 25), copy_start + index - 1))
document.insert_pdf(homepage)
document.insert_pdf(claims)
document.insert_pdf(copy)
for source, rect, destination in contents_links:
    document[source].insert_link({"kind": fitz.LINK_GOTO, "from": rect, "page": destination})
toc = [[1, "Contents", 2], [1, "Homepage rebuild guide", homepage_start]]
for index, section in enumerate(homepage_data["sections"]):
    title = f"{index + 1:02d} {section['title']}"
    first_page = next(page.number for page in homepage if normalized(title) in normalized(page.get_text()))
    toc.append([2, title, homepage_start + first_page])
toc.extend([[1, "Claims, nutrition & original label artwork", claims_start], [1, "Website page-by-page copy", copy_start]])
for index, chunk in enumerate(capture["chunks"]):
    if not chunk["continued"]:
        toc.append([2, chunk["title"], copy_start + index])
document.set_toc(toc)
document.set_metadata({"title": "Stellar Labs - Complete Web-Team Handoff", "subject": "Website copy, claims, nutrition and labels", "author": "Stellar Labs"})
target = output / "stellar-labs-web-team-complete-handoff.pdf"
document.save(target, garbage=4, deflate=True)
why_index = next(i for i, chunk in enumerate(capture["chunks"]) if chunk["title"].startswith("Why Stellar Labs?"))
for name, index in [("cover", 0), ("homepage-rebuild", homepage_start - 1), ("why-stellar-labs", copy_start + why_index - 1), ("website-copy", copy_start - 1)]:
    document[index].get_pixmap(matrix=fitz.Matrix(1.25, 1.25)).save(output / f"preview-{name}.png")
(output / "verification.json").write_text(json.dumps({
    "pages": len(document), "websiteSections": len(capture["pages"]),
    "copyPages": len(copy), "claimsAndLabelPages": len(claims),
    "printedCopyVerified": True, "whyStellarLabsIncluded": True, "bookmarks": len(toc),
    "homepageRebuildPages": len(homepage), "homepageSections": len(homepage_data["sections"]),
    "homepageAssets": len(homepage_data["assets"]), "homepageGuideVerified": True,
}, indent=2))
print(json.dumps({"pages": len(document), "websiteSections": len(capture["pages"]), "file": str(target)}))
