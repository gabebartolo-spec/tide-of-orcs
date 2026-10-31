# Find the hole through the closed right fist (bind pose): line with no body verts within R of it, most enclosed by verts within 2.5R.
import bpy, sys, os, numpy as np; S=os.environ.get("SIDE","Right")
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0])
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); B = arm.data.bones
body = next(o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith(("wpn_", "prop_")))
co = np.array([body.matrix_world @ v.co for v in body.data.vertices])
W = lambda n: np.array(arm.matrix_world @ B["mixamorig:" + n].head_local)
c0 = (W(S+"HandIndex1") + W(S+"HandPinky1") + W(S+"HandMiddle3") + W(S+"Hand")) / 4
P = co[np.linalg.norm(co - c0, axis=1) < 0.09]; R = 0.011; best = None
g = np.random.default_rng(0).normal(size=(3000, 3)); g /= np.linalg.norm(g, axis=1)[:, None]; g = g[g[:, 2] >= 0]
for dx in np.linspace(-0.03, 0.03, 7):
    for dy in np.linspace(-0.03, 0.03, 7):
        for dz in np.linspace(-0.03, 0.03, 7):
            c = c0 + (dx, dy, dz); q = P - c
            if (np.linalg.norm(q, axis=1) < R).any(): continue
            t = q @ g.T; d2 = (q ** 2).sum(1)[:, None] - t ** 2; near = np.abs(t) < 0.04
            hit = ((d2 < R * R) & near).sum(0); ring = ((d2 < (2.5 * R) ** 2) & near).sum(0)
            s = hit * 1000 - ring; i = int(np.argmin(s))
            if best is None or s[i] < best[0]: best = (s[i], hit[i], ring[i], c, g[i])
s, h, r, c, d = best
print("HOLE hits", int(h), "ring", int(r), "c", [round(float(x), 4) for x in c], "dir", [round(float(x), 3) for x in d])
print("BONES thumb", [round(float(x), 3) for x in W(S+"HandThumb1")], "index", [round(float(x), 3) for x in W(S+"HandIndex1")], "pinky", [round(float(x), 3) for x in W(S+"HandPinky1")], "wrist", [round(float(x), 3) for x in W(S+"Hand")])

