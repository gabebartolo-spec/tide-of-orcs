# mk_wr5.py: build_wr4.py -> build_wr5.py (hand bone at the real fist centre, whole fist rider-owned, hard arm/torso seam)
src=open("build_wr4.py",encoding="utf-8").read()
def rep(a,b):
    global src; assert src.count(a)==1,(src.count(a),a); src=src.replace(a,b)
rep(r'wolfrider_anim4.blend', r'wolfrider_anim5.blend')
# 1. the fist is centred on the spear axis (y~0.05 at z 0.53), not at y 0.11 where v1-v4 put the hand bone
rep(" 'R_LForeArm':((-0.03,0.12,0.50),(0.14,0.11,0.53),'R_LArm'),", " 'R_LForeArm':((-0.03,0.12,0.50),(0.135,0.06,0.53),'R_LArm'),")
rep(" 'R_LHand':((0.14,0.11,0.53),(0.17,0.11,0.535),'R_LForeArm'),", " 'R_LHand':((0.135,0.06,0.53),(0.17,0.055,0.535),'R_LForeArm'),")
# 2. the fist spans z 0.52..0.58 within 0.065 of the axis; the old z>0.56 clause left its lower half to the wolf mane rule
rep("    if p.z>0.56 and -0.06<along(p)<0.12 and linedist(p)<0.07: return True",
    "    if p.z>0.515 and -0.10<along(p)<0.12 and linedist(p)<0.065: return True")
# 3. shed belly verts go to the spine, not the shoulder
rep('RMAX={"R_LArm":0.075,"R_LForeArm":0.055,"R_LHand":0.075,"R_RArm":0.075,"R_RForeArm":0.055,"R_RHand":0.075}',
    'RMAX={"R_LArm":0.075,"R_LForeArm":0.055,"R_LHand":0.075,"R_RArm":0.075,"R_RForeArm":0.055,"R_RHand":0.075,"R_LShoulder":0.10,"R_RShoulder":0.10}')
# 4. hard seam: a vert never blends a lower-arm bone with a torso bone (blends there become ribbons; a hard seam cuts instead)
rep("    W=W2\nassign={}",
    "    W=W2\n"
    "_LOW={'R_LForeArm','R_LHand','R_RForeArm','R_RHand'}; _ARM=_LOW|{'R_LArm','R_RArm'}; _purged=0\n"
    "for i in candset:\n"
    "    o=max(W[i],key=W[i].get)\n"
    "    keep={n:w for n,w in W[i].items() if (n in _ARM)==(o in _ARM)} if (o in _LOW or o not in _ARM) else W[i]\n"
    "    if len(keep)<len(W[i]): _purged+=1; s_=sum(keep.values()); W[i]={n:w/s_ for n,w in keep.items()}\n"
    "print('SEAM purged', _purged)\n"
    "assign={}")
open("build_wr5.py","w",encoding="utf-8").write(src); print("wrote build_wr5.py")
