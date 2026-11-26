# TB-250 fox tabards: paint the approved fox sigil (banners/sigil_fox.png, the fox path banner's roundel) onto a spearman's tunic as a
# thin decal shell. The shell is a copy of the body's tunic faces, pushed out along their normals by OFF, keeping the body's vertex groups
# and armature, so it moves with the cloth frame for frame. Its own UV map "fox" is a planar projection of the rest-pose vertices; outside
# the roundel the image is transparent (CLIP), so only the paint shows. Rendered with TABARDONLY=1 (apply_anim.py: every other mesh a
# holdout) it gives the paint's visible pixels only, which the game draws over the plain van.spear frame.
# TUNIC (director 26 Nov: "warm rust-orange tunic and skirt cloth, unlike the ember cloak"): a second shell, "tabard_cloth", a copy of
# the whole body in its place (the body itself hidden from render), wearing the body's own material with its
# colour map re-dyed: each cloth texel (green close to red: the sage tunic, its cream lining and the olive undershirt) keeps its brightness and takes
# TUNIC; every other texel (leather, metal, skin) is a holdout, so only the cloth shows and changes colour.
# RIM (director 26 Nov: "fox sigil at the hip with a cream rim"): the sigil's orange outer ring (radius RIMR..edge, px of the 192 px
# sigil) repainted in RIM.
#   blender -b --factory-startup <spearman.blend> --python fox_decal.py -- <out.blend>
# PLACES: "<side>:<c_u>,<c_v>:<size>;..." side is the axis the paint faces (-x = the body's right flank, the side the game camera sees;
# -y = chest front, +y = back); c_u, c_v the roundel's centre in the plane (world units, u = across, v = up), size its diameter.
import bpy, bmesh, os, sys
from mathutils import Vector
out = sys.argv[sys.argv.index("--") + 1]
SIG = os.environ.get("SIGIL", r"C:\Users\DANTE\Documents\tide-assets\banners\sigil_fox.png")
OFF = float(os.environ.get("OFF", "0.0025"))
TUNIC = os.environ.get("TUNIC"); RIM = os.environ.get("RIM"); RIMR = float(os.environ.get("RIMR", "83.5"))
import numpy as np
KEEP = ("Spine", "Hips", "UpLeg")   # paint only on faces the torso or skirt carries (never the arms, which hang over the flank)
AX = {"-x": (Vector((-1, 0, 0)), Vector((0, -1, 0))), "+x": (Vector((1, 0, 0)), Vector((0, 1, 0))),
      "-y": (Vector((0, -1, 0)), Vector((1, 0, 0))), "+y": (Vector((0, 1, 0)), Vector((-1, 0, 0)))}   # normal, u axis (reads unmirrored from that side)
places = []
for p in os.environ.get("PLACES", "-x:0.02,0.33:0.12").split(";"):
    side, c, s = p.split(":"); cu, cv = map(float, c.split(",")); places.append((side, cu, cv, float(s)))

body = bpy.data.objects["body"]

def bone_ok(bm, f, dl, vg):
    bones = [vg[max(v[dl].items(), key=lambda kv: kv[1])[0]] if v[dl] else "" for v in f.verts]
    return all(any(k in b for k in KEEP) for b in bones)

