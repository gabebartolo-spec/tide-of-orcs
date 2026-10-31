# Tunic blotches: Tripo painted the resting arm's brown bracer and skin onto the hip/side of the tunic, and the body plug
# (body_plug.py) shows the same paint. Copy the clean side instead of inventing colour: every blotched pixel (not cream
# tunic, not teal cloak) under a body/plug face in the side box takes the colour of the mirror point (x -> -x) on the
# other side of the body; if that lands on skin or cloak it gets the median tunic cream. Arm faces are skipped.
# Writes a new texture file next to out.blend.
# Args: in.blend out.blend   Env: SIDE (Right), BOX=x0,x1,y0,y1,z0,z1 (bind world; default from the armature)
import bpy, sys, os, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
S = os.environ.get("SIDE", "Right"); arm_o = next(o for o in bpy.data.objects if o.type == "ARMATURE")
BP = lambda n: arm_o.matrix_world @ arm_o.data.bones["mixamorig:" + n].head_local
hip, sh = BP("Hips"), BP(f"{S}Arm"); sg = 1 if sh.x > 0 else -1
x0, x1, y0, y1, z0, z1 = map(float, os.environ["BOX"].split(",")) if "BOX" in os.environ else \
    (*sorted((-sg * 0.04, sh.x + sg * 0.12)), -0.3, 0.3, hip.z - 0.12, sh.z - 0.06)
meshes = [o for o in bpy.data.objects if o.type == "MESH" and (o.name == "body_plug" or not o.name.startswith(("wpn_", "prop_")))]
body = max((o for o in meshes if o.name != "body_plug"), key=lambda o: len(o.data.vertices)); objs = [body] + [o for o in meshes if o.name == "body_plug"]
img = next(n.image for m in body.data.materials if m for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image)
TW, TH = img.size; px = np.array(img.pixels[:], dtype=np.float32).reshape(TH, TW, 4)
cream = lambda c: (c[..., 0] > 0.55) & (c[..., 1] > 0.5) & (c[..., 2] > 0.38) & (c[..., 0] - c[..., 2] < 0.25)
teal = lambda c: c[..., 2] > c[..., 0] + 0.05
skin = lambda c: (c[..., 0] > 0.6) & (c[..., 1] > 0.35) & (c[..., 1] < 0.65) & (c[..., 2] > 0.25) & ~cream(c)
# arm share: under the armpit the torso side carries 0.5-0.7 upper-arm weight and is fully blotched, so torso = share < ARMW
ARMW = float(os.environ.get("ARMW", "0.7"))
def tri_data(o):  # bind-world vert positions (n,3,3), uvs (n,3,2), arm share (n)
    me = o.data; me.calc_loop_triangles(); M = o.matrix_world; ul = me.uv_layers.active.data
    co = np.array([(M @ v.co)[:] for v in me.vertices]); gi = {g.index: g.name for g in o.vertex_groups}
    wt = lambda v, ks: sum(g.weight for g in v.groups if gi.get(g.group, "").startswith(f"mixamorig:{S}") and any(k in gi[g.group] for k in ks))
    aw = np.array([wt(v, ("Arm", "Hand")) - (wt(v, ("ForeArm", "Hand")) > 0.3) * 9 for v in me.vertices])  # forearm/hand faces read as -9: never torso
    tv = np.array([t.vertices[:] for t in me.loop_triangles]); tl = np.array([t.loops[:] for t in me.loop_triangles])
    return co[tv], np.array([[ul[l].uv[:] for l in row] for row in tl]), aw[tv].mean(1)
