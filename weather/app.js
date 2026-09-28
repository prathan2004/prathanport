"use strict";

const WEATHER_CONFIG = {
  weatherEndpoint: "https://api.open-meteo.com/v1/forecast",
  radarEndpoint: "https://api.rainviewer.com/public/weather-maps.json",
  refreshInterval: 5 * 60 * 1000,
  defaultLocation: { name: "จังหวัดเชียงใหม่", latitude: 18.7883, longitude: 98.9853 }
};

const DISTRICTS = [
  "เมืองเชียงใหม่", "จอมทอง", "แม่แจ่ม", "เชียงดาว", "ดอยสะเก็ด", "แม่แตง",
  "แม่ริม", "สะเมิง", "ฝาง", "แม่อาย", "พร้าว", "สันป่าตอง", "สันกำแพง",
  "สันทราย", "หางดง", "ฮอด", "ดอยเต่า", "อมก๋อย", "สารภี", "เวียงแหง",
  "ไชยปราการ", "แม่วาง", "แม่ออน", "ดอยหล่อ", "กัลยาณิวัฒนา"
];

const WEATHER_CODES = {
  0: "ท้องฟ้าแจ่มใส", 1: "ท้องฟ้าโปร่ง", 2: "มีเมฆบางส่วน", 3: "เมฆมาก",
  45: "มีหมอก", 48: "มีหมอกจัด", 51: "ฝนปรอยเล็กน้อย", 53: "ฝนปรอยปานกลาง",
  55: "ฝนปรอยหนัก", 61: "ฝนตกเล็กน้อย", 63: "ฝนตกปานกลาง", 65: "ฝนตกหนัก",
  80: "ฝนซู่เล็กน้อย", 81: "ฝนซู่ปานกลาง", 82: "ฝนซู่หนัก",
  95: "พายุฝนฟ้าคะนอง", 96: "พายุฝนฟ้าคะนองและลูกเห็บ", 99: "พายุฝนฟ้าคะนองรุนแรง"
};

const appState = {
  map: null, districtLayer: null, selectedLayer: null, userMarker: null,
  weatherCache: new Map(), radarFrames: [], radarHost: "", radarLayer: null,
  radarAnimation: null, currentLocation: WEATHER_CONFIG.defaultLocation
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
  setInterval(updateClock, 1000);
  setInterval(refreshAllData, WEATHER_CONFIG.refreshInterval);
  await loadDistrictGeoJSON();
  await Promise.allSettled([loadWeather(), loadRadar()]);
});

function initializeMap() {
  appState.map = L.map("map", {
    center: [18.7883, 98.9853], zoom: 8, zoomControl: false, minZoom: 7
  });
  L.control.zoom({ position: "topright" }).addTo(appState.map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap | Boundaries: &copy; geoBoundaries, RTSD, OCHA"
  }).addTo(appState.map);
}

