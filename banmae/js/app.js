import { EMPTY_WATER_DATA, fetchWaterData, fetchThaDueaData, deriveWaterState } from "./water.js";
import { renderWaterChart } from "./chart.js";

const fmtNumber = value => value === null ? "ไม่มีค่ารายงานล่าสุด" : `${value.toFixed(2)} เมตร`;
const fmtTime = value => value ? new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ไม่มีเวลาตรวจวัด";
let p71aData = EMPTY_WATER_DATA;
let thaDueaData = EMPTY_WATER_DATA;

function renderP71A(data) {
  p71aData = data;
  const state = deriveWaterState(data);
  document.querySelector("#water-level").textContent = fmtNumber(data.waterLevel);
  document.querySelector("#critical-level").textContent = data.criticalLevel === null ? "ยังไม่มีเกณฑ์ที่ยืนยัน" : fmtNumber(data.criticalLevel);
  document.querySelector("#critical-distance").textContent = state.distance === null ? "คำนวณไม่ได้" : `${state.distance.toFixed(2)} เมตร`;
  document.querySelector("#observed-at").textContent = fmtTime(data.observedAt);
  document.querySelector("#fetched-at").textContent = data.fetchedAt ? `ระบบดึงข้อมูล ${fmtTime(data.fetchedAt)}` : "ระบบยังไม่ได้ดึงข้อมูล";
  document.querySelector("#p71a-level").textContent = fmtNumber(data.waterLevel);
  document.querySelector("#p71a-time").textContent = `ตรวจวัด ${fmtTime(data.observedAt)}`;
  const trend = state.changePerHour === null ? ["คำนวณไม่ได้", "ไม่มีข้อมูลย้อนหลังเพียงพอ"] : state.changePerHour > 1 ? ["↑ เพิ่มขึ้น", `+${state.changePerHour.toFixed(0)} ซม./ชม.`] : state.changePerHour < -1 ? ["↓ ลดลง", `${state.changePerHour.toFixed(0)} ซม./ชม.`] : ["→ ทรงตัว", `${state.changePerHour.toFixed(0)} ซม./ชม.`];
  document.querySelector("#water-trend").textContent = trend[0];
  document.querySelector("#trend-rate").textContent = trend[1];
  const badge = document.querySelector("#quality-badge");
  badge.className = `quality-badge ${state.quality.toLowerCase()}`;
  badge.innerHTML = `<span></span> ${state.quality}`;
  const alert = document.querySelector("#data-alert");
  if (data.error) { alert.hidden = false; alert.textContent = `ไม่สามารถดึงข้อมูล P.71A ได้ในขณะนี้ · พยายามล่าสุด ${fmtTime(data.fetchedAt)}`; }
  else if (state.quality === "DELAYED") { alert.hidden = false; alert.textContent = `ข้อมูล P.71A อาจล่าช้า · ตรวจวัดล่าสุด ${fmtTime(data.observedAt)}`; }
  else alert.hidden = true;
  renderCharts();
}

function renderThaDuea(data) {
  thaDueaData = data;
  document.querySelector("#tha-duea-level").textContent = fmtNumber(data.waterLevel);
  document.querySelector("#tha-duea-time").textContent = `ตรวจวัด ${fmtTime(data.observedAt)}`;
  renderCharts();
}

function renderCharts() {
  const hours = Number(document.querySelector(".range-tabs .active").dataset.hours);
  renderWaterChart(p71aData, hours);
  renderWaterChart(thaDueaData, hours, { canvasId: "tha-duea-water-chart", emptyId: "tha-duea-chart-empty", color: "#f3c969", fill: "rgba(243,201,105,.12)" });
}

async function refresh() {
  const button = document.querySelector("#refresh-button");
  button.classList.add("loading"); button.disabled = true;
  const [p71aResult, thaDueaResult] = await Promise.allSettled([fetchWaterData(), fetchThaDueaData()]);
  if (p71aResult.status === "fulfilled") renderP71A(p71aResult.value);
  else {
    renderP71A({ ...EMPTY_WATER_DATA, fetchedAt: new Date().toISOString(), quality: "OFFLINE", error: p71aResult.reason?.code || "FUNCTION_REQUEST_FAILED" });
    if (p71aResult.reason?.code === "FUNCTION_NOT_DEPLOYED") document.querySelector("#data-alert").textContent = "ไม่พบ Netlify Function · Deploy Functions ใหม่จาก repository";
  }
  if (thaDueaResult.status === "fulfilled") renderThaDuea(thaDueaResult.value);
  else {
    renderThaDuea(EMPTY_WATER_DATA);
    document.querySelector("#tha-duea-source-state").textContent = "ไม่สามารถโหลดข้อมูลบ้านท่าเดื่อได้";
  }
  button.classList.remove("loading"); button.disabled = false;
}

document.querySelector("#refresh-button").addEventListener("click", refresh);
document.querySelectorAll(".range-tabs button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".range-tabs button").forEach(item => item.classList.toggle("active", item === button));
  renderCharts();
}));
document.querySelectorAll("[data-scroll-to]").forEach(button => button.addEventListener("click", () => document.querySelector(`#${button.dataset.scrollTo}`)?.scrollIntoView({ behavior: "smooth", block: "start" })));

renderP71A(EMPTY_WATER_DATA);
refresh();
setInterval(refresh, 5 * 60 * 1000);
