"use strict";
// Shared by the browser and the dependency-free language tests.
const TiboI18n = (() => {
  const messages = {
    pageTitle: ["Tibo 28 天更新追踪 · Alex", "Tibo 28-day update log · Alex"],
    pageDescription: ["Tibo 28 天更新追踪。更新记录、额度重置、原帖与中文摘要。Alex 整理。", "Tibo’s 28-day update log. Product updates, usage resets, original posts and summaries. Curated by Alex."],
    socialTitle: ["Tibo · 28 天更新追踪", "Tibo · 28-day update log"],
    skip: ["跳到更新列表", "Skip to updates"],
    home: ["Tibo 28 天更新追踪首页", "Tibo 28-day log home"],
    nav: ["主要导航", "Main navigation"],
    updates: ["更新记录", "Updates"],
    sources: ["来源", "Sources"],
    language: ["页面语言", "Page language"],
    heading: ["28 天更新追踪", "28-day update log"],
    planPost: ["计划原帖", "Original announcement"],
    progress: ["28 天追踪进度", "28-day progress"],
    campaign: ["28 天更新计划", "28-day challenge"],
    pacific: ["太平洋时间", "Pacific time"],
    beijing: ["北京时间", "Beijing time"],
    recorded: ["已有记录", "Recorded"],
    currentDay: ["当前日", "Current day"],
    loading: ["正在读取", "Loading"],
    dataStatus: ["数据状态", "Data status"],
    interval: ["每 2 小时检查一次", "Checked every 2 hours"],
    updateUnit: ["项更新", "updates"],
    updateUnitOne: ["项更新", "update"],
    resetUnitOne: ["次重置", "reset"],
    resetLabel: ["额度重置", "Usage reset"],
    resetUnit: ["次重置", "resets"],
    refresh: ["刷新 ↻", "Refresh ↻"],
    refreshLabel: ["刷新网站已保存的数据", "Refresh saved website data"],
    timezone: ["时间显示", "Display time zone"],
    filters: ["筛选更新", "Filter updates"],
    all: ["全部", "All"],
    features: ["功能更新", "Features"],
    resets: ["额度重置", "Usage resets"],
    search: ["搜索更新", "Search updates"],
    allDates: ["所有日期 ×", "All dates ×"],
    loadingPosts: ["正在加载更新记录…", "Loading updates…"],
    byline: ["整理 / Alex", "Curated by Alex"],
    grouping: ["按原帖 Day 编号归组。自动收录与原帖核对状态分别标注。", "Grouped by the Day number in the original posts. Automatically collected and verified records are labeled separately."],
    sourceStatus: ["数据来源与运行状态", "Data sources and status"],
    refreshNote: ["每 2 小时检查公开追踪源。刷新仅读取网站已保存的数据。", "Public sources are checked every 2 hours. Refresh loads the website’s saved data."],
    period: ["2026.10.05—11.01 · 太平洋时间", "Oct 5–Nov 1, 2026 · Pacific time"],
    disclaimer: ["独立追踪，与 OpenAI 无隶属关系。重置公告不代表个人账号的实时额度。", "An independent tracker, not affiliated with OpenAI. Reset announcements do not show your account’s current usage allowance."],
    top: ["顶部 ↑", "Top ↑"],
    timePending: ["时间待核对", "Time unverified"],
    announcement: ["计划公告", "Announcement"],
    notStarted: ["尚未开始", "Not started"],
    ended: ["计划已结束", "Challenge ended"],
    tracking: ["持续记录中", "Tracking"],
    through: ["已记录至 Day {day}", "Through Day {day}"],
    records: ["{count} 条记录", "{count} records"],
    oneRecord: ["1 条记录", "1 record"],
    noRecords: ["暂无记录", "No records yet"],
    initial: ["已载入核对记录，等待首次自动检查", "Verified records loaded · awaiting first check"],
    archived: ["28 天追踪已归档", "28-day log archived"],
    unavailable: ["来源暂不可用 · 保留已有记录", "Sources unavailable · saved records retained"],
    delayed: ["检查已延迟 · 当前显示历史记录", "Check delayed · showing saved records"],
    partial: ["部分来源状态待核对 · 其余来源可用", "Some sources need review · others available"],
    scheduled: ["定时追踪中 · 每 2 小时检查", "Tracking · checked every 2 hours"],
    lastCheck: ["最近检查 {time} · {zone}", "Last checked {time} · {zone}"],
    initialSnapshot: ["当前为已核对的初始记录", "Initial verified snapshot"],
    sourceFailed: ["本次读取失败", "Fetch failed"],
    sourceStale: ["来源数据延迟", "Source data delayed"],
    sourceUnknown: ["可读，来源更新时间未知", "Available · source update time unknown"],
    sourceAvailable: ["可用", "Available"],
    lastSuccess: ["上次成功 {time}", "Last success {time}"],
    candidates: ["另有 {count} 条线索尚未读到完整原文，未计入更新数量：", "{count} leads await complete source text and are not included in the update count:"],
    candidate: ["查看待核对原帖 {id}", "Unverified post {id}"],
    changed: ["原文有变化 · 待复核", "Source changed · review pending"],
    verified: ["原帖已核对", "Source verified"],
    unverified: ["自动收录 · 待核对", "Auto-collected · unverified"],
    originalLink: ["查看 X 原帖 ↗", "Original on X ↗"],
    productLink: ["产品公告 ↗", "Product announcement ↗"],
    expandOriginal: ["展开英文原文", "Show original post"],
    expandMirror: ["展开追踪源收录的英文内容", "Show source text from tracker"],
    quote: ["引用帖", "Quoted post"],
    mirrorNotice: ["以上文字来自公开追踪源，请以 X 原帖为准。", "This text was collected by a public tracker. Refer to the original post on X."],
    changedNotice: ["追踪源中的文字发生变化，现有摘要尚待重新核对。", "The tracker’s source text has changed. The current summary is awaiting another review."],
    selectedDay: ["正在查看 Day {day}", "Showing Day {day}"],
    newest: ["最新在前", "Newest first"],
    empty: ["没有找到符合条件的更新。", "No matching updates."],
    clear: ["清除筛选", "Clear filters"],
    prologue: ["序章", "Prologue"],
    recap: ["DAILY RECAP / 当日汇总", "DAILY RECAP"],
    officialRecap: ["官方汇总 ↗", "Official recap ↗"],
    laterReset: ["后续额度重置 ↗", "Subsequent usage reset ↗"],
    refreshing: ["读取中…", "Loading…"],
    refreshFailed: ["刷新失败 · 保留当前页面记录", "Refresh failed · current records retained"],
    dataFailed: ["数据暂时无法加载", "Data unavailable"],
    loadError: ["暂时无法读取记录，请稍后刷新。也可以直接查看 ", "Unable to load records. Try refreshing later or visit "],
    profileLink: ["Tibo 的 X 主页 ↗", "Tibo on X ↗"],
    newUpdate: ["新更新", "New update"],
    summaryPending: ["摘要待核对。", "Summary pending review."],
    englishPending: ["英文摘要待补充。", "English summary pending; original source text shown below."],
    roundupTitle: ["Day {day} · 当日汇总", "Day {day} · Daily recap"],
    roundupPending: ["汇总待核对。", "English recap pending. See the official recap below."]
  };
  function language(value) { return value === "en" ? "en" : "zh"; }
  function t(lang, key, values = {}) {
    const pair = messages[key];
    if (!pair) throw new Error(`Unknown translation key: ${key}`);
    return pair[language(lang) === "en" ? 1 : 0].replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
  }
  function postCopy(post, lang) {
    if (language(lang) === "zh") return {title: post.title, summary: post.summary};
    const label = post.day === 0 ? t(lang, "announcement") : `Day ${post.day}${post.subDay ? `.${post.subDay}` : ""}`;
    return {
      title: post.titleEn || `${label} · ${t(lang, post.kind === "reset" ? "resetLabel" : "newUpdate")}`,
      summary: post.summaryEn || post.originalText || t(lang, "summaryPending"),
      fallback: !post.summaryEn
    };
  }
  function roundupCopy(recap, lang) {
    return language(lang) === "zh" ? {title: recap.title, summary: recap.summary} : {
      title: recap.titleEn || t(lang, "roundupTitle", {day: recap.day}),
      summary: recap.summaryEn || t(lang, "roundupPending")
    };
  }
  return {messages, language, t, postCopy, roundupCopy};
})();
if (typeof module !== "undefined" && module.exports) module.exports = TiboI18n;
