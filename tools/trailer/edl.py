"""The trailer's cut list (storyboard shots 1-12, 75 s). in/dur in seconds of the recorded shot; caps = (caption, start, end) in the segment."""
EDL = [
    dict(shot='s01_arrival', **{'in': 0.5}, dur=5.0, zoom=(1.0, 1.1), center=(0.6, 0.55), fadein=1.0, caps=[('c01', 0.8, 4.8)]),
    dict(shot='s02_aim', **{'in': 0.6}, dur=6.0, caps=[('c02', 0.6, 5.6)]),
    dict(shot='s03a_grove', **{'in': 0.3}, dur=3.0, caps=[('c03', 0.4, 3.0)]),
    dict(shot='s03b_wolf', **{'in': 0.5}, dur=3.0),
    dict(shot='s04_pals', **{'in': 0.3}, dur=2.0, zoom=(1.3, 1.36), center=(0.25, 0.6)),
    dict(shot='s04_pals', **{'in': 2.4}, dur=2.0, zoom=(1.3, 1.36), center=(0.6, 0.55)),
    dict(shot='s04_pals', **{'in': 4.5}, dur=2.0, zoom=(1.3, 1.36), center=(0.9, 0.6)),
    dict(shot='s04_pals', **{'in': 6.6}, dur=2.0, zoom=(1.0, 1.06), center=(0.5, 0.5)),
    dict(shot='s05_arms', **{'in': 1.0}, dur=6.0, zoom=(1.0, 1.08), center=(0.7, 0.6)),
    dict(shot='s06_vanguard', **{'in': 0.5}, dur=6.0, zoom=(1.12, 1.18), center=(0.15, 0.7), caps=[('c06', 0.6, 5.6)]),
    dict(shot='s07_tide', **{'in': 1.0}, dur=5.0, zoom=(1.0, 1.05), center=(0.6, 0.5)),
    dict(shot='s08_boss', **{'in': 0.3}, dur=2.0),
    dict(shot='s08_boss', **{'in': 4.3}, dur=3.0, zoom=(1.25, 1.3), center=(0.85, 0.55), caps=[('c08', 0.2, 3.0)]),
    dict(shot='s08_boss', **{'in': 15.0}, dur=5.0, zoom=(1.15, 1.2), center=(0.75, 0.55)),
    dict(shot='s09_fall', **{'in': 0.0}, dur=6.0, caps=[('c09', 0.8, 5.5)], fadeout=0.6),
    dict(shot='s10a_paths', **{'in': 0.3}, dur=3.0, fadein=0.5),
    dict(shot='s10b_camp', **{'in': 0.3}, dur=4.0, zoom=(1.0, 1.08), center=(0.5, 0.6), caps=[('c10', 0.3, 4.0)]),
    dict(shot='s11_late', **{'in': 0.5}, dur=6.0, zoom=(1.0, 1.04)),
    dict(still='STILL', dur=4.0, blur=6, fadein=0.8, caps=[('title', 0.4, 4.0)]),
]
MUSIC = dict(**{'from': 28.0}, fadein=1.2, fadeout=2.5, duck=[(52.6, 58.2, 0.35)])
SFX = [(5.7, 'loose', 0.6), (6.4, 'arrowHit', 0.6), (6.5, 'orcDeath', 0.4), (11.9, 'bought', 0.7), (31.3, 'rallyHorn', 0.6),
       (37.5, 'warDrum', 0.5), (38.3, 'warDrum', 0.5), (39.1, 'warDrum', 0.5), (43.0, 'bossRoar', 0.8), (54.2, 'wallCreak', 0.7),
       (55.2, 'wallFall', 0.9), (58.3, 'replant', 0.6)]
