import { getStore } from "@netlify/blobs";

const SESSION_DAYS = 30;
const STORE_NAME = "mhahao-run";

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const method = request.method.toUpperCase();
    const body = method === "GET" || method === "DELETE" ? {} : await request.json().catch(() => ({}));

    if (method === "GET" && path === "/leaderboard") return publicLeaderboard();
    if (method === "POST" && path === "/signup") return signup(body);
    if (method === "POST" && path === "/login") return login(body);
    if (method === "POST" && path === "/logout") return logout(request);
    if (method === "GET" && path === "/dashboard") return dashboard(request);
    if (method === "POST" && path === "/runs") return createRun(request, body);
    if (path.startsWith("/runs/") && method === "PUT") return updateRun(request, path, body);
    if (path.startsWith("/runs/") && method === "DELETE") return deleteRun(request, path);
    if (method === "POST" && path === "/admin/seasons") return createSeason(request, body);
    if (path.startsWith("/admin/seasons/") && path.endsWith("/current") && method === "POST") return setCurrentSeason(request, path);
    if (path.startsWith("/admin/seasons/") && method === "DELETE") return deleteSeason(request, path);
    if (path.startsWith("/admin/runs/") && method === "PUT") return adminUpdateRun(request, path, body);
    if (path.startsWith("/admin/runs/") && method === "DELETE") return adminDeleteRun(request, path);

    return json({ error: "ไม่พบ API นี้" }, 404);
  } catch (error) {
    return json({ error: error.message || "เกิดข้อผิดพลาด" }, error.status || 500);
  }
}

export const config = {
  path: ["/api/*", "/run/api/*"],
};

function normalizePath(path) {
  return path
    .replace(/^\/run\/api/, "")
    .replace(/^\/api/, "")
    .replace(/^\/\.netlify\/functions\/api/, "") || "/";
}

function store() {
  return getStore(STORE_NAME);
}

async function listJson(prefix) {
  const currentStore = store();
  const listed = await currentStore.list({ prefix });
  const values = await Promise.all(listed.blobs.map((blob) => currentStore.get(blob.key, { type: "json" })));
  return values.filter(Boolean);
}

async function allUsers() {
  return listJson("users/");
}

async function allRuns() {
  return listJson("runs/");
}

async function allSeasons() {
  return listJson("seasons/");
}

async function saveUser(user) {
  await store().setJSON(`users/${user.id}.json`, user);
}

async function saveRun(run) {
  await store().setJSON(`runs/${run.id}.json`, run);
}

async function saveSeason(season) {
  await store().setJSON(`seasons/${season.id}.json`, season);
}

async function getUserById(id) {
  return store().get(`users/${id}.json`, { type: "json" });
}

async function getUserByUsername(username) {
  const users = await allUsers();
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) || null;
}

async function getRunById(id) {
  return store().get(`runs/${id}.json`, { type: "json" });
}

async function activeSeason() {
  let seasons = await allSeasons();
  if (!seasons.length) {
    const season = {
      id: crypto.randomUUID(),
      name: "Season 1",
      startDate: "2026-01-01",
      endDate: "",
      isCurrent: true,
      createdAt: new Date().toISOString(),
    };
    await saveSeason(season);
    return season;
  }

  let current = seasons.find((season) => season.isCurrent);
  if (!current) {
    current = seasons.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))[0];
    current.isCurrent = true;
    await saveSeason(current);
  }
  return current;
}

function inSeason(run, season) {
  if (!season) return false;
  if (run.seasonId) return run.seasonId === season.id;
  return run.date >= season.startDate && (!season.endDate || run.date <= season.endDate);
}

async function signup(body) {
  const username = clean(body.username).toLowerCase();
  const password = String(body.password || "");
  const nickname = clean(body.nickname);

  if (!username || !nickname || password.length < 4) {
    return json({ error: "กรุณากรอกข้อมูลให้ครบ และ Password อย่างน้อย 4 ตัวอักษร" }, 400);
  }
  if (await getUserByUsername(username)) return json({ error: "Username นี้ถูกใช้แล้ว" }, 409);

  const users = await allUsers();
  const salt = crypto.randomUUID();
  const user = {
    id: crypto.randomUUID(),
    username,
    passwordHash: await hashPassword(password, salt),
    salt,
    nickname,
    isAdmin: users.length === 0,
    createdAt: new Date().toISOString(),
  };
  await saveUser(user);
  return json({ ok: true });
}

