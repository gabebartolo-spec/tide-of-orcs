---
name: mixamo-animate
description: Retarget Mixamo clips onto Tripo models in headless Blender 5.2, seat a held weapon in the fist, shape the arm motion, render game-view and side frames, and build GIFs for the director. Use for any TB-068 walk/attack/idle sprite work. Update this file whenever the director corrects a result.
---

# Mixamo → Tripo animation (TB-068)

Scripts are in `scripts/`. Assets are in `C:\Users\DANTE\Documents\tide-assets` (`mixamo\` holds the clips and the GIFs sent to the director; `<unit>\` holds the rigged .blend files).
Blender: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe -b --factory-startup --python <script> -- <args>`.

## Rules (from the director; each one was learned the hard way)
1. **Copy proven motion.** Start from a Mixamo clip and take poses from it. Never invent poses, probe axes at random, or apply art rules of thumb. "An axe going level reads as a lance" is an example of an invented rule. Judge only these four things: clipping, impossible anatomy, a broken grip, and a mismatch with the reference.
2. **Show the right side.** For a held weapon, send the game view (`CAMROT=0`) and the weapon side (`CAMROT=-90` is the axe side; `90` is the plank side).
3. **Screen every frame before sending.** Build contact sheets with `sheetn.py` and look at them. Then compare the probe numbers with the previous version: if they barely changed, the change did nothing, so don't send it.
4. **Background `#7c9676`** for the GIFs, 33 ms per frame. Use only the clip's unique frames (0..N-2 for an N-frame clip; Dual Weapon Combo is 0–109).
5. **No spend without the director's written yes.** No three.js. Never enter passwords.
6. **Free downloads need no permission** (standing yes, 2026-10-31). Download any free Mixamo clip through the director's Chrome (already signed in) into `tide-assets\mixamo` without asking. Settings: FBX Binary, 30 fps, no keyframe reduction, Without Skin.

## Pipeline
1. **Grip.** `fist_hole.py` measures the hole through the closed fist in the bind pose and gives C and DIR. `fit_hole.py` (env `C`, `DIR`, `GF` grip fraction, `SCL`) seats the haft through it, edge toward the knuckles. Never aim a weapon with a world vector.
2. **Retarget.** `apply_anim.py <in.blend> <clip.fbx> <outprefix>`. Before relying on the render, check `CLIP=1` (prints the weapon/body intersection count without rendering). It must be 0.
3. **Shape the motion** with the env vars below.
4. **Probe.** `HPROBE=1` prints, per frame, the left hand | right hand | left-foot y relative to the hips (x, y, z; forward is -Y).
5. **Sheets and GIFs.** `blender ... sheetn.py -- <prefix> <sheet.png>`, then `python gifn.py <prefix> <out.gif> 33 0,1,...,32`. Pass the frame indices comma-joined; in PowerShell, `((0..32) -join ",")`.

## apply_anim env vars
| Var | Effect |
|---|---|
| `RMATCH=RightShoulder,...` | Match the rest pose for these bone substrings before retargeting |
| `SWING=bone:gain;...` | Bind pose plus the clip's swing about its mean |
| `MIRR=src>dst:gain;...` | dst keeps its mean pose plus src's swing, mirrored and phase-shifted (`MPH` frames; default half a cycle) |
| `H1=1` | MIRR: keep only the once-per-stride part of the swing (smooth) |
| `HINGE=world` | MIRR: rotate only about the body's left-right axis (a pure forward/back pendulum) |
| `FREEZE=bone,...` | Hold the clip's mean pose (kills twist and wobble from the clip) |
| `AMP=bone:gain` | Scale the clip's swing about its mean (axis-angle; slerp can't go above 1) |
| `WOFFS=bone:1,x,y,z` | Fixed local rotation offset in degrees (e.g. lower the arm, bend the wrist forward) |
| `REST=bones` | Hold the bind pose |
| `CAMROT`, `ORTHO`, `FR` | Camera yaw, ortho scale, frames to render |
| `GAMECAM=20` | The real field camera (ART-STYLE): side-on from the character's right, walking screen-right, 20° top-down. CAMROT 0 is a 45° three-quarter view, not the game angle |
| `CLIP=1`, `HPROBE=1` | Check intersections (prints `CLIP` for weapon vs body and `LFIST` for left-hand depth inside the body in cm; both must be 0) / print hand paths |
| `INPLACE=1` | With `DIRECT`: pin the hips' ground drift to frame 1 and keep their height (for clips with no Mixamo In Place box, e.g. Dual Weapon Combo) |
| `CLIPDBG=<frame>` | With CLIP: name the bones that own the hit faces at frame 0 and this frame |
| `ELBOW=1` | Print elbow bend and arm directions per side (min/mean/max, degrees; upper arm and forearm: "side" out from straight down, "fwd" forward) for the clip (`src`) and the result (`tgt`). Run it on a reference clip (e.g. Orc Walk) to get numbers to copy |
| `ARMSET=Side:side,fwd` | Turn the upper arm so its mean direction equals the reference's (keeps the swing) |
| `ELBOWSET=Side:deg` | Set the elbow bend every frame about its own hinge axis. WOFFS about a world axis barely changes a bend (±12° moved it ±3°) |
| `ARMTWIST=Side:side,fwd` | Twist the upper arm about its own axis so the mean forearm direction matches the reference (elbow hinges forward, not inward) |
| `ALIGN=Left:x,y,z;Right:x,y,z` | Two-hand weapon: every frame, turn each hand so its fist hole (rest world dir from `fist_hole_s.py`) lies along the haft `grip_r`?`grip_l` |
| `GRIP2=1` | With CLIP: the left fist is a grip too (same 12 cm / LeftHand-skinned exemption as the right) |
| `LHPROBE=x,y,z` + `PSIDE=Left/Right` | Print the angle between that fist's hole and the haft every 10 frames (must be ~0 after ALIGN) |
| `OFFS=bone:x,y,z` | Local Euler offset (deg). Only for a measured fist alignment; prefer `ALIGN` |
Older vars (`AIM`, `EDGE`, `GRIPAX`, `ABD`, `OFFS`, `DAMP`) were replaced by the grip-from-fist approach. Don't use them.

