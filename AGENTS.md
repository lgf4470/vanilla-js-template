# AGENTS.md

> 面向所有在本仓库工作的 AI 编码助手与人类开发者的操作规则。架构原理见 `ARCHITECTURE.md`（有冲突以该文件为准），本文件只讲"怎么做、别做什么"。

---

## 1. 硬性红线（不可协商，违反即视为错误提交）

1. **禁止安装任何第三方运行时依赖**。`package.json` 的 `dependencies` / `devDependencies` 必须始终为 `{}`。平台部署 CLI（`wrangler` `vercel` `deno` `docker`）作为外部工具通过 `npx <cli>@version` 临时调用，不写入依赖字段。
2. **禁止使用浏览器内置弹窗/控件默认视觉**：`window.alert()` `window.confirm()` `window.prompt()`、原生 `<dialog>`/`<select>` 默认样式一律禁止，必须使用 `app/components/ui/` 的自研组件（`App.ui.*` 函数式渲染：`buttonClass` `dropdownContentClass` `toast` `radio` 等，见 `ARCHITECTURE.md` 2.3）。
3. **禁止硬编码颜色/圆角/间距字面量**。颜色与圆角一律通过 `app/styles/tokens.css` 定义的 CSS 变量消费，新增视觉样式前先检查 token 是否已存在，缺失则先在 `tokens.css` 补充（颜色由 `just lint` 强制检查，含 CSS）；间距优先使用 `--spacing` 刻度（`calc(var(--spacing) * N)`），新增代码不得写死 rem/px 间距。
4. **禁止跨模块直接 import**。`app/modules/<A>` 不得 import `app/modules/<B>` 内部任何文件。确需复用，先把代码"上移"到 `app/components/ui`（组件/渲染函数）或 `shared/`（纯函数/常量），再各自引用。
5. **页面级滚动只由壳层承担**：`html`/`body`/`#app` 不滚动，唯一的页面级滚动视口是壳层 `[data-slot="scroll-area-viewport"]`（`overflow-y: auto`）。业务模块如需工作台式多栏布局（如 apihub、settings），可在模块内部使用独立 `overflow-y: auto` 容器，但不得引入第二个页面级滚动视口。
6. **新增业务模块禁止修改壳层文件**（`app/components/layout/*`、`app/core/app.js`、`app/core/bootstrap.js`）。唯一允许改动的登记点是 `app/modules/registry.js` 新增一行。
7. **SQL 一律参数化，禁止字符串拼接拼 SQL**（参数统一经适配器绑定，见 `ARCHITECTURE.md` 4.3）。
8. **敏感字段禁止明文入库**（清单见 `ARCHITECTURE.md` 4.6 节：用户信息、API Key、Token、需要落库的数据库凭证等）。新增涉及敏感字段的表/接口前，先确认加密/哈希方案，不确定就询问而不是自行明文实现。
9. **禁止引入 ORM 或查询构建器依赖**，保持 SQL-first。
10. **建表 SQL 单一来源、只增不改**：`server/db/schema.js` 是唯一事实来源，新表只追加 `CREATE TABLE IF NOT EXISTS`（幂等）；旧结构迁移在适配器 `migrateAppSettings` / `migrateAuthSessions` 中幂等执行，不得修改已合并的迁移逻辑。

---

## 2. 新增一个"模块"（侧边栏一级菜单）标准流程

1. 新建 `app/modules/<id>/`，包含 `module.config.js` `index.js` `module.css` `i18n.js`（子模块另建 `sub/`）；
2. `module.config.js` 按 `ARCHITECTURE.md` 2.3 节的 `ModuleManifest` 形状导出清单（id / icon / order / i18nNamespace / loadRoot / load / css / i18nFile / submodules）；
3. 在 `app/modules/registry.js` 补一行 `import()` 登记；
4. 新建 `server/modules/<id>/routes.js`（必要时配 `service.js`），在 `server/core/api.js` 的路由汇总处登记（同样只加一行，不改其它模块路由）；
5. 若需要新表：在 `server/db/schema.js` 追加 `CREATE TABLE IF NOT EXISTS`，表名遵循 `[module]_[entity]`；
6. 在 `i18n.js` 补齐三语言（`en` / `zh-CN` / `zh-TW` 三个对象），跑 `just i18n:check` 确认三语言 key 对齐；
7. 补单元测试（源码同目录 `*.test.js`），跑 `just test`；
8. 跑 `just lint` 与 `just build:budget` 确认不超体积预算；
9. 提交前对照第 9 节"提交前自检清单"。

## 3. 新增一个"子模块"（二级菜单）标准流程

同上，实现文件放 `app/modules/<parent>/sub/<id>.js`（调用 `App.defineModule({ id, sub, render })`），`module.config.js` 中父模块的 `submodules` 数组补一项；子模块纯前端渲染，无独立后端路由；子模块与同级其它子模块之间同样禁止相互 import。

## 4. 新增/复用 UI 组件规范

- 先搜索 `app/components/ui/` 是否已有可复用组件，**禁止在模块私有目录重复造已存在的基础组件**（按钮、卡片、弹窗、输入框、下拉、Tabs 等）；
- 只有明确"仅本模块使用、不具备通用性"的组件才放在模块的 `components/` 目录；
- 新建公共组件必须：沿用 `App.ui` 函数式渲染（返回 HTML 字符串，不使用 Shadow DOM）、只消费 token 变量（不硬编码视觉数值）、支持键盘可达性（Tab/Enter/Esc）、在 light/dark 两套主题下自测；
- 涉及信息展示类组件（卡片、列表项等）必须遵循 `ARCHITECTURE.md` 3.6 节"反留白铁律"：默认使用 `--spacing-3`、数值类信息配图标、空状态必须有图标+引导文案。

