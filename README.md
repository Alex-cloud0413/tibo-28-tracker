# Tibo / 28 Days

Alex 的独立更新追踪站。记录 Tibo 的 28 天更新、额度重置与中文报道。

- 网站：https://alex-cloud0413.github.io/tibo-28-tracker/
- 原帖：https://x.com/thsottiaux

纯静态 HTML / CSS / JavaScript，部署到 GitHub Pages。数据抓取使用 Python 3.11+ 标准库和系统 curl，没有付费 API、模型调用或浏览器登录凭据。

## 本地运行

```sh
python3 scripts/refresh.py
python3 -m unittest discover -s tests -v
python3 scripts/validate.py
python3 -m http.server 8792 --directory site
```

打开 http://localhost:8792 。只想查看已保存的快照，可直接运行最后一条。`--seed-only` 仅用于首次从 `curated.json` 初始化，不用于覆盖已有动态快照。

## 语言

页首可切换中文 / English，默认中文，并在浏览器本地记住选择。切换保留搜索、筛选、日期、时区和已展开的原文；搜索同时覆盖中英文内容。

`site/i18n.js` 管理界面文案。经核对的更新和每日汇总在 `curated.json` 中同时维护 `title` / `summary`（中文）及 `titleEn` / `summaryEn`（英文）；更正时同步两种语言。自动收录但尚未整理的记录在英文模式显示原帖与待核对状态，不调用外部翻译服务。公众号链接标明为中文内容。

语言检查：`node --test tests/test_i18n.cjs`。

## 数据与核对

- `curated.json`：核对原帖后的中文摘要、日期、原始链接和已公开的报道链接。只添加经核对的公开内容，不放私人项目记录、未发布图文包或登录信息。
- `site/data/updates.json`：最新公开数据快照，包含来源健康状态。前端只加载本站数据，访客不直接访问 X 或追踪源。
- `scripts/refresh.py`：交叉读取三个公开追踪源。仅收录 Tibo 的 Day 更新和明确已完成的额度重置。追踪站只有链接、没有正文的内容进入待核对线索，不计入更新数。
- 自动发现不等于原帖核实。自动条目展示英文内容与待核对标记。核对原帖后将完整记录加入 `curated.json`，保留 post ID、原文时间与来源。中文摘要不会被追踪源自动改写。
- 用 post ID 去重，语义指纹排除点赞等互动数据；原文变化会标记待复核。来源故障时保留历史数据。Day 编号优先于北京时间日期。
- 已公开公众号链接来自作者提供。本站不复制未发布的图片包，也不替作者操作公众号发布。

公开来源：[Tibo 28 Day Live](https://www.tibo-28day.live/#tracker)、[Codex Resets](https://codex-resets.com/zh-CN/tibo-28)、[Reset Alerts](https://resetalerts.com/codex-28-day-challenge)。原帖属于 Tibo / OpenAI 等原作者，本站与 OpenAI 无隶属关系。

## 部署与更新

仓库 Settings → Pages → Source 选 **GitHub Actions**。工作流仅上传 `site/`，不上传源码目录以外的任何本地文件。

GitHub Actions 在 main 更新、手动触发，以及每两小时的第 17 分钟运行。定时任务在 GitHub 执行，不依赖个人电脑在线；[GitHub 的定时执行可能延迟](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)，所以页面始终展示最近检查时间，超过四小时会显示延迟状态。数据源更新时间也可能落后于 X。

计划 Day 1—28 对应 2026-10-05 至 2026-11-01（America/Los_Angeles）。2026-11-02 16:00 UTC 后最后一次检查将数据标记归档，此后的定时唤醒不再抓取或部署。网站继续可读；可在仓库 Actions 中关闭本工作流的 schedule，手动维护仍可部署。

更新工作流会提交公开 JSON 快照，并部署 Pages。令牌仅使用 GitHub 自带的仓库级 GITHUB_TOKEN，不需要新建长期密钥。来源返回内容只作为文本，不作为命令或 HTML 执行。

恢复：克隆本仓库，即可运行上述命令。无数据库、设备绑定或外部图片存储依赖。
