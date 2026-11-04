"""Remove the detached stick fragments left of the forge level 3 base (TB-188h): components that end left of x=490 below y=500,
or are thin and high on the left. Usage: python trim_forge3_sticks.py public/decor/camp"""
import sys
import numpy as np
import scipy.ndimage as nd
from PIL import Image

p = sys.argv[1] + '/forge3.webp'; a = np.array(Image.open(p).convert('RGBA')); m = a[..., 3] > 40
lab, n = nd.label(nd.binary_dilation(m, iterations=3)); objs = nd.find_objects(lab)
for i, sl in enumerate(objs):
    if (sl[1].stop <= 490 and sl[0].start > 500) or (sl[1].stop - sl[1].start < 60 and sl[0].start < 600 and sl[1].start < 400):
        a[sl][lab[sl] == i + 1] = 0
Image.fromarray(a, 'RGBA').save(p, 'WEBP', quality=92, method=6, alpha_quality=100)
