# ADR-001: 不用任何前端框架，改用原生 Web Components

- 状态：已废弃（实现未按此落地；UI 实际为 `app/components/ui/` 的 `App.ui.*` 函数式 HTML 渲染，见 ARCHITECTURE.md 2.3 与 AGENTS.md 4.3）
- 日期：2025-01（废弃于 2026-08）

## 背景
项目硬约束为"零第三方运行时依赖"（`package.json` 的 dependencies/devDependencies 恒为空）。

## 决策
前端 UI 全部基于原生 Custom Elements + Shadow DOM 手写实现，不引入 React/Vue/Svelte。

## 理由
- 满足"零第三方包"硬约束；
- Shadow DOM 天然提供组件级样式隔离，契合"模块解耦、互不影响"的要求；
- 组件只消费全局 Design Token（CSS 变量可穿透 Shadow 边界），暗黑模式仅需切换 `<html data-theme>`。

## 后果
- 公共组件集中在 `app/components/ui/`，命名前缀 `ui-*`，跨模块复用必须先"毕业"到这里；
- 新增组件必须支持键盘可达性（Tab/Enter/Esc）并在 light/dark 下自测。