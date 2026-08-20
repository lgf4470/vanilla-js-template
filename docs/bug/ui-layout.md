# Bug 记录：布局 / 滚动 / 间距（ui-layout）

> 覆盖：页面级滚动视口、工作台式多栏布局、间距/尺寸设置。
> 相关铁律：AGENTS.md §1.5（页面级滚动只由壳层承担）。

---

## BUG-001: 设置页左右两栏联动滚动、左栏过宽、右栏无 padding

- 类型：ui-layout
- 严重度：中（可见功能问题，非崩溃）
- 发现时间：2026-08-20
- 修复提交：`4152bc0`（fix(settings): 设置页左右两栏独立滚动并收紧布局）
- 涉及文件：
  - `app/modules/settings/module.css`（`.sp-body` / `.sp-nav-col` / `.sp-content` / `.sp-section-body`）
  - `app/core/app.js`（`rerenderContent()` 滚动位置保存/恢复）
- 涉及组件：设置模块（settings，壳层二级菜单工作台式布局）

### 现象

1. 右侧内容项一多，向下滚动时**左边的设置项会被滚上去看不见**（左右两栏共享同一滚动，未独立）；
2. 左侧设置项**宽度太宽**（20%），布局不紧凑；
3. 右侧内容区 **padding 为 0**（实际只有左右 20px、上下 4px），容器边框被内容遮挡。

### 根因

- 右栏 `.sp-content` 没有确定高度：`.sp-body` 未铺满可用高度，页面级滚动由壳层
  `[data-slot="scroll-area-viewport"]` 承担，导致左栏 `.sp-nav-col` 跟随页面滚动被滚走；
- 左栏 `.sp-nav-col` 缺少独立 `overflow-y:auto` 与 `min-height:0`（flex 子项高度溢出陷阱）；
- `.sp-body` 桌面端列间距 `3rem` 过宽；`.sp-content` 上下 padding 只有 4px。

### 修复过程

1. `module.css` 高度链：新增 `[data-content-area]:has(.sp-page)` 高度铺满 +
   `.sp-page { height: 100% }`，让 `.sp-body` 获得确定高度，从而 `.sp-content` 可独立滚动；
2. 左栏 `.sp-nav-col`：`overflow-y:auto` + `min-height:0` 独立滚动，宽度 20% → **12rem**；
3. 右栏 `.sp-content`：`overflow-y:auto` 独立滚动，四边统一 **20px padding**；
4. `.sp-body` 桌面端列间距 `3rem → 1rem`；移除 `.sp-section-body` 冗余的内层滚动与 padding-right；
5. `app.js rerenderContent()`：设置页重渲染时额外保存/恢复右侧 `.sp-content` 的滚动位置，
   避免两栏独立滚动后开关/单选变更把右栏弹回顶部。

### 验证

- 预览手测：右侧内容加多滚动，左栏固定不动；左栏自身内容多时可独立滚动；
- 切换开关/单选后右栏滚动位置保留（不弹回顶部）；`just lint` / `just test` 通过。

### 防坑指南

- 工作台式多栏布局（apihub、settings 等）：**每栏必须是独立 `overflow-y:auto` 容器**，
  且作为 flex 子项时必须配 `min-height:0`（否则子项高度被内容撑破、无法滚动）；
- 独立滚动容器必须有**确定的高度链**（父级高度铺满），可用 `:has()` 选择器锚定
  `[data-content-area]:has(.sp-page)` 打通高度链；
- 业务模块内部允许使用独立 `overflow-y:auto`，但**不得引入第二个页面级滚动视口**
  （铁律 §1.5，页面级滚动只由壳层承担）；
- 模块内部重渲染（设置项变更）时，若容器可滚动，必须保存/恢复滚动位置，否则每次切换弹回顶部。