async function login(body) {
  const username = clean(body.username).toLowerCase();
  const password = String(body.password || "");
  const user = await getUserByUsername(username);
  const valid = user && user.passwordHash === await hashPassword(password, user.salt);
  if (!valid) return json({ error: "Username หรือ Password ไม่ถูกต้อง" }, 401);

  const checkedUser = await ensureAdminFlag(user);
  const token = crypto.randomUUID() + crypto.randomUUID();
  await store().setJSON(`sessions/${token}.json`, {
    token,
    userId: checkedUser.id,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  return json({ token, user: publicUser(checkedUser) });
}

async function logout(request) {
  const token = bearerToken(request);
  if (token) await store().delete(`sessions/${token}.json`);
  return json({ ok: true });
}

async function requireUser(request) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { status: 401 });

  const session = await store().get(`sessions/${token}.json`, { type: "json" });
  if (!session || session.expiresAt <= new Date().toISOString()) {
    throw Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) throw Object.assign(new Error("ไม่พบผู้ใช้"), { status: 401 });
  return ensureAdminFlag(user);
}

async function requireAdmin(request) {
  const user = await requireUser(request);
  if (!user.isAdmin) throw Object.assign(new Error("เฉพาะ admin เท่านั้น"), { status: 403 });
  return user;
}

async function dashboard(request) {
  const user = await requireUser(request);
  const currentSeason = await activeSeason();
  const [runs, users, seasons] = await Promise.all([allRuns(), allUsers(), allSeasons()]);
  const currentRuns = runs.filter((run) => inSeason(run, currentSeason));
  const userRuns = currentRuns
    .filter((run) => run.userId === user.id)
    .sort(sortRuns);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const seasonMap = new Map(seasons.map((item) => [item.id, item]));
  const allUserRuns = user.isAdmin
    ? runs.map((run) => ({
      ...run,
      nickname: userMap.get(run.userId)?.nickname || "ไม่พบชื่อ",
      seasonName: seasonMap.get(run.seasonId)?.name || (inSeason(run, currentSeason) ? currentSeason.name : "ไม่ระบุ Season"),
    })).sort(sortRuns)
    : [];

  return json({
    user: { ...publicUser(user), totalKm: totalDistance(userRuns) },
    runs: userRuns,
    allRuns: allUserRuns,
    seasons: seasons.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
    currentSeason,
    leaderboard: await leaderboard(currentSeason),
  });
}

async function publicLeaderboard() {
  const currentSeason = await activeSeason();
  return json({ currentSeason, leaderboard: await leaderboard(currentSeason) });
}

async function leaderboard(currentSeason = null) {
  const season = currentSeason || await activeSeason();
  const [users, runs] = await Promise.all([allUsers(), allRuns()]);
  const currentRuns = runs.filter((run) => inSeason(run, season));
  return users
    .map((user) => {
      const userRuns = currentRuns.filter((run) => run.userId === user.id);
      return {
        id: user.id,
        nickname: user.nickname,
        totalKm: totalDistance(userRuns),
        runCount: userRuns.length,
      };
    })
    .filter((row) => row.totalKm > 0)
    .sort((a, b) => b.totalKm - a.totalKm || a.nickname.localeCompare(b.nickname, "th"));
}

async function ensureAdminFlag(user) {
  if (typeof user.isAdmin === "boolean") return user;
  const users = await allUsers();
  const sorted = users.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const updated = { ...user, isAdmin: sorted[0]?.id === user.id };
  await saveUser(updated);
  return updated;
}

async function createRun(request, body) {
  const user = await requireUser(request);
  const season = await activeSeason();
  const run = validateRun(body, season);
  run.id = crypto.randomUUID();
  run.userId = user.id;
  run.seasonId = season.id;
  run.createdAt = new Date().toISOString();
  await saveRun(run);
  return json({ ok: true, run });
}

async function updateRun(request, path, body) {
  const user = await requireUser(request);
  const id = decodeURIComponent(path.replace("/runs/", ""));
  const current = await getRunById(id);
  if (!current || current.userId !== user.id) return json({ error: "ไม่พบรายการวิ่งนี้" }, 404);

  const season = (current.seasonId ? (await allSeasons()).find((item) => item.id === current.seasonId) : null) || await activeSeason();
  const next = { ...current, ...validateRun(body, season), seasonId: season.id, updatedAt: new Date().toISOString() };
  await saveRun(next);
  return json({ ok: true, run: next });
}

