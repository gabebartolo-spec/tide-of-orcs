# render_rider_rest.py <blend> <out.png> : the wolf rider in its rest pose (wolf level, rider seated), field camera, mirrored
# to face screen-right like render_wr_sheet.py. Env MASK=1 paints every face whose verts carry rider (R_*) weight pure red
# and the rest pure blue (emission, no light), so the 2D cut knows which pixels are the orc.
import bpy, math, sys, os
import numpy as np
from mathutils import Vector, Euler
a = sys.argv[sys.argv.index("--") + 1:]
BLEND, OUT = a[0], a[1]
RES = int(os.environ.get("RES", "512")); ORTHO = float(os.environ.get("ORTHO", "1.4"))
T = math.radians(20); D = 3.7; C = Vector((0, 0, 0.5))
bpy.ops.wm.open_mainfile(filepath=BLEND)
sc = bpy.context.scene
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o, do_unlink=True)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = ORTHO
cam.location = C + Vector((0, D * math.cos(T), D * math.sin(T))); cam.rotation_euler = Euler((math.pi / 2 - T, 0, math.pi))
def sun(name, d, energy, color):
    L = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); sc.collection.objects.link(L); L.data.energy = energy; L.data.color = color
    L.rotation_euler = Vector(d).normalized().to_track_quat('-Z', 'Y').to_euler()
sun("sun", (-0.60, 0.22, -0.77), 3.5, (1, 0.93, 0.8)); sun("rim", (-0.82, 0.30, -0.5), 1.5, (0.8, 0.85, 1))
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.6, 0.65, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
sc.view_settings.view_transform = "Standard"; sc.eevee.taa_render_samples = 32
sc.render.resolution_x = sc.render.resolution_y = RES; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
for mt in bpy.data.materials:
    if mt.use_nodes:
        for nd in mt.node_tree.nodes:
            if nd.type == "BSDF_PRINCIPLED": nd.inputs["Roughness"].default_value = 1.0; nd.inputs["Metallic"].default_value = 0.0
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
arm.data.pose_position = 'REST'
if os.environ.get("MASK") == "1":
    sc.eevee.taa_render_samples = 1; sc.render.filter_size = 0.0
    def emit(name, col):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        e = nt.nodes.new("ShaderNodeEmission"); e.inputs[0].default_value = col; o = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(e.outputs[0], o.inputs[0]); return m
    red, blue = emit("rider", (1, 0, 0, 1)), emit("wolf", (0, 0, 1, 1))
    for ob in [o for o in bpy.data.objects if o.type == 'MESH' and o.visible_get()]:
        me = ob.data; rg = {g.index for g in ob.vertex_groups if g.name.startswith("R_")}
        rv = np.zeros(len(me.vertices))
        for v in me.vertices: rv[v.index] = sum(g.weight for g in v.groups if g.group in rg)
        me.materials.clear(); me.materials.append(blue); me.materials.append(red)
        for p in me.polygons: p.material_index = 1 if max(rv[i] for i in p.vertices) > 0.5 else 0
sc.render.filepath = OUT; bpy.ops.render.render(write_still=True)
img = bpy.data.images.load(OUT); px = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)[:, ::-1, :]
img.pixels.foreach_set(px.ravel()); img.filepath_raw = OUT; img.file_format = 'PNG'; img.save()
print("RIDER", OUT)
