# TB-250 wall banners: one standard (pole, crossbar, cloth, emblem) per banner cosmetic, rendered on its own for the field's wall.
# The build is the camp path banner's (render_camp_backdrop.py build_banner: pole, crossbar, Quaternius MegaKit "Banner_2_Cloth",
# CC0), with the cloth in the banner's colour and its emblem (a 512 px RGBA PNG) on the upper cloth. Light: lit_render (the actor
# light, which takes the walls' upper-left sun), Cycles, no ground (the standard stands on a wall post, not the meadow). Camera: the
# wall art's pitch (WALL_VIEW, 30 degrees), ortho, cloth facing it. Writes <out>/<name>.png and <out>/<name>.json (the pole foot's
# pixel and the image size), which post_standard (in pack) turns into the field sprite.
# LIT=1 NOGROUND=1 blender -b --factory-startup --python wall_standard.py -- <out dir> <name> <r,g,b cloth> <emblem.png> [px]
import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Euler, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lit_render
from bpy_extras.object_utils import world_to_camera_view as w2c

a = sys.argv[sys.argv.index("--") + 1:]
out, name, col, emblem = a[0], a[1], tuple(int(c) for c in a[2].split(",")), a[3]
PX = int(a[4]) if len(a) > 4 else 1400            # output height in px before the crop
os.makedirs(out, exist_ok=True)
QUAT = r"C:\Users\DANTE\Documents\tide-assets\quaternius\fantasy_props_megakit\x\Exports\glTF"
BANNER_H, BANNER_W, POLE_R = 0.66, 0.17, 0.011     # the camp path banner's sizes (metres)
PITCH = 30.0                                        # WALL_VIEW pitch

bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene

def srgb(c): return tuple(((v / 255) ** 2.2) for v in c) + (1,)
def bsdf(m):
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in b.inputs: b.inputs["Specular IOR Level"].default_value = 0.0
    return b
def mat(nm, c, c2=None, scale=6.0, bump=0.0):
    m = bpy.data.materials.new(nm); m.use_nodes = True; nt = m.node_tree; b = bsdf(m)
    if c2 is None: b.inputs["Base Color"].default_value = srgb(c); return m
    tc = nt.nodes.new("ShaderNodeTexCoord"); n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = 3
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].color = srgb(c); r.color_ramp.elements[1].color = srgb(c2)
    r.color_ramp.elements[0].position = 0.3; r.color_ramp.elements[1].position = 0.7
    nt.links.new(n.outputs["Fac"], r.inputs["Fac"]); nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    if bump:
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump
        nt.links.new(n.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m
WOOD = mat("wood", (122, 84, 50), (152, 108, 64), 9.0, 0.4)          # render_camp_backdrop.py's WOOD / WOOD_END
WOOD_END = mat("woodEnd", (176, 136, 88), (196, 158, 106), 20.0, 0.2)

def obj(me, nm, m):
    o = bpy.data.objects.new(nm, me); sc.collection.objects.link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o
def cyl(loc, r1, r2, h, m, seg=10, rot=(0, 0, 0)):
    me = bpy.data.meshes.new("c"); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    for v in bm.verts: v.co.z += h / 2
    bm.to_mesh(me); bm.free(); o = obj(me, "cone", m); o.location = loc; o.rotation_euler = rot; return o
def knob(loc, r, m):
    me = bpy.data.meshes.new("b"); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r); bm.to_mesh(me); bm.free()
    o = obj(me, "knob", m); o.location = loc; return o
def import_baked(path, k, rotz):
    before = set(sc.objects); bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in sc.objects if o not in before]; ms = [o for o in new if o.type == "MESH"]
    for o in ms:
        mw = o.matrix_world.copy(); o.parent = None; o.data.transform(Matrix.Rotation(rotz, 4, "Z") @ Matrix.Scale(k, 4) @ mw); o.matrix_world.identity()
    for o in new:
        if o not in ms: bpy.data.objects.remove(o)
    for mt in {s_.material for o in ms for s_ in o.material_slots if s_.material}:
        for nd in (mt.node_tree.nodes if mt.node_tree else []):
            if nd.type == "BSDF_PRINCIPLED":
                for l in list(nd.inputs["Roughness"].links) + list(nd.inputs["Metallic"].links): mt.node_tree.links.remove(l)
                nd.inputs["Roughness"].default_value = 1.0; nd.inputs["Metallic"].default_value = 0.0
    return ms

