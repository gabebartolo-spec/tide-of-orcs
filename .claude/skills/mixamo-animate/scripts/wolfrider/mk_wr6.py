# mk_wr6.py: build_wr5.py -> build_wr6.py (director 2026-11-01: "just have the orc sit calmly"; rider bones hold rest pose, only the wolf animates)
src=open("build_wr5.py",encoding="utf-8").read()
def rep(a,b):
    global src; assert src.count(a)==1,(src.count(a),a); src=src.replace(a,b)
rep(r'wolfrider_anim5.blend', r'wolfrider_anim6.blend')
rep('# build_wr.py: Tripo wolf-rider rig + Quaternius Wolf "Attack" (wolf bones) + Mixamo "Sitting Angry" mirrored (rider bones)',
    '# build_wr6.py: Tripo wolf-rider rig + Quaternius Wolf "Attack" (wolf bones); rider bones hold rest pose (orc sits calmly, rides on Spine_2)')
# rider bones: no retarget, rest pose (chain) -> the orc is rigid relative to the wolf's back
rep("        elif b.name in RMAP: src,samp,mir,scale,root=RMAP[b.name],rider_s,True,RSCALE,b.name=='R_Hips'\n",
    "        elif b.name in RMAP: src=None   # v6: orc sits calmly, no rider retarget\n")
open("build_wr6.py","w",encoding="utf-8").write(src); print("wrote build_wr6.py")
