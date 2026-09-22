import os, glob
root = r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library"
for f in glob.glob(os.path.join(root, "**", "*.py"), recursive=True):
    low = f.lower()
    if any(k in low for k in ["database","record","property","column","schema","table","meta"]):
        print(f)
