# Shared: SPLICE is either a token list (round 5: "171,171>180@0.2,180-190,61-110~1@0.7", grammar in toks() below) or the old
# "a:b:N" = attack plays take 173..a, then N frames that crossfade the pose held at take a into the take
# playing from b (weights k/(N+1), smoothstep; bones slerp their local basis, the cleaver keeps the take's own hand grip, slerped),
# then take b+N..231. Every pose is a take pose or a blend of two; nothing is keyed by hand.
import bpy
from mathutils import Matrix
def seq(spec, f_start=173, f_end=231):
    if ":" not in spec: return toks(spec)
    a, b, n = (int(x) for x in spec.split(":"))
    out = [("t", f) for f in range(f_start, a + 1)]
    for k in range(n):
        w = (k + 1) / (n + 1); w = w * w * (3 - 2 * w); out.append(("x", a, b + k, w))
    out += [("t", f) for f in range(b + n, f_end + 1)]
    return out
def toks(spec):
    # TB-211 round 5: SPLICE as a token list "171,171>180@0.5,180-190,190>171@0.5": take frame, take range, a blend
    # "a>b@w" (take pose a slerped toward take pose b by w; same maths as the crossfade), or an arm layer "61-110~171@0.6"
    # (take pose a, the right arm joint145 subtree slerped toward take pose b by w, the cleaver on a's own grip; upper/lower
    # body layering of two take poses). Same token grammar as probe_ogre.py.
    out = []
    for t in (x.strip() for x in spec.split(",")):
        if not t: continue
        if "~" in t:  # arm layer "a~b@w" or "a0-a1~b@w"
            rg, rest = t.split("~"); b, w = rest.split("@"); a0, a1 = (int(x) for x in rg.split("-")) if "-" in rg else (int(rg), int(rg))
            out += [("l", f, int(b), float(w)) for f in range(a0, a1 + 1)]
        elif ">" in t:
            ab, w = t.split("@"); a, b = (int(x) for x in ab.split(">")); out.append(("x", a, b, float(w)))
        elif "-" in t:
            a, b = (int(x) for x in t.split("-")); out += [("t", f) for f in range(a, b + 1)]
        else: out.append(("t", int(t)))
    return out
_REST = {}
def reset(arm, WP):
    # manual pose/grip writes persist on unkeyed channels (the weapon has no keys of its own): put the import state back first
    ad = arm.animation_data
    if not _REST: _REST["act"] = ad.action; _REST["slot"] = getattr(ad, "action_slot", None); _REST["wp"] = WP.matrix_basis.copy(); _REST["b"] = {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}
    if ad.action is None:  # the take drives the bones again
        ad.action = _REST["act"]
        if _REST["slot"] is not None: ad.action_slot = _REST["slot"]
    WP.matrix_basis = _REST["wp"]
    for pb in arm.pose.bones: pb.matrix_basis = _REST["b"][pb.name]
def snap(sc, arm, WP, HB, f):
    reset(arm, WP); sc.frame_set(f); bpy.context.view_layer.update()
    hw = arm.matrix_world @ HB.matrix
    return {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}, hw.inverted() @ WP.matrix_world
def apply(sc, arm, WP, HB, item):
    if item[0] == "t":
        reset(arm, WP); sc.frame_set(item[1]); bpy.context.view_layer.update(); return
    if item[0] == "l":
        _, a, b, w = item
        PB, _ = snap(sc, arm, WP, HB, b); PA, RA = snap(sc, arm, WP, HB, a)  # ends on frame a (root/time of a)
        AS = set(); st = [arm.pose.bones["joint145"]]
        while st: x = st.pop(); AS.add(x.name); st += list(x.children)
        arm.animation_data.action = None
        for pb in arm.pose.bones:
            if pb.name in AS:
                l1, r1, s1 = PA[pb.name].decompose(); l2, r2, s2 = PB[pb.name].decompose(); pb.matrix_basis = Matrix.LocRotScale(l1.lerp(l2, w), r1.slerp(r2, w), s1.lerp(s2, w))
            else: pb.matrix_basis = PA[pb.name]
        bpy.context.view_layer.update(); WP.matrix_world = (arm.matrix_world @ HB.matrix) @ RA; bpy.context.view_layer.update(); return
    _, a, f, w = item
    PA, RA = snap(sc, arm, WP, HB, a); PB, RB = snap(sc, arm, WP, HB, f)  # ends on frame f (root/time of B)
    def mix(m1, m2):
        l1, r1, s1 = m1.decompose(); l2, r2, s2 = m2.decompose()
        return Matrix.LocRotScale(l1.lerp(l2, w), r1.slerp(r2, w), s1.lerp(s2, w))
    # the render re-evaluates animation at the scene frame and would put take f's pose back on the bones (action
    # influence 0 does not stop it): unassign the armature's action for this frame; reset() puts it back
    arm.animation_data.action = None
    for pb in arm.pose.bones: pb.matrix_basis = mix(PA[pb.name], PB[pb.name])
    bpy.context.view_layer.update()
    WP.matrix_world = (arm.matrix_world @ HB.matrix) @ mix(RA, RB); bpy.context.view_layer.update()
