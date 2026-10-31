# post_wr.py <prefix> <n> <gifdir> <name> : mirror game frames, contact sheets, GIFs (bg #7c9676, 33 ms, drop last frame if == first)
import sys
from PIL import Image, ImageOps, ImageChops
pre, n, gifdir, name = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
BG=(0x7c,0x96,0x76,255)
def load(v,i):
    im=Image.open(f"{pre}_{v}_{i}.png").convert("RGBA")
    if v=="game": im=ImageOps.mirror(im)
    return im
def flat(im):
    bg=Image.new("RGBA",im.size,BG); bg.alpha_composite(im); return bg.convert("RGB")
for v in ("game","front"):
    fr=[flat(load(v,i)) for i in range(n)]
    for i,f in enumerate(fr): f.save(f"{pre}_{v}m_{i}.png")
    # contact sheet, 9 columns, half size
    w,h=fr[0].size; cols=9; rows=-(-n//cols); S=Image.new("RGB",(cols*w//2,rows*h//2),BG[:3])
    for i,f in enumerate(fr):
        r,c=divmod(i,cols); S.paste(f.resize((w//2,h//2)),(c*w//2,r*h//2))
    S.save(f"{pre}_{v}_sheet.png")
    seq=fr[:-1] if ImageChops.difference(fr[0],fr[-1]).getbbox() is None else fr
    seq[0].save(f"{gifdir}/{name}_{v}.gif",save_all=True,append_images=seq[1:],duration=33,loop=0)
    print("GIF",v,len(seq),"frames")
