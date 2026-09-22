# -*- coding: utf-8 -*-
import io, os

p = r"D:\workbuddyProjects\工作台3\.workbuddy\memory\2026-09-22.md"
s = io.open(p, encoding="utf-8").read()

entry = u"""

## v74 修复习惯健康页顶部「代码」+ 倒数日视觉重做（已上线 /57/）

### 用户反馈
1. 「习惯健康最上面的代码是什么？」——页面顶部出现一串 CSS 文本。
2. 「倒数日页面做的太丑了」——倒数日完全没有样式。

### 根因（两问其实是同一个 bug）
v73-B2 插入倒数日 CSS 时，锚点 `</style>` 命中的是**习惯健康视图里的内联 `<style>`**（文件里第一个 `</style>` 在 433 行主 style，第二次插入却落到了 606 行习惯页那个），而且插在了 `</style>` **之后** → 一大段 `.cd-sub{...}.cd-hero{...}.cd-row{...}` 变成可见文本渲染在习惯健康页最顶部，还留下 `</style></style>`。
连带后果：倒数日的 CSS 一条都没生效，所以页面丑。

**教训（新增铁律）**：页面里不止一个 `<style>`（`view-habits` 那个内联 style 排在主 style 之后但更靠前被 `find` 命中）。插 CSS 一律用**带上下文的唯一锚点**（如 `</style>\n  <title ...`），不要裸用 `</style>`；插完必须断言"该 section 的可见 HTML 里没有 CSS 文本"。

### 修复
1. 删除泄漏块（1191 字符），把 `.cd-*` 全部放回主 style（锚点 `</style>\n  <title data-page-node-id="N9uQg0dpiKTsyB4FFPFrxl"`），并加注释 `/* v74：倒数日样式已回归主 style */`。
2. 倒数日视觉重做（朴素、无彩色/阴影）：
   - Hero 改为两栏：左主卡（`cd-hero-main`：名称 17px + 38px 大数字 + 日期/农历元信息），右侧栏（`cd-hero-side`）列出接下来 2 个（`cd-hero-sm`）；≤640px 单栏堆叠。
   - 列表行：`cd-num`（等宽数字，tabular-nums）+ `cd-body`（名称/说明，单行省略）+ `cd-tag`（公历/农历）；`days<=7` 加 `.near`（边框与数字用 `--red`）；`days===0` 显示「今天」而不是 0 天。
   - 字体数字对齐用 `font-variant-numeric:tabular-nums`，避免天数跳动。

### 验证
- `node --check` 过；`_verify_v74.py` 全 FOUND，且习惯页可见 HTML 无残留 CSS、`style` 标签数=2。
- 新增 `_smoke_v74.js` 43/43；回归 v57 27、v63 32、v65 41、v67 22、v68 28、v69 39、v70 21、v71 28、v72 39、v73 56 —— 全部 0 失败。
- v73 的 B25 旧断言（检查 `cd-hero-days`）按新结构更新为 `cd-hero-count`；注意内置节日可能比测试构造的自定义项更近（9 月 22 日时国庆 9 天 < 构造的 10 天），断言不要写死天数。
- 部署 `/56/` → `/57/`，MISS 0。
"""

io.open(p, "w", encoding="utf-8", newline="").write(s + entry)
print("daily log appended")
