#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_local_storage_snippets.py —— 打印 localStorage 备份/恢复的浏览器控制台片段。

打开工作台页面（https://www.workbuddy.cn/space/d/muRdSFuIXga85vsZfTsTJ4）
按 F12 打开 DevTools → Console 面板，粘贴下方命令即可一键导出/导入。

localStorage 的 key 固定为 `richangji-state-v1`，包含整个应用状态：
  records / mediaItems / habits / settings / drafts
  + 每条记录上的 remoteId / syncTriedAt / createdAt（用于与云端 merge）
"""
EXPORT_SNIPPET = r"""
(function(){
  var KEY = 'richangji-state-v1';
  var raw = localStorage.getItem(KEY);
  if(!raw){ alert('localStorage 中没有数据：' + KEY); return; }
  var blob = new Blob([raw], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'richangji-localstorage-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  try {
    var parsed = JSON.parse(raw);
    var recCount = (parsed.records||[]).length;
    var mediaCount = (parsed.mediaItems||[]).length;
    var habitCount = (parsed.habits||[]).length;
    console.log('[备份] 已下载，records=' + recCount + ' / media=' + mediaCount + ' / habits=' + habitCount);
  } catch(e){ console.warn('[备份] 下载完成但统计失败', e); }
})();
""".strip()

IMPORT_SNIPPET = r"""
(function(){
  var KEY = 'richangji-state-v1';
  var input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = function(){
    var f = input.files[0]; if(!f){ return; }
    var reader = new FileReader();
    reader.onload = function(){
      try {
        var data = JSON.parse(reader.result);
        if(!data || typeof data !== 'object' || !Array.isArray(data.records)){
          alert('备份格式不正确：缺少 records 字段'); return;
        }
        if(!confirm('将覆盖当前 localStorage（含 ' + (data.records||[]).length + ' 条业务记录），是否继续？')) return;
        localStorage.setItem(KEY, JSON.stringify(data));
        location.reload();
      } catch(e){
        alert('解析失败：' + e.message);
      }
    };
    reader.readAsText(f);
  };
  input.click();
})();
""".strip()


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, help="输出目录（snippet.txt 会写到此处）")
    args = parser.parse_args()

    out = __import__('pathlib').Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    snippet_path = out / "_localStorage_snippets.txt"
    content = (
        "================ localStorage 导出片段（粘到 DevTools Console 执行） ================\n\n"
        + EXPORT_SNIPPET
        + "\n\n================ localStorage 导入片段（粘到 DevTools Console 执行） ================\n"
        + "\n（警告：导入会覆盖当前 localStorage 并刷新页面）\n\n"
        + IMPORT_SNIPPET
        + "\n"
    )
    snippet_path.write_text(content, encoding="utf-8")
    print(f"已写入: {snippet_path}")
    print()
    print("用法：")
    print("  1) 打开 https://www.workbuddy.cn/space/d/muRdSFuIXga85vsZfTsTJ4")
    print("  2) F12 → Console")
    print("  3) 粘贴上方'导出片段' → 回车 → 浏览器下载 .json 文件")
    print("  4) 把 .json 放到此备份目录即可一并保存")


if __name__ == "__main__":
    main()