## 5. 数据库变更规范

- 新表命名：`[module]_[entity]`，子模块专属表：`[module]_[submodule]_[entity]`；
- 全局配置一律走 `app_settings`，key 命名 `domain:subject[:field]`（如 `settings:profile`、`accounts:webdav`），**不要为全局配置新建专用表**；
- 涉及敏感字段：确认 `schema.js` 中字段类型为 `TEXT`（存放密文，格式 `enc:v1:<iv>:<tag>:<ct>`，见 `ARCHITECTURE.md` 4.4），读写必须显式调用 `server/core/security/index.js` 的 `encrypt` / `decrypt` 封装，**不允许绕过封装直接读写敏感字段**；
- `schema.js` 只追加不修改（`CREATE TABLE IF NOT EXISTS` 幂等），旧结构迁移逻辑（`migrateAppSettings` / `migrateAuthSessions`）不得改动已合并行为。

## 6. API 路由新增规范

- 路由放在对应模块的 `routes.js`，业务逻辑放 `service.js`，**路由函数本身不写 SQL / 不写加解密逻辑**，只做参数校验 + 调用 service（现有 `auth` / `settings` 路由内联 SQL 属历史实现，新增路由遵循此约定）；
- 所有需要鉴权的路由默认经过 `server/core/api.js` 的会话门禁（`x-auth-token`）校验，公开路由需显式标注并说明理由；
- 只读 `GET` 接口需要考虑是否设置 `Cache-Control`（见 `ARCHITECTURE.md` 4.7 节缓存分层），避免每次都击穿到 DB。

## 7. i18n 新增文案流程

1. 在对应模块 `i18n.js` 的 `window.__moduleI18n['<id>']` 中新增 key（命名空间 `<module>.<scope>.<name>`）；
2. 同步补齐 `en` / `zh-CN` / `zh-TW` 三个语言对象的同一 key；
3. 跑 `just i18n:check`，确认三语言 key 集合完全一致，缺一个都视为失败（脚本已覆盖模块 `i18n.js`）；
4. 壳层通用文案（按钮、通用提示等）改 `app/core/i18n.js`，命名空间 `sidebar.*` / `settings.*` 等。

## 8. 性能与体积自检

- 新增依赖大量代码前，先跑一次 `just build:budget`，确认当前基线；改动后再跑一次对比增量；
- 单模块 chunk 目标 ≤ 15KB（gzip），若超出，优先考虑：拆更小的子路由懒加载、复用公共组件而非复制代码、检查是否有未裁剪的调试代码；
- 禁止为图方便引入整份第三方图标库/字体文件到仓库，图标走 `app/components/ui` 内已有的 SVG 图标集，新增图标需精简 SVG（去冗余属性）。

## 9. 提交前自检清单（每次提交前逐项确认）

- [ ] `just deps:check` 通过（无第三方依赖）
- [ ] `just lint` 通过（无禁用模式：`window.alert` 等）
- [ ] `just test` 通过
- [ ] `just i18n:check` 通过
- [ ] `just build:budget` 通过（未超体积预算）
- [ ] 涉及新模块/子模块：`registry.js` 已登记，且未触碰壳层文件
- [ ] 涉及敏感字段：已走加解密封装，未明文入库
- [ ] 涉及 SQL：已参数化（无字符串拼接）
- [ ] 涉及 UI：未使用 `window.alert/confirm/prompt`，样式全部走 token
- [ ] 涉及信息卡片类 UI：已核对"反留白铁律"
- [ ] Commit message 符合 Conventional Commits 且正文逐文件说明改动（见第 10 节）

## 10. Commit Message 规范

格式与完整示例见 `ARCHITECTURE.md` 第 8 节，此处仅重申硬性要求：

- Header：`<type>(<scope>): <简短描述>`，`type` ∈ `feat|fix|refactor|perf|style|docs|test|build|ci|chore`；
- **正文必须逐文件列出改动**，且精确到"新增/修改了哪个方法或组件"，禁止只写"优化了笔记模块"这类无法回溯的粗粒度描述；
- 一次提交只做一件语义完整的事，禁止把无关模块的改动混在同一个 commit。

## 11. Code Review Checklist（评审者/评审 Agent 使用）

- [ ] 是否有跨模块直接 import？（应重构到 `shared/` 或 `components/ui`）
- [ ] 是否有硬编码视觉数值 / 原生浏览器弹窗？
- [ ] 新表/新字段命名是否符合规范？敏感字段是否走加密？
- [ ] SQL 是否参数化？是否有 N+1 查询可以合并？
- [ ] 是否更新了三语言文案？
- [ ] 是否需要同步更新 `ARCHITECTURE.md`（见第 12 节判断标准）？
- [ ] Commit message 是否逐文件说明到方法/组件级别？

## 12. 何时必须同步更新 `ARCHITECTURE.md` / `README.md`

以下变更**必须**在同一 PR 内同步更新 `ARCHITECTURE.md` 对应章节，否则视为文档漂移、评审不通过：

- 新增/更换数据库适配器或自动选型逻辑；
- 调整鉴权机制（令牌格式、会话时长选项、传输方式）；
- 新增部署平台或调整某平台默认数据库；
- 调整目录结构约定、模块注册契约（`ModuleManifest` 形状）；
- 调整体积/性能预算数值。

`README.md` 需要同步更新的情形：新增/变更环境变量、新增部署平台、新增语言、常用命令（justfile）增删。