## Two-hand weapons on Tripo's own rig (elf spearman, 2026-10-31)
- **Mixamo's "unable to map your existing skeleton" is misleading**: an OBJ got it too. The cause is the posed arms (bent, touching the body). Skip the Mixamo auto-rig: export Tripo's Mixamo-preset rigged FBX (52 `mixamorig:` bones) and import with `use_anim=False` (with anim it hangs).
- **No `DIRECT` on a Tripo rig** (body leans back ~45°). Use the default world retarget with `INPLACE=1` and `RMATCH` on both arms (raw retarget aimed the spear down/backward).
- **Tripo hand bones are ~1 mm long, and the finger roots sit at the wrist.** Any grip point built from bones (`head_tail`, wrist+Middle1 midpoint) is inside the cuff. Measure both fists: `scripts/fist_hole_s.py` (env `SIDE=Left/Right`).
- **Setup**: `scripts/spear_setup.py <rig.blend> <cut.blend> <out.blend>` ? `grip_r` empty on RightHand at its hole (COPY_LOCATION), `grip_l` on LeftHand at the measured left hole (env `CL`), spear DAMPED_TRACK to `grip_l`. `GF` = grip fraction from the butt: 0.15 left a 15 cm butt that stabbed the right forearm on the raised thrust; 0.08 clears it.
- **The haft only touched each fist at a point** (46–87° off the hole), so the butt swung into the forearms. `ALIGN` per frame takes both to 0° (copies the source, where both hands hold the rifle rigidly). CLIP 0 with `GRIP2=1`; at `HANDR=0.06` the residual hits are cuffs around the fists, confirmed on close-ups.
- **Bayonet Stab raises the hands to head height on the thrust** (source hands at 1.25× hips-to-head at frame 31), so the haft across the brow is faithful, not a bug. Check the source's numbers before "fixing" a pose.

