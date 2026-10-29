# 观潮 Guanchao · TikTok 直播间获客与高价值用户发现工作台

**把直播间里一闪而过的互动，整理成可以筛选、判断和持续跟进的潜在客户线索。**

面向跨境卖家、直播运营、主播与公会：发现潜在客户，筛选高等级送礼用户，建立自己的直播间线索库。

**开发者 / Developer：老K（Lao K）** · [微信交流与赞助支持](#开发者与联系)

[下载 Windows 正式包](https://github.com/1213109176kgy-png/guanchao-tiktok-live/releases/latest) · [GitHub](https://github.com/1213109176kgy-png/guanchao-tiktok-live) · [Gitee](https://gitee.com/kugou8/guanchao-tiktok-live) · [English](#english) · [验证范围](docs/VALIDATION.md)

## 这个项目能帮你做什么？

TikTok 直播间里，观众正在问价格、询问配送、讨论产品，也有人持续评论、参与粉丝团或赠送礼物。这些互动，是发现潜在客户和重点运营对象的起点。

观潮围绕 **“发现直播间 → 记录互动观众 → 筛选有价值线索 → 查看互动背景 → 人工跟进”** 这条流程设计。你可以边浏览 TikTok 边添加直播间，把事件中可用的账号、昵称、头像、等级和互动记录留在本机，再决定哪些人值得进一步了解。

### 1. 直播间获客：把互动中的机会留下来

面向跨境卖家、品牌和垂直行业运营者，在获准采集的目标直播间里整理参与互动的用户。结合评论内容与账号资料，人工判断产品兴趣和需求，把值得了解的人标记为待联系或有意向，后续再开展适当沟通。

例如：你在美妆直播间看到有人询问配送、款式或产品细节，可以在互动记录中回看内容，找到对应账号，在备注里写下需求，形成有背景信息的线索，而不是只留下一串用户名。

### 2. 高价值用户发现：优先关注高等级、有送礼行为的观众

对于主播、公会和娱乐直播运营，可以通过 **送礼等级范围、“有送礼记录”、礼物数量排序** 缩小关注范围，寻找值得进一步了解的高等级送礼用户，也就是运营中常说的“找大哥”线索。

例如：先筛选送礼等级 ≥ 20 的观众，再查看其在采集期间的送礼与评论记录、来源房间和粉丝团等级，整理一份需要人工评估的重点用户名单。

**等级和送礼行为用于安排关注优先级，不能直接证明收入、真实购买力或合作意愿。** 产品不自动判定谁一定会付费，也不承诺获客或转化结果。

### 3. 粉丝与社群运营：带着互动背景做跟进

把观众的来源直播间、房间内粉丝团等级、评论和礼物记录放到同一份资料中，帮助运营人员了解“这个人从哪里来、出现过什么互动、上次跟进到哪一步”。按需要记录待联系、已联系、有意向等状态，避免下一次又从头查找。

## 谁适合使用？

| 使用者 | 想解决的问题 | 在观潮里的工作方式 |
| --- | --- | --- |
| 跨境电商卖家、品牌运营 | 从直播互动中寻找产品相关的潜在客户 | 选择相关房间，查看互动背景，人工判断需求并记录跟进 |
| 娱乐主播、直播公会 | 寻找高等级送礼用户和重点维护对象 | 按送礼等级、送礼记录与礼物数量筛选，再查看详情 |
| 自有直播间运营者 | 直播结束后还能回看观众互动、继续维护关系 | 保存账号与事件，整理备注和跟进状态 |
| 社群、用户运营人员 | 把分散的观众信息整理成可执行的跟进清单 | 按来源和状态整理，导出符合条件的 CSV |
| 开发者、工具集成者 | 基于现成桌面工作台继续开发 | 复用开源源码、本地数据库和已有采集适配层 |

以上是产品支持的工作方式与使用示例，并非已经验证的客户案例或业务效果。

## 为什么用观潮整理直播间线索？

### 边浏览，边把直播间加入采集

首页就是内嵌的 TikTok 网页。浏览视频、进入直播间，识别到具体直播页面后出现“采集此直播间”。任务建立后，切换到其他模块或继续浏览，都不会主动停止已经运行的采集任务。

### 按价值线索筛选，决定先看谁

支持送礼等级区间、等级已知或未知、最低粉丝团等级、有无送礼记录、跟进状态等条件；可按最近出现、送礼等级或礼物数量排序。先缩小范围，再逐一查看，适合人工做优先级判断。

### 账号、互动和来源放在一起

观众详情关联来源直播间和收到的互动记录。送礼等级与房间内粉丝团等级分别展示，未知字段保持未知，方便你结合上下文理解用户，而不是只凭昵称和一个等级数字判断。

### 从发现线索，到留下跟进进度

支持“未跟进 → 待联系 → 已联系 → 有意向 → 已结束”等人工状态，以及最多 4,000 字备注。可记录已知需求、沟通结果和下次事项；有有效账号时可以打开 TikTok 主页，再按平台允许的方式人工联系。

### Windows 双击运行，线索保存在本机

免安装 EXE 或完整 ZIP 即可运行，无需自行部署服务器，也无需额外安装 Node.js、数据库或浏览器。任务、观众、事件与备注保存在本机 SQLite，签名密钥通过 Windows 加密保存。访问 TikTok 与签名服务仍需联网。

### 筛选后的名单可以继续使用

CSV 导出覆盖全部符合当前条件的观众，不限于列表当前页，便于放入表格做后续整理。长用户 ID 按文本处理，中文使用 UTF-8 BOM，并对文本公式注入做转义。

## 功能清单

| 模块 | 已实现功能 | 对使用者的作用 |
| --- | --- | --- |
| TikTok 首页 | 内嵌浏览、网站自身登录流程、会话本地保留、地址栏、前进/后退/刷新 | 在熟悉的浏览流程中发现目标直播间 |
| 快捷添加 | 识别当前直播页面，创建或复用任务，恢复与重试入口 | 把发现的房间快速加入采集 |
| 直播间管理 | 最多 3 个任务同时采集，连接状态、停止与手动启动 | 集中管理多个关注房间 |
| 观众资料 | 记录事件中可用的账号、昵称、头像和用户 ID，按标识去重 | 将收到的互动关联到对应用户 |
| 两类等级 | 最近观测的送礼等级、按来源房间记录的粉丝团等级 | 为送礼用户筛选和粉丝运营提供参考 |
| 互动记录 | 评论、礼物、入场、点赞、关注、分享等支持事件的归一化记录 | 回看用户在采集期间的参与情况 |
| 搜索与筛选 | 昵称/账号/ID 搜索，等级区间、未知等级、粉丝团等级、送礼及跟进条件 | 找到符合人工评估条件的线索 |
| 排序与详情 | 最近出现、送礼等级优先、礼物数量优先，来源房间与事件详情 | 结合证据安排查看顺序 |
| 人工跟进 | 状态管理、4,000 字备注、有效账号主页入口 | 保存沟通背景与下一步事项 |
| 导出 | 全部筛选结果 CSV、长 ID 精度保留、文本公式转义 | 将线索用于表格整理与人工工作流 |
| 本地数据 | SQLite 保存，关闭后保留记录，可打开数据目录 | 在本机管理与备份历史记录 |
| 运行配置 | 可选代理、Euler Stream API Key、运行诊断 | 按实际网络和服务权限配置采集 |

## 一条实际可操作的线索整理流程

1. **选房间**：在内嵌 TikTok 中浏览与你的产品、内容或运营方向相关、且获准采集的直播间。
2. **添加采集**：识别到当前直播页面后点击“采集此直播间”，检查连接是否成功。
3. **积累记录**：接收采集期间的互动事件，保存其中可用的用户资料与等级。
4. **筛选线索**：做产品获客时回看评论需求；做送礼用户运营时结合等级、送礼记录和礼物数量缩小范围。
5. **人工判断**：查看账号、来源房间和互动背景，决定是否值得进一步了解。
6. **留下进度**：填写备注、更新跟进状态，必要时打开主页人工联系，或导出 CSV。

这里的“线索”指需要你进一步判断的用户信息。当前版本不包含 AI 意向评分、自动关键词分类、自动触达或自动私信。

## 开发者与联系

**开发者：老K。** 欢迎交流 TikTok 直播运营、使用反馈与功能建议。扫码添加微信时，请备注“观潮”。问题复现和功能需求也可以通过仓库 Issues 提交，方便公开跟踪。

如果这个项目对你有帮助，欢迎点亮 Star、分享项目，或通过微信收款码自愿赞助，支持老K继续维护与迭代。**赞助金额自愿，不是使用开源项目的前提，也不构成定制开发或服务交付承诺。**

| 微信联系 · 老K | 微信赞助 · 自愿支持 |
| :---: | :---: |
| <img src="docs/assets/laok-wechat.jpg" alt="开发者老K的微信联系二维码" width="260" /> | <img src="docs/assets/laok-wechat-pay.jpg" alt="老K的微信自愿赞助收款码" width="260" /> |
| 项目交流、反馈与建议 | 感谢你支持项目维护 |

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

**Turn TikTok LIVE interactions into audience leads you can review, prioritize and follow up on.**

Guanchao is an open-source Windows workspace for **LIVE-based lead discovery, high-level gifter research and manual relationship management**. It brings embedded TikTok browsing, interaction records, audience filters and follow-up notes into one local application.

### What can you use it for?

**Find potential customers in relevant LIVE conversations.** Sellers and brand operators can review available comments and audience profiles from rooms they are authorized to collect from, identify product-related questions manually, and retain useful context for later follow-up.

**Discover high-level gifters and priority audience leads.** Streamers and agencies can combine observed gifter levels, recorded gifts, gift-quantity sorting and room-specific fan-club levels to build a shortlist for human review. These signals help prioritize attention; they do not establish income, purchasing power or willingness to engage.

**Keep audience relationships organized.** Review a user's source rooms and interaction history, save notes, and mark leads as new, pending, contacted, interested or closed. Open valid TikTok profiles for appropriate manual follow-up, or export the filtered list for spreadsheet work.

These are supported workflows and illustrative use cases, not verified customer outcomes or conversion claims.

### A workflow from discovery to follow-up

**Browse a relevant room → start collection → review incoming events → filter audience signals → assess context manually → save follow-up progress or export.**

The contextual collection button reduces the steps between finding a LIVE room and adding a task. Audience records keep available usernames, IDs, avatars, levels and interactions together. Filters help you decide which records to inspect first; notes preserve what you learned.

### Features and practical benefits

| Capability | What it helps you do |
| --- | --- |
| Embedded TikTok website with an isolated, persistent local session | Browse videos and discover rooms from the desktop workspace |
| Contextual collection, task reuse, resume and retry | Add recognized LIVE pages to your workflow |
| Up to three concurrent collection tasks | Manage several rooms with visible connection states |
| Available usernames, nicknames, avatars and string-preserved user IDs | Associate received events with audience identities |
| Last-observed gifter levels and room-specific fan-club levels | Review engagement and gifting signals separately |
| Search, level ranges, known/unknown fields, gift and follow-up filters | Build a shortlist using your own criteria |
| Recent activity, level and gift-quantity sorting | Prioritize records for human review |
| Interaction details and source-room history | Read the context behind an audience record |
| Manual statuses, notes of up to 4,000 characters and profile links | Keep relationship-management progress in one place |
| Export of all matching records, beyond the current page | Continue working in spreadsheets |
| Local SQLite storage and Windows-encrypted API keys | Keep records locally without deploying your own server |
| Portable Windows EXE and ZIP | Run without a separate Node.js or database installation |

There is no automated intent scoring, keyword classification, outreach or direct messaging. Collection still requires internet access to TikTok and an external signing service. Incoming events do not provide a complete viewer list.

### Developer, contact and support

**Created and maintained by 老K (Lao K).** Scan the WeChat contact QR code below to discuss the project or share feedback; mention “Guanchao” when adding the contact. Reproducible bugs and feature requests can also be submitted through repository Issues.

If Guanchao is useful to you, consider starring or sharing the project, or making a voluntary contribution using the WeChat Pay QR code. Donations are optional, are not required to use the open-source project, and do not purchase custom development or a service commitment.

| WeChat contact · Lao K | Optional support · WeChat Pay |
| :---: | :---: |
| <img src="docs/assets/laok-wechat.jpg" alt="Lao K WeChat contact QR code" width="260" /> | <img src="docs/assets/laok-wechat-pay.jpg" alt="Optional WeChat Pay donation QR code for Lao K" width="260" /> |

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
