# TB-278 grunt test: the Tripo grunt from the approved character dream

Look test only, no game code. Source model: Tripo export with the Mixamo-preset rig (axe and plank shield welded),
4K Tripo texture kept as is.

- Blend: `C:\Users\DANTE\Documents\tide-assets\grunt_dream\grunt_dream.blend` (texture packed);
  `grunt_dream_split.blend` = the same with the axe's two mesh islands (100% RightHand) moved into `wpn_R` so CLIP can see it.
- Walk: Sword And Shield Walk, the grunt walk v19 env (RMATCH right arm, MIRR, H1, HINGE=world, FREEZE, WOFFS) plus INPLACE=1,
  no fit_hole. 34 clip frames, frames 0-32 rendered. CLIP 0, LFIST 0, LFISTSURF 0 on every frame.
- Renders: apply_anim / lit_render as the shipped sheets (LIT=1 SUN=-0.6,1.6,0.5 AMB=0.65 LITFLIP=1 GAMECAM=20 RES=512),
  ORTHO 2.08 (= 2.4 x this model's 0.80 m body / the shipped grunt's 0.93 m), LOOK=off and LOOK=grunt.
  Stills: walk frame 0, GAMECAM=20 CAMROT=45, ORTHO 1.4, RES 1024, same sun, no LITFLIP.

Files
- `grunt_sidebyside.png`: dream crop | LOOK=off still | LOOK=grunt still.
- `grunt_walk_ingame.gif`: shipped grunt jog | new walk LOOK=off | new walk LOOK=grunt, at in-game size on the front row
  (body 61 px on a 1080p view: 2.4 x r 12 x k 1920/900), mirrored to march screen-left, 33 ms a frame.
- `grunt_on_field.jpg` (+ `_zoom.png`): walk frame 8 of each pasted onto `before/field_clean.jpg` at game scale for that row.

## v2 (coordinator brief, 26 Nov)
- Blend: `C:\Users\DANTE\Documents\tide-assets\grunt_dream\grunt_dream_v2.blend` = the split blend plus (1) skin-only hue shift of the
  base colour texture, -10.8 deg on pixels with hue 45-135 and sat > 0.2 (skin hue 80.4 -> 69.5 vs the dream's 69.6), and (2) an
  inverted-hull ink outline (Solidify, flipped normals, 0.4% of height = 3.2 mm, #2a2a22 emission, camera rays only) on body and axe.
- Clip: Jogging XBot frames 0-25, as the shipped grunt (lean 3-6 deg). The shipped grunt jog env with this model put the axe through
  the right thigh on all 78 frames, so the axe arm is re-posed: `ARMSET=Right:-30,5`, RightHand WOFFS X 60 (was 75),
  `WOFFS2=mixamorig:RightHand:0,0,1,-25` (haft out to the side, head out). CLIP 0, LFIST 0, LFISTSURF 0 (measured on the
  split blend; on the v2 blend the outline shell makes LFIST read 2-3 cm, a measuring artefact of the shell).
- Shield: no arm twist. The game view is rendered from the shield side (`CAMROT=180`, no LITFLIP), so the frames already face
  screen-left with the plank face-on and are NOT mirrored. In game this sheet would have to skip the packer's orc mirror.
- Files: `v2_sidebyside.png` (dream | v2 still, CAMROT 120, 1024 px), `v2_walk_ingame.gif` (shipped jog | v2 jog, same clip,
  front-row game size), `v2_on_field_zoom.png` (frame 8 of each on `before/field_clean.jpg`).

## v3 (director, 27 Nov: "looks good except for the shield and the clothes strap")
Everything from v2 kept (Jogging clip, axe-arm pose, skin hue -10.8, ink outline, CAMROT 180 game view). Two changes only.
- Shield: the Tripo plank and boss islands (260 + 152 verts) are cut from the body and replaced by a modelled `wpn_S`, built to
  the dream: 3 flat horizontal planks with slightly ragged ends, dark seams between them (a backing board inside the gaps), a
  low-poly round iron boss, two leather straps on the back, 0.44 x 0.36 m (0.55 x 0.45 of body height) x 4 cm. Plain planks, no
  emblem. 100% LeftForeArm; rotated -28 deg in its plane so the planks are level in the game view at frame 0; 1.8 cm clear of
  the forearm and hand. Wood (110,86,62) +-8% per plank, iron (125,127,124), strap (70,52,38).
- Chest strap: the painted Tripo strap breaks up over the belly (green patches, torn edge). A modelled leather band `wpn_C`
  (5 cm wide, 4 mm thick, colour sampled from the painted strap: 98,75,58) is laid over it, from under the pauldron to the belt.
  Each point sits 4 mm in front of the frontmost body surface within 1.2 cm, and its skin weights are copied from the 4 nearest
  body verts (spine, hips, shoulders only), so it moves with the chest without sinking or floating.
- Blend: `grunt_dream_v3.blend` (shield: `_s3`, + strap: `_s4`). CLIP 0, LFIST 0, LFISTSURF 0 on the s4 blend (shield and strap tested).
- Not done (director's note: skip unless already done): camera-side fill light, spine and neck straightening.
- Files: `v3_sidebyside.png`, `v3_walk_ingame.gif` (shipped jog | v3 jog), `v3_on_field_zoom.png`.
