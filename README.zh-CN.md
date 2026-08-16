# Dawngrid

[English](./README.md)

一次登录，一张格子，集群、训练、机器人、已经在跑的前端，都以插件挂上来

身份、壳、网关、审计在这个仓库，领域产品待在自己的仓里，不要把 Pod 或训练 Run 写进宿主

## 做什么

- 登录后先看到空间格，浮岛导航，七种地板
- 人、角色、组织 / 项目、审计
- 编译期插件：native 页面，或 iframe 包一层别人的控制台
- 运行时装卸，不必重建
- 粘贴 URL 立刻成格；对方拒嵌套就新标签打开
- Dawn / Ion / Tide 三套主题，亮暗各一套

## 截图

<details>
<summary>壳</summary>

<details>
<summary>登录</summary>

<img src="docs/screenshots/01-login.png" alt="登录" width="920" />

</details>

<details>
<summary>空间格</summary>

<img src="docs/screenshots/02-grid.png" alt="空间格" width="920" />

</details>

<details>
<summary>空间格（暗色）</summary>

<img src="docs/screenshots/16-grid-dark.png" alt="空间格暗色" width="920" />

</details>

<details>
<summary>布局</summary>

<img src="docs/screenshots/13-settings.png" alt="布局与主题" width="920" />

</details>

</details>

<details>
<summary>插件</summary>

<details>
<summary>Hello</summary>

<img src="docs/screenshots/03-hello.png" alt="Hello 原生插件" width="920" />

</details>

<details>
<summary>Images</summary>

<img src="docs/screenshots/04-images.png" alt="Images demo" width="920" />

</details>

<details>
<summary>Train</summary>

<img src="docs/screenshots/05-train.png" alt="Train demo" width="920" />

</details>

<details>
<summary>Robot</summary>

<img src="docs/screenshots/06-robot.png" alt="Robot demo" width="920" />

</details>

<details>
<summary>Cluster 适配器</summary>

<img src="docs/screenshots/15-cluster.png" alt="Cluster 适配器加载 CiliKube" width="920" />

</details>

</details>

<details>
<summary>宿主管理</summary>

<details>
<summary>插件清单</summary>

<img src="docs/screenshots/07-plugins.png" alt="插件管理" width="920" />

</details>

<details>
<summary>人员</summary>

<img src="docs/screenshots/08-users.png" alt="人员" width="920" />

</details>

<details>
<summary>角色</summary>

<img src="docs/screenshots/09-roles.png" alt="角色" width="920" />

</details>

<details>
<summary>组织</summary>

<img src="docs/screenshots/10-orgs.png" alt="组织" width="920" />

</details>

<details>
<summary>审计</summary>

<img src="docs/screenshots/11-audit.png" alt="审计" width="920" />

</details>

<details>
<summary>格子</summary>

<img src="docs/screenshots/12-cells.png" alt="格子" width="920" />

</details>

<details>
<summary>账号</summary>

<img src="docs/screenshots/14-account.png" alt="账号" width="920" />

</details>

</details>

## 本地跑

需要 [pnpm](https://pnpm.io) 10

```bash
pnpm install
pnpm test
pnpm dev
```

打开 [http://127.0.0.1:5178](http://127.0.0.1:5178)，开发账号 `admin` / `admin123`

| 进程 | 端口 |
|------|------|
| 壳 | 5178 |
| 宿主 API | 8788 |
| Hello 插件 | 8791 |

Cluster 的 iframe 要另起 CiliKube（默认 Web `8888`、API `8080`），Images / Train / Robot 是假数据格，不占真实服务

卸一格：地板 Remove，或 Plugins 页，要从这台构建里拿掉，才改 `plugins.enabled.yaml` 并重建

单独起 API 时需要：`DAWNGRID_PLUGIN_<ID>_UPSTREAM`、`DAWNGRID_GATEWAY_SECRET`、`DAWNGRID_JWT_ISS`，`pnpm dev` 已带开发默认值

## 仓库

```
apps/api              宿主 API（Hono + SQLite）
apps/web              壳（Vite + React）
packages/plugin-sdk   插件契约
plugins/hello         native 示例
plugins/cluster       CiliKube adapter
plugins/images        镜像 demo
plugins/train         训练 demo
plugins/robot         机器人 demo
```

新插件：`plugin.yaml` + `register()`，写进清单和 `apps/web/src/plugins/catalog.ts`

## 许可证

[GNU Affero General Public License v3.0](./LICENSE)（`AGPL-3.0-only`）