def raster(uvt):  # pixels inside a UV triangle and their barycentrics (b1, b2)
    p = uvt * (TW, TH); lo = np.floor(p.min(0)).astype(int); hi = np.ceil(p.max(0)).astype(int)
    xs, ys = np.meshgrid(np.arange(lo[0], hi[0] + 1), np.arange(lo[1], hi[1] + 1)); q = np.stack([xs.ravel() + 0.5, ys.ravel() + 0.5], 1)
    v0, v1 = p[1] - p[0], p[2] - p[0]; d = v0[0] * v1[1] - v0[1] * v1[0]
    if abs(d) < 1e-12: return [np.zeros(0, int)] * 2 + [np.zeros(0)] * 2
    w = q - p[0]; b1 = (w[:, 0] * v1[1] - w[:, 1] * v1[0]) / d; b2 = (v0[0] * w[:, 1] - v0[1] * w[:, 0]) / d
    k = (b1 >= -0.02) & (b2 >= -0.02) & (b1 + b2 <= 1.02); return xs.ravel()[k] % TW, ys.ravel()[k] % TH, b1[k], b2[k]
BT, BU, BA = tri_data(body); bvh = BVHTree.FromPolygons([Vector(p) for p in BT.reshape(-1, 3)], [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(BT))])
# measured from the clean side's torso faces: the belt is the band of gold (buckle, studs) pixels; the hem is the lowest
# 1 cm row that is mostly cream (below it the brown is trousers, not paint)
uc = BU.mean(1); fc = px[(uc[:, 1] % 1 * TH).astype(int).clip(0, TH - 1), (uc[:, 0] % 1 * TW).astype(int).clip(0, TW - 1), :3]; c3 = BT.mean(1)
tor = (np.abs(c3[:, 0]) < 0.2) & (BA < 0.3) & (BA > -1); gold = (fc[:, 0] > 0.6) & (fc[:, 1] > 0.4) & (fc[:, 2] < 0.25)
gz = c3[tor & gold, 2]; bz0, bz1 = (np.percentile(gz, 5) - 0.01, np.percentile(gz, 95) + 0.01) if len(gz) else (0, 0)
if "BAND" in os.environ: bz0, bz1 = (float(v) / 100 for v in os.environ["BAND"].split(","))
cl = tor & (c3[:, 0] * sg < 0) & (c3[:, 1] < 0); zb = np.floor(c3[:, 2] * 100)
hem = next((z / 100 for z in range(int(hip.z * 100) - 25, int(bz0 * 100)) if (cl & (zb == z)).sum() and cream(fc[cl & (zb == z)]).mean() > 0.5), z0)
if "BOX" not in os.environ: z0, z1 = max(z0, hem), sh.z
X, Y, P = [], [], []
for o in objs:
    T, U, AW = tri_data(o); c = T.mean(1)
    for i in np.nonzero((c[:, 0] > x0) & (c[:, 0] < x1) & (c[:, 1] > y0) & (c[:, 1] < y1) & (c[:, 2] > z0) & (c[:, 2] < z1) & (AW < ARMW) & (AW > -1))[0]:
        xs, ys, b1, b2 = raster(U[i])
        if len(xs): X.append(xs); Y.append(ys); P.append(T[i, 0] + b1[:, None] * (T[i, 1] - T[i, 0]) + b2[:, None] * (T[i, 2] - T[i, 0]))
X, Y, P = np.concatenate(X), np.concatenate(Y), np.concatenate(P)
col = px[Y, X, :3]; bad = ~(cream(col) | teal(col)); ref = np.median(col[cream(col)], 0)
Xb, Yb, Pb = X[bad], Y[bad], P[bad] * (-1, 1, 1); new = np.tile(ref, (len(Xb), 1))
loc, fi = np.zeros((len(Xb), 3)), np.zeros(len(Xb), int)
for j, p in enumerate(Pb):
    l_, _, f_, _ = bvh.find_nearest(Vector(p)); loc[j] = l_; fi[j] = f_
