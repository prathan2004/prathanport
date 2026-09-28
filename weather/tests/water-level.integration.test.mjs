import assert from "node:assert/strict";
import waterLevelHandler from "../../netlify/functions/water-level.mjs";

const response = await waterLevelHandler(new Request("http://localhost/api/water-level?station=P.1&hours=48"));
const data = await response.json();

assert.equal(response.status, 200);
assert.equal(data.station, "P.1");
assert.equal(data.name, "สะพานนวรัฐ");
assert.equal(data.bankLevel, 3.7);
assert.equal(data.available, true);
assert.equal(typeof data.waterLevel, "number");
assert.ok(data.flowRate === null || typeof data.flowRate === "number");
assert.ok(data.history.length > 0 && data.history.length <= 48);
assert.ok(["rising", "stable", "falling"].includes(data.trend));
assert.deepEqual(data.thresholds, { normal: null, watch: null, warning: null, critical: null });

console.log(JSON.stringify({
  station: data.station,
  waterLevel: data.waterLevel,
  bankLevel: data.bankLevel,
  flowRate: data.flowRate,
  trend: data.trend,
  updatedAt: data.updatedAt,
  historyPoints: data.history.length
}, null, 2));
