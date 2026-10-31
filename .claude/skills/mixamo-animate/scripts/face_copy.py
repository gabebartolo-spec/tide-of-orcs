import os
"""Copy painted face features (eyes, brows, nose, mouth) from one Tripo model onto another's blank face.
Args: <src.fbx> <dst.fbx> <outdir>
Env: RECT=x0,y0,x1,y1 feature box in the source front render (512 px, top-left origin),
     DX,DY shift (px) and SC scale of the features on the destination, FEATH feather px.
Features move as a ratio to the source's skin colour, so the destination keeps its own skin tone.
Writes <outdir>/basecolor_face.png, <outdir>/face.blend and <outdir>/head_after.png."""
import bpy, sys, os, mathutils
import numpy as np

a = sys.argv[sys.argv.index("--") + 1:]
src, dst, outd = a
E = os.environ
RECT = [int(v) for v in E.get("RECT", "175,225,340,345").split(",")]
DX, DY, SC = float(E.get("DX", "0")), float(E.get("DY", "45")), float(E.get("SC", "1"))
FEATH = float(E.get("FEATH", "14"))
R = 512


def load(fbx):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=fbx, use_image_search=False)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from relink import relink; relink(fbx)
    sc = bpy.context.scene
    ob = [o for o in sc.objects if o.type == "MESH"][0]
    W = [ob.matrix_world @ v.co for v in ob.data.vertices]
    zs = [p.z for p in W]; h = max(zs) - min(zs)
    cx = sum(p.x for p in W) / len(W)
    top = max(p.z for p in W if abs(p.x - cx) < 0.04 * h)
    return sc, ob, W, cx, top - 0.09 * h, 0.22 * h


def camera(sc, cx, cz, s):
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    cam.data.type = "ORTHO"; cam.data.ortho_scale = s
    cam.location = (cx, -5, cz); cam.rotation_euler = (1.5708, 0, 0)
    sc.camera = cam
    sc.render.resolution_x = sc.render.resolution_y = R


def base_node(ob):
    nt = ob.data.materials[0].node_tree
    return nt, [n for n in nt.nodes if n.type == "TEX_IMAGE" and "basecolor" in n.image.name][0]


# 1. flat (unlit) front render of the source's base colour, linear EXR
sc, ob, W, cx, cz, s = load(src)
camera(sc, cx, cz, s)
nt, bn = base_node(ob)
em = nt.nodes.new("ShaderNodeEmission"); out = nt.nodes["Material Output"]
nt.links.new(bn.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs[0], out.inputs["Surface"])
sc.render.engine = "BLENDER_EEVEE"; sc.view_settings.view_transform = "Standard"
sc.render.image_settings.file_format = "OPEN_EXR"
flat = os.path.join(outd, "src_flat.exr"); sc.render.filepath = flat
bpy.ops.render.render(write_still=True)
img = bpy.data.images.load(flat)
F = np.array(img.pixels[:]).reshape(R, R, 4)[::-1, :, :3]  # top-left origin

# 2. ratio of features to the source's skin (median of the feature box), feathered box mask
x0, y0, x1, y1 = RECT
box = F[y0:y1, x0:x1]
skin = np.median(box.reshape(-1, 3), axis=0)
ratio = np.clip(box / np.maximum(skin, 1e-4), 0, 1.15)
# CUT=x0,y0,x1,y1;... source boxes to drop (e.g. a helmet edge inside the feature box)
for c in filter(None, E.get("CUT", "").split(";")):
    a0, b0, a1, b1 = [int(v) for v in c.split(",")]
    ratio[max(b0 - y0, 0):b1 - y0, max(a0 - x0, 0):a1 - x0] = 1
