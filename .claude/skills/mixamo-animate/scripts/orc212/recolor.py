# recolor.py <textures dir> <out dir>: TB-212 critic fix. The Riltariki orc ships with pink human skin; shift only the skin
# pixels (warm hue 0-35 deg, mid saturation, light) to the tide's orc green, keeping the texture's own shading. Leather,
# cloth, hair and metal (dark or desaturated) are untouched. Writes Orc_Body_Diffuse.png and copies the axe texture.
import sys, os, shutil
import numpy as np
from PIL import Image
src, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
HUE = 72 / 360  # TB-212 critic 2: 88 deg was 21 deg from the meadow (109 deg) and read as dark blobs; 72 deg is the Tripo orcs' own skin (measured 75) and 37 deg off the grass
im = np.asarray(Image.open(os.path.join(src, "Orc_Body_Diffuse.png")).convert("RGB")).astype(np.float32) / 255
hsv = np.asarray(Image.fromarray((im * 255).astype(np.uint8)).convert("HSV")).astype(np.float32) / 255
h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
hd = np.minimum(h, 1 - h) * 360  # distance from red, degrees
w = np.clip((35 - hd) / 10, 0, 1) * np.clip((v - 0.30) / 0.10, 0, 1) * np.clip((s - 0.18) / 0.08, 0, 1) * np.clip((0.85 - s) / 0.1, 0, 1)
nh = h * (1 - w) + HUE * w; ns = s * (1 - w) + np.minimum(s * 1.35, 0.7) * w; nv = v * (1 - w) + np.minimum(v * 1.0, 1) * w
o = np.stack([nh, ns, nv], -1); Image.fromarray((o * 255).astype(np.uint8), "HSV").convert("RGB").save(os.path.join(out, "Orc_Body_Diffuse.png"))
shutil.copy(os.path.join(src, "Orc_Axe_Diffuse.png"), out); print("skin px", int((w > 0.5).sum()), "of", w.size)