t = BT[fi]; v0, v1, w = t[:, 1] - t[:, 0], t[:, 2] - t[:, 0], loc - t[:, 0]  # barycentric of the mirror point -> its UV
d00, d01, d11, d20, d21 = (v0 * v0).sum(1), (v0 * v1).sum(1), (v1 * v1).sum(1), (w * v0).sum(1), (w * v1).sum(1)
den = np.where(np.abs(d00 * d11 - d01 * d01) < 1e-14, 1e-14, d00 * d11 - d01 * d01); bb = (d11 * d20 - d01 * d21) / den; bc = (d00 * d21 - d01 * d20) / den
uv = BU[fi, 0] + bb[:, None] * (BU[fi, 1] - BU[fi, 0]) + bc[:, None] * (BU[fi, 2] - BU[fi, 0])
src = px[(uv[:, 1] % 1 * TH).astype(int).clip(0, TH - 1), (uv[:, 0] % 1 * TW).astype(int).clip(0, TW - 1), :3]
# the mirror point can land on the other arm (bracer brown): off the belt only cream is copied, on the belt anything but cloak/skin
inb = (Pb[:, 2] >= bz0) & (Pb[:, 2] <= bz1); ok = np.where(inb, ~(teal(src) | skin(src)), cream(src)); new[ok] = src[ok]
print("TUNIC belt", round(bz0, 3), round(bz1, 3), "hem", round(hem, 3), "box", [round(v, 3) for v in (x0, x1, y0, y1, z0, z1)], "pixels", len(X), "blotched", int(bad.sum()), "mirrored", int(ok.sum()), "cream fill", int((~ok).sum()), "ref", ref.round(3))
px[Yb, Xb, :3] = new
if os.environ.get("MAGB"): px[Yb[ok & inb & ~cream(src)], Xb[ok & inb & ~cream(src)], :3] = (1, 0, 1)  # debug: brown copied in the belt band
# arm faces in the box (sleeve): a mostly-cream face gets its stray brown flecks set to its own cream; skin and bracer faces stay
AX, AY, nf = [], [], 0
for o in objs:
    T, U, AW = tri_data(o); c = T.mean(1)
    for i in np.nonzero((c[:, 0] > x0) & (c[:, 0] < x1) & (c[:, 2] > z0) & (c[:, 2] < z1 + 0.08) & ((AW >= ARMW) | (AW < -1)))[0]:
        xs, ys, _, _ = raster(U[i])
        if not len(xs): continue
        cc = px[ys, xs, :3]; cm = cream(cc)
        if cm.mean() < 0.5: continue
        st = ~(cm | skin(cc)); px[ys[st], xs[st], :3] = np.median(cc[cm], 0); AX.append(xs); AY.append(ys); nf += 1
print("TUNIC sleeve faces cleaned", nf)
# UV padding: texture filtering at island edges reads the uncovered pixels around them, which still hold the old brown.
# Grow the cleaned colours 4 px into pixels no triangle covers.
cov = np.zeros((TH, TW), bool)
for o in objs:
    for u in tri_data(o)[1]:
        xs, ys, _, _ = raster(u); cov[ys, xs] = True
done = np.zeros((TH, TW), bool); done[Y, X] = True
if AX: done[np.concatenate(AY), np.concatenate(AX)] = True
grown = 0
for _ in range(4):
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        nb = np.roll(done, (dy, dx), (0, 1)) & ~done & ~cov
        if nb.any():
            ys, xs = np.nonzero(nb); px[ys, xs, :3] = px[(ys - dy) % TH, (xs - dx) % TW, :3]; done |= nb; grown += len(ys)
print("TUNIC padding grown", grown, "covered", int(cov.sum()), "of", TW * TH)
if os.environ.get("MAG"): px[done, :3] = (1, 0, 1)  # debug: show every pixel touched
img.pixels.foreach_set(px.ravel()); out = os.path.join(os.path.dirname(a[1]), os.path.splitext(os.path.basename(a[1]))[0] + "_tex.png")
img.filepath_raw = out; img.file_format = "PNG"; img.save(); img.filepath = out
bpy.ops.wm.save_as_mainfile(filepath=a[1]); print("TUNIC saved", out)
