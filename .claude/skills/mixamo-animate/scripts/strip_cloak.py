# Cloak lifting as a flat sheet with the draw arm: cloak verts carry arm weight. Find them by texture colour (teal), move
# their arm-chain weight to Spine2, keep a light share only near the shoulder (collar), then add Corrective Smooth on
# those verts so the hand-over doesn't crease. Args: in.blend out.blend   Env: SIDE (Right), C0/C1 collar fade (0.05/0.15 m)
import bpy, sys, os, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
body = max((o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("wpn_")), key=lambda o: len(o.data.vertices))
S = os.environ.get("SIDE", "Right"); C0, C1 = float(os.environ.get("C0", "0.05")), float(os.environ.get("C1", "0.15"))
me = body.data; nv = len(me.vertices); M = body.matrix_world
img = next(n.image for m in me.materials if m for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image)
TW, TH = img.size; px = np.array(img.pixels[:]).reshape(TH, TW, 4)
uv = np.zeros((nv, 2)); ul = me.uv_layers.active.data
for l in me.loops: uv[l.vertex_index] = ul[l.index].uv
col = px[(uv[:, 1] % 1 * TH).astype(int).clip(0, TH - 1), (uv[:, 0] % 1 * TW).astype(int).clip(0, TW - 1), :3]
teal = (col[:, 0] < 0.25) & (col[:, 1] > 0.3) & (col[:, 2] > 0.3)
arm_o = next(o for o in bpy.data.objects if o.type == "ARMATURE"); sh = arm_o.matrix_world @ arm_o.data.bones[f"mixamorig:{S}Arm"].head_local
G = body.vertex_groups; gi = {g.index: g.name for g in G}
chain = {n for n in gi.values() if n.startswith(f"mixamorig:{S}") and any(s in n for s in ("Arm", "Hand"))}
sp = G.get("mixamorig:Spine2") or G.new(name="mixamorig:Spine2"); cg = G.new(name="cloak_cs"); n = 0
for v in me.vertices:
    if not teal[v.index]: continue
    ws = {gi[g.group]: g.weight for g in v.groups}; m = sum(ws.get(c, 0) for c in chain)
    if m < 0.01: continue
    d = ((M @ v.co) - sh).length; k = min(1, max(0, (d - C0) / (C1 - C0)))  # 0 at the shoulder (collar keeps it), 1 past C1
    for c in chain:
        if c in ws: G[c].add([v.index], ws[c] * (1 - k), "REPLACE")
    sp.add([v.index], ws.get("mixamorig:Spine2", 0) + m * k, "REPLACE"); cg.add([v.index], 1.0, "REPLACE"); n += 1
cs = body.modifiers.new("CloakSmooth", "CORRECTIVE_SMOOTH"); cs.vertex_group = "cloak_cs"; cs.rest_source = "ORCO"; cs.iterations = 10
print("CLOAK", n, "verts off the arm,", int(teal.sum()), "teal verts")
bpy.ops.wm.save_as_mainfile(filepath=a[1])
