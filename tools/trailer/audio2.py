"""Trailer take 2 sound (TB-278): music B on the cut's beat grid, plus the game's own SFX from each shot's logged events.

Music: track beats 16..120, spliced at the downbeat to 168..end (a 12 ms crossfade under the outro's first hit).
SFX: each field shot's meta.json events in the frames the cut uses, mapped to cues the way src/data/audio.ts does (cueFor,
CUES gains and per-cue throttle gaps), with the game's pitch jitter; page shots get their UI cue by hand (MANUAL).
The music ducks under the big moments. Everything is summed in float, then two-pass loudnorm to -14 LUFS, -1 dBTP.
Called by edit2.py with the resolved EDL; writes out2/cut/mix.wav.
"""
import json, os, subprocess, random
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.join(HERE, '..', '..', 'public', 'audio')
GRUNTS = '/mnt/project-files/launch/grunts'   # TB-280 ElevenLabs takes (PR #354), until they land on main

CUES = {  # gain, gap (s), file stem: src/data/audio.ts CUES
    'loose': (0.5, 0.08, 'loose'), 'arrowHit': (0.45, 0.05, 'arrowHit'), 'knife': (0.5, 0.08, 'knife'), 'ignite': (0.5, 0.2, 'ignite'),
    'orcHit': (0.6, 0.12, 'orcHit'), 'orcDeath': (0.6, 0.1, 'orcDeath'), 'bruteDeath': (0.8, 0.25, 'bruteDeath'), 'bossRoar': (1, 2, 'bossRoar'),
    'wallThud': (0.7, 0.15, 'wallThud'), 'wallCreak': (0.7, 1.2, 'wallCreak'), 'wallFall': (1, 2, 'wallFall'), 'rallyHorn': (0.9, 0.5, 'rallyHorn'),
    'replant': (0.9, 1, 'replant'), 'bought': (0.7, 0.05, 'ui/buy'), 'click': (0.5, 0.03, 'ui/click'),
    'fireArrow': (0.5, 0.2, 'fireArrow'), 'bounce': (0.45, 0.08, 'bounce'), 'shock': (0.55, 0.2, 'shock'), 'stun': (0.5, 0.25, 'stun'),
    'frost': (0.5, 0.2, 'frost'), 'shatter': (0.6, 0.12, 'shatter'), 'starfall': (0.8, 1, 'starfall'),
    'fireballCast': (0.55, 0.2, 'fireballCast'), 'fireballHit': (0.65, 0.15, 'fireballHit'),
    'lootDrop': (0.35, 0.15, 'lootDrop'), 'lootRare': (0.5, 0.2, 'lootRare'), 'lootEpic': (0.65, 0.3, 'lootEpic'),
    'lootLegendary': (0.8, 0.5, 'lootLegendary'), 'lootMythic': (1, 1, 'lootMythic'), 'warDrum': (1, 0.4, 'warDrum'),
    'orcPain': (0.45, 0.35, 'orcPain1'), 'orcBark': (0.5, 0.7, 'orcBark1'),
    'uiStamp': (0.7, 0.3, 'ui/stamp'), 'uiPath': (0.7, 0.5, 'ui/path'), 'uiPanel': (0.4, 0.2, 'ui/panel'),
}
# Orc voices (TB-280, src/data/audio.ts CUES vars/jitter): every take a cue can play, one at random, never the same twice running
TAKES = {'orcDeath': ['orcDeath', 'orcDeath2', 'orcDeath3'], 'bruteDeath': ['bruteDeath', 'bruteDeath2', 'bruteDeath3'],
         'orcPain': ['orcPain1', 'orcPain2'], 'orcBark': ['orcBark1', 'orcBark2']}
JITTER = {'orcDeath': 0.1, 'bruteDeath': 0.08, 'orcPain': 0.1, 'orcBark': 0.1}   # ± playbackRate; others AUDIO.pitchJitter 0.06
FIELD_W = 900           # world units across the whole plain; the camera shows FIELD_W / z of it
DUCK = {'bossRoar', 'wallFall', 'rallyHorn', 'replant', 'lootLegendary', 'lootMythic'}
LOOT = {'common': 'lootDrop', 'rare': 'lootRare', 'epic': 'lootEpic', 'legendary': 'lootLegendary', 'mythic': 'lootMythic'}
BIG = {'boss', 'brute', 'elite', 'drummer'}


def cue_for(e):
    t = e.get('t')
    m = {'loose': 'loose', 'knife': 'knife', 'ignite': 'ignite', 'hit': 'arrowHit', 'barricadeFell': 'wallFall', 'bossStart': 'bossRoar',
         'vanguardRallied': 'rallyHorn', 'vanguardHit': 'orcHit', 'bought': 'bought', 'fireStrike': 'fireArrow', 'bounceHit': 'bounce',
         'shock': 'shock', 'stun': 'stun', 'chill': 'frost', 'shatter': 'shatter', 'starfall': 'starfall', 'fireballCast': 'fireballCast',
         'drumBeat': 'warDrum', 'fireballStrike': 'fireballHit', 'replant': 'replant'}
    if t == 'kill':
        return 'bruteDeath' if e.get('kind') in BIG else 'orcDeath'
    if t == 'barricadeHit':
        return 'wallCreak' if (e.get('frac') or 1) < 0.5 else 'wallThud'
    if t == 'loot':
        return LOOT.get(e.get('rarity'), 'lootDrop') if e.get('kept') else None
    return m.get(t)


