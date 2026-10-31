# mk_wr3.py: build_wr3.py = build_wr2.py + (a) arm bones pre-rotated so frame 0 matches the clip's frame 0 directions
# (the mesh's elbow starts ~95 deg bent, the clip's 47 deg: world deltas carried that 48 deg fold through every frame),
# (b) sharp weights: WSIG 0.006, WSMOOTH 1 (0.02 / 4 blended the whole arm into a rubber tube).
import io
s=io.open("build_wr2.py",encoding="utf-8").read()
def rep(a,b):
    global s; assert a in s, a; s=s.replace(a,b)
rep(r'wolfrider_anim2.blend', r'wolfrider_anim3.blend')
rep('os.environ.get("WSIG","0.02")','os.environ.get("WSIG","0.006")')
rep('os.environ.get("WSMOOTH","4")','os.environ.get("WSMOOTH","1")')
rep('prevq={}\n', '''prevq={}
PREB=os.environ.get("PREB","R_LArm,R_LForeArm,R_LHand").split(",")
PRE={}
for n in PREB:
    src=RMAP[n]; b=arm.data.bones[n]
    mix0=YAW@(SX@(rider_s[0][0][src].to_matrix()@Vector((0,1,0))))
    mine=(Mw3@b.matrix_local.to_3x3().normalized())@Vector((0,1,0))
    PRE[n]=mine.normalized().rotation_difference(mix0.normalized()).to_matrix()
    print("PRE %s %.1f deg"%(n,math.degrees(PRE[n].to_quaternion().angle)))
''')
rep('Rdes=Dw@(Mw3@rest.to_3x3().normalized())','Rdes=Dw@PRE.get(b.name,Matrix.Identity(3))@(Mw3@rest.to_3x3().normalized())')
io.open("build_wr3.py","w",encoding="utf-8",newline="\n").write(s)
print("WROTE build_wr3.py")
