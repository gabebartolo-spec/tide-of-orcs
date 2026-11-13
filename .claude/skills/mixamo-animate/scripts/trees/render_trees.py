# TB-260: the treeline sprites lit like the actors. Renders each Handpainted Tree Pack kind (sketchfab/trees/scene.gltf, rudolfs,
# CC-BY-4.0) alone, front orthographic (no tilt: TREELINE.heights x unit is the model height), in Cycles under lit_render's sun
# (camera-space SUN, SUNE, AMB as the actors) with NOGROUND (treeline.ts draws each tree's own soft ground shadow).
# Usage: blender -b --factory-startup --python render_trees.py -- <scene.gltf> <outdir> [kinds,comma,separated]
# env: RES (512), SUNA (key sun angle rad, 0.14), SKYC (fill colour, 0.8,0.88,1), YAW (camera yaw deg around the tree, 0 = looking +Y), BUSHTILT (deg the camera looks down on the bush, 7), plus lit_render's.
# Writes <outdir>/<kind>.png (RES x RES, transparent). pack_trees.py crops and scales them into public/decor.
import bpy, sys, os, math
from mathutils import Vector
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
os.environ.setdefault('LIT', '1'); os.environ.setdefault('NOGROUND', '1')
import lit_render
E = os.environ.get
a = sys.argv[sys.argv.index('--') + 1:]
src, out = a[0], a[1]; os.makedirs(out, exist_ok=True)
KINDS = a[2].split(',') if len(a) > 2 else ['oak_green_1', 'oak_green_2', 'pine_1', 'pine_2', 'pine_3', 'spruce_2', 'spruce_3', 'bush']
RES = int(E('RES', '512'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
meshes = {o.name: o for o in sc.objects if o.type == 'MESH'}
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = 'ORTHO'
sc.render.resolution_x = sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'Standard'; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
for k in KINDS:
    obj = meshes.get(f'{k}_' + next((m.name for m in meshes[next(n for n in meshes if n.startswith(k + '_'))].data.materials), '') + '_0') or next(o for n, o in meshes.items() if n.startswith(k + '_'))
    for o in meshes.values(): o.hide_render = o is not obj
    bb = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector([min(v[i] for v in bb) for i in range(3)]); hi = Vector([max(v[i] for v in bb) for i in range(3)]); c = (lo + hi) / 2; sz = hi - lo
    tilt = math.radians(float(E('BUSHTILT', '7'))) if k == 'bush' else 0.0; yaw = math.radians(float(E('YAW', '0')))
    d = Vector((math.sin(yaw) * math.cos(tilt), math.cos(yaw) * math.cos(tilt), -math.sin(tilt)))  # view direction
    cam.location = c - d * 50; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam.data.clip_end = 200
    cam.data.ortho_scale = max(sz.x, sz.y, sz.z) * 1.08
    lit_render.setup(sc, cam)  # (re)aims the key sun in this camera's space
    # a factory world is near-black (0.05), so AMB alone barely lifts a crown's self-shadow: give the fill a sky colour (SKYC)
    bg = next(n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = [float(x) for x in E('SKYC', '0.8,0.88,1').split(',')] + [1]
    for o in sc.objects:  # SUNA: a wider sun softens the stacked leaf layers' shadow bands (lit_render's 0.14 rad striped the bush)
        if o.type == 'LIGHT' and o.data.type == 'SUN' and o.data.use_shadow: o.data.angle = float(E('SUNA', '0.14'))
    sc.render.filepath = os.path.join(out, k + '.png'); bpy.ops.render.render(write_still=True)
    print('TREE', k, [round(x, 2) for x in sz], 'ortho', round(cam.data.ortho_scale, 2))
