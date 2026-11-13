# TB-259 painted ground: the meadow lit by the actors' sun (lit_render.py / apply_anim LIT), baked top-down to one image.
# Painterly scale, not grass noise: gentle swells the low sun models into light and shade, soft colour drifts from the palette's
# plain tokens, worn earth, and sparse low-poly tufts that cast soft shadows (blade-level grass baked as pixel noise, test3).
# Usage: blender -b --factory-startup --python bake_ground.py -- <out.png>
# env: PXU (px per field unit, 2.4), X0 X1 Y0 Y1 (field-unit region, -140 1040 100 490), SAMPLES (64), SUNE (3.2), SUNEL (sun
#      elevation deg, 38), AMB (0.65), SWELL (swell height m, 0.35), SWELLS (swell noise scale, 0.08), TUFTS (tufts per m2, 1.2),
#      TH (tuft height m, 0.32), SEED (7). One field unit = 5 cm (the elf, 36 units tall, is 1.8 m). Field y grows down; Blender Y = -y.
import bpy, sys, os, math, mathutils
E = os.environ.get
out = sys.argv[sys.argv.index('--') + 1]
U = 0.05; PXU = float(E('PXU', '2.4'))
X0, X1, Y0, Y1 = (float(E(k, d)) for k, d in (('X0', '-140'), ('X1', '1040'), ('Y0', '100'), ('Y1', '490')))
W, H = (X1 - X0) * U, (Y1 - Y0) * U; cx, cy = (X0 + X1) / 2 * U, -(Y0 + Y1) / 2 * U
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def lin(h):  # sRGB hex -> linear rgba
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]


PAL = dict(plain='#7c9676', lush='#728d6c', sun='#8eab7b', worn='#8e9a72', bare='#a09c80')  # palette.ts plain* tokens
SEED = float(E('SEED', '7'))

# ground grid (a margin past the region so tufts at the edge still cast in), swells displaced in geometry nodes
M = 4.0
bpy.ops.mesh.primitive_grid_add(x_subdivisions=int((W + M) * 4), y_subdivisions=int((H + M) * 4), size=1, location=(cx, cy, 0))
gnd = bpy.context.object; gnd.scale = (W + M, H + M, 1); bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.shade_smooth()


def noise_n(N, L, pos, scale, w, detail=3.0, rough=0.5):
    n = N.new('ShaderNodeTexNoise'); n.noise_dimensions = '4D'; n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough; n.inputs['W'].default_value = w; L.new(pos, n.inputs['Vector']); return n


def ground_mat():
    m = bpy.data.materials.new('ground'); m.use_nodes = True; N = m.node_tree.nodes; L = m.node_tree.links
    bs = N['Principled BSDF']; bs.inputs['Roughness'].default_value = 1.0
    p = N.new('ShaderNodeNewGeometry').outputs['Position']

    def ramp(src, stops):
        r = N.new('ShaderNodeValToRGB'); e = r.color_ramp; e.interpolation = 'EASE'
        for i, (q, c) in enumerate(stops):
            el = e.elements[i] if i < 2 else e.elements.new(q); el.position = q; el.color = c
        L.new(src.outputs['Fac'], r.inputs['Fac']); return r.outputs['Color']

    def mix(a, b, fac):
        x = N.new('ShaderNodeMix'); x.data_type = 'RGBA'
        for s_, v in ((x.inputs[6], a), (x.inputs[7], b)):
            if isinstance(v, list): s_.default_value = v
            else: L.new(v, s_)
        L.new(fac, x.inputs['Factor'])
        return x.outputs[2]

    big = noise_n(N, L, p, 0.06, SEED + 1.3, 3, 0.45); mid = noise_n(N, L, p, 0.22, SEED + 7.1, 2, 0.5)
    wear = noise_n(N, L, p, 0.09, SEED + 3.7, 3, 0.5); fine = noise_n(N, L, p, 1.6, SEED + 5.5, 2, 0.5)
    col = ramp(big, [(0.36, lin(PAL['lush'])), (0.64, lin(PAL['sun'])), (0.5, lin(PAL['plain']))])
    col = mix(col, lin(PAL['lush']), ramp(mid, [(0.5, (0, 0, 0, 1)), (0.72, (0.5, 0.5, 0.5, 1))]))
    col = mix(col, lin(PAL['worn']), ramp(wear, [(0.52, (0, 0, 0, 1)), (0.6, (1, 1, 1, 1))]))
    col = mix(col, lin(PAL['bare']), ramp(wear, [(0.6, (0, 0, 0, 1)), (0.66, (1, 1, 1, 1))]))
    col = mix(col, lin(PAL['lush']), ramp(fine, [(0.45, (0, 0, 0, 1)), (0.7, (0.3, 0.3, 0.3, 1))]))  # a dab texture, brush scale
    L.new(col, bs.inputs['Base Color']); return m