## Approved recipes
- **Grunt walk v19** (approved 2026-10-31): `scripts/walk_grunt.ps1`. Model `grunt2\grunt2u.blend` (fit_hole C=-0.2839,0.0591,0.3298 DIR=-0.135,-0.96,0.246 GF 0.15 SCL 1.4). Clip: Sword And Shield Walk. The axe arm copies the free arm's swing (MIRR ×2.8, forearm ×1) with `H1`, `MPH=2`, `HINGE=world` and `FREEZE=RightShoulder,RightHand`. The carry: `WOFFS` RightArm -17, RightForeArm +18, RightHand +20 (axe head forward and low, wrist bent forward), LeftArm -25.
  Result: the hand moves 10 cm forward and back with 0.8 cm of sideways drift. CLIP 0.

- **Grunt attack v3** (approved 2026-10-31): `scripts/attack_grunt.ps1`. Clip: Standing Melee Attack Downward, Arm-Space 100 (69 frames). WOFFS RightArm Y −45, RightHand Y +15 (clears the head in the windup); RMATCH adds LeftArm,LeftForeArm (left arm wide like the reference). CLIP 0. ORTHO 2.2. (v1 slash and v2 left-arm WOFFS rejected.)

- **Bladedancer attack v1** (approved 2026-10-31): model `elf_bladedancer\bladedancer_dagger.blend` (rig3 + `single_blade.py`, KEEP 0.03: two single daggers). Clip: Dual Weapon Combo, Arm-Space 100 (`Dual Weapon Combo AS100.fbx`, 110 unique frames 0–109). `DIRECT=1 INPLACE=1`, no offsets. CLIP never above the own-thumb baseline 193. Walk parked.

- **Elf hero attack (WIP, 2026-10-31)**: `scripts/attack_hero.ps1`. Model `elf_hero\tripo_bow3.blend` (Tripo FBX, rig from Tripo). Clip: Standing Draw Arrow (32 frames, AS50). No `DIRECT` (RMATCH only works without it), `RMATCH` shoulders/arms/forearms (not hands), `WOFFS mixamorig:LeftHand:0,1,0,90` stands the bow upright. Open: right hand clips cape/hood on the quiver reach (frames 9–13) ? re-download at higher Arm-Space.

## Bow / cloak welded into one Tripo mesh
- **Bow folds and wraps the legs** ? Tripo skinned the bow into the body mesh (pinky/thumb/leg groups; one island, so no split) ? select verts whose dominant group is a LeftHand finger bone (bow + gripping fist), add verts near the tip-to-tip line (string), set them 100% `LeftHand` (scratchpad `bowrigid.py`). The fist keeps its bind grip, which already holds the bow.
- **Cloak tears into wings/shards** ? cloak verts skinned to Arm/Shoulder ? move every Left/Right Arm/Hand/Shoulder weight on blue-hue verts to `Spine2` (`cloakfix2.py`). Shoulder (not Spine2) still left shards.
- **Bow lies along the forearm like a lance** ? bind grip axis differs from X Bot ? sweep `WOFFS` on LeftHand ±90° about world x/y/z on one frame, pick the upright one (y +90).
- `sheetn.py` needs frames 0–32: for a 32-frame clip copy frame 0 to `_32`. `WOFFS` takes the full bone name and `ax,ay,az,deg`.

- **Spearman attack v1** (approved 2026-10-31): `scripts/attack_spearman.ps1`. Clip: Bayonet Stab AS100 (99 frames). Model `elf_spearman\spearman_2h_g0.08.blend` (spear_setup.py GF 0.08, CL = left fist hole). RMATCH both arms, no DIRECT, INPLACE 1, ALIGN both fist holes, GRIP2 1, ORTHO 2.0. CLIP 0, LFIST 0.

- **Elf draw v1** (sent 2026-11-01, awaiting approval): `scripts/attack_hero.ps1`. Model `elf_hero\hero2_bow.blend` (separate Tripo bow seated by `seat_bow.py` in the left fist hole C=0.2326,-0.0526,0.3448 DIR=-0.247,-0.93,0.274). Clip: Standing Draw Arrow AS100. Env `INPLACE=1 ORTHO=1.4 RMATCH=LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm GRIPSIDE=Left BOWALIGN=-1`. CLIP 0.

