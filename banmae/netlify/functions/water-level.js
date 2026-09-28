import { DATA_SOURCES, FLOOD_THRESHOLDS } from "./config.js";

const CACHE_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;
let cache = { expiresAt: 0, value: null };
const source = DATA_SOURCES.p71a;

const numberOrNull = value => {
  if (value === null || value === undefined || value === "" || value === "-") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
};

const emptyPayload = (fetchedAt, overrides = {}) => ({
  station: source.stationCode,
  stationName: "บ้านท่าวัวป่าสัก",
  river: source.river,
  waterLevel: null,
  criticalLevel: FLOOD_THRESHOLDS.critical,
  flowRate: null,
  observedAt: null,
  fetchedAt,
  source: source.sourceName,
  sourceUrl: source.hourlyReportUrl,
  history: [],
  quality: "UNVERIFIED",
  error: null,
  diagnostics: [],
  ...overrides
});

function bangkokDateAt(baseDate, dayOffset, hour) {
  const epoch = Date.parse(`${baseDate}T00:00:00+07:00`);
  if (!Number.isFinite(epoch)) return null;
  return new Date(epoch + dayOffset * 86_400_000 + hour * 3_600_000).toISOString();
}

export function parseHourlyPayload(rows, fetchedAt, requestedHours = 48) {
  if (!Array.isArray(rows)) throw new Error("รูปแบบ JSON จากต้นทางไม่ถูกต้อง");
  const payload = rows.find(row => row?.station_id1 === source.stationCode || row?.station_id2 === source.stationCode);
  if (!payload) throw new Error(`ไม่พบสถานี ${source.stationCode} ในรายงานรายชั่วโมง`);

  const slot = payload.station_id1 === source.stationCode ? 1 : 2;
  const baseDate = payload.date_day_use || payload.date_today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate || "")) throw new Error("รายงานไม่มีวันที่ตรวจวัดที่อ่านได้");

  const history = [];
  for (let day = 3; day >= 1; day -= 1) {
    const dayOffset = 1 - day;
    for (let hour = 1; hour <= 24; hour += 1) {
      const suffix = `day${day}_${slot}`;
      const waterLevel = numberOrNull(payload[`level${hour}_${suffix}`]);
      if (waterLevel === null) continue;
      const observedAt = bangkokDateAt(baseDate, dayOffset, hour);
      if (!observedAt) continue;
      history.push({ waterLevel, flowRate: numberOrNull(payload[`dischg${hour}_${suffix}`]), observedAt });
    }
  }

  history.sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const limitedHistory = history.slice(-Math.min(48, Math.max(6, requestedHours)));
  const latest = limitedHistory.at(-1);
  if (!latest) throw new Error(`สถานี ${source.stationCode} ไม่มีค่าระดับน้ำในรายงานล่าสุด`);

  return emptyPayload(fetchedAt, {
    waterLevel: latest.waterLevel,
    flowRate: latest.flowRate,
    observedAt: latest.observedAt,
    history: limitedHistory,
    quality: "LIVE",
    sourceUrl: source.hourlyReportUrl
  });
}

function unwrapJson(text) {
  const body = text.trim();
  if (body.startsWith("[") || body.startsWith("{")) return JSON.parse(body);
  const firstParen = body.indexOf("(");
  const lastParen = body.lastIndexOf(")");
  if (firstParen >= 0 && lastParen > firstParen) return JSON.parse(body.slice(firstParen + 1, lastParen));
  throw new Error("ต้นทางไม่ได้ส่ง JSON หรือ JSONP ที่อ่านได้");
}

async function fetchHourlyReport(fetchedAt) {
  const url = new URL(source.hourlyJsonUrl);
  url.searchParams.set("station_id1", source.stationCode);
  url.searchParams.set("station_id2", source.stationCode);
  url.searchParams.set("date", "");
  const response = await fetch(url, {
    headers: { Accept: "application/json, text/javascript, */*; q=0.01", Referer: source.hourlyReportUrl, "User-Agent": "MaeKhanFloodMonitor/2.0" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseHourlyPayload(unwrapJson(await response.text()), fetchedAt);
}

const decodeEntities = text => text.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
const clean = html => decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

export function parseDailyReport(html, fetchedAt) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => clean(cell[1]))).filter(row => row.length);
  const headerIndex = rows.findIndex(row => row.some(cell => /ระดับน้ำ|water\s*level/i.test(cell)));
  const stationRow = rows.find(row => row.some(cell => cell.replace(/\s/g, "").includes(source.stationCode)));
  if (headerIndex < 0 || !stationRow) throw new Error(`ไม่พบตารางของสถานี ${source.stationCode}`);
  const headers = rows[headerIndex];
  const valueAt = pattern => {
    const index = headers.findIndex(value => pattern.test(value));
    return index < 0 ? null : numberOrNull(String(stationRow[index] || "").match(/-?\d+(?:\.\d+)?/)?.[0]);
  };
  const waterLevel = valueAt(/ระดับน้ำ(?!.*วิกฤติ)|water\s*level/i);
  if (waterLevel === null) throw new Error("พบสถานีแต่ไม่พบคอลัมน์ระดับน้ำที่ยืนยันได้");
  return emptyPayload(fetchedAt, { waterLevel, flowRate: valueAt(/ปริมาณน้ำ|อัตราการไหล|discharge|flow/i), quality: "UNVERIFIED", sourceUrl: source.dailyReportUrl });
}

async function fetchDailyReport(fetchedAt) {
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  const url = `${source.dailyReportUrl}?sdate=${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const response = await fetch(url, { headers: { "User-Agent": "MaeKhanFloodMonitor/2.0" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  let html;
  try { html = new TextDecoder("windows-874").decode(bytes); } catch { html = new TextDecoder("utf-8").decode(bytes); }
  return parseDailyReport(html, fetchedAt);
}

export async function handler() {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) return response(200, cache.value, true);
  const fetchedAt = new Date().toISOString();
  const diagnostics = [];
  for (const [name, load] of [["RID_HOURLY_JSON", fetchHourlyReport], ["HII_DAILY_HTML", fetchDailyReport]]) {
    try {
      const value = await load(fetchedAt);
      value.diagnostics = [...diagnostics, { source: name, ok: true }];
      cache = { value, expiresAt: now + CACHE_MS };
      return response(200, value);
    } catch (error) {
      diagnostics.push({ source: name, ok: false, message: error instanceof Error ? error.message : String(error) });
    }
  }
  console.error("All P.71A sources failed", diagnostics);
  return response(200, emptyPayload(fetchedAt, { quality: "OFFLINE", error: "ALL_SOURCES_UNAVAILABLE", diagnostics }));
}

function response(statusCode, body, cached = false) {
  return { statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60", "X-Cache": cached ? "HIT" : "MISS", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) };
}
