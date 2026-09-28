const OFFICIAL_HOURLY_URL = "https://hydro1.ddns.net/main/information_4/houly/water_today_json.php";

const STATIONS = {
  "P.1": {
    station: "P.1",
    name: "สะพานนวรัฐ",
    river: "แม่น้ำปิง",
    district: "อำเภอเมืองเชียงใหม่",
    latitude: 18.786111,
    longitude: 99.0075,
    source: {
      agency: "ศูนย์อุทกวิทยาชลประทานภาคเหนือตอนบน กรมชลประทาน",
      reportPage: "https://hydro-1.net/Data/HD-04/houly/hourly_level.php",
      stationReference: "https://water.rid.go.th/hyd/download/book2012/assets/basic-html/page218.html"
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
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

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

function extractHistory(payload, requestedHours) {
  const baseDate = payload.date_day_use || payload.date_today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate || "")) return [];
  const baseTime = Date.parse(`${baseDate}T00:00:00+07:00`);
  const history = [];

  for (let day = 3; day >= 1; day -= 1) {
    const dayOffset = day - 1;
    for (let hour = 1; hour <= 24; hour += 1) {
      const suffix = `day${day}_2`;
      const waterLevel = numberOrNull(payload[`level${hour}_${suffix}`]);
      if (waterLevel === null) continue;
      history.push({
        waterLevel,
        flowRate: numberOrNull(payload[`dischg${hour}_${suffix}`]),
        recordedAt: new Date(baseTime - dayOffset * 86400000 + hour * 3600000).toISOString()
      });
    }
  }

  history.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  return history.slice(-requestedHours);
}

async function fetchOfficialP1(hours) {
  const upstream = new URL(OFFICIAL_HOURLY_URL);
  upstream.searchParams.set("station_id1", "P.67");
  upstream.searchParams.set("station_id2", "P.1");
  upstream.searchParams.set("date", "");
  const response = await fetch(upstream, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Referer: STATIONS["P.1"].source.reportPage,
      "User-Agent": "Chiang-Mai-Rain-Monitor/1.0"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Official water source HTTP ${response.status}`);

  const body = (await response.text()).trim();
  const jsonText = body.startsWith("[") ? body : body.slice(body.indexOf("(" ) + 1, body.lastIndexOf(")"));
  const rows = JSON.parse(jsonText);
  const payload = rows.find((row) => row.station_id2 === "P.1");
  if (!payload) throw new Error("Official response does not contain station P.1");

  const history = extractHistory(payload, hours);
  const latest = history.at(-1);
  const bankLevel = numberOrNull(payload.level_limit2_day1) ?? numberOrNull(payload.level_limit2_day2);
  return { payload, history, latest, bankLevel };
}

export default async (request) => {
  const url = new URL(request.url);
  const stationCode = url.searchParams.get("station") || "P.1";
  const station = STATIONS[stationCode];
  if (!station) return json({ error: "ไม่พบสถานีที่ระบุ" }, 404);
  const requestedHours = Math.min(48, Math.max(6, Number(url.searchParams.get("hours")) || 24));

  try {
    const { history, latest, bankLevel } = await fetchOfficialP1(requestedHours);
    const waterLevel = latest?.waterLevel ?? null;
    const flowRate = latest?.flowRate ?? null;
    return json({
      ...station,
      waterLevel,
      bankLevel,
      differenceToBank: waterLevel === null || bankLevel === null
        ? null
        : Number((bankLevel - waterLevel).toFixed(2)),
      flowRate,
      trend: calculateTrend(history),
      status: calculateStatus(waterLevel),
      updatedAt: latest?.recordedAt || null,
      thresholds: WATER_THRESHOLDS,
      history,
      available: waterLevel !== null,
      message: waterLevel === null
        ? "รายงานทางการยังไม่มีค่าระดับน้ำล่าสุด"
        : "ข้อมูลจากรายงานระดับน้ำรายชั่วโมง กรมชลประทาน"
    });
  } catch (error) {
    console.error("P.1 official source error", error);
    return json({
      ...station,
      waterLevel: null,
      bankLevel: 3.7,
      differenceToBank: null,
      flowRate: null,
      trend: "unavailable",
      status: "unknown",
      updatedAt: null,
      thresholds: WATER_THRESHOLDS,
      history: [],
      available: false,
      message: "ไม่สามารถอ่านรายงานระดับน้ำ P.1 จากกรมชลประทานได้ในขณะนี้"
    }, 502);
  }
};
