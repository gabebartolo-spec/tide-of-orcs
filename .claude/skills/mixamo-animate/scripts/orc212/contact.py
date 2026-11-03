# contact.py <frames dir> <key> <out.png> [cols] [crop x0,y0,x1,y1] [anchor x,y]: every frame of <key> on the field green, numbered.
import sys, os, re
from PIL import Image, ImageDraw
d, key, out = sys.argv[1:4]; cols = int(sys.argv[4]) if len(sys.argv) > 4 else 10
cb = tuple(map(int, sys.argv[5].split(","))) if len(sys.argv) > 5 else (96, 96, 416, 416)
fs = sorted((int(m.group(1)), f) for f in os.listdir(d) if (m := re.fullmatch(re.escape(key) + r"_(\d+)\.png", f)))
ax, ay = map(float, sys.argv[6].split(",")) if len(sys.argv) > 6 else (256, 336)  # ground under the rig origin (render_orc ANCHOR)
w, h = cb[2] - cb[0], cb[3] - cb[1]; rows = (len(fs) + cols - 1) // cols
s = Image.new("RGBA", (cols * w, rows * h), (124, 150, 118, 255)); dr = ImageDraw.Draw(s)
for i, (n, f) in enumerate(fs):
    x, y = (i % cols) * w, (i // cols) * h
    dr.ellipse((x + ax - cb[0] - 40, y + ay - cb[1] - 10, x + ax - cb[0] + 40, y + ay - cb[1] + 10), fill=(60, 75, 55, 255))  # ground shadow at the anchor
    s.alpha_composite(Image.open(os.path.join(d, f)).convert("RGBA").crop(cb), (x, y)); dr.text((x + 4, y + 4), str(n), fill=(0, 0, 0, 255))
s.convert("RGB").save(out); print(out, s.size, len(fs))
