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

## v4 (coordinator brief, 27 Nov: shield, planks, brighter and straighter, ink line)
Everything from v3 kept (Jogging clip, axe-arm pose, hue shift, CAMROT 180 game view, not mirrored).
- Shield: rebuilt at 0.42 of body height (0.34 x 0.28 m), held out on the left forearm, turned 32 deg away from the camera and
  rotated -13 deg in its plane so the planks slant down toward the front. Slid 7 cm down the forearm and 2 cm clear of hand and
  arm. Torso, belt and strap show beside it at frame 0. Plain planks, no emblem.
- Planks: each plank carries a painted 512 x 128 texture: mid brown (110,86,62) +-8% per plank, 7 wavy darker grain lines (-22%),
  one knot, lighter long edges (up to +28%) and a light top band; plank ends and sides map to the light band.
- Body: skin value x1.12 on the base texture (hue kept: rendered skin hue 69.2, median value 0.412 -> 0.471 = +14%, shadow-side
  20th percentile 0.337 -> 0.369). Spine, Spine1, Spine2 each +5 deg, Neck and Head -10 deg each (less hunch, head level).
  Light unchanged (AMB 0.65): AMB 0.9 lifted the shadows evenly but pushed skin value to +22%, past the brief.
- Chest strap: refitted for the straighter spine, ending higher (belt end at x 0.04, z 0.42, 7 mm off the body) so it no longer
  touches the left thigh.
- Ink: (1) the 3D inverted hull is 0.8% of height (6.4 mm, was 0.4%) for the inner lines; (2) the outer line is drawn on each
  frame: the body mask (alpha > 0.9; the cast shadow stays under 0.55) is grown by a disc and filled with ink #2a2a22 under the
  body, radius = 2 game px in that frame's pixels (6.25 px on the 512 frames, body 192 px -> 61.4 px in game). The close-up still
  uses 4 px, the dream image's own line weight at that size.
- Clip test: CLIP 0, LFIST 0, LFISTSURF 0 on all frames (shield, strap, axe) on `grunt_dream_v4_s4.blend`.
- Blend: `grunt_dream_v4.blend` (shield `_v4_s3`, strap `_v4_s4`).
- Files: `v4_sidebyside.png`, `v4_walk_ingame.gif` (shipped jog | v4 jog, front-row size), `v4_on_field_zoom.png`,
  `v4_on_target.png` (walk frame 8 on `target/battlefield_day.png` at 67 px, the measured height of the orcs there: 65, 67, 70 px).

## v5 (coordinator brief, 27 Nov: the director's battlefield_day.png target sets camera and shading)
Everything from v4 kept (clip, arm pose, shield, planks, strap, spine) except:
- Camera: front three-quarter, walking toward screen-left: `GAMECAM=30 CAMROT=120` (30 deg top-down; 120 turns the view from
  the shield side toward his front). Face and chest face the camera; the shield arm is on the far side, beside the body.
  Neck -15 and Head -20 deg (were -10 each) so the face reads from 30 deg above. Frames are not mirrored.
- Flat cartoon shading (`grunt_dream_v5.blend`, mk_v5): skin pixels of the base texture set to one flat colour, the target
  orcs' lit skin sRGB (155,169,72) (median of hue 62-82 pixels in three orcs of battlefield_day.png; their shade is
  (120,130,55)). Every body, strap and shield material is Emission(base colour x tone): tone is a constant 3-step ramp of
  N.L in camera space against the key sun direction: lit 1.0 (N.L > -0.15), shade 0.56 linear (= the target's shade ratio),
  small dark core 0.27 (N.L < -0.6). No soft light, no AO; the cast shadow on the ground is kept.
- Ink: outer line 2 game px drawn per frame as in v4 (5.63 px on the 512 frames, body 173 px); the 3D hull (0.8% of height)
  draws the inner lines where parts overlap. Freestyle was not used.
- Clip test: CLIP 0, LFIST 0, LFISTSURF 0 on all frames (`grunt_dream_v4_s4.blend` + the v5 head pose; the hull shell on the
  v5 blend makes the clip probe read high, as in v2).
- Files: `v5_sidebyside.png` (target orc, upscaled | v5 still), `v5_walk_ingame.gif` (shipped jog | v5 jog, front-row size),
  `v5_on_target.png` (walk frame 8 on battlefield_day.png at 67 px, the measured height of the orcs there).

## v6 (coordinator brief, 27 Nov: upright walk, one shade shape per limb, shield face lit)
Everything from v5 kept (camera GAMECAM 30 / CAMROT 120, flat skin colour, 3-tone ramp, ink, shield, strap, spine and head pose)
except:
- Walk: Mixamo `Walking` (37 frames, 0-36 rendered) instead of Jogging: chest up, the clip's own small lean. The axe arm keeps the
  v19 recipe, with two changes. The mirrored swing gain is 1.0 instead of 2.8 (at 2.8 the axe swung behind his back mid-step).
  The RightHand WOFFS X is 25 instead of 60 (at 60 the haft went through the forearm on this clip). Orc Walk was tried; Walking
  stands taller.
- Shade shapes (`grunt_dream_v6.blend`, mk_v6): a geometry-nodes modifier after the Armature on the body and on `wpn_R` (which
  shares the body material) blurs the deformed vertex normals 15 times along the mesh edges and stores them in world space as
  `snrm`. The toon step reads `snrm` instead of the true normal, so muscle bumps no longer break the shade into blotches. The
  mesh itself is unchanged; the outline still uses the true geometry.
- With smoothed normals the old shade step (N.L < -0.15) put 61% of the skin in shade. The body's shade step is now N.L < -0.45
  (core < -0.75). This makes the lit share 0.50 lit / 0.50 shade on walk frame 0 and frame 8, against 0.48 lit / 0.36 shade /
  0.16 dark on the target orc (pixels nearest each sampled target tone, `tones.py`).
- Shield: lit rather than turned. The wood's shade step is N.L < -0.7 (core < -0.9), so the plank face reads in the lit tone with
  its grain, and only the plank edges turned away from the sun go dark.
- Clip test: CLIP 0, LFIST 0, LFISTSURF 0 on all frames (`grunt_dream_v4_s4.blend` with the v6 clip and arm pose).
- Files: `v6_sidebyside.png` (target orc | v6 still), `v6_walk_ingame.gif` (shipped jog | v6 walk, front-row size),
  `v6_on_target.png` (walk frame 8 on battlefield_day.png at 67 px).
- Still open: the sculpt's own hunch (head forward of the shoulders, long arms) keeps him lower and wider than the target
  orcs even on an upright clip. With the head pitched down, the face falls in the shade tone.
