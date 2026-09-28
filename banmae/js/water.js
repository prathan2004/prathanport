export const EMPTY_WATER_DATA = Object.freeze({
  station: "P.71A", river: "แม่ขาน", waterLevel: null, criticalLevel: null,
  flowRate: null, observedAt: null, fetchedAt: null, source: null,
  history: [], quality: "UNVERIFIED", error: null, diagnostics: []
});

export function normalizeWaterData(payload = {}) {
  const numberOrNull = value => value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  return {
    ...EMPTY_WATER_DATA,
    ...payload,
    waterLevel: numberOrNull(payload.waterLevel),
    criticalLevel: numberOrNull(payload.criticalLevel),
    flowRate: numberOrNull(payload.flowRate),
    history: Array.isArray(payload.history) ? payload.history.filter(item => Number.isFinite(Number(item.waterLevel))) : []
  };
}

export function deriveWaterState(data) {
  const observed = data.observedAt ? new Date(data.observedAt) : null;
  const ageHours = observed && !Number.isNaN(observed.valueOf()) ? (Date.now() - observed.valueOf()) / 36e5 : null;
  const quality = data.error ? "OFFLINE" : ageHours === null ? "UNVERIFIED" : ageHours > 3 ? "DELAYED" : "LIVE";
  const distance = data.waterLevel !== null && data.criticalLevel !== null ? data.criticalLevel - data.waterLevel : null;
  const history = data.history.slice().sort((a, b) => new Date(a.observedAt) - new Date(b.observedAt));
  let changePerHour = null;
  if (history.length >= 2) {
    const a = history.at(-2); const b = history.at(-1);
    const hours = (new Date(b.observedAt) - new Date(a.observedAt)) / 36e5;
    if (hours > 0) changePerHour = ((Number(b.waterLevel) - Number(a.waterLevel)) * 100) / hours;
  }
  return { quality, ageHours, distance, changePerHour };
}

export async function fetchWaterData() {
  const response = await fetch("/.netlify/functions/mae-khan-water-level", { headers: { Accept: "application/json" }, cache: "no-store" });
  if (response.status === 404) {
    const error = new Error("ไม่พบ Netlify Function");
    error.code = "FUNCTION_NOT_DEPLOYED";
    throw error;
  }
  if (!response.ok) throw new Error(`Water API returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const error = new Error("Netlify Function ไม่ได้ตอบกลับเป็น JSON");
    error.code = "FUNCTION_NOT_DEPLOYED";
    throw error;
  }
  return normalizeWaterData(await response.json());
}
