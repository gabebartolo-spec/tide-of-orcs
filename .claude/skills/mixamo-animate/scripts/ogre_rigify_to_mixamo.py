# TB-228: Rigify ogre -> clean blend with a Mixamo-named skeleton (weights merged from DEF-*), own paint relinked, loincloth, club wpn_club.
import bpy, sys, bmesh
from mathutils import Vector, Matrix
out = sys.argv[sys.argv.index('--') + 1]
S = 0.6; SM = Matrix.Scale(S, 4)
A = bpy.data.objects['Ogre']; A.data.pose_position = 'REST'; bpy.context.view_layer.update()
D = {b.name: (A.matrix_world @ b.head_local, A.matrix_world @ b.tail_local) for b in A.data.bones if b.use_deform}
H = lambda n: D['DEF-' + n][0] * S
T = lambda n: D['DEF-' + n][1] * S
# bone: (head, tail, parent, source DEF groups)
B = {}
ribm = (H('ribs') + T('ribs')) / 2
hip = Vector((0, (H('thigh.L.01').y), H('thigh.L.01').z))
B['Hips'] = (hip, H('spine'), None, ['hips'])
B['Spine'] = (H('spine'), H('ribs'), 'Hips', ['spine'])
B['Spine1'] = (H('ribs'), ribm, 'Spine', [])
B['Spine2'] = (ribm, T('ribs'), 'Spine1', [])
B['Neck'] = (H('neck'), H('head'), 'Spine2', ['neck'])
B['Head'] = (H('head'), T('head'), 'Neck', ['head'])
for L, s in (('Left', 'L'), ('Right', 'R')):
    B[L + 'Shoulder'] = (H(f'shoulder.{s}'), H(f'upper_arm.{s}.01'), 'Spine2', [f'shoulder.{s}'])
    B[L + 'Arm'] = (H(f'upper_arm.{s}.01'), H(f'forearm.{s}.01'), L + 'Shoulder', [f'upper_arm.{s}.01', f'upper_arm.{s}.02'])
    B[L + 'ForeArm'] = (H(f'forearm.{s}.01'), H(f'hand.{s}'), L + 'Arm', [f'forearm.{s}.01', f'forearm.{s}.02'])
    B[L + 'Hand'] = (H(f'hand.{s}'), H(f'finger_middle.01.{s}.01'), L + 'ForeArm', [f'hand.{s}'] + [f'palm.0{i}.{s}' for i in range(1, 5)])
    for mx, rg in (('Thumb', 'thumb'), ('Index', 'finger_index'), ('Middle', 'finger_middle'), ('Ring', 'finger_ring'), ('Pinky', 'finger_pinky')):
        B[f'{L}Hand{mx}1'] = (H(f'{rg}.01.{s}.01'), H(f'{rg}.02.{s}'), L + 'Hand', [f'{rg}.01.{s}.01', f'{rg}.01.{s}.02'])
        B[f'{L}Hand{mx}2'] = (H(f'{rg}.02.{s}'), H(f'{rg}.03.{s}'), f'{L}Hand{mx}1', [f'{rg}.02.{s}'])
        B[f'{L}Hand{mx}3'] = (H(f'{rg}.03.{s}'), T(f'{rg}.03.{s}'), f'{L}Hand{mx}2', [f'{rg}.03.{s}'])
    B[L + 'UpLeg'] = (H(f'thigh.{s}.01'), H(f'shin.{s}.01'), 'Hips', [f'thigh.{s}.01', f'thigh.{s}.02'])
    B[L + 'Leg'] = (H(f'shin.{s}.01'), H(f'foot.{s}'), L + 'UpLeg', [f'shin.{s}.01', f'shin.{s}.02'])
    B[L + 'Foot'] = (H(f'foot.{s}'), H(f'toe.{s}'), L + 'Leg', [f'foot.{s}'])
    B[L + 'ToeBase'] = (H(f'toe.{s}'), T(f'toe.{s}'), L + 'Foot', [f'toe.{s}'])
src2dst = {'DEF-' + g: n for n, v in B.items() for g in v[3]}

# capture rest world matrices, then cut everything loose
keep = {n: bpy.data.objects[n] for n in ('dude', 'boneclub', 'eye.L', 'eye.R')}
W = {n: o.matrix_world.copy() for n, o in keep.items()}
dude = keep['dude']
rh, rt = D['DEF-ribs']
vw = []
names = {g.index: g.name for g in dude.vertex_groups}
missing = set()
for v in dude.data.vertices:
    w = {}
    for g in v.groups:
        n = names[g.group]
        if n == 'DEF-ribs':
            t = max(0, min(1, (W['dude'] @ v.co - rh).dot(rt - rh) / (rt - rh).length_squared)); t = t * t * (3 - 2 * t)
            w['Spine1'] = w.get('Spine1', 0) + g.weight * (1 - t); w['Spine2'] = w.get('Spine2', 0) + g.weight * t
        elif n in src2dst: w[src2dst[n]] = w.get(src2dst[n], 0) + g.weight
        elif n.startswith('DEF-'): missing.add(n)
    vw.append(w)
print('UNMAPPED', sorted(missing), 'unweighted', sum(1 for w in vw if not w))
for o in list(bpy.data.objects):
    if o.name not in keep: bpy.data.objects.remove(o)
for coll in list(bpy.data.collections):
    if not coll.objects and not coll.children: bpy.data.collections.remove(coll)
