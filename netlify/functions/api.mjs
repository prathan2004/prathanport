import { getStore } from "@netlify/blobs";

const SESSION_DAYS = 30;
const STORE_NAME = "mhahao-run";

export async function handler(event) {
  try {
    const path = normalizePath(event.path);
    const method = event.httpMethod.toUpperCase();
    const body = event.body ? JSON.parse(event.body) : {};

    if (method === "GET" && path === "/leaderboard") return json({ leaderboard: await leaderboard() });
    if (method === "POST" && path === "/signup") return signup(body);
    if (method === "POST" && path === "/login") return login(body);
    if (method === "POST" && path === "/logout") return logout(event);
    if (method === "GET" && path === "/dashboard") return dashboard(event);
    if (method === "GET" && path === "/export") return exportData(event);
    if (method === "POST" && path === "/import") return importData(event, body);
    if (method === "POST" && path === "/runs") return createRun(event, body);
    if (path.startsWith("/runs/") && method === "PUT") return updateRun(event, path, body);
    if (path.startsWith("/runs/") && method === "DELETE") return deleteRun(event, path);

    return json({ error: "ไม่พบ API นี้" }, 404);
  } catch (error) {
    return json({ error: error.message || "เกิดข้อผิดพลาด" }, error.status || 500);
  }
}

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
  const values = await Promise.all(
    listed.blobs.map((blob) => currentStore.get(blob.key, { type: "json" }))
  );
  return values.filter(Boolean);
}

async function getUserByUsername(username) {
  const users = await listJson("users/");
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) || null;
}

async function getUserById(id) {
  return store().get(`users/${id}.json`, { type: "json" });
}

async function saveUser(user) {
  await store().setJSON(`users/${user.id}.json`, user);
}

async function saveRun(run) {
  await store().setJSON(`runs/${run.id}.json`, run);
}

async function allRuns() {
  return listJson("runs/");
}

async function allUsers() {
  return listJson("users/");
}

async function signup(body) {
  const username = clean(body.username).toLowerCase();
  const password = String(body.password || "");
  const nickname = clean(body.nickname);

  if (!username || !nickname || password.length < 4) {
    return json({ error: "กรุณากรอกข้อมูลให้ครบ และ Password อย่างน้อย 4 ตัวอักษร" }, 400);
  }

  const existing = await getUserByUsername(username);
  if (existing) return json({ error: "Username นี้ถูกใช้แล้ว" }, 409);

  const salt = crypto.randomUUID();
  const user = {
    id: crypto.randomUUID(),
    username,
    passwordHash: await hashPassword(password, salt),
    salt,
    nickname,
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

  const token = crypto.randomUUID() + crypto.randomUUID();
  const session = {
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  await store().setJSON(`sessions/${token}.json`, session);
  return json({ token, user: publicUser(user) });
}

async function logout(event) {
  const token = bearerToken(event);
  if (token) await store().delete(`sessions/${token}.json`);
  return json({ ok: true });
}

async function requireUser(event) {
  const token = bearerToken(event);
  if (!token) throw Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { status: 401 });

  const session = await store().get(`sessions/${token}.json`, { type: "json" });
  if (!session || session.expiresAt <= new Date().toISOString()) {
    throw Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) throw Object.assign(new Error("ไม่พบผู้ใช้"), { status: 401 });
  return user;
}

async function dashboard(event) {
  const user = await requireUser(event);
  const runs = (await allRuns())
    .filter((run) => run.userId === user.id)
    .sort((a, b) => `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`));
  const rows = await leaderboard();
  const totalKm = runs.reduce((sum, run) => sum + Number(run.distanceKm), 0);

  return json({
    user: { ...publicUser(user), totalKm },
    runs,
    leaderboard: rows,
  });
}

async function leaderboard() {
  const [users, runs] = await Promise.all([allUsers(), allRuns()]);
  return users
    .map((user) => {
      const userRuns = runs.filter((run) => run.userId === user.id);
      return {
        id: user.id,
        nickname: user.nickname,
        totalKm: userRuns.reduce((sum, run) => sum + Number(run.distanceKm), 0),
        runCount: userRuns.length,
      };
    })
    .filter((row) => row.totalKm > 0)
    .sort((a, b) => b.totalKm - a.totalKm || a.nickname.localeCompare(b.nickname, "th"));
}

async function createRun(event, body) {
  const user = await requireUser(event);
  const run = validateRun(body);
  run.id = crypto.randomUUID();
  run.userId = user.id;
  run.createdAt = new Date().toISOString();
  await saveRun(run);
  return json({ ok: true, run });
}

async function updateRun(event, path, body) {
  const user = await requireUser(event);
  const id = decodeURIComponent(path.replace("/runs/", ""));
  const current = await store().get(`runs/${id}.json`, { type: "json" });
  if (!current || current.userId !== user.id) return json({ error: "ไม่พบรายการวิ่งนี้" }, 404);

  const next = { ...current, ...validateRun(body), updatedAt: new Date().toISOString() };
  await saveRun(next);
  return json({ ok: true, run: next });
}

async function deleteRun(event, path) {
  const user = await requireUser(event);
  const id = decodeURIComponent(path.replace("/runs/", ""));
  const current = await store().get(`runs/${id}.json`, { type: "json" });
  if (!current || current.userId !== user.id) return json({ error: "ไม่พบรายการวิ่งนี้" }, 404);
  await store().delete(`runs/${id}.json`);
  return json({ ok: true });
}

async function exportData(event) {
  await requireUser(event);
  return json({ users: (await allUsers()).map(publicUser), runs: await allRuns() });
}

async function importData(event, body) {
  await requireUser(event);
  if (!Array.isArray(body.runs)) return json({ error: "ไฟล์ไม่ถูกต้อง" }, 400);

  await Promise.all(body.runs.map((run) => {
    const validRun = validateRun(run);
    validRun.id = clean(run.id, 120) || crypto.randomUUID();
    validRun.userId = clean(run.userId, 120);
    validRun.createdAt = clean(run.createdAt, 40) || new Date().toISOString();
    if (!validRun.userId) throw new Error("ไฟล์ไม่มี userId");
    return saveRun(validRun);
  }));

  return json({ ok: true });
}

function validateRun(body) {
  const date = clean(body.date, 10);
  const distanceKm = Number(body.distanceKm);
  const note = clean(body.note);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw Object.assign(new Error("กรุณากรอกวันที่และระยะทางให้ถูกต้อง"), { status: 400 });
  }
  return { date, distanceKm, note };
}

function publicUser(user) {
  return { id: user.id, username: user.username, nickname: user.nickname };
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bearerToken(event) {
  const header = event.headers.authorization || event.headers.Authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function clean(value, max = 80) {
  return String(value || "").trim().slice(0, max);
}

function json(data, statusCode = 200) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(data),
  };
}
