import bpy
import os as _os, glob as _glob
def relink(fbx):
    """FBX import runs with use_image_search=False (it hangs otherwise): point images at the .fbm folder by file name."""
    files = {_os.path.basename(p).lower(): p for p in _glob.glob(_os.path.join(_os.path.dirname(fbx), "**", "*.*"), recursive=True)}
    for im in bpy.data.images:
        if im.filepath and not _os.path.exists(bpy.path.abspath(im.filepath)):
            p = files.get(_os.path.basename(bpy.path.abspath(im.filepath)).lower())
            if p: im.filepath = p; im.reload()

