# TB-250 wall banners: the post a banner standard stands on at wall tiers 1-3 (wall0 keeps its own tall posts). One post per tier,
# coloured from that tier's wall render (tools: the median and bright-fifth colours of public/decor/wall<t>_0.webp):
#   log      wall1 timber   (59,41,30)  / (114,85,65)   a round log with a pale cut top
#   stone    wall2 stone    (82,72,55)  / (145,129,98)  a square block pillar with a cap slab
#   pilaster wall3 red      (59,37,34)  / (108,63,58)   a square pilaster with a base and a capital
# Sizes in post widths (1 unit = the post's width): H tall. Light: lit_render (the wall's upper-left sun), Cycles, a shadow-catcher
# ground for the post's cast shadow (lit_render.mask). Camera: the wall art's pitch (WALL_VIEW, 30 degrees), ortho.
# Writes <out>/<name>.png and <out>/<name>.json: image size, the post's foot (bottom centre) and top (top centre) in px, px per unit.
# LIT=1 blender -b --factory-startup --python wall_post.py -- <out dir> <log|stone|pilaster> [H] [px]
import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lit_render
from bpy_extras.object_utils import world_to_camera_view as w2c

a = sys.argv[sys.argv.index("--") + 1:]
out, kind = a[0], a[1]; H = float(a[2]) if len(a) > 2 else 9.0; PX = int(a[3]) if len(a) > 3 else 1400
os.makedirs(out, exist_ok=True); name = "wall_post_" + kind
PITCH = 30.0
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene

def srgb(c): return tuple(((v / 255) ** 2.2) for v in c) + (1,)
def mat(nm, c, c2, scale, bump, stretch=(1, 1, 1)):
    m = bpy.data.materials.new(nm); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in b.inputs: b.inputs["Specular IOR Level"].default_value = 0.0
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = stretch
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = 4
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].color = srgb(c); r.color_ramp.elements[1].color = srgb(c2)
    r.color_ramp.elements[0].position = 0.3; r.color_ramp.elements[1].position = 0.75
    nt.links.new(n.outputs["Fac"], r.inputs["Fac"]); nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump
    nt.links.new(n.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m
def obj(me, m, smooth=False):
    o = bpy.data.objects.new("p", me); sc.collection.objects.link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = smooth
    return o
def cyl(z0, h, r1, r2, m, seg=16, smooth=True):
    me = bpy.data.meshes.new("c"); bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    for v in bm.verts: v.co.z += h / 2 + z0
    bm.to_mesh(me); bm.free(); return obj(me, m, smooth)
def box(z0, h, w, m, bev=0.04):
    me = bpy.data.meshes.new("b"); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co.x *= w; v.co.y *= w; v.co.z = (v.co.z + 0.5) * h + z0
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=2, affect="EDGES")
    bm.to_mesh(me); bm.free(); return obj(me, m)

parts = []
if kind == "log":
    bark = mat("bark", (59, 41, 30), (114, 85, 65), 3.0, 0.5, (6, 6, 0.6))      # bark streaks run up the log
    end = mat("end", (150, 118, 84), (186, 152, 110), 14.0, 0.2)
    parts.append(cyl(0, H, 0.5, 0.47, bark, 18))
    parts.append(cyl(H, 0.04, 0.45, 0.43, end, 18))
elif kind == "stone":
    st = mat("stone", (82, 72, 55), (145, 129, 98), 4.0, 0.6)
    n = 6; hb = (H - 0.5) / n
    for i in range(n): parts.append(box(i * hb, hb * 0.97, 1.0 - 0.02 * (i % 2), st, 0.06))   # coursed blocks with thin joints
    parts.append(box(H - 0.5, 0.5, 1.22, st, 0.07))                                           # cap slab
else:
    red = mat("red", (59, 37, 34), (108, 63, 58), 5.0, 0.35)
    parts.append(box(0, 0.6, 1.25, red, 0.06))                    # base
    parts.append(box(0.6, H - 1.3, 1.0, red, 0.05))               # shaft
    parts.append(box(H - 0.7, 0.25, 1.15, red, 0.04))             # capital: neck
    parts.append(box(H - 0.45, 0.45, 1.3, red, 0.06))             # capital: top block

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
t = math.radians(PITCH); cam.data.type = "ORTHO"; cam.data.clip_end = 200
cam.rotation_euler = Euler((math.pi / 2 - t, 0, -math.pi / 2))
bpy.context.view_layer.update()
R = cam.matrix_world.to_3x3()
Vw = [o.matrix_world @ v.co for o in parts for v in o.data.vertices]
Vw += [Vector((x, y, 0)) for x in (-2.5, 3.5) for y in (-1.5, 8)]   # room for the cast shadow (the sun throws it right and back)
L = [R.transposed() @ p for p in Vw]
x0, x1 = min(p.x for p in L), max(p.x for p in L); y0, y1 = min(p.y for p in L), max(p.y for p in L)
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; wv, hv = (x1 - x0) * 1.04, (y1 - y0) * 1.04
cam.location = R @ Vector((cx, cy, 60)); cam.data.ortho_scale = max(wv, hv)
cam.data.sensor_fit = "VERTICAL" if hv >= wv else "HORIZONTAL"
sc.render.resolution_y = PX; sc.render.resolution_x = max(8, round(PX * wv / hv))
w = bpy.data.worlds.new("sky"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.8, 0.85, 1)
lit_render.setup(sc, cam)
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
p = os.path.join(out, name + ".png"); sc.render.filepath = p; bpy.ops.render.render(write_still=True)
lit_render.mask(sc, p)
bpy.context.view_layer.update()
def px(v): q = w2c(sc, cam, v); return [q.x * sc.render.resolution_x, (1 - q.y) * sc.render.resolution_y]
ppu = (sc.render.resolution_y if hv >= wv else sc.render.resolution_x) / cam.data.ortho_scale
# the foot is the near face's bottom (front centre: the camera looks along +X), the top the near rim of the top face
json.dump({"w": sc.render.resolution_x, "h": sc.render.resolution_y, "foot": px(Vector((-0.5, 0, 0))), "top": px(Vector((-0.5, 0, H))), "pxPerUnit": ppu},
          open(os.path.join(out, name + ".json"), "w"))
print("DONE", name)
