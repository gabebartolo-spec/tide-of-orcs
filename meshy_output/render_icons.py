"""Headless Blender 5.2: render approved GLBs as satchel icons (transparent PNG) and optional turntable frames.
Usage (via hid.ps1): blender -b --python render_icons.py -- <dir> <out> <px> <frames> stem1 stem2 ...
frames=1 writes <out>/<stem>.png from a 3/4 icon angle; frames>1 writes <out>/<stem>_tNN.png around Z."""
import bpy, sys, math, os
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index('--') + 1:]
d, out, px, frames, stems = argv[0], argv[1], int(argv[2]), int(argv[3]), argv[4:]
os.makedirs(out, exist_ok=True)
for stem in stems:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(d, stem + '.glb'))
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in meshes:
        for p in o.data.polygons: p.use_smooth = False
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    ctr = (lo + hi) / 2; size = max(hi - lo) * 1.12
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'TEXTURE'
    sc.display.shading.show_shadows = False; sc.display.shading.show_cavity = True
    sc.render.resolution_x = sc.render.resolution_y = px; sc.render.film_transparent = True
    sc.render.image_settings.color_mode = 'RGBA'
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = size
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    verts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    def view(yaw):
        return Vector((math.sin(yaw) * math.cos(math.radians(25)), -math.cos(yaw) * math.cos(math.radians(25)), math.sin(math.radians(25))))
    def spread(yaw):  # projected width across the camera's right axis
        r = Vector((math.cos(yaw), math.sin(yaw), 0))
        xs = [r.dot(v) for v in verts]; return max(xs) - min(xs)
    best = max((math.radians(a) for a in range(0, 180, 10)), key=spread)
    best0 = best - math.radians(35) if spread(best - math.radians(35)) > 0.8 * spread(best) else best
    tall = (hi.z - lo.z) > 2.2 * spread(best0)
    for f in range(frames):
        yaw = best0 + (2 * math.pi * f / frames if frames > 1 else 0)
        dv = view(yaw)
        co.location = ctr + dv * size * 3
        q = dv.to_track_quat('Z', 'Y')
        if tall:  # long thin items (bows) lie on the diagonal so they fill the square
            q = q @ Matrix.Rotation(math.radians(-45), 4, 'Z').to_quaternion()
            cam.ortho_scale = size * 0.78
        co.rotation_euler = q.to_euler()
        name = f'{stem}.png' if frames == 1 else f'{stem}_t{f:02d}.png'
        sc.render.filepath = os.path.join(out, name)
        bpy.ops.render.render(write_still=True)
    print('ICON', stem, frames)
print('RENDER_ICONS_DONE')
