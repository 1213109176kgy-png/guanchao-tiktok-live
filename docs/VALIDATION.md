# v0.3.0 验证范围 / Validation scope

- npm test：18 项通过，覆盖 SQLite、API、事件归一化、协议数据、连接取消保护与受控连接测试。
- Windows 打包程序：10 项桌面检查通过，覆盖无演示入口、筛选、跟进保存、CSV 导出、配置加密和重启持久化。
- Windows 打包程序：首页 9 项检查通过，覆盖受控网页的直播识别、下播禁用、页面隔离、模态框遮挡、模块切换、可用浏览区域与会话保留。
- 单文件便携 EXE 已在当前 Windows 11 开发机直接启动；自动化驱动该自解压包装器超时，完整功能自动化通过解包后的同一发行版 Guanchao.exe 执行。
- 上述使用隔离数据库、合成测试记录、连接桩与受控 HTTPS 页面。不会把测试观众写入用户的正式数据库。

尚未验收：真实 TikTok 登录、真实直播采集连接、目标房间下发的账号和等级字段、长时间稳定性，以及其他干净 Windows 电脑上的运行表现。等级为最近观测值，名单仅覆盖收到互动事件的观众。没有自动私信能力。

Tests use isolated synthetic fixtures. They do not prove real TikTok compatibility. Real login, LIVE connections, field accuracy, long-running stability and clean-machine compatibility remain to be validated. The self-extracting portable EXE launched manually; full automation targets the unpacked release executable.
