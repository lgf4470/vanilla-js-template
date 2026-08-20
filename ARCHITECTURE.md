# ARCHITECTURE.md

> 本文档是迁移后项目的架构真源。协作规则见 `AGENTS.md`，使用说明见 `README.md`；发生冲突时以本文件与 `AGENTS.md` 为准。

## 0. 设计目标

1. **零第三方依赖**：`package.json` 的 `dependencies` 与 `devDependencies` 必须为空。
2. **完整复刻模板体验**：保留 `.wrangler/html-template` 的 One API Shell、Dashboard、Tasks、Apps、Chats、Docs、API Hub、Settings、主题、工作空间、配置文件与鉴权行为；只把文件提升到当前仓库约定的目录。
3. **渐进式加载**：登录页只加载鉴权核心；登录后加载 Shell 与模块注册表；业务模块的实现、样式和语言包按路由懒加载。
4. **后端逻辑集中**：API 业务逻辑按 `server/modules/<id>/routes.js` 与 `service.js` 组织，运行时差异只存在于 `server/adapters/`。
5. **安全默认**：登录密码不落库；会话只保存 SHA-256 哈希；敏感设置通过 AES-256-GCM 加密后落库；SQL 全部参数化。

## 1. 目录结构

```text
.
├── index.html                 # PREPAINT + critical.css + bootstrap.js
├── app/
│   ├── core/                  # bootstrap、app、auth、api、settings、i18n、interactions
│   ├── components/
│   │   ├── layout/            # Shell 的布局入口与 shell 渲染器
│   │   └── ui/                # UI class 生成器、图标、头像、工作空间等公共能力
│   ├── styles/                # 模板 tokens、语义 token、关键样式、工具类
│   ├── fonts/                 # 模板本地字体资源目录
│   ├── lib/                   # 单文件前端库（如 Chart.js）
│   └── modules/
│       ├── registry.js        # 模块唯一登记点
│       ├── dashboard/
│       ├── tasks/
│       ├── apps/
│       ├── chats/
│       ├── docs/              # 含 sub/ 下四个文档子路由
│       ├── apihub/
│       └── settings/          # 含五个设置子路由
├── server/
│   ├── app.js                 # Web Request → Node 风格 API handler
│   ├── core/                  # API、鉴权、安全、HTTP、日志、环境
│   ├── db/                    # schema、scope、适配器工厂与 adapters/
│   ├── modules/               # auth、settings、apihub 路由与服务
│   ├── adapters/              # Node、Vercel、Cloudflare、Deno 入口
│   └── package.json           # 仅声明 server/ 内部使用 CommonJS
├── api/server.js              # Vercel 函数转接入口
├── shared/                    # 前后端共享常量与校验
├── scripts/                   # dev、build、lint、test、预算与数据库脚本
└── public/                    # 公开静态资源
```

仓库不使用迁移包装层：前端不得出现 `app/template/`，后端不得出现 `server/template/`。模板的原始说明文档仍位于 `.wrangler/html-template/`，不参与运行时产物。

## 2. 前端运行时

### 2.1 引导顺序

`index.html` 先执行 PREPAINT 脚本读取 `html-template-*` 本地设置，应用主题、语言、风格、圆角、字体和侧边栏属性，避免首帧闪烁；随后加载 `app/core/bootstrap.js`。

引导顺序固定为：

```text
critical.css
  → logger / i18n / icons-data / icons / api / auth / settings / ui
  → 若未登录：渲染 auth 登录卡片
  → 若已登录：tooltip / search / json-tree / color-picker / group-tree /
                tag-picker / avatar / shell / app / workspace / profile /
                interactions
  → app/modules/registry.js
  → App.start() → Shell → 当前路由模块
```

完整设计系统由 `bootstrap.js` 在鉴权核心之后加载 `tokens.css`、`semantic-tokens.css` 与 `utilities.css`；模块样式只在模块首次加载时注入。

### 2.2 Shell 与滚动契约

`app/components/layout/shell.js` 是模板 Shell 的唯一渲染器，负责侧边栏、顶栏、设置 Sheet、工作空间菜单和用户菜单；业务模块只向 `[data-content-area]` 返回页面 HTML，不直接改 Shell。

