"""Headless Blender 5.2: render every GLB matching a pattern from the game 20° angle and the front, flat shaded.
Usage (via hid.ps1): blender -b --python render_many.py -- <dir> <glob> <mat|tex>
Writes <dir>/renders/<stem>_game.png and _front.png (512 px, Workbench), prints one TRIS line per file."""
import bpy, sys, math, os, glob
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
d, pat, mode = argv[0], argv[1], argv[2]
out = os.path.join(d, 'renders'); os.makedirs(out, exist_ok=True)
VIEWS = {'front': (0, -1, 0), 'game': (0, -math.cos(math.radians(20)), math.sin(math.radians(20)))}
for glb in sorted(glob.glob(os.path.join(d, pat))):
    stem = os.path.splitext(os.path.basename(glb))[0]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    tris = 0
    for o in meshes:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
        for p in o.data.polygons: p.use_smooth = False
        if mode != 'tex':
            m = bpy.data.materials.new('flat'); m.diffuse_color = (0.75, 0.70, 0.60, 1)
            o.data.materials.clear(); o.data.materials.append(m)
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    ctr = (lo + hi) / 2; size = max(hi - lo) * 1.15
    print('TRIS', stem, tris, 'DIMS', tuple(round(v, 3) for v in (hi - lo)), 'OBJECTS', len(meshes))
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'TEXTURE' if mode == 'tex' else 'MATERIAL'
    sc.display.shading.show_shadows = False; sc.display.shading.show_cavity = True
    sc.render.resolution_x = sc.render.resolution_y = 512; sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.9, 0.88, 0.82)
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = size
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    for name, v in VIEWS.items():
        dv = Vector(v).normalized()
        co.location = ctr + dv * size * 3
        co.rotation_euler = dv.to_track_quat('Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out, f'{stem}_{name}.png')
        bpy.ops.render.render(write_still=True)
print('RENDER_MANY_DONE')
