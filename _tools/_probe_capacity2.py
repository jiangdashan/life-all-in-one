# -*- coding: utf-8 -*-
"""v65 容量探针 v2：验证「写入 150KB → 读回完整无误」。
   上一版教训：finally 里如果调 read_rows 崩溃，删除就不会执行。
   本版：删除只依赖 add 返回的 id，且 ValueError/异常全部吞掉后也强制删。
"""
import subprocess, json, io, csv, time, sys

csv.field_size_limit(10 ** 9)

TOK = sys.argv[1]
DB = 'FKpqucBa96f2slzvcU3jdV'
PY = r'C:/Users/依易亦奕鸭/.workbuddy/binaries/python/versions/3.13.12/python.exe'
DB_DIR = r'D:/workbuddy/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/library/database'


def run(script, args, stdin_bytes=None):
    p = subprocess.run([PY, script] + args, input=stdin_bytes, capture_output=True, timeout=120, cwd=DB_DIR)
    return p.stdout.decode('utf-8', 'replace')


def read_rows():
    out = run('get_database_content.py', ['--token-stdin', '--database-id', DB], TOK.encode())
    d = json.loads(out)
    return list(csv.DictReader(io.StringIO(d.get('content', ''))))


def delete_ids(ids):
    out = run('batch_delete_database_records.py',
              ['--token-stdin', '--database-id', DB, '--record-ids', json.dumps(ids)], TOK.encode())
    return out.strip()[:300]


# 模拟真实快照：混入中文、标点、换行\n，逼迫 CSV/JSON 各层做转义
N = 150000
payload = ('x' * 50000) + '生活工作台·日常集「写成一份备份」，价格 ¥32.5，备注：午饭 & 咖啡\n' + ('y' * 99939)
payload = payload[:N]

records = [{'键': {'text': '__probe_tmp_rt__'}, '值': {'text': payload}}]
stdin_bytes = (TOK + '\n').encode() + json.dumps({'database_id': DB, 'records': records}).encode()

created = []
try:
    out = run('batch_add_database_records.py', ['--stdin'], stdin_bytes)
    d = json.loads(out)
    for it in (d.get('results') or []):
        if it.get('id'):
            created.append(it['id'])
    print('写入:', out[:260])
    print('拿到的 id:', created)
    if not created:
        print('!! 没拿到 id，手工清理')

    time.sleep(1.0)
    rows = read_rows()
    print('meta 总行数:', len(rows))
    hit = [r for r in rows if (r.get('键') or '') == '__probe_tmp_rt__']
    if not hit:
        print('!! 没读到探针行')
    else:
        got = hit[0].get('值') or ''
        print()
        print('期望长度:', len(payload))
        print('读回长度:', len(got))
        print('完全一致:', got == payload)
        if got != payload:
            print('首差异位置:', next((i for i, (a, b) in enumerate(zip(payload, got)) if a != b), min(len(payload), len(got))))
            print('读回片段:', repr(got[50000:50120]))
finally:
    print()
    print('--- 清理 ---')
    if created:
        print(delete_ids(created))
        time.sleep(0.8)
        rows = read_rows()
        left = [r for r in rows if (r.get('键') or '').startswith('__probe_tmp_')]
        keys = sorted(set(r.get('键') for r in rows))
        print('清理后总行数:', len(rows), '| 探针残留:', len(left), '| 键:', keys)
    else:
        print('无 id 可删，请手工核查')