- 桌面端使用固定侧边栏 + 顶栏 + 主内容区；
- 移动端由 `app/core/interactions.js` 创建抽屉侧边栏；
- 内容区使用唯一的 `overflow-y-auto` 视口；
- 所有按钮、下拉、Sheet、Toast 和确认交互由公共 UI/class 生成器与事件委托完成，不使用浏览器默认弹窗或默认下拉视觉。

### 2.3 模块契约与懒加载

模块清单位于 `app/modules/<id>/module.config.js`，实际形状如下：

```js
const manifest = {
  id: 'dashboard',
  title: { 'zh-CN': '仪表盘', 'zh-TW': '儀表板', en: 'Dashboard' },
  icon: 'layout-dashboard',
  order: 1,
  route: '/',
  i18nNamespace: 'dashboard',
  loadRoot: () => import('./index.js'),
  load: 'index.js',
  css: 'module.css',
  i18nFile: 'i18n.js',
  submodules: [],
};
```

`app/modules/registry.js` 仅登记各模块的 `module.config.js`。清单加载后由 `App.registerModule()` 建立路由和侧边栏菜单；实现文件通过原生 `<script>` 注入懒加载，以保持迁移模板的 IIFE 运行方式与动态路径兼容。

模块实现调用：

```js
App.defineModule({
  id: 'dashboard',
  render(route, ctx) {
    return '<section>...</section>';
  },
});
```

Docs 和 Settings 的子模块使用 `sub/<id>.js` 并调用 `App.defineModule({ id, sub, render })`。模块之间不 import 其它业务模块，只依赖 `App.ui`、`App.icon`、`App.settings`、`App.i18n` 与 `ctx`。

### 2.4 路由、设置与国际化

应用使用 Hash 路由，支持 `/`、`/tasks`、`/apps`、`/chats`、`/docs/*`、`/apihub`、`/settings/*`；未知路径由 `App.ui.notFound()` 渲染 404。所有内容事件通过 `document` 委托绑定，重渲染后无需重复注册。

核心词典位于 `app/core/i18n.js`；模块词典由 `i18nFile` 在首次访问时写入 `window.__moduleI18n[id]`。支持 `zh-CN`、`zh-TW`、`en`，运行 `npm run i18n:check` 强制校验 key 集合一致。

设置状态由 `app/core/settings.js` 管理并保存到 `html-template-*` 本地键；登录后与服务端 `app_settings` 双向同步。工作空间注册表和当前指针属于 `global` 作用域，其余设置按活跃工作空间隔离。

## 3. 样式系统

`app/styles/tokens.css` 保留迁移模板的完整设计系统（Nova/shadcn 视觉语言、8 套风格、色板、暗色模式和组件规则）；`semantic-tokens.css` 提供迁移层的语义 token；`utilities.css` 保留模板补丁工具类；`critical.css` 只负责首帧基础布局与启动错误显示。

新增视觉规则必须优先使用模板已有 CSS token 和 utility class。不要在模块中新增硬编码颜色、圆角或间距；新公共 UI 能力必须遵循 `AGENTS.md` 的键盘可达性、暗色模式和滚动约束。

主题状态使用 `html.dark` 与 `style-*`、`base-*`、`chart-*`、`menu-*` class 组合，`App.settings.applySettings()` 负责把白名单值应用到根节点。

## 4. 后端架构

### 4.1 统一入口

`server/app.js` 提供统一的 `handleRequest(request, env)` 与 `createApp()`。Node 适配器把 `node:http` 请求转换为 Web `Request`，核心 handler 再将 Node 风格响应转换为 Web `Response`；业务路由不依赖具体平台。

- `server/adapters/node.entry.js`：本地开发与 Docker，静态资源 + API；
- `server/adapters/vercel.entry.js`：Vercel 函数响应转接；
- `server/adapters/cloudflare.entry.js`：Workers Assets 与 API 的入口；
- `server/adapters/deno.entry.mjs`：Deno.serve 与动态静态资源入口。

`server/package.json` 将后端 `.js` 文件限定为 CommonJS，避免根目录的 ESM 默认规则改变现有模板服务端实现。平台适配器只负责请求/响应和静态资源边界，路由与业务逻辑集中在 `server/core/` 与 `server/modules/`。

### 4.2 API 路由与鉴权

`server/core/api.js` 汇总 `auth`、`settings` 和 `apihub` 路由，并为所有非登录接口执行会话门禁。路由文件只负责参数读取、状态码和调用 service；API Hub 的公开路由、Bearer、全局密码与 API Key 策略由 `server/modules/apihub/service.js` 统一计算。

