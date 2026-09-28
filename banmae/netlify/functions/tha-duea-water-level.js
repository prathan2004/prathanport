const STATION_CODE = "TA061016";
const SOURCE_PAGE = `https://telemetry.dwr.go.th/home?layerMapType=BASIN&stnCode=${STATION_CODE}`;
const SOURCE_API = `https://telemetry.dwr.go.th/api/public/station/getByCode/${STATION_CODE}`;
const CACHE_SECONDS = 300;

const numberOrNull = value => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function parseThaDueaPayload(payload, fetchedAt = new Date().toISOString()) {
  const data = payload?.value || payload;
  const entity = data?.fullCon?.entity;
  const current = data?.stationCurrentData;
  if (!entity || entity.stationCode !== STATION_CODE || !current) throw new Error(`ไม่พบข้อมูลสถานี ${STATION_CODE}`);

  const history = Array.isArray(data.wlChart?.past)
    ? data.wlChart.past.map(point => ({ waterLevel: numberOrNull(point.value), flowRate: null, observedAt: point.date })).filter(point => point.waterLevel !== null && point.observedAt).slice(-48)
    : [];
  const latestCriteria = data.wlChart?.past?.at(-1) || {};
  const observedAt = current.wlTimeStamp || current.timeStamp || history.at(-1)?.observedAt || null;

  return {
    station: STATION_CODE,
    stationName: entity.stnNameTh || "น้ำแม่ขานที่บ้านท่าเดื่อ",
    river: "แม่ขาน",
    location: "บ้านท่าเดื่อ จ.เชียงใหม่",
    waterLevel: numberOrNull(current.wl),
    criticalLevel: numberOrNull(latestCriteria.redHigh),
    warningLevel: numberOrNull(latestCriteria.yellowHigh),
    watchLevel: numberOrNull(latestCriteria.yellowLow),
    flowRate: numberOrNull(current.fr),
    observedAt,
    fetchedAt,
    source: "ระบบโทรมาตร กรมทรัพยากรน้ำ",
    sourceUrl: SOURCE_PAGE,
    history,
    quality: observedAt ? "LIVE" : "UNVERIFIED",
    archived: false,
    error: null
  };
}

export async function handler() {
  const fetchedAt = new Date().toISOString();
  try {
    const upstream = await fetch(SOURCE_API, { headers: { Accept: "application/json", "User-Agent": "MaeKhanFloodMonitor/2.0" }, signal: AbortSignal.timeout(12_000) });
    if (!upstream.ok) throw new Error(`DWR telemetry HTTP ${upstream.status}`);
    return response(200, parseThaDueaPayload(await upstream.json(), fetchedAt));
  } catch (error) {
    console.error("TA061016 source error", error);
    return response(200, {
      station: STATION_CODE, stationName: "น้ำแม่ขานที่บ้านท่าเดื่อ", river: "แม่ขาน", location: "บ้านท่าเดื่อ จ.เชียงใหม่",
      waterLevel: null, criticalLevel: null, warningLevel: null, watchLevel: null, flowRate: null, observedAt: null, fetchedAt,
      source: "ระบบโทรมาตร กรมทรัพยากรน้ำ", sourceUrl: SOURCE_PAGE, history: [], quality: "OFFLINE", archived: false,
      error: "SOURCE_UNAVAILABLE"
    });
  }
}

function response(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`, "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) };
}
