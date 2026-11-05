import sys
from PIL import Image
# gifn.py <prefix> <out.gif> <ms> <i,j,k...> [flip]
# flip: mirror left-right. Orcs walk screen-LEFT in the game; GAMECAM renders them facing right, so orc GIFs need flip.
pre, out, ms, idx = sys.argv[1], sys.argv[2], int(sys.argv[3]), [int(x) for x in sys.argv[4].split(",")]
flip = len(sys.argv) > 5 and sys.argv[5] == "flip"
fr = []
for i in idx:
    im = Image.open(f"{pre}_{i}.png").convert("RGBA"); bg = Image.new("RGBA", im.size, (0x7c, 0x96, 0x76, 255)); bg.alpha_composite(im); fr.append(bg.convert("RGB").transpose(Image.FLIP_LEFT_RIGHT) if flip else bg.convert("RGB"))
fr[0].save(out, save_all=True, append_images=fr[1:], duration=ms, loop=0)