公开接口只有 `POST /api/auth/login`，原因是它是换取会话令牌的入口；其余管理接口默认需要 `x-auth-token`。登录密码来自 `AUTH_PASSWORD`，不会写入数据库。服务端生成随机会话令牌，数据库只写入 `auth_sessions.token_hash`、过期时间和选项；客户端按 `localStorage` 或 `sessionStorage` 保存令牌。

### 4.3 数据库与工作空间

`server/db/index.js` 根据 `DB_DRIVER` 加载适配器：

| 驱动 | 文件 | 场景 |
|---|---|---|
| `sqlite` | `server/db/adapters/sqlite.adapter.js` | Node ≥ 22 本地开发与 Docker |
| `turso` | `server/db/adapters/turso.adapter.js` | Vercel、Deno 或远程部署 |
| `d1` | `server/db/adapters/d1.adapter.js` | Cloudflare D1 或 D1 REST |

所有适配器提供 `query(sql, params)`、`get(sql, params)`、`run(sql, params)` 与 `initSchema(schema)`。schema 位于 `server/db/schema.js`，所有值使用参数绑定；业务 SQL 不允许字符串拼接参数。

`app_settings` 使用 `(workspace_id, key)` 复合主键。`server/db/scope.js` 规定只有 `settings:workspaces` 和 `settings:activeWorkspace` 写入 `global`，其余设置按当前工作空间写入。API Hub 的 `apihub_config`、`apihub_history`、`apihub_logs` 也包含工作空间字段。

### 4.4 敏感数据

`server/core/security/` 提供敏感键判断和 AES-256-GCM 封装。邮箱、API Key、Token、secret、credential 等可回显敏感值在 `app_settings` 或 API Hub secrets 写入前加密；读取时只在已鉴权响应中解密。`ENCRYPTION_KEY` 是 64 位 hex 的 32 字节主密钥；本地未配置时可生成 `server/.secret-key`，生产环境必须显式配置并安全保管。

### 4.5 日志与静态资源

`server/core/logging/logger.js` 提供服务端日志；API Hub 对请求历史和访问日志进行工作空间隔离、保留期和数量限制。`server/core/http/static.js` 只允许 `/`、`/index.html`、`/app/` 与 `/public/`，并阻断目录穿越、数据库、环境文件和服务端源码暴露；公开资源提供 MIME、安全头、ETag 和缓存策略。

## 5. 构建与体积预算

`npm run build` 执行 `scripts/build.js`：清理并复制 `index.html`、`app/`、`public/`、`shared/` 到 `dist/`，删除测试文件，对 JS/CSS 做零依赖安全压缩，并保持动态脚本路径不变。

`npm run build:budget` 的阈值为：

| 指标 | 阈值 |
|---|---|
| 首屏 JS（gzip） | ≤ 40KB |
| 单个懒加载模块文件（gzip） | ≤ 15KB |
| 首屏关键 CSS（gzip） | ≤ 8KB |

模块报告同时显示一个模块的资源总量；失败判断按每个独立懒加载文件的最大 gzip 值执行，因为实现 JS、语言包和 CSS 是浏览器分别请求的独立 chunk。

## 6. 部署矩阵

| 平台 | 入口 | 静态资源 | 数据库 |
|---|---|---|---|
| Node / Docker | `server/adapters/node.entry.js` | Node 白名单静态服务 | SQLite 或 Turso |
| Vercel | `api/server.js` → `server/adapters/vercel.entry.js` | `dist/` + Vercel rewrite | Turso |
| Cloudflare | `server/adapters/cloudflare.entry.js` + `wrangler.toml` | Workers Assets `dist/` | D1 |
| Deno | `server/adapters/deno.entry.mjs` | Deno 动态静态服务 | Turso |

部署 CLI 不写入依赖字段；按 `justfile` 中的 `npx <cli>@version` 命令临时调用。部署前运行 `npm run build` 和 `freebuff-deploy check`，生产密钥通过平台环境变量设置。

## 7. 验证命令

```bash
npm run deps:check
npm run lint
npm test
npm run i18n:check
npm run build
npm run build:budget
```

所有迁移后的前端与后端文件必须通过这些检查；不要用忽略规则掩盖语法错误、禁用浏览器默认控件或依赖体积问题。