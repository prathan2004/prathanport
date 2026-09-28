let chart;

export function renderWaterChart(data, hours = 24) {
  const canvas = document.querySelector("#water-chart");
  const empty = document.querySelector("#chart-empty");
  const cutoff = Date.now() - hours * 36e5;
  const points = (data.history || []).filter(p => new Date(p.observedAt).valueOf() >= cutoff);
  if (!points.length || typeof Chart === "undefined") {
    canvas.style.display = "none"; empty.style.display = "grid"; chart?.destroy(); chart = null; return;
  }
  canvas.style.display = "block"; empty.style.display = "none"; chart?.destroy();
  const critical = data.criticalLevel;
  chart = new Chart(canvas, { type: "line", data: { labels: points.map(p => new Date(p.observedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })), datasets: [
    { label: "ระดับน้ำ", data: points.map(p => p.waterLevel), borderColor: "#29d3e2", backgroundColor: "rgba(41,211,226,.12)", fill: true, tension: .25, pointRadius: 2 },
    ...(critical === null ? [] : [{ label: "ระดับวิกฤติ", data: points.map(() => critical), borderColor: "#ff6174", borderDash: [5, 5], pointRadius: 0 }])
  ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#91a8b8", boxWidth: 10, font: { size: 9 } } } }, scales: { x: { ticks: { color: "#78909f", font: { size: 8 } }, grid: { color: "rgba(36,65,84,.35)" } }, y: { title: { display: true, text: "เมตร", color: "#78909f" }, ticks: { color: "#78909f", font: { size: 8 } }, grid: { color: "rgba(36,65,84,.35)" } } } } });
}
