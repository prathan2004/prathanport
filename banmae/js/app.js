import { initMap, invalidateMapSize } from "./map.js";
import { EMPTY_WATER_DATA, fetchWaterData, deriveWaterState } from "./water.js";
import { renderWaterChart } from "./chart.js";

const fmtNumber = value => value === null ? "ยังไม่มีข้อมูล" : `${value.toFixed(2)} เมตร`;
const fmtTime = value => value ? new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ยังไม่มีข้อมูล";
let currentData = EMPTY_WATER_DATA;

function render(data) {
  currentData = data; const state = deriveWaterState(data);
  document.querySelector("#water-level").textContent = fmtNumber(data.waterLevel);
  document.querySelector("#critical-level").textContent = fmtNumber(data.criticalLevel);
  document.querySelector("#critical-distance").textContent = state.distance === null ? "ยังไม่มีข้อมูล" : `${state.distance.toFixed(2)} เมตร`;
  document.querySelector("#observed-at").textContent = fmtTime(data.observedAt);
  document.querySelector("#fetched-at").textContent = data.fetchedAt ? `ระบบดึงข้อมูล ${fmtTime(data.fetchedAt)}` : "ระบบยังไม่ได้ดึงข้อมูล";
  const trend = state.changePerHour === null ? ["ยังไม่มีข้อมูล", "ต้องมีข้อมูลย้อนหลัง"] : state.changePerHour > 1 ? ["↑ เพิ่มขึ้น", `+${state.changePerHour.toFixed(0)} ซม./ชม.`] : state.changePerHour < -1 ? ["↓ ลดลง", `${state.changePerHour.toFixed(0)} ซม./ชม.`] : ["→ ทรงตัว", `${state.changePerHour.toFixed(0)} ซม./ชม.`];
  document.querySelector("#water-trend").textContent = trend[0]; document.querySelector("#trend-rate").textContent = trend[1];
  const badge = document.querySelector("#quality-badge"); badge.className = `quality-badge ${state.quality.toLowerCase()}`; badge.innerHTML = `<span></span> ${state.quality}`;
  const alert = document.querySelector("#data-alert");
  if (data.error) { alert.hidden = false; alert.textContent = `ไม่สามารถดึงข้อมูลระดับน้ำได้ในขณะนี้ · พยายามเชื่อมต่อล่าสุด ${fmtTime(data.fetchedAt)}`; }
  else if (state.quality === "DELAYED") { alert.hidden = false; alert.textContent = `ข้อมูลอาจล่าช้า · ตรวจวัดล่าสุด ${fmtTime(data.observedAt)}`; }
  else alert.hidden = true;
  renderWaterChart(data, Number(document.querySelector(".range-tabs .active").dataset.hours));
}

async function refresh() {
  const button = document.querySelector("#refresh-button"); button.classList.add("loading"); button.disabled = true;
  try { render(await fetchWaterData()); } catch { render({ ...EMPTY_WATER_DATA, fetchedAt: new Date().toISOString(), quality: "OFFLINE", error: "SOURCE_UNAVAILABLE" }); }
  finally { button.classList.remove("loading"); button.disabled = false; }
}

document.querySelector("#refresh-button").addEventListener("click", refresh);
document.querySelectorAll(".range-tabs button").forEach(button => button.addEventListener("click", () => { document.querySelectorAll(".range-tabs button").forEach(b => b.classList.toggle("active", b === button)); renderWaterChart(currentData, Number(button.dataset.hours)); }));
const sidebar = document.querySelector("#sidebar"); const sheetToggle = document.querySelector("#sheet-toggle");
sheetToggle.addEventListener("click", () => { const open = sidebar.classList.toggle("open"); sheetToggle.setAttribute("aria-expanded", String(open)); sheetToggle.querySelector("span").textContent = open ? "⌄" : "⌃"; invalidateMapSize(); });

render(EMPTY_WATER_DATA); initMap(); refresh(); setInterval(refresh, 5 * 60 * 1000);
