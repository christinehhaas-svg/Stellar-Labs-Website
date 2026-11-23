"""Remove the leftover white-container rim from the derived black mockup.

The supplied label and original photos are untouched. Only neutral pixels in
the lower container rim are recolored; the label's printed text stays intact.
"""
from pathlib import Path
import sys
import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[3]
DIRECTORY = ROOT / "artifacts/stellar-review/source-assets/images/stellar-proteins"
flavor = sys.argv[1] if len(sys.argv) > 1 else "vanilla"
if flavor not in ("vanilla", "chocolate"):
    raise ValueError("Only verified vanilla and chocolate mockups use this rim mask.")
NAME = f"100-isolate-whey-protein-shake-{flavor}-0-black-bottle"
source = fitz.Pixmap(str(DIRECTORY / f"{NAME}.png"))
original = source.samples
pixels = bytearray(original)
sx, sy = source.width / 1024, source.height / 1024
for y in range(round(794 * sy), round(821 * sy)):
    for x in range(round(267 * sx), round(757 * sx)):
        offset = (y * source.width + x) * source.n
        red, green, blue = pixels[offset:offset + 3]
        if min(red, green, blue) >= 100 and max(red, green, blue) - min(red, green, blue) <= 24:
            sample_x = max(round(280 * sx), min(x, round(744 * sx)))
            sample = (round(826 * sy) * source.width + sample_x) * source.n
            pixels[offset:offset + 3] = original[sample:sample + 3]
result = fitz.Pixmap(fitz.csRGB, source.width, source.height, bytes(pixels), source.alpha)
for directory in (
    DIRECTORY,
    ROOT / "artifacts/mockup-sandbox/public/images/stellar-proteins",
):
    result.save(str(directory / f"{NAME}-clean-rim.png"))
