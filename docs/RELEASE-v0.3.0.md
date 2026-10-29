# 观潮 Guanchao v0.3.0 · TikTok 直播间获客与高价值用户发现

## 中文

**把直播间里一闪而过的互动，整理成可以筛选、判断和持续跟进的潜在客户线索。**

观潮面向跨境卖家、品牌运营、主播与公会，把“发现直播间、记录互动观众、筛选重点用户、查看背景、人工跟进”放到一个 Windows 桌面工作台中。

### 三个主要使用场景

1. **直播间获客**：整理相关直播间中参与互动的账号，回看产品问题、配送咨询等评论内容，由人工判断需求并记录后续跟进。
2. **寻找高等级送礼用户**：按送礼等级范围、“有送礼记录”和礼物数量筛选，结合来源房间与互动背景，整理值得进一步了解的“大哥”线索。
3. **粉丝维护与用户运营**：查看观众资料、房间内粉丝团等级和互动记录，保存备注与跟进状态，后续继续维护关系。

等级和送礼行为只是安排关注优先级的参考，不等于真实购买力、合作意愿或转化保证。

### 主要亮点

- **边浏览边添加**：内嵌 TikTok 网页，识别具体直播页面后快捷加入采集，最多同时运行 3 个任务。
- **有条件地筛选**：昵称、账号、ID 搜索，送礼等级区间、粉丝团等级、送礼记录和跟进状态组合筛选。
- **结合上下文判断**：账号、昵称、头像、最近观测等级、来源直播间和互动详情关联查看。
- **跟进进度可保留**：未跟进、待联系、已联系、有意向、已结束等人工状态，支持最多 4,000 字备注和有效主页入口。
- **线索可导出**：CSV 导出全部符合条件的记录，保留长用户 ID 精度，便于继续用表格整理。
- **本机直接运行**：免安装 EXE / ZIP，无需自行部署服务器；SQLite 保存，支持代理与加密密钥配置。

### 下载与开始

- [Windows 免安装 EXE](https://github.com/1213109176kgy-png/guanchao-tiktok-live/releases/download/v0.3.0/Guanchao-0.3.0-Windows-x64.exe)
- [Windows ZIP](https://github.com/1213109176kgy-png/guanchao-tiktok-live/releases/download/v0.3.0/Guanchao-0.3.0-Windows-x64.zip)
- [SHA256 校验值](https://github.com/1213109176kgy-png/guanchao-tiktok-live/releases/download/v0.3.0/SHA256SUMS-0.3.0.txt)
- [中文使用说明](https://github.com/1213109176kgy-png/guanchao-tiktok-live/releases/download/v0.3.0/USAGE.zh-CN.txt)

运行后在设置中配置所需网络与 Euler Stream API Key，进入目标直播间并开始采集，再到观众工作台筛选、查看、备注和导出。完整介绍和源码见 [GitHub](https://github.com/1213109176kgy-png/guanchao-tiktok-live) / [Gitee](https://gitee.com/kugou8/guanchao-tiktok-live)。Gitee 的单个附件上限为 100 MB，完整 EXE 和 ZIP 通过以上 GitHub 地址提供。

### 当前验证范围

打包程序通过 10 项桌面检查和 9 项受控首页检查，便携 EXE 已在开发机启动。**真实 TikTok 登录、直播采集连接、字段准确性和长时间稳定性仍需真实直播间验证。** 只记录收到互动事件的观众，不提供完整在线名单；等级是最近观测值。没有 AI 意向评分、自动触达或自动私信，不承诺获客数量和转化结果。二进制未做发行者代码签名。

## English

**Turn TikTok LIVE interactions into leads you can review, prioritize and follow up on.**

Guanchao is a local Windows workspace for sellers, brand operators, streamers and agencies. It supports LIVE-based prospect research, high-level gifter discovery and manual audience relationship management.

### Use cases

- Review product-related questions and available audience profiles from authorized rooms to identify potential customer leads manually.
- Filter by observed gifter levels, recorded gifts and gift quantity to shortlist priority audience leads for human assessment.
- Retain source-room context, interaction history, follow-up status and notes for future relationship management.

Gifting signals do not establish income, buying power or willingness to engage. These are workflows, not verified acquisition results.

### Included in v0.3.0

Embedded TikTok browsing and contextual task creation; up to three concurrent tasks; available audience identities and observed levels; search and combined filters; source-room and interaction details; manual statuses and 4,000-character notes; profile links and full filtered CSV exports. Portable Windows distribution with local SQLite storage, optional proxy configuration and encrypted API-key storage.

Download the complete Windows EXE or ZIP using the links above. Gitee's 100 MB per-file limit prevents hosting these complete binaries there.

Packaged desktop and controlled-page checks pass, and the portable EXE launches on the development machine. Real login, LIVE collection, field accuracy and long-running stability remain unverified. Records cover received interaction events, not the entire viewer list. There is no automated lead scoring, outreach or direct messaging. Binaries are unsigned. Original project code is AGPL-3.0-only; third-party licenses are retained.