## Bows (learned on the elf, 2026-11-01)
- A bow welded into the Tripo body can't be posed: generate the hero empty-fisted and the bow as its own model (Workbench render, Nano Banana edit at 0 credits, then Generate at 55).
- `GRIPSIDE=Left` so CLIP ignores the fist that holds the bow.
- No constant hand roll works: the string flips away from the archer mid-draw and the limb hits the head. `BOWALIGN=-1` turns the bow hand every frame so the limb axis stands upright, perpendicular to the full-draw arrow line, back away from the draw hand. Use the full-draw line for every frame; a per-frame line swings while the draw hand reaches back for the arrow (limb hit the thigh).
- `BOWPROBE=1` prints CANT (degrees out of the shot plane) and STR (+1 = string toward the draw hand). The reference aims upward (about 45 deg, a lob); upright means in the shot plane, not world-vertical.

- **Spearman walk v12** (sent 2026-11-01, not yet approved): `scripts/walk_spearman.ps1`. The pike "charge" (1814 drill, de Gheyn 1607 plates): HANDIK `Right:0.15,0.1,0.5` (right wrist at the hip), `SPEARIK=0.2,-20,-10` (the left fist rides the haft). Measured yaw 5–9°, elev 12–15°, CLIP 0, LFIST 0. Prove the yaw with a top-down render (`GAMECAM=89`).

