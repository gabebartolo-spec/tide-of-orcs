import sys
from PIL import Image
# gifn.py <prefix> <out.gif> <ms> <i,j,k...>
pre, out, ms, idx = sys.argv[1], sys.argv[2], int(sys.argv[3]), [int(x) for x in sys.argv[4].split(",")]
fr = []
for i in idx:
    im = Image.open(f"{pre}_{i}.png").convert("RGBA"); bg = Image.new("RGBA", im.size, (0x7c, 0x96, 0x76, 255)); bg.alpha_composite(im); fr.append(bg.convert("RGB"))
fr[0].save(out, save_all=True, append_images=fr[1:], duration=ms, loop=0)
