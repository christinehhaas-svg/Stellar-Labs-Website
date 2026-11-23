"""Render clearly identified product illustrations without changing label text.

The blank bottle follows the current store's container shape; it is not a
finished-product photograph. Source labels and their original files are kept.
"""
from pathlib import Path
import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "artifacts/stellar-review/source-assets/images/stellar-supplements"
CANVAS = ROOT / "artifacts/mockup-sandbox/public/images/stellar-supplements"
UPLOADS = {
    "omega-3": "attachment-1_(2)_1792505513626.jpeg",
    "probiotic-40": "StellarLabs_-_Probiotic_40_60ct_-_2.4_x_6.8_-_V9R0_1792503025892.jpg",
}

for product, filename in UPLOADS.items():
    image = fitz.Pixmap(str(ROOT / "attached_assets" / filename))
    image = fitz.Pixmap(image, 1024, 373)
    data, channels = image.samples, image.n
    cropped = b"".join(
        data[(y * 1024 + 278) * channels:(y * 1024 + 734) * channels]
        for y in range(373)
    )
    front = fitz.Pixmap(fitz.csRGB, 456, 373, cropped, image.alpha)
    for directory in (SOURCE, CANVAS):
        front.save(str(directory / f"{product}-merchant-front.png"))

products = [
    "mens-multivitamin", "probiotic-40", "digestive-enzyme", "omega-3",
    "magnesium-complex", "turmeric-w-bioperine", "night-time-fat-burn",
]
template = fitz.Pixmap(str(SOURCE / "white-bottle-template.png"))
width, height, channels, alpha = template.width, template.height, template.n, template.alpha
for product in products:
    suffix = "merchant-front" if product in UPLOADS else "front"
    front = fitz.Pixmap(str(SOURCE / f"{product}-{suffix}.png"))
    front = fitz.Pixmap(front, 395, 324)
    pixels = bytearray(template.samples)
    artwork, fw, fh, fn, fa = front.samples, front.width, front.height, front.n, front.alpha
    for y in range(fh):
        for x in range(fw):
            target = ((410 + y) * width + 310 + x) * channels
            source = (y * fw + x) * fn
            opacity = artwork[source + 3] / 255 if fa else 1
            for channel in range(3):
                pixels[target + channel] = round(
                    artwork[source + channel] * opacity
                    + pixels[target + channel] * (1 - opacity)
                )
    bottle = fitz.Pixmap(fitz.csRGB, width, height, bytes(pixels), alpha)
    bottle = fitz.Pixmap(bottle, 512, 512)
    for directory in (SOURCE, CANVAS):
        bottle.save(str(directory / f"{product}-store-bottle.png"))
    print(f"Prepared product-specific illustration: {product}")

# Keep the verified photo byte-identical as well as the seven illustrations.
for image in SOURCE.glob("*-store-bottle.png"):
    (CANVAS / image.name).write_bytes(image.read_bytes())
