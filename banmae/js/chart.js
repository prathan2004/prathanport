const charts = new Map();

export function renderWaterChart(data, hours = 24, options = {}) {
  const canvasId = options.canvasId || "water-chart";
  const canvas = document.querySelector(`#${canvasId}`);
  const empty = document.querySelector(`#${options.emptyId || "chart-empty"}`);
  if (!canvas || !empty) return;
  const cutoff = data.archived ? -Infinity : Date.now() - hours * 36e5;
  const points = (data.history || []).filter(p => new Date(p.observedAt).valueOf() >= cutoff);
  const previous = charts.get(canvasId);
  if (!points.length || typeof Chart === "undefined") {
    canvas.style.display = "none"; empty.style.display = "grid"; previous?.destroy(); charts.delete(canvasId); return;
  }
  canvas.style.display = "block"; empty.style.display = "none"; previous?.destroy();
  const threshold = data.criticalLevel ?? data.warningLevel ?? null;
  const chart = new Chart(canvas, { type: "line", data: { labels: points.map(p => new Date(p.observedAt).toLocaleString("th-TH", data.archived ? { dateStyle: "short" } : { hour: "2-digit", minute: "2-digit" })), datasets: [
    { label: "ระดับน้ำ", data: points.map(p => p.waterLevel), borderColor: options.color || "#29d3e2", backgroundColor: options.fill || "rgba(41,211,226,.12)", fill: true, tension: .25, pointRadius: points.length < 4 ? 4 : 2 },
    ...(threshold === null ? [] : [{ label: data.criticalLevel !== null ? "ระดับวิกฤติ" : "ระดับเตือนภัย", data: points.map(() => threshold), borderColor: "#ff6174", borderDash: [5, 5], pointRadius: 0 }])
  ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#91a8b8", boxWidth: 10, font: { size: 9 } } } }, scales: { x: { ticks: { color: "#78909f", font: { size: 8 } }, grid: { color: "rgba(36,65,84,.35)" } }, y: { title: { display: true, text: "เมตร", color: "#78909f" }, ticks: { color: "#78909f", font: { size: 8 } }, grid: { color: "rgba(36,65,84,.35)" } } } } });
  charts.set(canvasId, chart);
}
