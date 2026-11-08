# TB-211 green ogre: blue/violet/teal skin + pads -> troll green. Browns (hide, wood) and greys (steel) untouched.
import numpy as np
from PIL import Image
P = "C:/Users/DANTE/Documents/GitHub/tide-of-orcs-wt/scratch211/g1/tex/Troll_Teksture_Troll_Diffuse.png"
src = "C:/Users/DANTE/Documents/tide-assets/sketchfab/troll_ogre/textures/Troll_Teksture_Troll_Diffuse.png"
hsv = np.array(Image.open(src).convert("RGB").convert("HSV")).astype(np.float32)
H, S, V = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
m = ((H >= 150) & (H <= 345) & (S > 0.10)).astype(np.float32)
w = np.clip((S - 0.10) / 0.12, 0, 1) * m              # feather the near-grey edge
pad = np.clip((S - 0.55) / 0.2, 0, 1)                 # saturated blue pads -> deeper moss
tgt = 100 - 12 * pad                                  # skin 100 deg, pads 88 deg
H2 = np.where(w > 0, H * (1 - w) + tgt * w, H)
S2 = np.where(w > 0, np.clip(np.maximum(S, 0.30 * w + S * (1 - w)) * (1 - 0.35 * pad), 0, 1), S)
V2 = np.where(w > 0, V * (1 + 0.12 * w * (1 - pad) - 0.22 * w * pad), V)
out = np.stack([H2 * 255 / 360, S2 * 255, np.clip(V2, 0, 1) * 255], -1).clip(0, 255).astype(np.uint8)
Image.fromarray(out, "HSV").convert("RGB").save(P)
Image.fromarray(out, "HSV").convert("RGB").resize((768, 768)).save("tex_green.png")
print("OK", int(m.sum()))
