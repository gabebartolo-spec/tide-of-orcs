# mk_wr4.py: patch build_wr3.py -> build_wr4.py (capsule limits on arm weights + cut the fused forearm/fist contact seam)
src=open("build_wr3.py",encoding="utf-8").read()
def rep(a,b):
    global src; assert src.count(a)==1,(src.count(a),a); src=src.replace(a,b)
rep(r'wolfrider_anim3.blend', r'wolfrider_anim4.blend')
rep('SIG=float(os.environ.get("WSIG","0.006")); W={}; _unr=0',
    'SIG=float(os.environ.get("WSIG","0.006")); W={}; _unr=0\n'
    '# v4: an arm bone may only own verts inside its capsule (Tripo fused forearm->belly and fist->mane; geodesics leak through the contact)\n'
    'RMAX={"R_LArm":0.075,"R_LForeArm":0.055,"R_LHand":0.075,"R_RArm":0.075,"R_RForeArm":0.055,"R_RHand":0.075}')
rep('    ws={n:math.exp(-(d-d1)/SIG) for d,n in ds[:3] if d-d1<3*SIG}',
    '    ds=[(d,n) for d,n in ds if n not in RMAX or segd(co[i],*segs[n])<RMAX[n]] or ds; d1=ds[0][0]\n'
    '    ws={n:math.exp(-(d-d1)/SIG) for d,n in ds[:3] if d-d1<3*SIG}')
rep('rest=[v.co.copy() for v in me.vertices]\nbadE=set()',
    'rest=[v.co.copy() for v in me.vertices]\nbadE=set()\n'
    '# v4: the fused contact seam (forearm/fist against belly, strap and mane) is a rider-internal edge, but it must cut when it stretches\n'
    'own=lambda i: max(W[i],key=W[i].get) if i in W else None\n'
    'LOW={"R_LForeArm","R_LHand","R_RForeArm","R_RHand"}; ARM=LOW|{"R_LArm","R_RArm"}\n'
    'def contact(a,b):\n'
    '    oa,ob_=own(a),own(b); return ((oa in LOW)!=(ob_ in LOW)) and not (oa in ARM and ob_ in ARM)\n'
    '_ncut=0')
rep('and not (a in candset and b in candset): badE.add(e.index)',
    'and not (a in candset and b in candset and not contact(a,b)): badE.add(e.index)')
open("build_wr4.py","w",encoding="utf-8").write(src); print("wrote build_wr4.py")
