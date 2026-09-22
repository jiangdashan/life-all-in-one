# -*- coding: utf-8 -*-
p = r'D:\workbuddyProjects\工作台3\.workbuddy\memory\2026-09-22.md'
add = '''

## v79 库存总览位置筛选不生效（上线 /63/，MISS 0）

### 根因
`renderStorageOverview` 只应用分类筛选（`storageFilter`）+ 总览搜索，**从未应用 `state.settings.storageLoc`**。点位置块 → `_locClick` 设 storageLoc → `renderStorage()` 只过滤了清单列表，总览（分类卡/条形图/提醒/明细）依旧全量 → 看起来"没生效"。

### 修复（纯 JS 3 处）
1. `renderStorageOverview` 中 `renderStorageLocGroups(records)` **之后**（归类块保持全量便于切换其它位置）加 `_locF` 过滤，cats/bar/alerts/list 全部生效。
2. `storageOvFilterNote` 提示条组合显示：分类部分（原样）+ 位置部分 `位置「X」· N 种 / M 件`，位置带独立 `data-action="storage-loc-clear"` 清除按钮。
3. action 委托注册 `storage-loc-clear`：清 storageLoc → saveState → renderStorage。

### 验证
- playwright-core + Edge 手机视口实测：注入厨房3/卫生间2/无位置1 共6条 → 点「厨房」归类块，明细 6→3、归类块仍 3 组可切换且高亮、提示条正确；点清除恢复 6 条；从清单筛选条选「卫生间」总览同步过滤为 2 条。**11/11 PASS**。
- node --check 通过（script 414,627 字符）。

### 踩坑
- **改 _deploy.py 标记列表时 `s.find(']')` 会停在含 `]` 的字符串中间**（如 `.cd-inline input[type=checkbox]{...}`），把新标记插进字符串里截断列表 → 必须用「列表真实结尾的完整锚点」（如最后一项+`\\n]`）定位，改完 ast.literal_eval 校验 + 全标记对主文件 grep MISS 应为 0。
'''
open(p, 'a', encoding='utf-8').write(add)
print('appended', len(add))
