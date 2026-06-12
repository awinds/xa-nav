# XA Nav

XA Nav 是一个基于 React、Vite、Cloudflare Pages Functions 和 Cloudflare D1 的书签导航页面，支持公开导航、管理员后台、智能填充、友情链接、备份恢复和多语言界面。

English documentation: [README_en.md](README_en.md)

## 功能特性

- 首页支持站内搜索、外部搜索、分类侧边栏、父子分类 Tab 和网址卡片展示
- 管理员登录后，首页右下角显示快捷添加收藏按钮，可直接弹窗添加网址并智能填充站点信息
- 后台支持网址管理、分类管理、友情链接管理、系统配置和备份恢复
- 分类支持 Font Awesome 图标、排序、父子级和私密分类
- 私密分类仅管理员登录后显示，未登录用户不会获取私密分类及其网址
- 友情链接支持站点名、图标、描述、URL、排序和启用状态，并在首页底部展示
- 登录支持图片验证码和 Cloudflare Turnstile
- 登录 Cookie 有效期可在后台按小时配置
- 网站名称、Logo URL、页脚版权、默认语言和 Favicon API 接口前缀可在后台配置
- 默认 Logo 来自 [src/images/logo.png](src/images/logo.png)
- 网址智能填充会优先保存网站自身图标；未获取到图标时留空，显示时使用 Favicon API 前缀拼接域名
- 可通过后台开关启用 Workers AI，在无法获取描述或标签时自动生成 Meta 信息，默认关闭
- 支持 JSON 备份导入导出
- 支持浏览器书签 HTML 文件导入导出
- 支持中文和英文界面

## 技术栈

- 前端：React 18、React Router、Vite、Tailwind CSS
- 后端：Cloudflare Pages Functions
- 数据库：Cloudflare D1
- 可选能力：Cloudflare Turnstile、Workers AI

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动前端开发服务器

```bash
npm run dev
```

前端默认地址：

```text
http://localhost:5173
```

Vite 已配置 `/api` 代理到 Cloudflare Pages Functions 本地服务：

```text
http://localhost:8788
```

### 3. 启动 Cloudflare Pages Functions 本地服务

Cloudflare Pages Functions 需要通过 Wrangler 启动。建议先构建前端，再启动 Pages dev：

```bash
npm run build
npx wrangler pages dev dist --port 8788
```

接口地址示例：

```text
http://localhost:8788/api/categories
```

前端访问 `/api/*` 时会由 Vite 代理到该服务。

如果修改了 [functions/](functions/) 下的后端接口代码，建议重启 Wrangler Pages dev，避免旧进程继续提供旧逻辑。

### 4. 初始化 D1 数据库

先使用 [db/schema.sql](db/schema.sql) 创建 D1 表结构。表结构存在后，应用在首次读取系统配置或分类时会自动写入默认配置和默认分类，不再需要访问 seed 接口。

本地示例：

```bash
npx wrangler d1 execute xa_nav --local --file db/schema.sql
```

默认管理员账号来自环境变量，未配置时为：

```text
账号：admin
密码：admin123
```

`AUTH_SECRET` 可不配置；未配置时程序会使用内置强随机默认值。生产环境如需自定义登录签名密钥，可在 Cloudflare Pages 环境变量中覆盖。

## 构建

```bash
npm run build
```

构建产物输出到：

```text
dist
```

本地预览构建产物：

```bash
npm run preview
```

## Cloudflare Pages 部署

### 1. 创建 D1 数据库

在 Cloudflare 控制台创建 D1 数据库，例如：

```text
xa_nav
```

然后在 Cloudflare Pages 项目中绑定 D1：

```text
Binding name: D1
Database: xa_nav
```

如果通过 Wrangler 管理，请在 [wrangler.toml](wrangler.toml) 中确认 D1 绑定：

```toml
d1_databases = [
  { binding = "D1", database_name = "xa_nav" }
]
```

### 2. 配置 Workers AI 绑定（可选）

Workers AI 用于网址智能填充缺失描述或标签时生成内容，后台开关默认关闭。

[wrangler.toml](wrangler.toml) 已包含绑定示例：

```toml
[ai]
binding = "AI"
```

如果不使用 AI Meta 功能，可以保持后台开关关闭。

### 3. Cloudflare Pages 构建配置

在 Cloudflare Pages 项目中配置：

```text
Build command: npm run build
Build output directory: dist
Functions directory: functions
```

### 4. 配置环境变量

需要配置以下环境变量：

- `ADMIN_USER`：后台管理员账号，未配置时为 `admin`
- `ADMIN_PASSWORD`：后台管理员密码，未配置时为 `admin123`

以下环境变量可选，未配置时会使用代码内置强随机默认值：

- `AUTH_SECRET`：登录 Cookie 和图片验证码签名密钥

[wrangler.toml](wrangler.toml) 中的 `[vars]` 仅保留管理员账号密码作为本地开发示例，生产环境建议在 Cloudflare Pages 控制台中配置变量。

### 5. 初始化生产数据库

部署前或部署后，在 Cloudflare D1 中执行 [db/schema.sql](db/schema.sql) 创建表结构。表结构创建完成后，首次访问站点或后台接口时会自动补齐默认系统配置和默认分类。

生产环境可通过 Cloudflare 控制台的 D1 SQL 页面执行 [db/schema.sql](db/schema.sql)，也可以使用 Wrangler：

```bash
npx wrangler d1 execute xa_nav --remote --file db/schema.sql
```

## 系统配置说明

后台“系统配置”中可维护：

- 网站名称
- 网站描述
- Logo URL
- 页脚版权
- 默认语言
- 登录 Cookie 有效期（小时）
- 图片验证码开关
- Cloudflare Turnstile 开关、Site Key、Secret Key
- Favicon API 接口前缀
- AI 获取 Meta 开关

说明：

- Turnstile Site Key 和 Secret Key 在后台维护，Secret Key 不会在配置接口中明文返回
- 未完整配置 Turnstile 时，登录页不会显示 Turnstile，也不会强制验证 Turnstile
- Logo URL 留空时使用构建内置默认 Logo
- Favicon API 前缀会直接拼接去掉协议后的域名，例如：

```text
https://faviconsnap.com/api/favicon?url= + www.v2ex.com
https://icon.horse/icon/ + www.v2ex.com
```

- “启用 AI 获取 Meta”默认关闭；开启后也会优先使用网站自身 Meta，只有描述或标签获取不到时才调用 Workers AI

## D1 表结构

主要数据表：

- `config`：平台配置项，包含站点标题、Logo、页脚版权、Favicon API、AI Meta 开关、验证码、Turnstile、默认语言等
- `categories`：分类目录，支持父级子分类、默认分类、私密分类和 Font Awesome 图标
- `bookmarks`：网址书签，支持 Favicon、排序、标签和启用状态
- `friend_links`：友情链接，支持站点图标、描述、URL、排序和启用状态

## 常用命令

```bash
# 安装依赖
npm install

# 启动 Vite 前端
npm run dev

# 构建前端
npm run build

# 本地预览构建产物
npm run preview

# 启动 Cloudflare Pages Functions 本地服务
npx wrangler pages dev dist --port 8788

# 如需测试远程 D1 / Workers AI 等 Cloudflare 资源
npx wrangler pages dev dist --port 8788 --remote
```

## 目录说明

```text
src/                 前端源码
src/pages/           页面组件
src/lib/             前端工具和国际化
src/images/          静态图片资源
functions/           Cloudflare Pages Functions 接口
functions/api/       API 路由
functions/lib/       后端公共工具
```
