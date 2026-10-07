"use strict";
const $ = (selector) => document.querySelector(selector);
let savedLanguage = "zh";
try { savedLanguage = localStorage.getItem("tibo-language"); } catch { /* Storage may be disabled. */ }
const state = {data: null, filter: "all", query: "", day: null, zone: "Asia/Shanghai", loading: false, loadError: false, lang: TiboI18n.language(savedLanguage)};
const t = (key, values) => TiboI18n.t(state.lang, key, values);
const recordCount = count => t(count === 1 ? "oneRecord" : "records", {count});
function applyLanguage() {
  document.documentElement.lang = state.lang === "en" ? "en" : "zh-CN";
  document.title = t("pageTitle");
  document.querySelector('meta[name="description"]').content = t("pageDescription");
  document.querySelector('meta[property="og:title"]').content = t("socialTitle");
  document.querySelector('meta[property="og:description"]').content = t("pageDescription");
  document.querySelectorAll("[data-i18n]").forEach(n => { n.textContent = t(n.dataset.i18n); });
  document.querySelectorAll("[data-i18n-label]").forEach(n => n.setAttribute("aria-label", t(n.dataset.i18nLabel)));
  document.querySelectorAll("[data-i18n-placeholder]").forEach(n => n.setAttribute("placeholder", t(n.dataset.i18nPlaceholder)));
  document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
  render();
}
function setLanguage(lang) {
  state.lang = TiboI18n.language(lang);
  try { localStorage.setItem("tibo-language", state.lang); } catch { /* The toggle still works without storage. */ }
  applyLanguage();
}
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
  if (!value) return t("timePending");
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return t("timePending");
  return new Intl.DateTimeFormat(state.lang === "en" ? "en-GB" : "zh-CN", {timeZone: state.zone, month: state.lang === "en" ? "short" : "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false}).format(d);
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
  return post.day === 0 ? t("announcement") : `Day ${post.day}${post.subDay ? `.${post.subDay}` : ""}`;
}
function renderCalendar() {
  const data = state.data, day = campaignDay();
  $("#current-day").textContent = String(Math.max(0, Math.min(28, day))).padStart(2, "0");
  $("#campaign-phase").textContent = day < 1 ? t("notStarted") : day > 28 ? t("ended") : t("tracking");
  const last = Math.max(0, ...data.posts.map(p => p.day));
  $("#record-through").textContent = t("through", {day: last});
  const grid = $("#day-grid"); grid.replaceChildren();
  for (let n = 1; n <= 28; n++) {
    const records = data.posts.filter(p => p.day === n);
    const button = el("button", [records.length ? "recorded" : "", n === day ? "today" : "", records.some(p => p.kind === "reset") ? "reset" : ""].join(" "), String(n).padStart(2, "0"));
    button.type = "button"; button.disabled = !records.length;
    button.setAttribute("aria-label", `Day ${n}, ${records.length ? recordCount(records.length) : t("noRecords")}`);
    button.setAttribute("aria-pressed", String(state.day === n));
    button.addEventListener("click", () => { state.day = state.day === n ? null : n; state.filter = "all"; state.query = ""; $("#search").value = ""; render(); $("#timeline").scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"}); });
    grid.append(button);
  }
}
function renderHealth() {
  const data = state.data, sources = Object.values(data.sources || {});
  const age = data.checkedAt ? (Date.now() - Date.parse(data.checkedAt)) / 3600000 : Infinity;
  const healthy = sources.filter(s => s.ok && !s.stale && !s.freshnessUnknown).length;
  const archived = data.campaignFinished === true;
  let label = t("initial");
  if (archived) label = t("archived");
  else if (sources.length && healthy === 0) label = t("unavailable");
  else if (age > 4 && sources.length) label = t("delayed");
  else if (sources.length && healthy < sources.length) label = t("partial");
  else if (sources.length) label = t("scheduled");
  $("#health-label").textContent = label;
  $("#health-dot").style.background = archived ? "var(--muted)" : healthy && age < 4 ? "var(--green)" : "var(--warning)";
  $("#last-check").textContent = data.checkedAt ? t("lastCheck", {time: formatTime(data.checkedAt), zone: t(state.zone === "Asia/Shanghai" ? "beijing" : "pacific")}) : t("initialSnapshot");
  $("#update-count").textContent = data.posts.filter(p => p.kind === "update").length;
  $("#reset-count").textContent = data.posts.filter(p => p.kind === "reset").length;
  $("#article-count").textContent = data.posts.filter(p => p.articleUrl).length;
  for (const [id, key] of [["update-count", "updateUnit"], ["reset-count", "resetUnit"], ["article-count", "articleUnit"]]) {
    document.querySelector(`[data-i18n="${key}"]`).textContent = t(key + ($("#" + id).textContent === "1" ? "One" : ""));
  }
  const sourceList = $("#source-list"); sourceList.replaceChildren();
  for (const source of sources) {
    const row = el("li"); row.append(link(source.name, source.url));
    row.append(document.createTextNode(` · ${t(!source.ok ? "sourceFailed" : source.stale ? "sourceStale" : source.freshnessUnknown ? "sourceUnknown" : "sourceAvailable")}${source.lastSuccessAt ? " · " + t("lastSuccess", {time: formatTime(source.lastSuccessAt)}) : ""}`));
    sourceList.append(row);
  }
  const candidates = $("#candidates"); candidates.replaceChildren();
  if (data.candidates?.length) {
    candidates.append(el("p", "", t("candidates", {count: data.candidates.length})));
    const list = el("ul");
    data.candidates.slice(0, 12).forEach(c => { const li = el("li"); li.append(link(t("candidate", {id: c.id}), c.url)); list.append(li); });
    candidates.append(list);
  }
}
function renderPost(post) {
  const article = el("article", "post"); article.id = `post-${post.id}`;
  const meta = el("div", "post-meta");
  meta.append(el("span", `tag ${post.kind === "reset" ? "reset-tag" : ""}`, post.kind === "reset" ? t("resetLabel") : post.kind === "announcement" ? t("announcement") : postLabel(post)));
  meta.append(el("span", "", post.sourceChanged ? t("changed") : post.verified ? t("verified") : t("unverified")));
  const time = el("time", "", formatTime(post.publishedAt)); if (post.publishedAt) time.dateTime = post.publishedAt; meta.append(time);
  const content = el("div", "post-content"), copy = el("div", "post-copy");
  const localized = TiboI18n.postCopy(post, state.lang);
  if (localized.fallback && post.verified) copy.append(el("p", "notice", t("englishPending")));
  copy.append(el("p", "post-summary", localized.summary));
  content.append(el("h3", "", localized.title), copy);
  article.append(meta, content);
  const links = el("div", "post-links"); links.append(link(t("originalLink"), post.url));
  if (post.sources?.[1]) links.append(link(t("productLink"), post.sources[1]));
  if (post.articleUrl) links.append(link(t("articleLink"), post.articleUrl, "article-link"));
  copy.append(links);
  if (post.originalText) {
    const details = el("details"); details.append(el("summary", "", post.verified ? t("expandOriginal") : t("expandMirror")));
    details.append(el("div", "original", post.originalText));
    if (post.quotedText) details.append(el("div", "original quote", t("quote") + "\n" + post.quotedText));
    if (!post.verified) details.append(el("p", "notice", t("mirrorNotice")));
    copy.append(details);
  }
  if (post.sourceChanged) article.append(el("p", "notice", t("changedNotice")));
  return article;
}
function renderUpdates() {
  const openPosts = new Set([...document.querySelectorAll(".post details[open]")].map(d => d.closest(".post").id));
  document.querySelectorAll("[data-filter]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === state.filter)));
  $("#active-day").hidden = state.day === null;
  $("#active-day span").textContent = t("selectedDay", {day: state.day});
  const query = state.query.toLocaleLowerCase();
  const posts = [...state.data.posts].filter(p =>
    (state.day === null || p.day === state.day) &&
    (state.filter === "all" || (state.filter === "article" ? !!p.articleUrl : p.kind === state.filter)) &&
    (!query || [p.title, p.summary, p.titleEn, p.summaryEn, p.originalText, p.quotedText, postLabel(p)].join(" ").toLocaleLowerCase().includes(query))
  ).sort((a, b) => b.day - a.day || (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  $("#result-count").textContent = `${recordCount(posts.length)} · ${t("newest")}`;
  const root = $("#updates"); root.replaceChildren();
  if (!posts.length) {
    const empty = el("div", "empty", t("empty")); const reset = el("button", "", t("clear"));
    reset.addEventListener("click", clearFilters); empty.append(reset); root.append(empty); return;
  }
  for (const day of [...new Set(posts.map(p => p.day))]) {
    const group = posts.filter(p => p.day === day), section = el("section", "day-section");
    const aside = el("div", "day-aside");
    aside.append(el("p", "", day === 0 ? t("prologue") : `Day ${String(day).padStart(2, "0")}`));
    if (day > 0) {
      const date = new Date(Date.parse(state.data.campaign.startDate) + (day - 1) * 86400000);
      const dateLabel = state.lang === "en" ? new Intl.DateTimeFormat("en", {timeZone: "UTC", month: "short", day: "numeric"}).format(date) : `${date.getUTCMonth() + 1}.${String(date.getUTCDate()).padStart(2, "0")}`;
      aside.append(el("time", "", `${dateLabel} · ${t("pacific")}`));
    }
    aside.append(el("span", "day-total", recordCount(group.length)));
    const body = el("div", "day-body"); group.forEach(p => body.append(renderPost(p)));
    if (state.filter === "all" && !query) {
      const recap = state.data.roundups?.find(r => r.day === day);
      if (recap) {
        const localized = TiboI18n.roundupCopy(recap, state.lang);
        const box = el("aside", "roundup"); box.append(el("p", "eyebrow", t("recap")), el("h3", "", localized.title), el("p", "", localized.summary), link(t("officialRecap"), recap.sourceUrl));
        if (recap.additionalSourceUrl) box.append(link(t("laterReset"), recap.additionalSourceUrl));
        body.append(box);
      }
    }
    section.append(aside, body); root.append(section);
  }
  root.querySelectorAll(".post").forEach(p => { if (openPosts.has(p.id) && p.querySelector("details")) p.querySelector("details").open = true; });
}
function render() {
  if (state.data) { renderCalendar(); renderHealth(); renderUpdates(); }
  else {
    $("#health-label").textContent = t("loading");
    $("#last-check").textContent = t("interval");
    $("#campaign-phase").textContent = t("campaign");
    $("#record-through").textContent = t("loading");
    $("#updates").replaceChildren(el("p", "empty", t("loadingPosts")));
  }
  if (state.loadError) {
    $("#health-label").textContent = t(state.data ? "refreshFailed" : "dataFailed");
    $("#health-dot").style.background = "var(--warning)";
    if (!state.data) {
      const empty = el("p", "empty", t("loadError"));
      empty.append(link(t("profileLink"), "https://x.com/thsottiaux"));
      $("#updates").replaceChildren(empty);
    }
  }
  $("#refresh").textContent = t(state.loading ? "refreshing" : "refresh");
}
function clearFilters() { state.filter = "all"; state.query = ""; state.day = null; $("#search").value = ""; render(); }
async function load() {
  if (state.loading) return;
  state.loading = true; state.loadError = false; $("#refresh").disabled = true; $("#refresh").textContent = t("refreshing");
  try {
    const response = await fetch(`./data/updates.json?v=${Date.now()}`, {cache: "no-store", signal: AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error("Unable to load");
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.posts) || !data.campaign) throw new Error("Invalid data");
    state.data = data;
  } catch { state.loadError = true; }
  finally { state.loading = false; $("#refresh").disabled = false; render(); }
}
document.querySelectorAll("[data-filter]").forEach(b => b.addEventListener("click", () => { state.filter = b.dataset.filter; if (state.data) renderUpdates(); }));
$("#search").addEventListener("input", e => { state.query = e.target.value.trim(); if (state.data) renderUpdates(); });
$("#timezone").addEventListener("change", e => { state.zone = e.target.value; if (state.data) render(); });
$("#clear-day").addEventListener("click", () => {state.day = null; if (state.data) render();});
$("#refresh").addEventListener("click", load);
document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => setLanguage(b.dataset.lang)));
applyLanguage();
load();