yy, xx = np.mgrid[0:y1 - y0, 0:x1 - x0]
edge = np.minimum.reduce([xx, yy, (x1 - x0 - 1) - xx, (y1 - y0 - 1) - yy]).astype(float)
m = np.clip(edge / FEATH, 0, 1)[..., None]
patch = 1 + (ratio - 1) * m
# place on the destination's 512 frame: same box centre + (DX, DY), scaled by SC
P = np.ones((R, R, 3))
ccx, ccy = (x0 + x1) / 2 + DX, (y0 + y1) / 2 + DY
Y, X = np.mgrid[0:R, 0:R]
sx = ((X - ccx) / SC + (x1 - x0) / 2).astype(int); sy = ((Y - ccy) / SC + (y1 - y0) / 2).astype(int)
ok = (sx >= 0) & (sx < x1 - x0) & (sy >= 0) & (sy < y1 - y0)
P[ok] = patch[sy[ok], sx[ok]]
print("SKIN", skin, "RATIO min", patch.min())
dbg = bpy.data.images.new("dbg", R, 2 * R)
dbg.pixels.foreach_set(np.concatenate([np.concatenate([np.clip(P / 1.15, 0, 1), np.clip(F, 0, 1)], 0)[::-1],
                                       np.ones((2 * R, R, 1))], 2).astype(np.float32).ravel())
dbg.filepath_raw = os.path.join(outd, "dbg_patch.png"); dbg.file_format = "PNG"; dbg.save()

# 3. destination: project UVs from the front camera, bake base * ratio into a new base colour
sc, ob, W, cx, cz, s = load(dst)
me = ob.data
uv0 = me.uv_layers[0]
pj = me.uv_layers.new(name="proj")
for lp in me.loops:
    p = W[lp.vertex_index]
    pj.data[lp.index].uv = ((p.x - cx) / s + 0.5, (p.z - cz) / s + 0.5)
me.uv_layers.active = uv0; uv0.active_render = True
rimg = bpy.data.images.new("ratio", R, R, float_buffer=True)
rimg.colorspace_settings.name = "Non-Color"
rimg.pixels.foreach_set(np.concatenate([P[::-1], np.ones((R, R, 1))], axis=2).astype(np.float32).ravel())
print("RIMG", rimg.size[:], np.array(rimg.pixels[:]).reshape(-1, 4)[:, :3].mean(0))
nt, bn = base_node(ob)
W0, H0 = bn.image.size
uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "proj"
rt = nt.nodes.new("ShaderNodeTexImage"); rt.image = rimg; rt.extension = "EXTEND"
nt.links.new(uvn.outputs[0], rt.inputs[0])
# only faces looking toward the camera (-Y) take the features
geo = nt.nodes.new("ShaderNodeNewGeometry")
dot = nt.nodes.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"; dot.inputs[1].default_value = (0, -1, 0)
nt.links.new(geo.outputs["Normal"], dot.inputs[0])
ramp = nt.nodes.new("ShaderNodeMapRange"); ramp.inputs[1].default_value = 0.2; ramp.inputs[2].default_value = 0.5
nt.links.new(dot.outputs["Value"], ramp.inputs[0])
mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[6].default_value = (1, 1, 1, 1)
nt.links.new(ramp.outputs[0], mix.inputs[0]); nt.links.new(rt.outputs["Color"], mix.inputs[7])
mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1
nt.links.new(bn.outputs["Color"], mul.inputs[6]); nt.links.new(mix.outputs[2], mul.inputs[7])
em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(mul.outputs[2], em.inputs["Color"])
out = nt.nodes["Material Output"]; keep = out.inputs["Surface"].links[0].from_socket
nt.links.new(em.outputs[0], out.inputs["Surface"])
tgt = bpy.data.images.new("basecolor_face", W0, H0)
tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = tgt
nt.nodes.active = tn
sc.render.engine = "CYCLES"; sc.cycles.samples = 1; sc.cycles.device = "CPU"
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.bake(type="EMIT", margin=8)
fp = os.path.join(outd, "basecolor_face.png")
tgt.filepath_raw = fp; tgt.file_format = "PNG"; tgt.save()
# restore the shader with the new texture and save the .blend
nt.links.new(keep, out.inputs["Surface"])
for n in (uvn, rt, geo, dot, ramp, mix, mul, em, tn): nt.nodes.remove(n)
bn.image = bpy.data.images.load(fp)
me.uv_layers.remove(me.uv_layers["proj"])
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outd, "face.blend"))
print("BAKED", fp)