# ---- the standard: build_banner's pole, crossbar, knob and cloth, the cloth facing -X (the camera) ----
parts = [cyl(Vector((0, 0, 0)), POLE_R, POLE_R * 0.8, BANNER_H, WOOD, 10)]
parts.append(cyl(Vector((0, -BANNER_W * 0.62, BANNER_H - 0.03)), POLE_R * 0.7, POLE_R * 0.7, BANNER_W * 1.24, WOOD, 8, (-math.pi / 2, 0, 0)))
parts.append(knob(Vector((0, 0, BANNER_H + 0.006)), POLE_R * 1.5, WOOD_END))
cl = import_baked(os.path.join(QUAT, "Banner_2_Cloth.gltf"), BANNER_W / 0.81, -math.pi / 2)
for o in cl: o.data.transform(Matrix.Translation((-POLE_R * 1.2, 0, BANNER_H - 0.035)))
cloth = mat("cloth_" + name, col, tuple(min(255, int(c * 1.18)) for c in col), 30.0, 0.15)
for o in cl:
    for sl in o.material_slots:
        if sl.material and "Banner" in sl.material.name: sl.material = cloth
parts += cl
P = [v.co for o in cl for v in o.data.vertices]; zt = max(p.z for p in P); zl = min(p.z for p in P)
d = BANNER_W * 0.78; zc = zt - (zt - zl) * 0.36; yc = (min(p.y for p in P) + max(p.y for p in P)) / 2
front = min(p.x for p in P) - 0.002
me = bpy.data.meshes.new("emb"); bm = bmesh.new()
vs = [bm.verts.new((front, yc + y_, z_)) for y_, z_ in ((d / 2, zc - d / 2), (-d / 2, zc - d / 2), (-d / 2, zc + d / 2), (d / 2, zc + d / 2))]
f = bm.faces.new(vs); uvl = bm.loops.layers.uv.new()
for l, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uvl].uv = uv
bm.to_mesh(me); bm.free(); eo = bpy.data.objects.new("emblem", me); sc.collection.objects.link(eo)
em = bpy.data.materials.new("emblem_" + name); em.use_nodes = True; nt = em.node_tree; b = bsdf(em)
tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(emblem); tx.extension = "CLIP"
nt.links.new(tx.outputs["Color"], b.inputs["Base Color"]); nt.links.new(tx.outputs["Alpha"], b.inputs["Alpha"])
eo.data.materials.append(em); parts.append(eo)

# ---- camera at the wall's pitch, ortho, framing the standard; then the actor light ----
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
t = math.radians(PITCH); cam.data.type = "ORTHO"; cam.data.clip_end = 100
cam.rotation_euler = Euler((math.pi / 2 - t, 0, -math.pi / 2)); cam.location = (-20 * math.cos(t), 0, 20 * math.sin(t) + BANNER_H / 2)
bpy.context.view_layer.update()
Vw = [o.matrix_world @ v.co for o in parts for v in o.data.vertices]
R = cam.matrix_world.to_3x3().transposed(); L = [R @ p for p in Vw]
x0, x1 = min(p.x for p in L), max(p.x for p in L); y0, y1 = min(p.y for p in L), max(p.y for p in L)
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; wv, hv = (x1 - x0) * 1.08, (y1 - y0) * 1.04
cam.location = cam.matrix_world.to_3x3() @ Vector((cx, cy, 20)); cam.data.ortho_scale = max(wv, hv)
cam.data.sensor_fit = "VERTICAL" if hv >= wv else "HORIZONTAL"
sc.render.resolution_y = PX; sc.render.resolution_x = max(8, round(PX * wv / hv))
w = bpy.data.worlds.new("sky"); sc.world = w; w.use_nodes = True        # factory startup has no world: lit_render's ambient needs a sky colour
w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.8, 0.85, 1)
lit_render.setup(sc, cam)
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.render.filepath = os.path.join(out, name + ".png"); bpy.ops.render.render(write_still=True)
bpy.context.view_layer.update()
foot = w2c(sc, cam, Vector((0, 0, 0)))
json.dump({"w": sc.render.resolution_x, "h": sc.render.resolution_y, "foot": [foot.x * sc.render.resolution_x, (1 - foot.y) * sc.render.resolution_y],
           "pxPerM": sc.render.resolution_y / cam.data.ortho_scale if hv >= wv else sc.render.resolution_x / cam.data.ortho_scale},
          open(os.path.join(out, name + ".json"), "w"))
print("DONE", name)