def voice_for(e):
    """voiceFor: an orc grunt layered on a hit, a bark on a wall or vanguard strike."""
    t = e.get('t')
    return 'orcPain' if t == 'hit' else 'orcBark' if t in ('barricadeHit', 'vanguardHit') else None


_buf = {}


def load(stem):
    if stem not in _buf:
        for ext in ('.ogg', '.mp3', '.wav'):
            p = os.path.join(AUD, stem + ext)
            if not os.path.exists(p):
                p = os.path.join(GRUNTS, stem + ext)
            if os.path.exists(p):
                raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
                _buf[stem] = np.frombuffer(raw, np.float32).reshape(-1, 2).copy(); break
        else:
            print('  ! missing sfx', stem); _buf[stem] = np.zeros((1, 2), np.float32)
    return _buf[stem]


def music(bt, total, splice_from=120, splice_to=168, start=16):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(AUD, 'music-b.mp3'), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
    m = np.frombuffer(raw, np.float32).reshape(-1, 2)
    s = lambda t: int(round(t * SR))
    a = m[s(bt[start]):s(bt[splice_from])].copy(); b = m[s(bt[splice_to]):].copy()
    x = int(0.012 * SR); r = np.linspace(0, 1, x)[:, None]
    tail = a[-x:] * (1 - r) + b[:x] * r
    out = np.concatenate([a[:-x], tail, b[x:]])
    n = s(total)
    out = out[:n] if len(out) >= n else np.concatenate([out, np.zeros((n - len(out), 2), np.float32)])
    return out


def build(edl, total, bt, manual, sfx_bus=0.55, seed=7, out=None):
    rng = random.Random(seed)
    n_all = int(round(total * SR)) + SR
    sfx = np.zeros((n_all, 2), np.float32); duck_t = []
    last = {}
    hits = []
    for r in edl:
        if r.get('page') or r.get('mute'):
            continue
        meta = json.load(open(os.path.join(HERE, 'out2', 'shots', r['shot'], 'meta.json')))
        for j in range(r['_j0'], r['_j1']):
            i = r['in'] + (j - r['_j0'])
            if i >= len(meta):
                break
            t = j / 30
            cam = meta[i].get('cam') or {'x': 450, 'z': 1}
            for e in meta[i]['ev']:
                if isinstance(e, str):
                    e = {'t': e}
                for c in (cue_for(e), voice_for(e)):
                    if not c or c not in CUES or c in r.get('skip', ()):
                        continue
                    g, gap, stem = CUES[c]
                    if t - last.get(c, -9) < gap:
                        continue
                    pan = 0.0; g *= r.get('sfx', 1.0)
                    if 'x' in e:   # place it where it is on screen; a sound off the edge of the frame is heard faint, from that side
                        p = (e['x'] - cam['x']) / (FIELD_W / cam['z'] / 2)
                        if abs(p) > 1.1:
                            g *= 0.3
                        pan = max(-0.7, min(0.7, p * 0.6))
                    last[c] = t; hits.append((t, c, g, pan))
    for t, c, g in list(manual):
        hits.append((t, c, g, 0.0))
    take = {}
    for t, c, g, pan in sorted(hits):
        stem = CUES[c][2]; opts = TAKES.get(c)
        if opts:   # a random take, never the same one twice running (the game's pickTake)
            k = rng.randrange(len(opts) - 1) if c in take else rng.randrange(len(opts))
            if c in take and k >= take[c]:
                k += 1
            take[c] = k; stem = opts[k]
        x = load(stem)
        jit = JITTER.get(c, 0.06); rate = 1 + rng.uniform(-jit, jit)
        idx = np.arange(0, len(x) - 1, rate)
        y = np.stack([np.interp(idx, np.arange(len(x)), x[:, ch]) for ch in (0, 1)], 1).astype(np.float32)
        th = (pan + 1) * np.pi / 4; y = y * np.array([np.cos(th), np.sin(th)], np.float32) * np.sqrt(2)   # equal-power pan, centre unchanged
        a = int(t * SR); b = min(n_all, a + len(y))
        sfx[a:b] += y[:b - a] * g
        if c in DUCK:
            duck_t.append(t)
    mus = music(bt, total)
    env = np.ones(len(mus), np.float32)
    for t in duck_t:  # duck the bed to 55% for the hit, back over 1.2 s
        a = int((t - 0.05) * SR); h = int(0.5 * SR); rel = int(1.2 * SR)
        seg = np.concatenate([np.full(h, 0.55), np.linspace(0.55, 1, rel)]).astype(np.float32)
        b = min(len(env), a + len(seg)); env[max(0, a):b] = np.minimum(env[max(0, a):b], seg[max(0, -a):b - a])
    mix = mus * env[:, None] + sfx[:len(mus)] * sfx_bus
    tmp = out + '.raw.wav'
    write_wav(tmp, mix)
    loudnorm(tmp, out)
    os.remove(tmp)
    return [(t, c, g) for t, c, g, _ in hits]


def write_wav(path, x):
    pcm = np.clip(x, -4, 4).astype(np.float32)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', path], input=pcm.tobytes(), check=True)


def loudnorm(src, dst, I=-14, TP=-1.0, LRA=11):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-af', f'loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(p[p.rindex('{'):p.rindex('}') + 1])
    af = (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af', af, '-ar', str(SR), dst], check=True)
