"""Render text with the built TTF: python look.py out.png SIZE "line one" "line two" ...
Optional env THEME=ink (cream on ink, the game look) or paper (ink on cream)."""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
TTF = os.path.join(HERE, "out", "Heartwood-Regular.ttf")


def render(out, size, lines, theme="ink", guides=False):
    font = ImageFont.truetype(TTF, size)
    bg, fg = ((27, 33, 48), (239, 230, 210)) if theme == "ink" else ((239, 230, 210), (27, 33, 48))
    pad = size // 2
    lh = int(size * 1.25)
    w = max(int(font.getlength(l)) for l in lines) + pad * 2
    h = lh * len(lines) + pad * 2
    im = Image.new("RGB", (max(w, 200), h), bg)
    d = ImageDraw.Draw(im)
    for i, line in enumerate(lines):
        y = pad + i * lh
        if guides:
            base = y + int(size * 0.9)
            for frac, col in ((0, (90, 70, 70)), (0.43, (70, 90, 70)), (0.68, (70, 70, 110)), (0.76, (90, 90, 60))):
                yy = base - int(size * frac)
                d.line([(0, yy), (im.width, yy)], fill=col)
        d.text((pad, y), line, font=font, fill=fg, anchor="la")
    im.save(out)
    return out


if __name__ == "__main__":
    out, size, *lines = sys.argv[1:]
    print(render(out, int(size), lines, os.environ.get("THEME", "ink"), os.environ.get("GUIDES") == "1"))
