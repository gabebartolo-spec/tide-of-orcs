"""Review aids for a cut (TB-278): what a viewer sees and hears, laid out so nothing is judged from a thumbnail sheet alone.

  python3 review2.py frames <mp4> <outdir> [every_s]   full-size stills every every_s seconds (default 0.5), named by time
  python3 review2.py sound <mp4> <png>                  loudness over time (momentary LUFS), spectrogram and cut/beat marks
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def frames(mp4, out, every=0.5):
    os.makedirs(out, exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', mp4, '-vf', f'fps=1/{every}', '-q:v', '3', os.path.join(out, 't%04d.jpg')], check=True)
    for f in sorted(os.listdir(out)):
        if f.startswith('t') and f[1:5].isdigit():
            t = (int(f[1:5]) - 1) * every
            os.replace(os.path.join(out, f), os.path.join(out, f'{t:06.2f}s.jpg'))


def sound(mp4, png):
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', mp4, '-f', 'f32le', '-ac', '1', '-ar', '22050', '-'], capture_output=True).stdout
    y = np.frombuffer(raw, np.float32); sr = 22050
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', mp4, '-map', '0:a', '-af', 'ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=-',
                        '-f', 'null', '-'], capture_output=True, text=True).stdout
    ts, M = [], []
    for line in e.splitlines():
        if line.startswith('frame:'):
            ts.append(float(line.split('pts_time:')[1]))
        elif line.startswith('lavfi.r128.M='):
            M.append(float(line.split('=')[1]))
    ts = ts[:len(M)]
    sys.path.insert(0, HERE); import edit2
    cuts = [edit2.T(r['k'][0]) for r in edit2.EDL]
    fig, ax = plt.subplots(2, 1, figsize=(24, 8), sharex=True)
    ax[0].plot(ts, M, lw=0.8); ax[0].set_ylim(-40, -5); ax[0].set_ylabel('momentary LUFS'); ax[0].axhline(-14, color='k', lw=0.5)
    ax[1].specgram(y, Fs=sr, NFFT=1024, noverlap=512, cmap='magma'); ax[1].set_ylim(0, 8000)
    for c in cuts:
        for a in ax: a.axvline(c, color='c', lw=0.8)
    for k in range(0, 113, 4):
        ax[0].axvline(edit2.T(k), color='0.85', lw=0.5, zorder=0)
    for a, n in zip(ax, ('loudness', 'spectrum')): a.set_title(n, loc='left')
    plt.tight_layout(); plt.savefig(png, dpi=80)


if __name__ == '__main__':
    if sys.argv[1] == 'frames':
        frames(sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 0.5)
    else:
        sound(sys.argv[2], sys.argv[3])
