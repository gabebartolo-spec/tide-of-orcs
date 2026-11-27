"""Cut the trailer from recorded shots: per-segment renders (crop/zoom, captions, fades), concat, then the music and SFX mix.
Usage: python3 tools/trailer/edit.py <shotsDir> <capsDir> <outDir>"""
import json, os, subprocess, sys
SHOTS, CAPS, OUT = sys.argv[1:4]
FPS = 30
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
AUD = os.path.join(REPO, 'public', 'audio')
os.makedirs(OUT, exist_ok=True)
from edl import EDL, SFX, MUSIC

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(' '.join(cmd)); print(r.stderr[-3000:]); sys.exit(1)

def segment(i, s):
    out = f'{OUT}/seg{i:02d}.mp4'; d = s['dur']; n = round(d * FPS)
    if s.get('still'):
        inp = ['-loop', '1', '-framerate', str(FPS), '-i', f'{SHOTS}/s01_arrival/0000.png' if s['still'] == 'STILL' else s['still']]
    else:
        start = round(s['in'] * FPS)
        inp = ['-framerate', str(FPS), '-start_number', str(start), '-i', f"{SHOTS}/{s['shot']}/%04d.png"]
    z0, z1 = s.get('zoom', (1, 1)); cx, cy = s.get('center', (0.5, 0.5))
    z = f"({z0}+({z1}-{z0})*t/{d})"
    vf = [f"scale=w='trunc(1920*{z}/2)*2':h='trunc(1080*{z}/2)*2':eval=frame:flags=bicubic", f"crop=1920:1080:x='(iw-1920)*{cx}':y='(ih-1080)*{cy}'", 'setsar=1']
    if s.get('blur'): vf += [f"gblur=sigma={s['blur']}", 'eq=brightness=-0.12:saturation=0.85']
    if s.get('fadein'): vf.append(f"fade=t=in:st=0:d={s['fadein']}")
    if s.get('fadeout'): vf.append(f"fade=t=out:st={d - s['fadeout']}:d={s['fadeout']}")
    filt = f"[0:v]{','.join(vf)}[v]"; extra = []; last = 'v'
    for k, cap in enumerate(s.get('caps', [])):
        name, a, b = cap; extra += ['-loop', '1', '-framerate', str(FPS), '-i', f'{CAPS}/{name}.png']
        filt += f";[{k+1}:v]format=rgba,fade=t=in:st={a}:d=0.45:alpha=1,fade=t=out:st={b-0.45}:d=0.45:alpha=1[c{k}];[{last}][c{k}]overlay=0:0:shortest=1[o{k}]"; last = f'o{k}'
    run(['ffmpeg', '-y', '-v', 'error', *inp, *extra, '-filter_complex', filt, '-map', f'[{last}]', '-frames:v', str(n), '-r', str(FPS),
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', out])
    return out

segs = [segment(i, s) for i, s in enumerate(EDL)]
with open(f'{OUT}/list.txt', 'w') as f: f.writelines(f"file '{os.path.abspath(p)}'\n" for p in segs)
run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', f'{OUT}/list.txt', '-c', 'copy', f'{OUT}/video.mp4'])
total = sum(s['dur'] for s in EDL)

# audio: music bed, ducked where the storyboard asks, plus SFX under the key hits
m = MUSIC; ins = ['-ss', str(m['from']), '-t', str(total), '-i', f"{AUD}/music-b.mp3"]
vol = '*'.join(f"if(between(t,{a},{b}),{g},1)" for a, b, g in m['duck'])
filt = f"[0:a]afade=t=in:st=0:d={m['fadein']},afade=t=out:st={total - m['fadeout']}:d={m['fadeout']},volume='{vol}':eval=frame[m]"
mix = ['[m]']
for k, (t, name, gain) in enumerate(SFX):
    ins += ['-i', f'{AUD}/{name}.mp3']; ms = int(t * 1000)
    filt += f";[{k+1}:a]volume={gain},adelay={ms}|{ms}[s{k}]"; mix.append(f'[s{k}]')
filt += f";{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
run(['ffmpeg', '-y', '-v', 'error', *ins, '-filter_complex', filt, '-map', '[a]', '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', f'{OUT}/audio.m4a'])
run(['ffmpeg', '-y', '-v', 'error', '-i', f'{OUT}/video.mp4', '-i', f'{OUT}/audio.m4a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', f'{OUT}/trailer-1080p.mp4'])
run(['ffmpeg', '-y', '-v', 'error', '-i', f'{OUT}/trailer-1080p.mp4', '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-c:a', 'copy', '-movflags', '+faststart', f'{OUT}/trailer-720p.mp4'])
print('done', total, 's')
