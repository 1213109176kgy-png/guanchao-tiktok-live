# 观潮 Guanchao · TikTok LIVE Audience Desk

**在 Windows 桌面上浏览 TikTok，识别直播间，一键开始记录观众互动。**

[English](#english) · [下载 Windows 正式包](https://github.com/1213109176kgy-png/guanchao-tiktok-live/releases/latest) · [验证范围](docs/VALIDATION.md) · [许可证](LICENSE)

观潮是一款本机运行的 TikTok 直播观众记录与人工跟进工具。首页内嵌 TikTok 网页，进入具体直播间后可快捷添加采集任务；评论、礼物、入场等事件中的观众资料保存到本机 SQLite，便于筛选、整理、备注和导出。

桌面端无需自行部署服务器，也无需额外安装 Node.js、数据库或浏览器。使用时仍需要连接 TikTok 和第三方 Euler Stream 签名服务。

## 功能

- **内嵌 TikTok 首页**：浏览视频和直播，支持网站自身的登录流程，会话独立保存在本机。
- **直播间快捷采集**：识别到当前直播页面后显示“采集此直播间”，支持已有任务复用、恢复和重试。
- **直播间管理**：最多同时运行 3 个任务，查看连接状态、停止任务及查看已收到的互动。
- **观众工作台**：记录事件中可用的昵称、账号、头像、用户 ID、送礼等级和粉丝团等级。
- **筛选与人工跟进**：按账号、昵称、等级、送礼记录和跟进状态筛选，查看详情并保存备注。
- **CSV 导出**：导出全部符合条件的记录，保留长用户 ID 精度并防止文本公式注入。
- **本地保存**：任务、观众和备注保存在本机；Windows 加密保存签名密钥。
- **仅真实数据入口**：发行版没有演示模式、示例观众生成入口或演示切换按钮。

## 下载与使用

前往 [Releases](https://github.com/1213109176kgy-png/guanchao-tiktok-live/releases/latest)，下载 **Guanchao-0.3.0-Windows-x64.exe**，双击运行；或下载 ZIP，完整解压后运行 Guanchao.exe。目标环境为 Windows 10 / 11 x64，目前已在开发机 Windows 11 验证。

1. 打开“运行设置”，按需要配置网络代理及 Euler Stream API Key。
2. 在首页浏览 TikTok，进入具体直播间后点击“采集此直播间”；也可以点击“添加直播间”，输入主播 @账号或完整直播链接。
3. 在“直播间管理”检查连接状态，在“观众工作台”和“实时互动”查看收到的记录。
4. 筛选观众、填写备注，或导出 CSV。

API Key 在 [Euler Stream 控制台](https://www.eulerstream.com/)注册登录后创建，再填写到运行设置中。密钥不是 TikTok 密码；可用额度、权限与收费以服务方为准。网络代理仅在实际访问需要时配置。

数据目录：%APPDATA%\Guanchao。可在“运行设置”中打开。关闭应用会停止采集，历史记录保留；重启后需手动启动任务。备份前先关闭应用并复制完整数据目录。

## 数据边界与当前验证状态

**这是 0.3.0 首个公开发行版本；真实直播采集仍需目标开播账号实测。**

- 打包程序已通过 10 项桌面功能检查及 9 项首页受控页面检查；免安装 EXE 已在开发机实际启动。
- 自动测试使用隔离数据库、合成测试记录及受控页面，不代表真实 TikTok 登录、真实直播连接或长期运行已验收。
- 仅记录收到互动事件的观众，**不是完整在线观众名单**，潜水观众可能不可见。
- 等级是最近事件中的观测值，缺失显示未知；送礼等级与粉丝团等级分别记录，不承诺持续实时查询。
- **不提供自动私信**。可以打开有效账号的主页，能否私信由 TikTok 决定。
- TikTok 页面变化、网络限制或签名服务变更可能影响可用性。项目与 TikTok / ByteDance 无隶属或官方合作关系。
- Windows 二进制未做发行者代码签名，系统可能提示未知发布者；尚未在其他干净电脑验证。

请仅在获得必要授权、遵守适用规则的场景使用，并妥善保管采集记录。提交 Issue 时不要上传真实观众数据库、登录会话或密钥。

## 从源码运行

需要 Node.js 24+、npm 和 Windows x64（桌面开发及打包）。

~~~powershell
npm ci
npm run desktop
~~~

若 Electron 安装脚本未执行，可先运行 node node_modules/electron/install.js。

~~~powershell
npm test                  # 单元与 API 测试
npm run test:desktop      # 桌面功能测试，使用隔离测试数据
npm run test:home         # 内嵌页面识别与会话隔离测试
npm run package:win       # 生成 Windows EXE 与 ZIP
~~~

桌面自动化使用 @playwright/cli 所带 Playwright。运行测试前先执行 npm run build:desktop。源码网页开发模式为 npm run dev，默认地址 http://127.0.0.1:3180；网页模式不能承载桌面原生内嵌 TikTok 视图。网页模式配置可参考 .env.example，切勿提交 .env。

## 技术与致谢

Electron / React / TypeScript / Vite / Node.js SQLite。桌面端通过 IPC 调用内置业务引擎，无需开启本地 HTTP 服务。TikTok 页面使用隔离的 WebContentsView，不向网站暴露 Node.js 或本地业务桥。

直播连接复用 [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector) 2.5.0，协议数据依赖 TikTok-Live-Proto；签名基础设施由 [Euler Stream](https://www.eulerstream.com/)提供。第三方组件保留各自版权和许可证，详见 [第三方说明](THIRD_PARTY_NOTICES.md)。

本项目原创代码以 **AGPL-3.0-only** 发布；上游连接库包含额外许可条款，原文保留于 third_party/licenses/。请在分发或提供网络服务前阅读适用许可证。

---

## English

**Browse TikTok on your Windows desktop and start recording LIVE audience interactions from the room you discover.**

Guanchao is a local TikTok LIVE audience desk for reviewing interaction records and managing manual follow-up. It embeds the TikTok website, detects the current LIVE page, and stores available audience information from incoming events in a local SQLite database.

### Features

- Embedded TikTok browsing with a persistent, isolated local session.
- A contextual collection button for recognized LIVE pages, with resume and retry actions.
- Up to three concurrent collection tasks and visible connection states.
- Available usernames, nicknames, avatars, user IDs, observed gifter levels and room-specific fan-club levels.
- Search, filters, interaction details, follow-up statuses, notes and CSV export.
- Local storage and Windows-encrypted API-key storage. No demo mode in the released application.

### Download and run

Download the Windows x64 portable EXE or ZIP from [Releases](https://github.com/1213109176kgy-png/guanchao-tiktok-live/releases/latest). No separate Node.js, database, browser installation or self-hosted server is required. Internet access to TikTok and the external Euler Stream signing service is still needed.

Configure your proxy if needed and your Euler Stream API key in Settings. Browse to a LIVE room and select the collection button, or add a broadcaster by username or full LIVE URL. Review records in Audience Desk and Interactions, save notes, and export CSV files.

Data is stored in %APPDATA%\Guanchao. Closing the app stops collection but retains records. Tasks must be restarted manually.

### Current limitations

This is the first public release, version 0.3.0. Packaged desktop and controlled-page checks pass, and the portable EXE launches on the development Windows 11 machine. **Real TikTok login, LIVE collection, level accuracy and long-running stability still require validation against a real live broadcaster.** Synthetic test fixtures are not evidence of real-platform compatibility.

Records represent users appearing in received interaction events, not the entire online audience. Levels are last-observed values and may be unavailable. There is no automated direct messaging. Availability depends on TikTok, network conditions and third-party signing services. The Windows binary is unsigned and has not been tested on a clean second machine.

### Development

Use Node.js 24+ and npm. Run npm ci, then npm run desktop. Run npm test, npm run test:desktop and npm run test:home for verification; npm run package:win builds Windows artifacts. Desktop packaging targets Windows x64.

### License and acknowledgments

Original project code is licensed under AGPL-3.0-only. TikTok-Live-Connector 2.5.0 and other dependencies retain their own licenses, including the connector's additional permissions and exceptions. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This project is not affiliated with TikTok or ByteDance. Use it only with appropriate authorization and avoid sharing personal records or credentials in bug reports.