- **Spearman walk v15** (superseded by v16, one-hand, spear pointing forward): `scripts/walk_spearman_1h.ps1`. Grunt v19 recipe on `elf_spearman\spearman_1h.blend`, MIRR RightArm x2.0 / forearm x1, WOFFS RightArm -5, RightForeArm +10, RightHand X +40, RightHand Z +130 (tip forward toward screen-right, level to slightly up). CLIP 0, LFIST 0.
- **Spearman walk v16** (APPROVED 2026-11-01, mid-shaft grip, free left arm; send the game view first and alone): `scripts/walk_spearman_1h.ps1`. v15 on `spearman_1h_mid.blend`, LeftArm WOFFS dropped; left arm = `SWING LeftArm:1;LeftForeArm:0` + `ARMSET Left:18.6,-15.6` + `ELBOWSET Left:37` + `ARMTWIST Left:17.1,22.7` (the Orc Walk's free arm, measured with ELBOW=1). CLIP 0, LFIST 0.

## Face copy (blank Tripo face)
`scripts/face_copy.py <src.fbx> <dst.fbx> <outdir>` bakes painted features from a source model onto the destination's base colour. Features move as a ratio to the source's skin, so the destination keeps its own skin tone. It writes `basecolor_face.png` and `face.blend` (unrigged; rig it after). Measure the boxes on `head_shot.py` renders: the framing is the same, and env YAW/FULL give other views.
- **Bladedancer** (2026-10-31): source elf spearman, `RECT=105,228,275,292 DX=65 DY=-2 SC=0.9 FEATH=10 CUT=168,226,212,250` (CUT drops the helmet nose-guard tip). The source texture paints only the eyes and brows; the nose and mouth come from the geometry.
- Tripo FBX export (Blender preset, 4k) cost no credits despite the crown icon.

## Fixes that worked (symptom → cause → fix)
- **Held "like an umbrella" by the head** → the clip carries the weapon raised → lower the arm with `WOFFS` and bend the wrist forward (head forward and low).
- **Arm only swings backward, too much** → the clip's sword arm only pulls back, so AMP made it worse → copy the free arm's swing with `MIRR` instead.
- **Arm "stirring the air" (circling)** → the shoulder and hand still played the clip's twist, and the swing axis was in the bone's frame → `FREEZE` the shoulder and hand, and `HINGE=world`. A bone-local `HINGE=1` changed nothing visible.
- **Hand 18 cm behind the hip** → rest pose mismatch → `WOFFS LeftArm -25`.
- **Weapon swings through the bulky head/torso** → X Bot is slimmer than the orc → re-download with Mixamo **Character Arm-Space** raised (grunt slash: 50→81 cut clipping from 8 frames to 2; 100 halved the remaining count).
- **Constant CLIP count on every frame** (e.g. 153, even at idle) → the haft touching the fingers that grip it → CLIP now skips faces skinned >50% to RightHand* bones; `CLIPDBG=<frame>` prints which bones own the hit faces.
- **Axe through the head in the windup** → X Bot's head is smaller → sweep world-axis `WOFFS` on RightArm plus the wrist and read CLIP after each (see the attack v2 recipe).
- **Left guard fist inside the belly** → X Bot is slim → sweep world-axis LeftArm/LeftForeArm `WOFFS` until LFIST is 0.
- **Grunt attack v1 rejected** (horizontal slash reads as a blade; the left fist sank into the torso) → an axe on a barricade chops top-down → the director chose the axe clip **Standing Melee Attack Downward** (search "axe", card 5; Arm-Space 100 → `Standing Melee Attack Downward AS100.fbx`, 69 frames). Weapon CLIP only checks the axe, so also read `LFIST` (left-hand points inside the torso, in cm).
- **Left fist clamped to the hip, wrist bent (attack v2)** → I rotated LeftArm/LeftForeArm with WOFFS to pass LFIST, which broke the arm away from the clip → never WOFFS the free arm; `RMATCH` LeftArm,LeftForeArm instead (the orc's rest pose differs, so raw retarget swung the hand to the belly midline, x 0.07 m). Result: arm held out wide like the Mixamo preview (x 0.3–0.48 m). Always compare against the Mixamo preview, not just CLIP/LFIST (LFIST then reads the planks prop; ignore hits there after a visual check).
- **Fused blades can't be clip-checked** (bladedancer) → split them into `wpn_L`/`wpn_R` with `split_blades.py` (after `weight_transfer.py` + `rigid_blades.py`) so `CLIP` sees them. Hits owned by `*HandThumb*` are the blade's own grip; ignore.
- **Blades cut the hips in the walk** → same as the orc: raise Mixamo **Character Arm-Space** to 100 (`Feminine Walk AS100.fbx`). Clips downloaded on the character's own auto-rig can use `DIRECT=1` (copies local rotations); it gave the same poses as the retarget. `RMATCH` on the arms/hands broke the match with the preview, so don't use it here. Mixamo's preview camera is high, so forward-pointing blades look like they hang down.
- **"Looks like she's limping"** → the GIF held the loop pose twice (Mixamo's last frame repeats the first) → render and GIF only the unique frames: for an N-frame clip use `FR`/gifn `0..N-2`. Check the clip's frame count first; don't assume 33.
- **Still limping after the loop fix** → Feminine Walk is uneven by itself (hip dip 2.9 vs 1.8 cm, feet airborne 13 vs 15 frames). To catch this, measure each step's hip drop and each foot's airtime before rendering. The director parked her walk (2026-10-31): bladedancers are defenders and barely walk.
- **Bladedancer CLIP baseline 193 on every frame** → left thumb on its own grip; count only the excess. Dual Weapon Combo's cross-body slashes graze the right upper arm (frames 35–38, 58–62, 69–75); Mixamo's preview shows the same crossing. The fix (the director's call): make them two single-bladed daggers. `single_blade.py` cuts the steel on the little-finger side of each fist (`bladedancer_dagger.blend`), and frame 61 then hits only the thumb, with no motion offsets. Fix the prop, not the copied motion.
- **Tripo FBX with the Mixamo preset (skeleton on) hangs Blender's importer forever** ? export with the Blender preset, skeleton off (imports in ~5 s), then rig in Mixamo.
- **Cutting a weapon off a welded retopo mesh** ? long faces span the whole shaft with no mid verts, so select by face, not by vertex: a face is weapon if every vert is near the shaft axis (tight radius only inside the fist band, wider for the blade). In edit mode set face select mode before separate, or faces sharing verts with the fist drop out. Spearman: cut_spear.py RC 0.018.
- **PowerShell variables are case-insensitive** ($B is $b); name the exe and blend paths differently.
- **Spearman walk v1 rejected** (spear carried low across the hips) ? the director wants a couched ready guard, tip forward ? hold the attack clip's guard arms over the walk legs: `POSEOUT=path;0;<arm bones>` on the attack run, then `POSEIN=path` on the walk run (v2). **v2 also rejected**: the tip pointed ~25° UP; measure the haft angle in the game view, never eyeball it. The director picked **Rifle Crouch Walk** (Arm-Space 100, 60 frames, no POSEIN) ? v3 (tip forward ~12° below level, CLIP 0, LFIST 0), sent 2026-10-31.
- **Planks clip the back** → push the prop 6 cm (`prop_push`).
- **Elf clothes stuck to the drawing arm** → the Tripo bind pose rests the arm on the hip, so the sleeve, belt and cloak share edges and weights with the arm (that is the root cause of every symptom below) → `inpaint_cloth.py`: split skin from cloth by texture colour, harmonic-fill the cloth weights from cloth neighbours only, cut the arm↔cloth bridge faces. Env `RU` (0.08 for the elf) keeps cloth within that distance of the upper-arm bone on the arm (it is the sleeve). Verts the fill never reaches keep their own weights (`W0`), never none. Then `strip_cloak.py` (teal arm weight → Spine2, plus Corrective Smooth).
- **White spikes from the armpit at full draw** → sleeve verts still carry torso weight → weight fixes plateaued. `sleeve_snap.py` (copy the nearest arm vert's weights) was REJECTED: it dragged the cloak and belt up the arm. What worked: delete the faces that tear. `apply_anim STRETCH=2 STROUT=edges.json` lists every edge that stretches past 2× **relative to the clip's first frame** (not bind: ~200 edges are already stretched at f0); `cut_stretch.py in.blend edges.json out.blend` (env `ZMIN=0.4`) deletes their faces. 2× cut 411 faces; the game view is clean; a faint streak stays under the arm in the side view (frames 22–31), accepted by the director.
- **Quiver and arrow** → `QUIVER=1` adds a back quiver on Spine2 (`QOFF` nudges it, `QCLR` colour) and a nocked arrow in the draw hand from frame 7 (auto; `ARROWF=<frame>` overrides, `ARROWF=99` hides it).

- **"Game view" sent from the wrong camera (elf v4)** → `CAMROT=0` alone is the old 3/4 preview camera, not the field → the game view is always `GAMECAM=20` (side-on, facing screen-right, 20° top-down). Render and screen it first, then the check views.

## Approved: elf attack setup (2026-11-01, director chose the 2× cut)
`scripts/attack_hero.ps1 -model ...\elf_hero\hero20_2.blend -tag v4`. Clip: Standing Draw Arrow AS100 (32 frames). Env: INPLACE=1, ORTHO=1.4, GRIPSIDE=Left, BOWALIGN=-1, RMATCH=LeftShoulder,LeftArm,LeftForeArm,RightShoulder,RightArm,RightForeArm, QUIVER=1. Model chain: hero → inpaint_cloth (RU 0.08) → strip_cloak → hero18 → cut_stretch (str2.json, ZMIN 0.4) → hero20_2.

- **Spearman walk v5 rejected ("missing an arm")** ? the rear hand target sat inside the hips, and the elf's arms are short (upper+fore 0.235 m) so the drawing's hip-to-chest carry is out of reach ? measure reach with `DIMS=1` first; v6 puts both fists in front of the chest (HANDIK Right:0.57,0.28,0;Left:1.12,0.5,0.28 on Walk With Rifle AS100), haft yaw 4°, both arms visible. `SPEARIK=len,elev,yaw` (left target from grip_r) exists but needs reach.

- **"Spear ahead" judged from the side camera (v11)** → a side view hides yaw; v11 was crosswise → read the yaw with HAFT and check it top-down (`GAMECAM=89`). Fix: SPEARIK (weapon-driven left hand) with the right fist near the centre line (out ≤0.5T); out 0.75+ leaves the left arm short, yaw 20–30°. SPEARIK elev and yaw are requests; the fist lands about 25° higher and 20° more inward, so read HAFT.

- **Two-hand spear on a short-armed Tripo body (v11-v12 rejected: crosswise, then arms hidden under pauldrons)** → the arms can't reach a two-hand grip clear of the torso; ARMLEN stretch freed only the left arm → the director chose a one-hand carry. Don't retry two-hand on short-armed bodies.
- **Spearman walk v13 rejected** (spear invisible, arm stiff) → yaw +40 pointed the spear crosswise/end-on in the game view (I judged it in a top view, GAMECAM=89), and I damped the approved swing to x1.2 → judge in the game view first; never damp an approved swing to dodge a problem; before sending, check against every past rejection of the unit (v1 low, v11 crosswise, v12 arms hidden, v13 invisible/stiff).
- **Spearman walk v14 rejected ("trail is dumb, have it facing forward")** → I misread the facing: in GAMECAM=20 CAMROT=0 the elf faces screen-RIGHT, so a tip on screen-left points behind him; a front-view "vertical" spear was not proof of forward → find the face/toes in the game frame first; a forward weapon tip sits on the side he faces; in the front view a forward spear is foreshortened toward the camera.

- **Spearman v15 "gimpy left arm"** → the free arm kept the Tripo bind pose (elbow bent 48.8°) plus the shield clip's raised-arm swing and WOFFS -25: upper arm 44° out and 33° forward, forearm hooked in → measure a plain-walk free arm (Orc Walk) with `ELBOW=1` and copy it with ARMSET + ELBOWSET + ARMTWIST. Retargeting the left arm from Sword And Shield Walk (RMATCH) puts it behind the back (shield arm); switching the whole clip to Orc Walk pitches the spear up.
- **Spear-arm forearm lost its swing** → `REST` runs before `MIRR`, so `REST LeftForeArm` zeroed the source the right forearm mirrors → hold a bind pose after MIRR with `SWING bone:0`. SWING now scales axis-angle (gain may exceed 1; slerp could not).
- **SWING gain ×2 on the shield clip's left arm** widened the sideways swing (7–26° out), not the forward swing, and put the fist into the hip (LFIST 2) → keep ×1.
- **Bladedancer-rig clips are unusable** (41 bones: Feminine Walk, Walking AS100); use X Bot (65 bones) downloads. Mixamo's export S3 URL expires in 300 s. Chrome blocks Mixamo saves after several downloads (multiple-downloads block): ask the director to allow it; never use screen control.

## Next uses
Grunt attack approval (speed: whatever looks natural), the bladedancer face fix, then the other 10 models. Add every new correction from the director to the fixes list above, and every approved setup to the recipes.



- **Elf spearman walk v11** (candidate 2026-11-01): `scripts/walk_spearman.ps1`, viewed with `GAMECAM=20`. Clip Walk With Rifle AS100 (RMATCH both arms, ALIGN fist holes, GRIP2) plus `HANDIK=Right:-0.2,0.2,0.95;Left:0.9,0.55,0`: right fist back at the right hip, left fist at the chest, spear pointing ahead (yaw ~30°, up ~14°). Model `spearman_2h_g0.25s.blend` = `spear_setup.py` (GF 0.25, CL=0.1684,-0.0352,0.3429) then `seam_patch.py` (sleeve over the mid-haft mesh seam). CLIP 0.
- **Spear carried crosswise reads as a stub from the field camera** → the rifle clip holds the weapon across the body (yaw ~80°) → HANDIK with the right fist *behind* the hip and wide (out ≥0.95T): on the elf's short arms, a right fist at the side of the belly sinks into the armour, and one in front pulls the yaw back to 55–64°.
- **Grip fraction**: director wanted the hands nearer the tip, but 0.4 was "too far up" → GF 0.25.
- **Him sliding forward in the side view** → `INPLACE` worked only on the DIRECT path → it now subtracts the clip's linear ground travel in the retarget path too.
