"use strict";

const DEMO_MODE = true;
const WEATHER_CONFIG = {
  weatherEndpoint: "",
  radarUrl: "",
  cloudUrl: "",
  rainUrl: "",
  satelliteUrl: "",
  apiKey: "" // ห้ามใส่ secret key ใน frontend ให้เรียกผ่าน serverless function
};

const DISTRICTS = [
  "เมืองเชียงใหม่", "จอมทอง", "แม่แจ่ม", "เชียงดาว", "ดอยสะเก็ด",
  "แม่แตง", "แม่ริม", "สะเมิง", "ฝาง", "แม่อาย", "พร้าว", "สันป่าตอง",
  "สันกำแพง", "สันทราย", "หางดง", "ฮอด", "ดอยเต่า", "อมก๋อย", "สารภี",
  "เวียงแหง", "ไชยปราการ", "แม่วาง", "แม่ออน", "ดอยหล่อ", "กัลยาณิวัฒนา"
];

const appState = {
  map: null,
  districtLayer: null,
  selectedLayer: null,
  weatherLayers: {},
  radarAnimation: null,
  userMarker: null,
  weatherCache: new Map(),
  geojson: null
};

const $ = (selector) => document.querySelector(selector);
const dom = {
  districtSelect: $("#districtSelect"), districtSearch: $("#districtSearch"),
  searchResults: $("#searchResults"), districtName: $("#districtName"),
  rainStatus: $("#rainStatus"), rainfall: $("#rainfall"), temperature: $("#temperature"),
  humidity: $("#humidity"), windSpeed: $("#windSpeed"), updatedAt: $("#updatedAt"),
  timeSlider: $("#timeSlider"), timelineTicks: $("#timelineTicks"), frameLabel: $("#frameLabel"),
  playButton: $("#playButton"), loadingOverlay: $("#loadingOverlay"), toast: $("#toast")
};

document.addEventListener("DOMContentLoaded", async () => {
  populateDistricts();
  initializeMap();
  bindEvents();
  updateClock();
  buildTimeline();
  setInterval(updateClock, 1000);
  setInterval(refreshWeather, 5 * 60 * 1000);
  await loadDistrictGeoJSON();
  await loadWeather();
});

function initializeMap() {
  appState.map = L.map("map", { center: [18.82, 98.82], zoom: 8, zoomControl: false, minZoom: 7 });
  L.control.zoom({ position: "topright" }).addTo(appState.map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(appState.map);
}

async function loadDistrictGeoJSON() {
  try {
    const response = await fetch("data/chiangmai-districts.geojson");
    if (!response.ok) throw new Error("GeoJSON response error");
    appState.geojson = await response.json();
    appState.districtLayer = L.geoJSON(appState.geojson, {
      style: districtStyle,
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name_th;
        layer.bindTooltip(`อำเภอ${name}`, { sticky: true, direction: "top" });
        layer.on({
          mouseover: (event) => event.target.setStyle({ weight: 2, color: "#8ff4ff", fillOpacity: .25 }),
          mouseout: (event) => { if (event.target !== appState.selectedLayer) appState.districtLayer.resetStyle(event.target); },
          click: () => selectDistrict(name, layer)
        });
      }
    }).addTo(appState.map);
    appState.map.fitBounds(appState.districtLayer.getBounds(), { padding: [22, 22] });
  } catch (error) {
    showToast("ไม่สามารถโหลดขอบเขตอำเภอได้ในขณะนี้");
    console.error(error);
  }
}

function districtStyle(feature) {
  const intensity = (feature.properties.demo_rain || 0) / 30;
  return { color: "#45bcd0", weight: 1, opacity: .7, fillColor: intensity > .65 ? "#f0547a" : intensity > .35 ? "#24c8bd" : "#2484b8", fillOpacity: .08 + intensity * .17 };
}

function populateDistricts() {
  DISTRICTS.forEach((name) => {
    const option = document.createElement("option");
    option.value = name; option.textContent = `อำเภอ${name}`;
    dom.districtSelect.append(option);
  });
}