async function deleteRun(request, path) {
  const user = await requireUser(request);
  const id = decodeURIComponent(path.replace("/runs/", ""));
  const current = await getRunById(id);
  if (!current || current.userId !== user.id) return json({ error: "ไม่พบรายการวิ่งนี้" }, 404);
  await store().delete(`runs/${id}.json`);
  return json({ ok: true });
}

async function adminUpdateRun(request, path, body) {
  await requireAdmin(request);
  const id = decodeURIComponent(path.replace("/admin/runs/", ""));
  const current = await getRunById(id);
  if (!current) return json({ error: "ไม่พบรายการวิ่งนี้" }, 404);

  const seasons = await allSeasons();
  const season = seasons.find((item) => item.id === current.seasonId) || await activeSeason();
  const next = { ...current, ...validateRun(body, season), seasonId: season.id, updatedAt: new Date().toISOString() };
  await saveRun(next);
  return json({ ok: true, run: next });
}

async function adminDeleteRun(request, path) {
  await requireAdmin(request);
  const id = decodeURIComponent(path.replace("/admin/runs/", ""));
  const current = await getRunById(id);
  if (!current) return json({ error: "ไม่พบรายการวิ่งนี้" }, 404);
  await store().delete(`runs/${id}.json`);
  return json({ ok: true });
}

async function createSeason(request, body) {
  await requireAdmin(request);
  const name = clean(body.name);
  const startDate = clean(body.startDate, 10);
  const endDate = clean(body.endDate, 10);
  if (!name || !validDate(startDate)) return json({ error: "กรุณากรอกชื่อ Season และวันเริ่มให้ถูกต้อง" }, 400);
  if (endDate && (!validDate(endDate) || endDate < startDate)) return json({ error: "วันสิ้นสุดต้องหลังวันเริ่ม" }, 400);

  const seasons = await allSeasons();
  const season = {
    id: crypto.randomUUID(),
    name,
    startDate,
    endDate,
    isCurrent: seasons.length === 0,
    createdAt: new Date().toISOString(),
  };
  await saveSeason(season);
  return json({ ok: true, season });
}

async function setCurrentSeason(request, path) {
  await requireAdmin(request);
  const id = decodeURIComponent(path.replace("/admin/seasons/", "").replace("/current", ""));
  const seasons = await allSeasons();
  if (!seasons.some((season) => season.id === id)) return json({ error: "ไม่พบ Season นี้" }, 404);
  await Promise.all(seasons.map((season) => saveSeason({ ...season, isCurrent: season.id === id })));
  return json({ ok: true });
}

async function deleteSeason(request, path) {
  await requireAdmin(request);
  const id = decodeURIComponent(path.replace("/admin/seasons/", ""));
  const seasons = await allSeasons();
  const season = seasons.find((item) => item.id === id);
  if (!season) return json({ error: "ไม่พบ Season นี้" }, 404);
  if (season.isCurrent) return json({ error: "ลบ Season ปัจจุบันไม่ได้" }, 400);

  const runs = await allRuns();
  if (runs.some((run) => run.seasonId === id)) {
    return json({ error: "ลบ Season ที่มีรายการวิ่งอยู่ไม่ได้" }, 400);
  }

  await store().delete(`seasons/${id}.json`);
  return json({ ok: true });
}

function validateRun(body, season) {
  const date = clean(body.date, 10);
  const distanceKm = Number(body.distanceKm);
  const note = clean(body.note);
  if (!validDate(date) || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw Object.assign(new Error("กรุณากรอกวันที่และระยะทางให้ถูกต้อง"), { status: 400 });
  }
  if (season && (date < season.startDate || (season.endDate && date > season.endDate))) {
    throw Object.assign(new Error("วันที่วิ่งต้องอยู่ในช่วง Season ของรายการนี้"), { status: 400 });
  }
  return { date, distanceKm, note };
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function totalDistance(runs) {
  return runs.reduce((sum, run) => sum + Number(run.distanceKm), 0);
}

function sortRuns(a, b) {
  return `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`);
}

function publicUser(user) {
  return { id: user.id, username: user.username, nickname: user.nickname, isAdmin: Boolean(user.isAdmin) };
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function clean(value, max = 80) {
  return String(value || "").trim().slice(0, max);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