def tuft_mat():
    m = bpy.data.materials.new('tuft'); m.use_nodes = True; N = m.node_tree.nodes; L = m.node_tree.links
    bs = N['Principled BSDF']; bs.inputs['Roughness'].default_value = 1.0
    uv = N.new('ShaderNodeUVMap'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(uv.outputs['UV'], sep.inputs['Vector'])
    x = N.new('ShaderNodeMix'); x.data_type = 'RGBA'; x.inputs[6].default_value = lin(PAL['lush']); x.inputs[7].default_value = lin(PAL['sun'])
    L.new(sep.outputs['Y'], x.inputs['Factor']); L.new(x.outputs[2], bs.inputs['Base Color']); return m


gnd.data.materials.append(ground_mat())

# one tuft: 7 flat tapered blades fanned from a point, uv v up the blade (base lush, tip sunlit), flat shaded
TH = float(E('TH', '0.32')); verts, faces, uvs = [], [], []
for i in range(7):
    a = i / 7 * 6.283 + 0.4 * (i % 2); lean = 0.55 + 0.25 * ((i * 37) % 5) / 4; h = TH * (0.7 + 0.3 * ((i * 53) % 7) / 6)
    d = mathutils.Vector((math.cos(a), math.sin(a), 0)); s = mathutils.Vector((-d.y, d.x, 0)) * 0.022
    tip = d * h * math.sin(lean) + mathutils.Vector((0, 0, h * math.cos(lean)))
    b = len(verts); verts += [-s, s, tip]; faces.append((b, b + 1, b + 2)); uvs += [(0, 0), (1, 0), (0.5, 1)]
tm = bpy.data.meshes.new('tuft'); tm.from_pydata([tuple(v) for v in verts], [], faces); uvl = tm.uv_layers.new()
for poly in tm.polygons:
    for li in poly.loop_indices: uvl.data[li].uv = uvs[tm.loops[li].vertex_index]
tm.materials.append(tuft_mat()); tuft = bpy.data.objects.new('tuft', tm); sc.collection.objects.link(tuft); tuft.hide_render = True

mod = gnd.modifiers.new('meadow', 'NODES'); ng = bpy.data.node_groups.new('meadow', 'GeometryNodeTree'); mod.node_group = ng
ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
N = ng.nodes; L = ng.links; gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput'); pos = N.new('GeometryNodeInputPosition').outputs['Position']
sw = noise_n(N, L, pos, float(E('SWELLS', '0.08')), SEED + 9.2, 2, 0.4)
sm = N.new('ShaderNodeMath'); sm.operation = 'MULTIPLY_ADD'; L.new(sw.outputs['Fac'], sm.inputs[0]); sm.inputs[1].default_value = float(E('SWELL', '0.35')) * 2; sm.inputs[2].default_value = -float(E('SWELL', '0.35'))
cz = N.new('ShaderNodeCombineXYZ'); L.new(sm.outputs[0], cz.inputs['Z'])
sp = N.new('GeometryNodeSetPosition'); L.new(gi.outputs[0], sp.inputs['Geometry']); L.new(cz.outputs[0], sp.inputs['Offset'])
# tufts: clustered by a noise mask, none on the worn earth
ds = N.new('GeometryNodeDistributePointsOnFaces'); ds.inputs['Density'].default_value = float(E('TUFTS', '1.2')); ds.inputs['Seed'].default_value = int(SEED)
L.new(sp.outputs[0], ds.inputs['Mesh'])
cl = noise_n(N, L, pos, 0.25, SEED + 4.4, 2, 0.5); wr = noise_n(N, L, pos, 0.09, SEED + 3.7, 3, 0.5)
c1 = N.new('FunctionNodeCompare'); c1.data_type = 'FLOAT'; c1.operation = 'GREATER_THAN'; L.new(cl.outputs['Fac'], c1.inputs[0]); c1.inputs[1].default_value = 0.5
c2 = N.new('FunctionNodeCompare'); c2.data_type = 'FLOAT'; c2.operation = 'LESS_THAN'; L.new(wr.outputs['Fac'], c2.inputs[0]); c2.inputs[1].default_value = 0.52
an = N.new('FunctionNodeBooleanMath'); an.operation = 'AND'; L.new(c1.outputs[0], an.inputs[0]); L.new(c2.outputs[0], an.inputs[1])
oi = N.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = tuft
rr = N.new('FunctionNodeRandomValue'); rr.data_type = 'FLOAT_VECTOR'; rr.inputs['Min'].default_value = (-0.15, -0.15, 0); rr.inputs['Max'].default_value = (0.15, 0.15, 6.283)
rs = N.new('FunctionNodeRandomValue'); rs.data_type = 'FLOAT'; rs.inputs['Min'].default_value = 0.6; rs.inputs['Max'].default_value = 1.4
ip = N.new('GeometryNodeInstanceOnPoints'); L.new(ds.outputs['Points'], ip.inputs['Points']); L.new(oi.outputs['Geometry'], ip.inputs['Instance'])
L.new(an.outputs[0], ip.inputs['Selection']); L.new(rr.outputs[0], ip.inputs['Rotation']); L.new(rs.outputs[0], ip.inputs['Scale'])
jn = N.new('GeometryNodeJoinGeometry'); L.new(ip.outputs['Instances'], jn.inputs[0]); L.new(sp.outputs[0], jn.inputs[0]); L.new(jn.outputs[0], go.inputs[0])

# sun: from the upper left of the screen, as the actors' (their cast shadows fall right and a little down)
el = math.radians(float(E('SUNEL', '38'))); sd = mathutils.Vector((1.0, -0.45, 0)).normalized()
d = mathutils.Vector((sd.x * math.cos(el), sd.y * math.cos(el), -math.sin(el)))
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
sun.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); sun.data.energy = float(E('SUNE', '3.2')); sun.data.angle = 0.14; sun.data.color = (1, 0.95, 0.85)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = float(E('AMB', '0.65'))

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = W; cam.location = (cx, cy, 20); cam.data.clip_end = 100
sc.render.resolution_x = round((X1 - X0) * PXU); sc.render.resolution_y = round((Y1 - Y0) * PXU); sc.render.resolution_percentage = 100
sc.render.engine = 'CYCLES'; sc.cycles.samples = int(E('SAMPLES', '64')); sc.cycles.use_denoising = True; sc.cycles.device = 'GPU'
sc.view_settings.view_transform = 'Standard'; sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = out
prefs = bpy.context.preferences.addons['cycles'].preferences
for t in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
    try:
        prefs.compute_device_type = t; prefs.get_devices(); break
    except Exception:
        pass
for dv in prefs.devices: dv.use = True
bpy.ops.render.render(write_still=True)
print('BAKED', out, sc.render.resolution_x, sc.render.resolution_y)