async function loadDistrictGeoJSON() {
  try {
    const response = await fetch("data/chiangmai-districts.geojson");
    if (!response.ok) throw new Error(`GeoJSON HTTP ${response.status}`);
    const geojson = await response.json();
    appState.districtLayer = L.geoJSON(geojson, {
      style: () => ({ color: "#45bcd0", weight: 1, opacity: .76, fillColor: "#2484b8", fillOpacity: .08 }),
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name_th;
        layer.bindTooltip(`อำเภอ${name}`, { sticky: true, direction: "top" });
        layer.on({
          mouseover: (event) => event.target.setStyle({ weight: 2, color: "#8ff4ff", fillOpacity: .25 }),
          mouseout: (event) => {
            if (event.target !== appState.selectedLayer) appState.districtLayer.resetStyle(event.target);
          },
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

function populateDistricts() {
  DISTRICTS.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = `อำเภอ${name}`;
    dom.districtSelect.append(option);
  });
}

function bindEvents() {
  dom.districtSelect.addEventListener("change", (event) => event.target.value && selectDistrictByName(event.target.value));
  $("#viewProvinceButton").addEventListener("click", viewProvince);
  $("#locateButton").addEventListener("click", locateUser);
  $("#refreshButton").addEventListener("click", refreshAllData);
  dom.districtSearch.addEventListener("input", handleSearch);
  dom.districtSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const first = getSearchMatches(event.target.value)[0];
      if (first) chooseSearchResult(first);
    }
  });
  dom.playButton.addEventListener("click", () => appState.radarAnimation ? stopRadarAnimation() : startRadarAnimation());
  dom.timeSlider.addEventListener("input", () => updateRadarFrame(Number(dom.timeSlider.value)));
  document.querySelectorAll(".range-buttons button").forEach((button) => {
    button.addEventListener("click", () => jumpToRadarOffset(Number(button.dataset.offset), button));
  });
  document.querySelectorAll("[data-layer]").forEach((input) => {
    input.addEventListener("change", () => toggleWeatherLayer(input.dataset.layer, input.checked));
  });
}

function selectDistrictByName(name) {
  if (!appState.districtLayer) return;
  let target;
  appState.districtLayer.eachLayer((layer) => {
    if (layer.feature.properties.name_th === name) target = layer;
  });
  if (target) selectDistrict(name, target);
}

async function selectDistrict(name, layer) {
  if (appState.selectedLayer) appState.districtLayer.resetStyle(appState.selectedLayer);
  appState.selectedLayer = layer;
  layer.setStyle({ color: "#bcf7ff", weight: 3, fillColor: "#16c2d7", fillOpacity: .30 });
  layer.bringToFront();
  appState.map.fitBounds(layer.getBounds(), { padding: [45, 45], maxZoom: 11 });
  const center = layer.getBounds().getCenter();
  appState.currentLocation = { name, latitude: center.lat, longitude: center.lng };
  dom.districtSelect.value = name;
  dom.districtSearch.value = "";
  dom.searchResults.hidden = true;
  dom.districtName.textContent = `อำเภอ${name}`;
  await loadWeather(appState.currentLocation);
}

function viewProvince() {
  if (appState.selectedLayer) appState.districtLayer.resetStyle(appState.selectedLayer);
  appState.selectedLayer = null;
  appState.currentLocation = WEATHER_CONFIG.defaultLocation;
  dom.districtSelect.value = "";
  dom.districtName.textContent = "จังหวัดเชียงใหม่";
  if (appState.districtLayer) appState.map.fitBounds(appState.districtLayer.getBounds(), { padding: [22, 22] });
  loadWeather(appState.currentLocation);
}

function getSearchMatches(term) {
  const query = term.trim().replace(/^อำเภอ/, "");
  return query ? DISTRICTS.filter((name) => name.includes(query)).slice(0, 7) : [];
}

function handleSearch(event) {
  const matches = getSearchMatches(event.target.value);
  dom.searchResults.replaceChildren(...matches.map((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `อำเภอ${name}`;
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

async function loadWeather(location = appState.currentLocation, force = false) {
  const cacheKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
  const cached = appState.weatherCache.get(cacheKey);
  if (!force && cached && Date.now() - cached.cachedAt < WEATHER_CONFIG.refreshInterval) {
    updateWeatherPanel(cached);
    return;
  }
  dom.loadingOverlay.hidden = false;
  try {
    const parameters = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
      current: "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,cloud_cover,wind_speed_10m",
      timezone: "Asia/Bangkok"
    });
    const response = await fetch(`${WEATHER_CONFIG.weatherEndpoint}?${parameters}`);
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const payload = await response.json();
    const current = payload.current;
    if (!current) throw new Error("Open-Meteo response has no current data");
    const data = {
      status: WEATHER_CODES[current.weather_code] || "ไม่ทราบสภาพอากาศ",
      rainfall: current.precipitation,
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      updatedAt: `${current.time}+07:00`,
      cachedAt: Date.now()
    };
    appState.weatherCache.set(cacheKey, data);
    updateWeatherPanel(data);
  } catch (error) {
    showToast("ไม่สามารถโหลดข้อมูลสภาพอากาศได้ในขณะนี้");
    updateWeatherPanel({ status: "ไม่มีข้อมูล", rainfall: null, temperature: null, humidity: null, windSpeed: null, updatedAt: null });
    console.error(error);
  } finally {
    dom.loadingOverlay.hidden = true;
  }
}

function updateWeatherPanel(data) {
  const display = (value, suffix) => value === null || value === undefined ? "ไม่มีข้อมูล" : `${value}${suffix}`;
  dom.rainStatus.textContent = data.status || "ไม่มีข้อมูล";
  dom.rainfall.textContent = display(data.rainfall, " มม.");
  dom.temperature.textContent = display(data.temperature, "°");
  dom.humidity.textContent = display(data.humidity, "%");
  dom.windSpeed.textContent = display(data.windSpeed, " กม./ชม.");
  dom.updatedAt.textContent = data.updatedAt ? `${formatTime(new Date(data.updatedAt))} น.` : "ไม่มีข้อมูล";
}

async function loadRadar() {
  try {
    const response = await fetch(WEATHER_CONFIG.radarEndpoint);
    if (!response.ok) throw new Error(`RainViewer HTTP ${response.status}`);
    const payload = await response.json();
    appState.radarHost = payload.host;
    appState.radarFrames = payload.radar?.past || [];
    if (!appState.radarFrames.length) throw new Error("RainViewer has no radar frames");
    buildTimeline();
    updateRadarFrame(appState.radarFrames.length - 1);
  } catch (error) {
    dom.frameLabel.textContent = "Radar ไม่พร้อมใช้งาน";
    showToast("ไม่สามารถโหลดข้อมูล Radar ได้ในขณะนี้");
    console.error(error);
  }
}

function buildTimeline() {
  const lastFrame = Math.max(0, appState.radarFrames.length - 1);
  dom.timeSlider.min = 0;
  dom.timeSlider.max = lastFrame;
  dom.timeSlider.value = lastFrame;
  dom.timelineTicks.replaceChildren(...appState.radarFrames.map((frame, index) => {
    const label = document.createElement("span");
    label.textContent = index % 3 === 0 || index === lastFrame ? formatTime(new Date(frame.time * 1000)) : "·";
    return label;
  }));
}

function updateRadarFrame(frameIndex) {
  const frame = appState.radarFrames[frameIndex];
  if (!frame) return;
  if (appState.radarLayer) appState.map.removeLayer(appState.radarLayer);
  appState.radarLayer = L.tileLayer(`${appState.radarHost}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
    opacity: .68, maxNativeZoom: 7, maxZoom: 18, attribution: "Radar: RainViewer"
  });
  if (isRadarEnabled()) appState.radarLayer.addTo(appState.map);
  dom.timeSlider.value = frameIndex;
  const frameTime = new Date(frame.time * 1000);
  const minutesAgo = Math.max(0, Math.round((Date.now() - frameTime.getTime()) / 60000));
  dom.frameLabel.textContent = minutesAgo < 6
    ? `ล่าสุด · ${formatTime(frameTime)} น.`
    : `${minutesAgo} นาทีที่แล้ว · ${formatTime(frameTime)} น.`;
}

function toggleWeatherLayer(type, enabled) {
  if (type === "rain" || type === "radar") {
    if (enabled && appState.radarLayer) appState.radarLayer.addTo(appState.map);
    if (!isRadarEnabled() && appState.radarLayer) appState.map.removeLayer(appState.radarLayer);
    return;
  }
  if (enabled) {
    showToast(`ยังไม่มี Tile API ฟรีสำหรับเลเยอร์ ${type === "cloud" ? "กลุ่มเมฆ" : "Satellite"}`);
    document.querySelector(`[data-layer="${type}"]`).checked = false;
  }
}

function isRadarEnabled() {
  return [...document.querySelectorAll('[data-layer="rain"], [data-layer="radar"]')].some((input) => input.checked);
}

function jumpToRadarOffset(minutes, button) {
  document.querySelectorAll(".range-buttons button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  if (!appState.radarFrames.length) return;
  const targetTime = Date.now() + minutes * 60000;
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  appState.radarFrames.forEach((frame, index) => {
    const distance = Math.abs(frame.time * 1000 - targetTime);
    if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
  });
  updateRadarFrame(nearestIndex);
}

function startRadarAnimation() {
  if (!appState.radarFrames.length) {
    showToast("ยังไม่มี Radar frame สำหรับเล่นภาพเคลื่อนไหว");
    return;
  }
  dom.playButton.classList.add("playing");
  dom.playButton.setAttribute("aria-label", "หยุดภาพเคลื่อนไหว");
  if (Number(dom.timeSlider.value) >= appState.radarFrames.length - 1) dom.timeSlider.value = 0;
  updateRadarFrame(Number(dom.timeSlider.value));
  appState.radarAnimation = setInterval(() => {
    updateRadarFrame((Number(dom.timeSlider.value) + 1) % appState.radarFrames.length);
  }, 700);
}

function stopRadarAnimation() {
  clearInterval(appState.radarAnimation);
  appState.radarAnimation = null;
  dom.playButton.classList.remove("playing");
  dom.playButton.setAttribute("aria-label", "เล่นภาพเคลื่อนไหว");
}

function locateUser() {
  const message = $("#locationMessage");
  if (!navigator.geolocation) {
    message.textContent = "อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง";
    return;
  }
  message.textContent = "กำลังค้นหาตำแหน่งของคุณ...";
  navigator.geolocation.getCurrentPosition((position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const latlng = [latitude, longitude];
    if (appState.userMarker) appState.userMarker.remove();
    appState.userMarker = L.circleMarker(latlng, {
      radius: 8, color: "#fff", weight: 3, fillColor: "#16c2d7", fillOpacity: 1
    }).addTo(appState.map).bindPopup("ตำแหน่งของคุณ").openPopup();
    appState.map.setView(latlng, 12);
    appState.currentLocation = { name: "ตำแหน่งของคุณ", latitude, longitude };
    dom.districtName.textContent = "ตำแหน่งของคุณ";
    message.textContent = "แสดงตำแหน่งและสภาพอากาศของคุณแล้ว";
    loadWeather(appState.currentLocation, true);
  }, () => {
    message.textContent = "ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาตรวจสอบการอนุญาต";
  }, { enableHighAccuracy: true, timeout: 10000 });
}

async function refreshAllData() {
  appState.weatherCache.clear();
  await Promise.allSettled([loadWeather(appState.currentLocation, true), loadRadar()]);
  showToast(`อัปเดตข้อมูลล่าสุด ${formatTime(new Date())} น.`);
}

function updateClock() {
  const now = new Date();
  $("#currentDate").textContent = new Intl.DateTimeFormat("th-TH", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  }).format(now);
  $("#currentTime").textContent = now.toLocaleTimeString("th-TH", { hour12: false });
}

function formatTime(date) {
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok"
  });
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  toastTimer = setTimeout(() => { dom.toast.hidden = true; }, 3500);
}