function bindEvents() {
  dom.districtSelect.addEventListener("change", (event) => event.target.value && selectDistrictByName(event.target.value));
  $("#viewProvinceButton").addEventListener("click", viewProvince);
  $("#locateButton").addEventListener("click", locateUser);
  $("#refreshButton").addEventListener("click", refreshWeather);
  dom.districtSearch.addEventListener("input", handleSearch);
  dom.districtSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const first = getSearchMatches(event.target.value)[0];
      if (first) chooseSearchResult(first);
    }
  });
  dom.playButton.addEventListener("click", () => appState.radarAnimation ? stopRadarAnimation() : startRadarAnimation());
  dom.timeSlider.addEventListener("input", () => updateRadarFrame(Number(dom.timeSlider.value)));
  document.querySelectorAll(".range-buttons button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".range-buttons button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const frame = Math.max(0, 12 + Number(button.dataset.offset) / 10);
    dom.timeSlider.value = frame;
    updateRadarFrame(frame);
  }));
  document.querySelectorAll("[data-layer]").forEach((input) => input.addEventListener("change", () => toggleWeatherLayer(input.dataset.layer, input.checked)));
}

function selectDistrictByName(name) {
  if (!appState.districtLayer) return;
  let target = null;
  appState.districtLayer.eachLayer((layer) => { if (layer.feature.properties.name_th === name) target = layer; });
  if (target) selectDistrict(name, target);
}

async function selectDistrict(name, layer) {
  if (appState.selectedLayer) appState.districtLayer.resetStyle(appState.selectedLayer);
  appState.selectedLayer = layer;
  layer.setStyle({ color: "#bcf7ff", weight: 3, fillColor: "#16c2d7", fillOpacity: .34 });
  layer.bringToFront();
  appState.map.fitBounds(layer.getBounds(), { padding: [45, 45], maxZoom: 11 });
  dom.districtSelect.value = name;
  dom.districtSearch.value = "";
  dom.searchResults.hidden = true;
  dom.districtName.textContent = `อำเภอ${name}`;
  await loadWeather(name);
}

function viewProvince() {
  if (appState.selectedLayer) appState.districtLayer.resetStyle(appState.selectedLayer);
  appState.selectedLayer = null;
  dom.districtSelect.value = "";
  dom.districtName.textContent = "จังหวัดเชียงใหม่";
  appState.map.fitBounds(appState.districtLayer.getBounds(), { padding: [22, 22] });
  loadWeather();
}

function getSearchMatches(term) {
  const query = term.trim().replace(/^อำเภอ/, "");
  return query ? DISTRICTS.filter((name) => name.includes(query)).slice(0, 7) : [];
}

function handleSearch(event) {
  const matches = getSearchMatches(event.target.value);
  dom.searchResults.replaceChildren(...matches.map((name) => {
    const button = document.createElement("button");
    button.type = "button"; button.textContent = `อำเภอ${name}`;
    button.addEventListener("click", () => chooseSearchResult(name));
    return button;
  }));
  dom.searchResults.hidden = matches.length === 0;
}

function chooseSearchResult(name) {
  dom.districtSearch.value = name;
  dom.searchResults.hidden = true;
  selectDistrictByName(name);
}

async function loadWeather(district = "จังหวัดเชียงใหม่", force = false) {
  dom.loadingOverlay.hidden = false;
  try {
    const cached = appState.weatherCache.get(district);
    if (!force && cached && Date.now() - cached.cachedAt < 5 * 60 * 1000) return updateWeatherPanel(cached);
    let data;
    if (DEMO_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      data = createDemoWeather(district);
    } else {
      if (!WEATHER_CONFIG.weatherEndpoint) throw new Error("Weather endpoint is not configured");
      const response = await fetch(`${WEATHER_CONFIG.weatherEndpoint}?district=${encodeURIComponent(district)}`);
      if (!response.ok) throw new Error("Weather API error");
      data = await response.json();
    }
    data.cachedAt = Date.now();
    appState.weatherCache.set(district, data);
    updateWeatherPanel(data);
  } catch (error) {
    showToast("ไม่สามารถโหลดข้อมูลสภาพอากาศได้ในขณะนี้");
    updateWeatherPanel({ status: "ไม่มีข้อมูล", rainfall: null, temperature: null, humidity: null, windSpeed: null, updatedAt: new Date() });
    console.error(error);
  } finally {
    dom.loadingOverlay.hidden = true;
  }
}

function createDemoWeather(district) {
  const seed = [...district].reduce((total, char) => total + char.charCodeAt(0), 0);
  const rainfall = Number(((seed % 165) / 10).toFixed(1));
  return {
    status: rainfall > 12 ? "ฝนตกหนักบางช่วง" : rainfall > 5 ? "มีฝนปานกลาง" : rainfall > 1 ? "มีฝนเล็กน้อย" : "ท้องฟ้ามีเมฆมาก",
    rainfall,
    temperature: 24 + seed % 8,
    humidity: 65 + seed % 27,
    windSpeed: 3 + seed % 14,
    updatedAt: new Date()
  };
}

