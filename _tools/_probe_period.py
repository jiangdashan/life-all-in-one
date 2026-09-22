# -*- coding: utf-8 -*-
import json, subprocess, sys
PY = r"C:\Users\依易亦奕鸭\.workbuddy\binaries\python\versions\3.13.12\python.exe"
LIB = r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library"
TOKEN = sys.argv[1]
DB = sys.argv[2]
body = {"databaseId": DB, "limit": 500}
proc = subprocess.run(
    [PY, "database/query_database_record.py", "--token-stdin"],
    input=(TOKEN + "\n" + json.dumps(body, ensure_ascii=False)).encode("utf-8"),
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=LIB,
)
raw = proc.stdout.decode("utf-8", errors="replace")
print(raw[:6000])
