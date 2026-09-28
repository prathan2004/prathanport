const DATASETS = [
  { id: "boundary", label: "ขอบเขตตำบลบ้านแม", file: "data/banmae-boundary.geojson", color: "#29d3e2", enabled: true },
  { id: "river", label: "ลำน้ำแม่ขาน", file: "data/maekhan-river.geojson", color: "#4a9dff", enabled: true },
  { id: "villages", label: "หมู่บ้าน", file: "data/villages.geojson", color: "#f3c969", enabled: true },
  { id: "stations", label: "สถานีวัดระดับน้ำ", file: "data/stations.geojson", color: "#48dfea", enabled: true },
  { id: "currentFlood", label: "พื้นที่น้ำท่วมปัจจุบัน", file: "data/flood-current.geojson", color: "#418cff" },
  { id: "historicalFlood", label: "พื้นที่น้ำท่วมย้อนหลัง", file: "data/flood-historical.geojson", color: "#8e78ff" },
  { id: "risk", label: "พื้นที่เสี่ยงน้ำท่วม", file: "data/flood-risk.geojson", color: "#ff925c" },
  { id: "obstructions", label: "จุดกีดขวางทางน้ำ", file: "data/obstructions.geojson", color: "#ff6174" }
];

let map; let userLayer; let studyBounds; const layers = new Map();
const stationIcon = L.divIcon({ className: "", html: '<div class="verified-marker"></div>', iconSize: [24, 24], iconAnchor: [12, 12] });

function popupFor(feature) {
  const p = feature.properties || {};
  if (p.stationCode) return `<div class="popup-title">สถานี ${p.stationCode}</div><div class="popup-grid"><span>สถานที่</span><b>${p.name || "ไม่มีข้อมูล"}</b><span>ลำน้ำ</span><b>${p.river || "ไม่มีข้อมูล"}</b><span>ตำแหน่ง</span><b>${p.location || "ไม่มีข้อมูล"}</b><span>แหล่งข้อมูล</span><a href="${p.sourceUrl}" target="_blank" rel="noopener">${p.source || "ไม่มีข้อมูล"}</a></div>`;
  return `<div class="popup-title">${p.name || "ข้อมูลพื้นที่"}</div><div>${p.source ? `แหล่งข้อมูล: ${p.source}` : "รอตรวจสอบข้อมูลจากหน่วยงาน"}</div>`;
}

async function loadDataset(item) {
  try {
    const response = await fetch(item.file); if (!response.ok) throw new Error();
    const geojson = await response.json(); const hasData = Array.isArray(geojson.features) && geojson.features.length > 0;
    const layer = L.geoJSON(geojson, {
      style: { color: item.color, weight: item.id === "river" ? 4 : 2, fillOpacity: .1 },
      pointToLayer: (_, latlng) => L.marker(latlng, { icon: item.id === "stations" ? stationIcon : undefined }),
      onEachFeature: (feature, featureLayer) => { featureLayer.bindPopup(popupFor(feature)); if (item.id === "boundary") { featureLayer.bindTooltip("ตำบลบ้านแม<br>อำเภอสันป่าตอง<br>จังหวัดเชียงใหม่"); featureLayer.on("click", () => map.fitBounds(featureLayer.getBounds())); } }
    });
    layers.set(item.id, { layer, hasData }); if (item.enabled && hasData) layer.addTo(map);
    if (item.id === "boundary" && hasData) { studyBounds = layer.getBounds(); map.fitBounds(studyBounds, { padding: [22, 22] }); document.querySelector("#map-notice").hidden = true; }
    return { ...item, hasData };
  } catch { return { ...item, hasData: false }; }
}

function renderLayerList(results) {
  const host = document.querySelector("#layer-list"); host.innerHTML = "";
  results.forEach(item => { const row = document.createElement("label"); row.className = `layer-row${item.hasData ? "" : " unavailable"}`; row.innerHTML = `<input type="checkbox" ${item.enabled && item.hasData ? "checked" : ""} ${item.hasData ? "" : "disabled"}><span>${item.label}</span><small>${item.hasData ? "พร้อมใช้" : "ยังไม่มีข้อมูล"}</small>`; const input = row.querySelector("input"); input.addEventListener("change", () => { const entry = layers.get(item.id); input.checked ? entry.layer.addTo(map) : map.removeLayer(entry.layer); }); host.append(row); });
}

export async function initMap() {
  map = L.map("map", { zoomControl: true, minZoom: 5 }).setView([13.3, 101.1], 6);
  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
  const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles &copy; Esri and contributors" });
  const terrain = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a>' });
  L.control.layers({ OpenStreetMap: osm, Satellite: satellite, Terrain: terrain }, {}, { position: "bottomright" }).addTo(map);
  renderLayerList(await Promise.all(DATASETS.map(loadDataset)));
  document.querySelector("#locate-button").addEventListener("click", locateUser);
  document.querySelector("#home-button").addEventListener("click", () => studyBounds ? map.fitBounds(studyBounds, { padding: [22, 22] }) : map.setView([13.3, 101.1], 6));
  document.querySelector('[data-station="P.71A"]').addEventListener("click", () => { const entry = layers.get("stations"); if (entry?.hasData) { if (!map.hasLayer(entry.layer)) entry.layer.addTo(map); map.fitBounds(entry.layer.getBounds(), { maxZoom: 15, padding: [60, 60] }); entry.layer.eachLayer(marker => marker.openPopup()); } });
  return map;
}

function locateUser() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(position => { const latlng = [position.coords.latitude, position.coords.longitude]; if (userLayer) map.removeLayer(userLayer); userLayer = L.marker(latlng, { icon: L.divIcon({ className: "", html: '<div class="user-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map).bindPopup("ตำแหน่งของคุณ").openPopup(); map.setView(latlng, 15); }, () => {}, { enableHighAccuracy: true, timeout: 10000 });
}

export function invalidateMapSize() { setTimeout(() => map?.invalidateSize(), 280); }
