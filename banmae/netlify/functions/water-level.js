import { DATA_SOURCES, FLOOD_THRESHOLDS } from "./config.js";

const CACHE_MS = 5 * 60 * 1000;
let cache = { expiresAt: 0, value: null };
const emptyPayload = fetchedAt => ({ station: "P.71A", river: "แม่ขาน", waterLevel: null, criticalLevel: FLOOD_THRESHOLDS.critical, flowRate: null, observedAt: null, fetchedAt, source: DATA_SOURCES.p71a.sourceName, sourceUrl: DATA_SOURCES.p71a.url, history: [], quality: "UNVERIFIED" });
const decodeEntities = text => text.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
const clean = html => decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

function parseReport(html, fetchedAt) {
  const payload = emptyPayload(fetchedAt);
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => clean(cell[1]))).filter(row => row.length);
  const headerIndex = rows.findIndex(row => row.some(cell => /ระดับน้ำ|water\s*level/i.test(cell)));
  const stationRow = rows.find(row => row.some(cell => cell.replace(/\s/g, "").includes("P.71A")));
  if (headerIndex < 0 || !stationRow) return payload;
  const headers = rows[headerIndex];
  const valueAt = pattern => { const index = headers.findIndex(value => pattern.test(value)); if (index < 0) return null; const value = Number(String(stationRow[index] || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0]); return Number.isFinite(value) ? value : null; };
  const textAt = pattern => { const index = headers.findIndex(value => pattern.test(value)); return index < 0 ? null : stationRow[index] || null; };
  payload.waterLevel = valueAt(/ระดับน้ำ(?!.*วิกฤติ)|water\s*level/i);
  payload.flowRate = valueAt(/ปริมาณน้ำ|อัตราการไหล|discharge|flow/i);
  const observedText = textAt(/วัน.*เวลา|เวลา.*ตรวจ|date|time/i);
  if (observedText) { const parsed = new Date(observedText); payload.observedAt = Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString(); }
  payload.quality = payload.waterLevel === null || payload.observedAt === null ? "UNVERIFIED" : "LIVE";
  return payload;
}

export async function handler() {
  const now = Date.now(); if (cache.value && cache.expiresAt > now) return response(200, cache.value, true);
  const fetchedAt = new Date().toISOString();
  if (!DATA_SOURCES.p71a.url) return response(200, emptyPayload(fetchedAt));
  try {
    const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    const bangkokDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const sourceUrl = `${DATA_SOURCES.p71a.url}?sdate=${bangkokDate}`;
    const upstream = await fetch(sourceUrl, { headers: { "User-Agent": "MaeKhanFloodMonitor/1.0 (+public monitoring dashboard)" }, signal: AbortSignal.timeout(10000) });
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
    const bytes = await upstream.arrayBuffer(); let html;
    try { html = new TextDecoder("windows-874").decode(bytes); } catch { html = new TextDecoder("utf-8").decode(bytes); }
    const value = parseReport(html, fetchedAt); value.sourceUrl = sourceUrl; cache = { value, expiresAt: now + CACHE_MS }; return response(200, value);
  } catch (error) { const value = { ...emptyPayload(fetchedAt), quality: "OFFLINE", error: "SOURCE_UNAVAILABLE" }; return response(200, value); }
}

function response(statusCode, body, cached = false) { return { statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300", "X-Cache": cached ? "HIT" : "MISS", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) }; }