sc = bpy.context.scene
arm = bpy.data.objects.new('Armature', bpy.data.armatures.new('Armature')); sc.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
for n, (h, t, p, _) in B.items():
    e = arm.data.edit_bones.new('mixamorig:' + n); e.head, e.tail = h, t
    if (t - h).length < 1e-4: e.tail = h + Vector((0, 0, .02))
for n, (_, _, p, _) in B.items():
    if p: arm.data.edit_bones['mixamorig:' + n].parent = arm.data.edit_bones['mixamorig:' + p]
bpy.ops.object.mode_set(mode='OBJECT')

def bake(o, world):
    if o.users_collection == (): sc.collection.objects.link(o)
    o.parent = None; m = SM @ world; o.data = o.data.copy(); o.data.transform(m)
    if m.determinant() < 0: o.data.flip_normals()
    o.matrix_world = Matrix.Identity(4)
for m in list(dude.modifiers):
    if m.type in {'PARTICLE_SYSTEM', 'ARMATURE'}: dude.modifiers.remove(m)
for n, o in keep.items(): bake(o, W[n])
for m in keep.values():
    for x in list(m.modifiers):
        if x.type == 'SUBSURF': x.levels = x.render_levels = 1
dude.vertex_groups.clear()
for n in B: dude.vertex_groups.new(name='mixamorig:' + n)
for v, w in zip(dude.data.vertices, vw):
    tot = sum(w.values()) or 1
    for n, x in w.items():
        if x > 1e-3: dude.vertex_groups['mixamorig:' + n].add([v.index], x / tot, 'REPLACE')
def rigid(o, bone):
    o.vertex_groups.clear(); g = o.vertex_groups.new(name='mixamorig:' + bone); g.add([v.index for v in o.data.vertices], 1, 'REPLACE')
rigid(keep['boneclub'], 'RightHand'); rigid(keep['eye.L'], 'Head'); rigid(keep['eye.R'], 'Head')
keep['boneclub'].name = 'wpn_club'

def tex(mat, img):
    nt = mat.node_tree; b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images[img]; nt.links.new(t.outputs[0], b.inputs['Base Color'])
tex(bpy.data.materials['skin'], 'FINAL_DIFF.png')
for m in keep['boneclub'].data.materials: tex(m, 'clubdiff.png')

# loincloth: a hide wrap cut from the body surface (same weights as the skin, so it cannot clip), ragged hem, darker belt
import math
vs = [v.co.copy() for v in dude.data.vertices]
crotch = min(p.z for p in vs if abs(p.x) < .02 and abs(p.y - hip.y) < .08 and p.z > .5)
ZT = H('hips').z + .055; ZBELT = ZT - .045
def hem(c):  # front and back hang lower than the outer thigh; teeth make the rag edge
    side = min(1, abs(c.x) / .24)
    return .70 + .05 * side + .018 * math.sin(c.x * 70 + (c.y > hip.y) * 2)
bm = bmesh.new(); bm.from_mesh(dude.data); bm.verts.ensure_lookup_table()
faces = [f for f in bm.faces if hem(f.calc_center_median()) < f.calc_center_median().z < ZT and abs(f.calc_center_median().x) < .34]
vm = {}; P = []; F = []; FM = []; SRC = []
for f in faces:
    idx = []
    for v in f.verts:
        if v.index not in vm: vm[v.index] = len(P); P.append(tuple(v.co + v.normal * .016)); SRC.append(v.index)
        idx.append(vm[v.index])
    F.append(idx); FM.append(1 if f.calc_center_median().z > ZBELT else 0)
bm.free(); print('WRAP faces', len(F), 'crotch', round(crotch, 3), 'top', round(ZT, 3))
mesh = bpy.data.meshes.new('loin'); mesh.from_pydata(P, [], F); mesh.update()
loin = bpy.data.objects.new('loincloth', mesh); sc.collection.objects.link(loin)
for nm, col in (('hide', (.085, .05, .022, 1)), ('belt', (.03, .017, .008, 1))):
    mt = bpy.data.materials.new(nm); mt.use_nodes = True; b_ = mt.node_tree.nodes['Principled BSDF']; b_.inputs['Base Color'].default_value = col; b_.inputs['Roughness'].default_value = .95; mesh.materials.append(mt)
for p_, m_ in zip(mesh.polygons, FM): p_.material_index = m_; p_.use_smooth = True
for n in B: loin.vertex_groups.new(name='mixamorig:' + n)
for i, si in enumerate(SRC):
    w = vw[si]; tot = sum(w.values()) or 1
    for n, x in w.items():
        if x > 1e-3: loin.vertex_groups['mixamorig:' + n].add([i], x / tot, 'REPLACE')
sol = loin.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = .012; sol.offset = 1
ss_ = loin.modifiers.new('Subsurf', 'SUBSURF'); ss_.levels = ss_.render_levels = 1
for o in list(keep.values()) + [loin]:
    o.parent = arm; md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
    # armature first, so subsurf smooths the deformed shape
    while o.modifiers[0] != md: bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_move_up(modifier=md.name)
for w_ in ('FINAL_DIFF.png', 'clubdiff.png'): print('PACKED', w_, bool(bpy.data.images[w_].packed_file))
sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.file_format = 'PNG'; sc.render.resolution_percentage = 100; sc.render.use_compositing = False; sc.render.use_sequencer = False
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print('SAVED', out, 'bones', len(arm.data.bones))
