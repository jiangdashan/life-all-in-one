# -*- coding: utf-8 -*-
"""v65 容量探针：测 meta 表单个 text 字段能存多少字符。
   只允许写 键 以 '__probe_tmp_' 开头的行，finally 里必定按 _id 精确删除。
   注意：管理脚本走 /space/api/agent/v1/*（服务端），而网页走前端 __SMART_PAGE__.database。
   两者共用同一套存储，故字段长度限制大概率一致；即便不一致，结论也只当作参考，
   实现仍需做成「先试单行、失败自动降级分片」。
"""
import subprocess, json, io, csv, time, sys

TOK = sys.argv[1] if len(sys.argv) > 1 else ''
if not TOK:
    raise SystemExit('need token')

DB = 'FKpqucBa96f2slzvcU3jdV'
PY = r'C:/Users/依易亦奕鸭/.workbuddy/binaries/python/versions/3.13.12/python.exe'
DB_DIR = r'D:/workbuddy/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/library/database'


def run(script, args, stdin_bytes=None, extra_stdin=None):
    cmd = [PY, script] + args
    p = subprocess.run(cmd, input=stdin_bytes, capture_output=True, timeout=90, cwd=DB_DIR)
    return p.stdout.decode('utf-8', 'replace'), p.stderr.decode('utf-8', 'replace')


def add_records(records):
    # acquire_token() 读 stdin 首行，_read_input() 再 read() 剩余部分 → 拼在同一份 stdin 里
    body = json.dumps({'database_id': DB, 'records': records}).encode()
    stdin_bytes = (TOK + '\n').encode() + body
    return run('batch_add_database_records.py', ['--stdin'], stdin_bytes)


def read_rows(key_filter):
    out, err = run('get_database_content.py', ['--token-stdin', '--database-id', DB], TOK.encode())
    try:
        d = json.loads(out)
    except Exception:
        return None, out[:300]
    rows = list(csv.DictReader(io.StringIO(d.get('content', ''))))
    return [r for r in rows if key_filter(r)], None


def delete_ids(ids):
    if not ids:
        return 'nothing to delete'
    out, err = run('batch_delete_database_records.py',
                   ['--token-stdin', '--database-id', DB, '--record-ids', json.dumps(ids)],
                   None)
    return out.strip()[:200]


SIZES = [2000, 20000, 100000, 400000]
# validate_properties(record) 直接作用于 records 元素 → 元素本身就是 properties map
RECORDS = []
for n in SIZES:
    RECORDS.append({
        '键': {'text': '__probe_tmp_%d__' % n},
        '值': {'text': 'x' * n},
    })

created_ids = []
try:
    out, err = add_records(RECORDS)
    print('--- add 返回 ---')
    print(out[:900])
    print('stderr:', err[:300])
    try:
        d = json.loads(out)
        data = d.get('data') or d
        lst = data.get('records') if isinstance(data, dict) else None
        if isinstance(lst, list):
            for it in lst:
                rid = it.get('_id') or it.get('recordId') or (it.get('id') if isinstance(it, dict) else None)
                if rid:
                    created_ids.append(rid)
        elif isinstance(data, list):
            created_ids = [x.get('_id') for x in data if isinstance(x, dict) and x.get('_id')]
    except Exception as e:
        print('解析 add 结果失败:', e)
    print('已创建行数:', len(created_ids))

    time.sleep(1.0)
    rows, rerr = read_rows(lambda r: (r.get('键') or '').startswith('__probe_tmp_'))
    if rows is None:
        print('读取失败:', rerr)
    else:
        print()
        print('%-22s %10s %10s %s' % ('键', '写入长度', '读回长度', '结论'))
        for r in rows:
            k = r.get('键')
            n = int(k.replace('__probe_tmp_', '').replace('__', '')) if k else 0
            got = len(r.get('值') or '')
            verdict = '完整' if got == n else ('被截断至 %d' % got if 0 < got < n else '没写进去')
            print('%-22s %10d %10d %s' % (k, n, got, verdict))
        missing = set(SIZES) - set(int(r.get('键', '').replace('__probe_tmp_', '').replace('__', '')) for r in rows)
        if missing:
            print('未能写入的长度:', sorted(missing))
finally:
    print()
    print('--- 清理 ---')
    if created_ids:
        print(delete_ids(created_ids))
    else:
        # 没拿到 _id 就退而成奥特：按内容扫描残留行再删
        rows, _ = read_rows(lambda r: (r.get('键') or '').startswith('__probe_tmp_'))
        if rows:
            print('发现残留，需手工处理:', [r.get('键') for r in rows])
        else:
            print('无残留')
    time.sleep(0.8)
    rows, _ = read_rows(lambda r: (r.get('键') or '').startswith('__probe_tmp_'))
    prows = [r for r in rows if (r.get('键') or '').startswith('__probe_tmp_')] if rows else []
    print('复查残留:', len(prows))
    tot, _ = read_rows(lambda r: True)
    print('meta 表清理后总行数:', len(tot) if tot is not None else '?')
