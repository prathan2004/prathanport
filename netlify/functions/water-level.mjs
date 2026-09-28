const STATIONS = {
  "P.1": {
    station: "P.1",
    name: "สะพานนวรัฐ",
    river: "แม่น้ำปิง",
    district: "อำเภอเมืองเชียงใหม่",
    latitude: 18.786111,
    longitude: 99.0075,
    bankLevel: 3.7,
    source: {
      agency: "ศูนย์อุทกวิทยาชลประทานภาคเหนือตอนบน กรมชลประทาน",
      stationReference: "https://water.rid.go.th/hyd/download/book2012/assets/basic-html/page218.html",
      hourlyReport: "https://www.hydro-1.net/Data/HD-04/houly/hourly_level.php"
    }
  }
};

const WATER_THRESHOLDS = {
  normal: null,
  watch: null,
  warning: null,
  critical: null
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=0, s-maxage=240, stale-while-revalidate=60"
  }
});

const numberOrNull = (value) => {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) ? null : number;
};

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.flatMap((row) => {
    const waterLevel = numberOrNull(row.waterLevel ?? row.water_level);
    const recordedAt = row.recordedAt ?? row.recorded_at;
    if (waterLevel === null || !recordedAt || Number.isNaN(Date.parse(recordedAt))) return [];
    return [{
      waterLevel,
      flowRate: numberOrNull(row.flowRate ?? row.flow_rate),
      recordedAt: new Date(recordedAt).toISOString()
    }];
  }).sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}

function calculateTrend(history) {
  if (history.length < 2) return "unavailable";
  const change = history.at(-1).waterLevel - history.at(-2).waterLevel;
  if (Math.abs(change) < 0.01) return "stable";
  return change > 0 ? "rising" : "falling";
}

function calculateStatus(waterLevel) {
  if (waterLevel === null) return "unknown";
  if (WATER_THRESHOLDS.critical !== null && waterLevel >= WATER_THRESHOLDS.critical) return "critical";
  if (WATER_THRESHOLDS.warning !== null && waterLevel >= WATER_THRESHOLDS.warning) return "warning";
  if (WATER_THRESHOLDS.watch !== null && waterLevel >= WATER_THRESHOLDS.watch) return "watch";
  if (WATER_THRESHOLDS.normal !== null) return "normal";
  return "unknown";
}

export default async (request) => {
  const url = new URL(request.url);
  const stationCode = url.searchParams.get("station") || "P.1";
  const station = STATIONS[stationCode];
  if (!station) return json({ error: "ไม่พบสถานีที่ระบุ" }, 404);

  const officialDataUrl = process.env.WATER_DATA_URL;
  if (!officialDataUrl) {
    return json({
      ...station,
      waterLevel: null,
      flowRate: null,
      differenceToBank: null,
      trend: "unavailable",
      status: "unknown",
      updatedAt: null,
      thresholds: WATER_THRESHOLDS,
      history: [],
      available: false,
      message: "ยังไม่ได้กำหนด Public API ทางการที่มีเอกสารยืนยัน"
    });
  }

  try {
    // WATER_DATA_URL ต้องเป็น endpoint ฝั่ง server ที่ได้รับอนุญาตและคืน schema ตาม README
    const upstream = new URL(officialDataUrl);
    upstream.searchParams.set("station", stationCode);
    upstream.searchParams.set("hours", url.searchParams.get("hours") || "24");
    const response = await fetch(upstream, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Official source HTTP ${response.status}`);
    const payload = await response.json();
    const history = normalizeHistory(payload.history);
    const waterLevel = numberOrNull(payload.waterLevel);
    const flowRate = numberOrNull(payload.flowRate);
    const bankLevel = numberOrNull(payload.bankLevel) ?? station.bankLevel;
    const updatedAt = payload.updatedAt && !Number.isNaN(Date.parse(payload.updatedAt))
      ? new Date(payload.updatedAt).toISOString()
      : history.at(-1)?.recordedAt || null;

    return json({
      ...station,
      waterLevel,
      bankLevel,
      differenceToBank: waterLevel === null ? null : Number((bankLevel - waterLevel).toFixed(2)),
      flowRate,
      trend: ["rising", "stable", "falling"].includes(payload.trend) ? payload.trend : calculateTrend(history),
      status: calculateStatus(waterLevel),
      updatedAt,
      thresholds: WATER_THRESHOLDS,
      history,
      available: waterLevel !== null,
      message: waterLevel === null ? "แหล่งข้อมูลไม่มีค่าระดับน้ำล่าสุด" : null
    });
  } catch (error) {
    console.error("water-level upstream error", error);
    return json({
      ...station,
      waterLevel: null,
      flowRate: null,
      differenceToBank: null,
      trend: "unavailable",
      status: "unknown",
      updatedAt: null,
      thresholds: WATER_THRESHOLDS,
      history: [],
      available: false,
      message: "ไม่สามารถเชื่อมต่อแหล่งข้อมูลระดับน้ำทางการได้"
    }, 502);
  }
};