function updateWeatherPanel(data) {
  const valueOrEmpty = (value, suffix) => value === null || value === undefined ? "ไม่มีข้อมูล" : `${value}${suffix}`;
  dom.rainStatus.textContent = data.status || "ไม่มีข้อมูล";
  dom.rainfall.textContent = valueOrEmpty(data.rainfall, " มม.");
  dom.temperature.textContent = valueOrEmpty(data.temperature, "°");
  dom.humidity.textContent = valueOrEmpty(data.humidity, "%");
  dom.windSpeed.textContent = valueOrEmpty(data.windSpeed, " กม./ชม.");
  dom.updatedAt.textContent = `${formatTime(new Date(data.updatedAt))} น.`;
}

function toggleWeatherLayer(type, enabled) {
  if (!enabled) {
    if (appState.weatherLayers[type]) appState.map.removeLayer(appState.weatherLayers[type]);
    return;
  }
  const url = WEATHER_CONFIG[`${type}Url`];
  if (!url) {
    showToast(`เลเยอร์ ${type} อยู่ในโหมด Demo — เพิ่ม Tile URL ใน WEATHER_CONFIG`);
    return;
  }
  if (!appState.weatherLayers[type]) appState.weatherLayers[type] = L.tileLayer(url, { opacity: .62, maxZoom: 18 });
  appState.weatherLayers[type].addTo(appState.map);
}

function buildTimeline() {
  const now = new Date();
  const labels = [];
  for (let frame = 0; frame <= 12; frame += 1) {
    const time = new Date(now.getTime() - (12 - frame) * 10 * 60 * 1000);
    labels.push(frame % 3 === 0 ? formatTime(time) : "·");
  }
  dom.timelineTicks.innerHTML = labels.map((label) => `<span>${label}</span>`).join("");
  updateRadarFrame(12);
}

function updateRadarFrame(frame) {
  const minutesAgo = (12 - frame) * 10;
  const time = new Date(Date.now() - minutesAgo * 60 * 1000);
  dom.frameLabel.textContent = minutesAgo === 0 ? `ปัจจุบัน · ${formatTime(time)} น.` : `${minutesAgo} นาทีที่แล้ว · ${formatTime(time)} น.`;
}

function startRadarAnimation() {
  dom.playButton.classList.add("playing");
  dom.playButton.setAttribute("aria-label", "หยุดภาพเคลื่อนไหว");
  if (Number(dom.timeSlider.value) >= 12) dom.timeSlider.value = 0;
  appState.radarAnimation = setInterval(() => {
    const nextFrame = (Number(dom.timeSlider.value) + 1) % 13;
    dom.timeSlider.value = nextFrame;
    updateRadarFrame(nextFrame);
  }, 650);
}

function stopRadarAnimation() {
  clearInterval(appState.radarAnimation);
  appState.radarAnimation = null;
  dom.playButton.classList.remove("playing");
  dom.playButton.setAttribute("aria-label", "เล่นภาพเคลื่อนไหว");
}

function locateUser() {
  const message = $("#locationMessage");
  if (!navigator.geolocation) return message.textContent = "อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง";
  message.textContent = "กำลังค้นหาตำแหน่งของคุณ...";
  navigator.geolocation.getCurrentPosition((position) => {
    const latlng = [position.coords.latitude, position.coords.longitude];
    if (appState.userMarker) appState.userMarker.remove();
    appState.userMarker = L.circleMarker(latlng, { radius: 8, color: "#fff", weight: 3, fillColor: "#16c2d7", fillOpacity: 1 })
      .addTo(appState.map).bindPopup("ตำแหน่งของคุณ").openPopup();
    appState.map.setView(latlng, 12);
    message.textContent = "แสดงตำแหน่งของคุณบนแผนที่แล้ว";
  }, () => { message.textContent = "ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาตรวจสอบการอนุญาต"; }, { enableHighAccuracy: true, timeout: 10000 });
}

async function refreshWeather() {
  const district = appState.selectedLayer?.feature.properties.name_th || "จังหวัดเชียงใหม่";
  appState.weatherCache.delete(district);
  await loadWeather(district, true);
  showToast(`อัปเดตข้อมูลล่าสุด ${formatTime(new Date())} น.`);
}

function updateClock() {
  const now = new Date();
  $("#currentDate").textContent = new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(now);
  $("#currentTime").textContent = now.toLocaleTimeString("th-TH", { hour12: false });
}

function formatTime(date) {
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  toastTimer = setTimeout(() => { dom.toast.hidden = true; }, 3500);
}