if TUNIC:   # the re-dyed cloth shell
    tgt = np.array([float(v) for v in TUNIC.split(",")], dtype=np.float32)
    cl = body.copy(); cl.data = body.data.copy(); cl.name = cl.data.name = "tabard_cloth"
    for c in body.users_collection: c.objects.link(cl)
    body.hide_render = True   # the shell IS the body in this blend: no offset (Tripo normals point inward on ~a quarter of the torso)
    mt = body.data.materials[0].copy(); mt.name = "tunic_dye"; nt = mt.node_tree; bs = nt.nodes["Principled BSDF"]
    tx = next(n for n in nt.nodes if n.type == "TEX_IMAGE" and "basecolor" in n.image.name)
    img = tx.image; W, H = img.size; px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4); c = px[..., :3]
    mx = c.max(-1)
    # cloth: green near red (sage, cream, olive; leather and skin sit at g/r 0.5-0.8), green over blue (no grey metal), not black
    cloth = (c[..., 1] >= 0.85 * c[..., 0]) & (c[..., 2] <= c[..., 1] - 0.02) & (mx > 0.12)
    lum = c @ np.array([0.299, 0.587, 0.114], dtype=np.float32); med = float(np.median(lum[cloth]))
    dye = np.zeros_like(px); dye[..., :3] = c
    dye[cloth, :3] = np.clip(tgt[None, :] * (lum[cloth] / med)[:, None], 0, 1); dye[..., 3] = cloth.astype(np.float32)
    dy = bpy.data.images.new("tunic_dye", W, H, alpha=True); dy.pixels[:] = dye.ravel(); dy.pack()
    if os.environ.get("DYEPREV"): dy.filepath_raw = os.environ["DYEPREV"]; dy.file_format = "PNG"; dy.save(); dy.pack()
    tx.image = dy; tx.interpolation = "Closest"   # a hard cloth edge: no leather texel half-dyed by filtering
    mo = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"); ho = nt.nodes.new("ShaderNodeHoldout"); mx_ = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tx.outputs["Alpha"], mx_.inputs[0]); nt.links.new(ho.outputs[0], mx_.inputs[1]); nt.links.new(bs.outputs[0], mx_.inputs[2])
    nt.links.new(mx_.outputs[0], mo.inputs["Surface"])   # not cloth: a holdout, so it still hides what is behind it
    cl.data.materials.clear(); cl.data.materials.append(mt)
    print("TUNIC faces", len(cl.data.polygons), "cloth texels", int(cloth.sum()), "median lum", round(med, 3))
dec = body.copy(); dec.data = body.data.copy(); dec.name = dec.data.name = "tabard_fox"; dec.hide_render = False
for c in body.users_collection: c.objects.link(dec)
vg = {g.index: g.name for g in dec.vertex_groups}
def dominant(v):
    return vg[max(v.groups, key=lambda g: g.weight).group] if v.groups else ""
me = dec.data; bm = bmesh.new(); bm.from_mesh(me)
dl = bm.verts.layers.deform.active
uv = bm.loops.layers.uv.new("fox")
keep = set()
for f in bm.faces:
    for side, cu, cv, s in places:
        n, u = AX[side]; c = f.calc_center_median()
        if f.normal.dot(n) < 0.35 or c.dot(n) < 0: continue   # faces this side, on this half of the body
        cu_, cv_ = c.dot(u), c.z
        if abs(cu_ - cu) > s * 0.6 or abs(cv_ - cv) > s * 0.6: continue
        if not bone_ok(bm, f, dl, vg): continue
        keep.add(f)
        for l in f.loops: l[uv].uv = ((l.vert.co.dot(u) - cu) / s + 0.5, (l.vert.co.z - cv) / s + 0.5)
        break
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context="FACES")
for v in bm.verts: v.co += v.normal * OFF
bm.to_mesh(me); bm.free()
me.uv_layers.active = me.uv_layers["fox"]
for l in [l for l in me.uv_layers if l.name != "fox"]: me.uv_layers.remove(l)
# paint: the sigil's colour and alpha, matte like the cloth under it
mt = bpy.data.materials.new("fox_paint"); mt.use_nodes = True; nt = mt.node_tree; bs = nt.nodes["Principled BSDF"]
tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(SIG); tx.extension = "CLIP"; tx.interpolation = "Cubic"
if RIM:   # the cream rim: the ring outside RIMR px takes RIM (one px blend at RIMR)
    si = tx.image; W, H = si.size; px = np.array(si.pixels[:], dtype=np.float32).reshape(H, W, 4)
    yy, xx = np.mgrid[0:H, 0:W]; d = np.hypot(xx + 0.5 - W / 2, yy + 0.5 - H / 2) * (192 / W)
    w = np.clip(d - RIMR, 0, 1)[..., None]; rim = np.array([float(v) for v in RIM.split(",")], dtype=np.float32)
    px[..., :3] = px[..., :3] * (1 - w) + rim[None, None, :] * w
    si.pixels[:] = px.ravel(); si.update()
uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "fox"; nt.links.new(uvn.outputs[0], tx.inputs[0])
nt.links.new(tx.outputs["Color"], bs.inputs["Base Color"]); nt.links.new(tx.outputs["Alpha"], bs.inputs["Alpha"])
bs.inputs["Roughness"].default_value = 1.0
for k in ("Specular IOR Level", "Specular"):
    if k in bs.inputs: bs.inputs[k].default_value = 0.0
me.materials.clear(); me.materials.append(mt)
tx.image.pack()
print("FOXDECAL faces", len(me.polygons), "places", places)
bpy.ops.wm.save_as_mainfile(filepath=out)
