import { getStore } from "@netlify/blobs";

const SESSION_DAYS = 30;

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname
      .replace(/^\/\.netlify\/functions\/api/, "")
      .replace(/^\/api/, "") || "/";
    const method = request.method.toUpperCase();

    if (method === "GET" && path === "/leaderboard") return json({ leaderboard: await leaderboard() });
    if (method === "POST" && path === "/signup") return signup(await request.json());
    if (method === "POST" && path === "/login") return login(await request.json());
    if (method === "POST" && path === "/logout") return logout(request);
    if (method === "GET" && path === "/dashboard") return dashboard(request);
    if (method === "GET" && path === "/export") return exportData(request);
    if (method === "POST" && path === "/import") return importData(request, await request.json());
    if (method === "POST" && path === "/runs") return createRun(request, await request.json());
    if (path.startsWith("/runs/") && method === "PUT") return updateRun(request, path, await request.json());
    if (path.startsWith("/runs/") && method === "DELETE") return deleteRun(request, path);

    return json({ error: "ไม่พบ API นี้" }, 404);
  } catch (error) {
    return json({ error: error.message || "เกิดข้อผิดพลาด" }, error.status || 500);
  }
}

export const config = {
  path: "/api/*",
};

function store(name) {
  return getStore(name);
}

async function listJson(storeName, prefix) {
  const currentStore = store(storeName);
  const listed = await currentStore.list({ prefix });
  const values = await Promise.all(
    listed.blobs.map((blob) => currentStore.get(blob.key, { type: "json" }))
  );
  return values.filter(Boolean);
}

async function getUserByUsername(username) {
  const users = await listJson("mhahao-run", "users/");
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) || null;
}

async function getUserById(id) {
  return store("mhahao-run").get(`users/${id}.json`, { type: "json" });
}

async function saveUser(user) {
  await store("mhahao-run").setJSON(`users/${user.id}.json`, user);
}

async function saveRun(run) {
  await store("mhahao-run").setJSON(`runs/${run.id}.json`, run);
}

async function allRuns() {
  return listJson("mhahao-run", "runs/");
}

async function allUsers() {
  return listJson("mhahao-run", "users/");
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
  await store("mhahao-run").setJSON(`sessions/${token}.json`, session);
  return json({ token, user: publicUser(user) });
}

async function logout(request) {
  const token = bearerToken(request);
  if (token) await store("mhahao-run").delete(`sessions/${token}.json`);
  return json({ ok: true });
}

async function requireUser(request) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { status: 401 });

  const session = await store("mhahao-run").get(`sessions/${token}.json`, { type: "json" });
  if (!session || session.expiresAt <= new Date().toISOString()) {
    throw Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) throw Object.assign(new Error("ไม่พบผู้ใช้"), { status: 401 });
  return user;
}

async function dashboard(request) {
  const user = await requireUser(request);
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

async function createRun(request, body) {
  const user = await requireUser(request);
  const run = validateRun(body);
  run.id = crypto.randomUUID();
  run.userId = user.id;
  run.createdAt = new Date().toISOString();
  await saveRun(run);
  return json({ ok: true, run });
}

async function updateRun(request, path, body) {
  const user = await requireUser(request);
  const id = decodeURIComponent(path.replace("/runs/", ""));
  const currentStore = store("mhahao-run");
  const current = await currentStore.get(`runs/${id}.json`, { type: "json" });
  if (!current || current.userId !== user.id) return json({ error: "ไม่พบรายการวิ่งนี้" }, 404);

  const next = { ...current, ...validateRun(body), updatedAt: new Date().toISOString() };
  await saveRun(next);
  return json({ ok: true, run: next });
}

async function deleteRun(request, path) {
  const user = await requireUser(request);
  const id = decodeURIComponent(path.replace("/runs/", ""));
  const currentStore = store("mhahao-run");
  const current = await currentStore.get(`runs/${id}.json`, { type: "json" });
  if (!current || current.userId !== user.id) return json({ error: "ไม่พบรายการวิ่งนี้" }, 404);
  await currentStore.delete(`runs/${id}.json`);
  return json({ ok: true });
}

async function exportData(request) {
  await requireUser(request);
  return json({ users: (await allUsers()).map(publicUser), runs: await allRuns() });
}

async function importData(request, body) {
  await requireUser(request);
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

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
