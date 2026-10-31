# Clothes stuck to an arm that rested on the hip in the Tripo pose (arm and hip are one surface, so no distance/normal
# rule can split them). Split by the texture instead: arm verts are skin-coloured, cloth verts are not. Cloth verts in
# the contact box that carry arm weight are marked unknown and their weights are inpainted (harmonic fill, Abdrashitov
# 2023 idea) from their cloth/torso neighbours only; edges to skin verts are cut so arm weight can't leak back in.
# Args: in.blend out.blend   Env: SIDE (Right), BOX=x0,x1,y0,y1,z0,z1 (bind world), IT (800)
import bpy, sys, os, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
body = max((o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("wpn_")), key=lambda o: len(o.data.vertices))
S = os.environ.get("SIDE", "Right"); x0, x1, y0, y1, z0, z1 = map(float, os.environ.get("BOX", "-0.30,-0.04,-0.25,0.15,0.25,0.52").split(","))
me = body.data; nv = len(me.vertices); M = body.matrix_world
img = next(n.image for m in me.materials if m for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image)
TW, TH = img.size; px = np.array(img.pixels[:]).reshape(TH, TW, 4)
uv = np.zeros((nv, 2)); ul = me.uv_layers.active.data
for l in me.loops: uv[l.vertex_index] = ul[l.index].uv
col = px[(uv[:, 1] % 1 * TH).astype(int).clip(0, TH - 1), (uv[:, 0] % 1 * TW).astype(int).clip(0, TW - 1), :3]
skin = (col[:, 0] > 0.6) & (col[:, 1] > 0.35) & (col[:, 1] < 0.65) & (col[:, 2] > 0.25)  # tan skin, not white tunic / brown belt
from mathutils.geometry import intersect_point_line
arm_o = next(o for o in bpy.data.objects if o.type == "ARMATURE"); BP = lambda n: arm_o.matrix_world @ arm_o.data.bones["mixamorig:" + n].head_local
el, wr = BP(f"{S}ForeArm"), BP(f"{S}Hand"); tip = wr + (wr - el).normalized() * 0.09
def dseg(p, a_, b_):
    q, t = intersect_point_line(p, a_, b_); t = min(1, max(0, t)); return (p - (a_ + (b_ - a_) * t)).length
RS = float(os.environ.get("RS", "0.06"))  # skin further than this from the forearm/hand line is texture bleed on the hip
skin &= np.array([min(dseg(M @ v.co, el, wr), dseg(M @ v.co, wr, tip)) < RS or (M @ v.co).z > el.z for v in me.vertices])
names = [g.name for g in body.vertex_groups]; Wt = np.zeros((nv, len(names))); W0 = None
for v in me.vertices:
    for g in v.groups: Wt[v.index, g.group] = g.weight
arm = [i for i, n in enumerate(names) if n.startswith(f"mixamorig:{S}") and any(s in n for s in ("Shoulder", "Arm", "Hand"))]
P = np.array([M @ v.co for v in me.vertices]); inb = (P[:, 0] > x0) & (P[:, 0] < x1) & (P[:, 1] > y0) & (P[:, 1] < y1) & (P[:, 2] > z0) & (P[:, 2] < z1)
MXU = float(os.environ.get("MXU", "9"))  # cloth this arm-heavy is the sleeve: it stays on the arm (joins the skin set)
sleeve = inb & ~skin & (Wt[:, arm].sum(1) >= MXU); skin |= sleeve
RU = float(os.environ.get("RU", "0.05"))  # cloth this close to the upper-arm bone is the sleeve (white spikes at full draw otherwise)
sh_ = BP(f"{S}Arm"); skin |= np.array([dseg(M @ v.co, sh_, el) < RU for v in me.vertices]) & inb
U = inb & ~skin & (Wt[:, arm].sum(1) > 0.01)
E = np.array([e.vertices[:] for e in me.edges]); E = E[~(skin[E[:, 0]] | skin[E[:, 1]]) | ~(U[E[:, 0]] | U[E[:, 1]])]  # cut cloth<->skin
W0 = Wt.copy(); Wt[U] = 0
deg = np.bincount(E.ravel(), minlength=nv).astype(float); ui = np.where(U)[0]
for _ in range(int(os.environ.get("IT", "800"))):  # Jacobi harmonic fill, known verts fixed
    acc = np.zeros_like(Wt); np.add.at(acc, E[:, 0], Wt[E[:, 1]]); np.add.at(acc, E[:, 1], Wt[E[:, 0]])
    Wt[ui] = acc[ui] / np.maximum(deg[ui], 1)[:, None]
Wt[np.ix_(ui, arm)] = 0; s = Wt[ui].sum(1, keepdims=True); Wt[ui] = np.where(s > 1e-6, Wt[ui] / np.maximum(s, 1e-6), W0[ui])  # unreached keeps its own weights, never none
K = np.where(inb & skin & (Wt[:, arm].sum(1) > 0.01))[0]  # skin in the box is the arm: drop its hip/leg share (else skin webs)
na = [j for j in range(len(names)) if j not in arm]; Wt[np.ix_(K, na)] = 0; Wt[K] /= Wt[K].sum(1, keepdims=True)
G = body.vertex_groups
for i in np.concatenate([ui, K]):
    for j, n in enumerate(names):
        if Wt[i, j] > 1e-4: G[j].add([int(i)], float(Wt[i, j]), "REPLACE")
        else: G[j].remove([int(i)])
import bmesh  # cut the surface where arm skin meets the cloth it rested on: a shared edge must stretch, a cut one doesn't
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); Ks = set(K.tolist()); Us = set(ui.tolist())
cut = [e for e in bm.edges if (e.verts[0].index in Ks and e.verts[1].index in Us) or (e.verts[1].index in Ks and e.verts[0].index in Us)]
bridge = list({f for e in cut for f in e.link_faces})  # faces spanning arm and cloth: delete the bridge strip itself
if os.environ.get("CUT", "1") == "1": bmesh.ops.delete(bm, geom=bridge, context="FACES_ONLY")
bm.to_mesh(me); bm.free(); print("CUT", len(cut), "edges,", len(bridge), "bridge faces")
print("INPAINT", len(ui), "cloth verts,", int(skin[inb].sum()), "skin verts kept on the arm,", int((s < 1e-6).sum()), "unreached")
bpy.ops.wm.save_as_mainfile(filepath=a[1])

