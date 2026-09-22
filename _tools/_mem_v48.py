# -*- coding: utf-8 -*-
import io

p = r'.workbuddy\memory\MEMORY.md'
s = io.open(p, encoding='utf-8').read()

row = (
    "| v48 | /25/ | 七项改动：①**热力图表头对齐**——旧公式 `Math.round(28-i*26/25)` 与真实偏移整体错一位且未锚定今天；改为 `ago=29-i`，每 5 列标注、最右(今天)显示「今」(`.heat-today`)；"
    "②**AI 菜谱 ≥10 道**——菜谱库扩到 42 道(早10/午11/晚11/加餐10，旧版每餐仅 2-3 道、加餐时段直接空白)，`MIN_RECIPES=10` 按贴合剩余热量排序，`.recipe-list` 限高滚动+「略超当前缺口」标记；"
    "③**心情页顶部三小指标移除**——根因 `.metric-row{display:grid}` 覆盖了 `hidden` 属性，故直接删 DOM + renderMood 加空值保护；"
    "④**心情月历点击详情**——新增 `#moodDayDetail` + `renderMoodDayDetail()`，所有日期格可点(`data-action=\"mood-day\"`)，展示当天表情/标签/文字记录，可删除，再点收起(`state.settings.moodSelDate`)；"
    "⑤**库存使用频率排行**——`state.settings.storageUsage[id]={n,first,last,m{月}}`（存 settings 避免改云端表结构），每次「减少」`_bumpUsage(id,1)`，频次=累计÷跟踪天数×30，Top10 排行+「按频次/按累计」切换(`storageFreqSort`)；"
    "⑥**书影音搜索**——`#mediaSearchInput` 名称/类型/状态/短评实时过滤，`_mediaSearch` 全局，清除按钮 `media-search-clear`；"
    "⑦**新增睡眠统计模块**——新建云端表 sleep=`4rjX5sVnSNNfS2mk16nR2W`(日期/入睡时间/醒来时间/深睡/浅睡/REM/清醒时长/零星小睡/备注/userId，时长统一存**分钟**)，导航插在 fitness 与 home 之间(桌面+手机)、新增 `i-sleep` 图标、TYPE_META/归档 chip/归档时间轴、pushSleep/updateRemoteSleep/deleteRemoteSleep/mergeSleep/runMerge(pending 10→11)/DIAG_TABLES(+sleep)，`_sleepMetrics` 算卧床/实际睡眠/效率/深睡%/REM%/评分(时长.4+深睡.2+REM.15+效率.25)，`_sleepAdviceFor` 出建议，日/周/月/年切换(`sleepRange`/`sleepDay`)。"
    "已上线 **/25/**（496957 字符，12/12 标记全 FOUND，活页 nodes 已含 sleep 表）。新增 `_tools/_smoke_v48.js`(41/41 通过) |"
)
a = "\n| v47 | /24/ |"
assert s.count(a) == 1
# 插到 v47 行之后（v47 行以 | 结尾，找到其后换行）
idx = s.index(a)
end = s.index('\n', idx + len(a) + 1)
# v47 行本身可能跨行，找到下一个以 "| v" 或 "---" 开头的行
nxt = s.find('\n\n', idx)
s = s[:nxt] + '\n' + row + s[nxt:]

s = s.replace("当前静态 **/24/**（v47 已部署）", "当前静态 **/25/**（v48 已部署；12 张云表）")
s = s.replace("内含 import(带 11 表)", "内含 import(带 12 表)")

io.open(p, 'w', encoding='utf-8').write(s)
print('MEMORY.md updated')
