# TB-250 fox tabards: paint the approved fox sigil (banners/sigil_fox.png, the fox path banner's roundel) onto a spearman's tunic as a
# thin decal shell. The shell is a copy of the body's tunic faces, pushed out along their normals by OFF, keeping the body's vertex groups
# and armature, so it moves with the cloth frame for frame. Its own UV map "fox" is a planar projection of the rest-pose vertices; outside
# the roundel the image is transparent (CLIP), so only the paint shows. Rendered with TABARDONLY=1 (apply_anim.py: every other mesh a
# holdout) it gives the paint's visible pixels only, which the game draws over the plain van.spear frame.
#   blender -b --factory-startup <spearman.blend> --python fox_decal.py -- <out.blend>
# PLACES: "<side>:<c_u>,<c_v>:<size>;..." side is the axis the paint faces (-x = the body's right flank, the side the game camera sees;
# -y = chest front, +y = back); c_u, c_v the roundel's centre in the plane (world units, u = across, v = up), size its diameter.
import bpy, bmesh, os, sys
from mathutils import Vector
out = sys.argv[sys.argv.index("--") + 1]
SIG = os.environ.get("SIGIL", r"C:\Users\DANTE\Documents\tide-assets\banners\sigil_fox.png")
OFF = float(os.environ.get("OFF", "0.0025"))
KEEP = ("Spine", "Hips", "UpLeg")   # paint only on faces the torso or skirt carries (never the arms, which hang over the flank)
AX = {"-x": (Vector((-1, 0, 0)), Vector((0, -1, 0))), "+x": (Vector((1, 0, 0)), Vector((0, 1, 0))),
      "-y": (Vector((0, -1, 0)), Vector((1, 0, 0))), "+y": (Vector((0, 1, 0)), Vector((-1, 0, 0)))}   # normal, u axis (reads unmirrored from that side)
places = []
for p in os.environ.get("PLACES", "-x:0.02,0.33:0.12").split(";"):
    side, c, s = p.split(":"); cu, cv = map(float, c.split(",")); places.append((side, cu, cv, float(s)))

body = bpy.data.objects["body"]
dec = body.copy(); dec.data = body.data.copy(); dec.name = dec.data.name = "tabard_fox"
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
        bones = [vg[max(v[dl].items(), key=lambda kv: kv[1])[0]] if v[dl] else "" for v in f.verts]
        if not all(any(k in b for k in KEEP) for b in bones): continue
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
uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "fox"; nt.links.new(uvn.outputs[0], tx.inputs[0])
nt.links.new(tx.outputs["Color"], bs.inputs["Base Color"]); nt.links.new(tx.outputs["Alpha"], bs.inputs["Alpha"])
bs.inputs["Roughness"].default_value = 1.0
for k in ("Specular IOR Level", "Specular"):
    if k in bs.inputs: bs.inputs[k].default_value = 0.0
me.materials.clear(); me.materials.append(mt)
tx.image.pack()
print("FOXDECAL faces", len(me.polygons), "places", places)
bpy.ops.wm.save_as_mainfile(filepath=out)
