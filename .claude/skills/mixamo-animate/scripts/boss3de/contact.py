# python contact.py <frames dir> <key> <n> <out.png> [cols] [cell px]: contact sheet on #7c9676 with frame numbers.
import sys, os
from PIL import Image, ImageDraw
d, key, n, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 8; cell = int(sys.argv[6]) if len(sys.argv) > 6 else 256
rows = -(-n // cols); S = Image.new("RGB", (cols * cell, rows * cell), (0x7c, 0x96, 0x76)); g = ImageDraw.Draw(S)
for i in range(n):
    im = Image.open(os.path.join(d, f"{key}_{i}.png")).convert("RGBA").resize((cell, cell), Image.LANCZOS)
    x, y = (i % cols) * cell, (i // cols) * cell; S.paste(im, (x, y), im); g.text((x + 4, y + 4), str(i), fill=(255, 255, 255))
os.makedirs(os.path.dirname(out), exist_ok=True); S.save(out); print(out, S.size)
