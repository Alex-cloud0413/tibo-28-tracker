"use strict";
const $ = (selector) => document.querySelector(selector);
const state = {data: null, filter: "all", query: "", day: null, zone: "Asia/Shanghai", loading: false};
function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function link(label, href, className = "") {
  const a = el("a", className, label);
  try {
    const url = new URL(href);
    if (url.protocol !== "https:") throw new Error("Unsupported link");
    a.href = url.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  } catch { a.removeAttribute("href"); }
  return a;
}
function formatTime(value) {
  if (!value) return "时间待核对";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "时间待核对";
  return new Intl.DateTimeFormat("zh-CN", {timeZone: state.zone, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false}).format(d);
}
function dateInZone(date, zone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en", {timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function campaignDay() {
  const c = state.data.campaign;
  return Math.floor((Date.parse(dateInZone(new Date(), c.timezone)) - Date.parse(c.startDate)) / 86400000) + 1;
}
function postLabel(post) {
  return post.day === 0 ? "计划公告" : `Day ${post.day}${post.subDay ? `.${post.subDay}` : ""}`;
}
function renderCalendar() {
  const data = state.data, day = campaignDay();
  $("#current-day").textContent = String(Math.max(0, Math.min(28, day))).padStart(2, "0");
  $("#campaign-phase").textContent = day < 1 ? "尚未开始" : day > 28 ? "计划已结束" : "持续记录中";
  const last = Math.max(0, ...data.posts.map(p => p.day));
  $("#record-through").textContent = `已记录至 Day ${last}`;
  const grid = $("#day-grid"); grid.replaceChildren();
  for (let n = 1; n <= 28; n++) {
    const records = data.posts.filter(p => p.day === n);
    const button = el("button", [records.length ? "recorded" : "", n === day ? "today" : "", records.some(p => p.kind === "reset") ? "reset" : ""].join(" "), String(n).padStart(2, "0"));
    button.type = "button"; button.disabled = !records.length;
    button.setAttribute("aria-label", `Day ${n}，${records.length ? records.length + " 条记录" : "暂无记录"}`);
    button.setAttribute("aria-pressed", String(state.day === n));
    button.addEventListener("click", () => { state.day = state.day === n ? null : n; state.filter = "all"; state.query = ""; $("#search").value = ""; render(); $("#timeline").scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"}); });
    grid.append(button);
  }
}
function renderHealth() {
  const data = state.data, sources = Object.values(data.sources || {});
  const age = data.checkedAt ? (Date.now() - Date.parse(data.checkedAt)) / 3600000 : Infinity;
  const healthy = sources.filter(s => s.ok && !s.stale).length;
  const archived = data.campaignFinished === true;
  let label = "已载入核对记录，等待首次自动检查";
  if (archived) label = "28 天追踪已归档";
  else if (sources.length && healthy === 0) label = "来源暂不可用 · 保留已有记录";
  else if (age > 4 && sources.length) label = "检查已延迟 · 当前显示历史记录";
  else if (sources.length && healthy < sources.length) label = "部分来源延迟 · 其余来源可用";
  else if (sources.length) label = "定时追踪中 · 每 2 小时检查";
  $("#health-label").textContent = label;
  $("#health-dot").style.background = archived ? "#6d7167" : healthy && age < 4 ? "#668066" : "#ac4e35";
  $("#last-check").textContent = data.checkedAt ? `最近检查 ${formatTime(data.checkedAt)} · ${state.zone === "Asia/Shanghai" ? "北京时间" : "太平洋时间"}` : "当前为已核对的初始记录";
  $("#update-count").textContent = data.posts.filter(p => p.kind === "update").length;
  $("#reset-count").textContent = data.posts.filter(p => p.kind === "reset").length;
  $("#article-count").textContent = data.posts.filter(p => p.articleUrl).length;
  const sourceList = $("#source-list"); sourceList.replaceChildren();
  for (const source of sources) {
    const row = el("li"); row.append(link(source.name, source.url));
    row.append(document.createTextNode(` · ${!source.ok ? "本次读取失败" : source.stale ? "来源数据延迟" : "可用"}${source.lastSuccessAt ? ` · 上次成功 ${formatTime(source.lastSuccessAt)}` : ""}`));
    sourceList.append(row);
  }
  const candidates = $("#candidates"); candidates.replaceChildren();
  if (data.candidates?.length) {
    candidates.append(el("p", "", `另有 ${data.candidates.length} 条追踪源线索尚未读到完整原文，未计入更新数量：`));
    const list = el("ul");
    data.candidates.slice(0, 12).forEach(c => { const li = el("li"); li.append(link(`查看待核对原帖 ${c.id}`, c.url)); list.append(li); });
    candidates.append(list);
  }
}
function renderPost(post) {
  const article = el("article", "post"); article.id = `post-${post.id}`;
  const meta = el("div", "post-meta");
  meta.append(el("span", `tag ${post.kind === "reset" ? "reset-tag" : ""}`, post.kind === "reset" ? "额度重置" : post.kind === "announcement" ? "计划公告" : postLabel(post)));
  meta.append(el("span", "", post.sourceChanged ? "原文有变化 · 待复核" : post.verified ? "原帖已核对" : "自动收录 · 待核对"));
  const time = el("time", "", formatTime(post.publishedAt)); if (post.publishedAt) time.dateTime = post.publishedAt; meta.append(time);
  article.append(meta, el("h3", "", post.title), el("p", "post-summary", post.summary));
  const links = el("div", "post-links"); links.append(link("查看 X 原帖 ↗", post.url));
  if (post.sources?.[1]) links.append(link("产品公告 ↗", post.sources[1]));
  if (post.articleUrl) links.append(link("阅读公众号图文 ↗", post.articleUrl, "article-link"));
  article.append(links);
  if (post.originalText) {
    const details = el("details"); details.append(el("summary", "", post.verified ? "展开英文原文" : "展开追踪源收录的英文内容"));
    details.append(el("div", "original", post.originalText));
    if (post.quotedText) details.append(el("div", "original quote", "引用帖\n" + post.quotedText));
    if (!post.verified) details.append(el("p", "notice", "以上文字来自公开追踪源，请以 X 原帖为准。"));
    article.append(details);
  }
  if (post.sourceChanged) article.append(el("p", "notice", "追踪源中的文字发生变化，现有中文摘要尚待重新核对。"));
  return article;
}
function renderUpdates() {
  document.querySelectorAll("[data-filter]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === state.filter)));
  $("#active-day").hidden = state.day === null;
  $("#active-day span").textContent = `正在查看 Day ${state.day}`;
  const query = state.query.toLocaleLowerCase();
  const posts = [...state.data.posts].filter(p =>
    (state.day === null || p.day === state.day) &&
    (state.filter === "all" || (state.filter === "article" ? !!p.articleUrl : p.kind === state.filter)) &&
    (!query || [p.title, p.summary, p.originalText, p.quotedText, postLabel(p)].join(" ").toLocaleLowerCase().includes(query))
  ).sort((a, b) => b.day - a.day || (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  $("#result-count").textContent = `${posts.length} 条记录 · 最新在前 · 按原帖 Day 编号归组`;
  const root = $("#updates"); root.replaceChildren();
  if (!posts.length) {
    const empty = el("div", "empty", "没有找到符合条件的更新。"); const reset = el("button", "", "清除筛选");
    reset.addEventListener("click", clearFilters); empty.append(reset); root.append(empty); return;
  }
  for (const day of [...new Set(posts.map(p => p.day))]) {
    const group = posts.filter(p => p.day === day), section = el("section", "day-section");
    const aside = el("div", "day-aside");
    aside.append(el("p", "", day === 0 ? "序章" : `Day ${String(day).padStart(2, "0")}`));
    if (day > 0) {
      const date = new Date(Date.parse(state.data.campaign.startDate) + (day - 1) * 86400000);
      aside.append(el("time", "", `${date.getUTCMonth() + 1}.${String(date.getUTCDate()).padStart(2, "0")} · 太平洋时间`));
    }
    aside.append(el("span", "day-total", `${group.length} 条记录`));
    const body = el("div", "day-body"); group.forEach(p => body.append(renderPost(p)));
    if (state.filter === "all" && !query) {
      const recap = state.data.roundups?.find(r => r.day === day);
      if (recap) {
        const box = el("aside", "roundup"); box.append(el("p", "eyebrow", "DAILY RECAP / 当日汇总"), el("h3", "", recap.title), el("p", "", recap.summary), link("官方汇总 ↗", recap.sourceUrl));
        if (recap.additionalSourceUrl) box.append(link("后续额度重置 ↗", recap.additionalSourceUrl));
        body.append(box);
      }
    }
    section.append(aside, body); root.append(section);
  }
}
function render() { renderCalendar(); renderHealth(); renderUpdates(); }
function clearFilters() { state.filter = "all"; state.query = ""; state.day = null; $("#search").value = ""; render(); }
async function load() {
  if (state.loading) return;
  state.loading = true; $("#refresh").disabled = true; $("#refresh").textContent = "读取中…";
  try {
    const response = await fetch(`./data/updates.json?v=${Date.now()}`, {cache: "no-store", signal: AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error("Unable to load");
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.posts) || !data.campaign) throw new Error("Invalid data");
    state.data = data; render();
  } catch {
    $("#health-label").textContent = state.data ? "刷新失败 · 保留当前页面记录" : "数据暂时无法加载";
    $("#health-dot").style.background = "#ac4e35";
    if (!state.data) { const empty = el("p", "empty", "暂时无法读取记录，请稍后刷新。也可以直接查看 "); empty.append(link("Tibo 的 X 主页 ↗", "https://x.com/thsottiaux")); $("#updates").replaceChildren(empty); }
  } finally { state.loading = false; $("#refresh").disabled = false; $("#refresh").textContent = "刷新页面数据 ↻"; }
}
document.querySelectorAll("[data-filter]").forEach(b => b.addEventListener("click", () => { state.filter = b.dataset.filter; if (state.data) renderUpdates(); }));
$("#search").addEventListener("input", e => { state.query = e.target.value.trim(); if (state.data) renderUpdates(); });
$("#timezone").addEventListener("change", e => { state.zone = e.target.value; if (state.data) render(); });
$("#clear-day").addEventListener("click", () => {state.day = null; if (state.data) render();});
$("#refresh").addEventListener("click", load);
load();
