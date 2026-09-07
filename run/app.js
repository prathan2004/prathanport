const STORAGE_KEY = "runClubTrackerData";
const SESSION_KEY = "runClubTrackerSession";

const state = {
  currentUserId: localStorage.getItem(SESSION_KEY),
  editingRunId: null,
};

const $ = (id) => document.getElementById(id);

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      };
    } catch {
      return seedData();
    }
  }
  return seedData();
}

function seedData() {
  const now = new Date().toISOString();
  const data = {
    users: [
      {
        id: crypto.randomUUID(),
        username: "admin",
        passwordHash: "",
        salt: "",
        nickname: "Admin",
        isAdmin: true,
        createdAt: now,
      },
    ],
    runs: [],
  };
  saveData(data);
  return data;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  return sha256(`${salt}:${password}`);
}

function clean(value, max = 80) {
  return String(value || "").trim().slice(0, max);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function setMessage(id, text, ok = false) {
  const el = $(id);
  el.textContent = text;
  el.style.color = ok ? "#0f604b" : "#d84f3f";
}

function showAuthMode(mode) {
  const isLogin = mode === "login";
  $("loginForm").classList.toggle("hidden", !isLogin);
  $("signupForm").classList.toggle("hidden", isLogin);
  $("showLogin").classList.toggle("active", isLogin);
  $("showSignup").classList.toggle("active", !isLogin);
  setMessage("authMessage", "");
}

function currentUser() {
  return data.users.find((user) => user.id === state.currentUserId) || null;
}

function userRuns(userId) {
  return data.runs
    .filter((run) => run.userId === userId)
    .sort((a, b) => `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`));
}

function totalFor(userId) {
  return userRuns(userId).reduce((sum, run) => sum + Number(run.distanceKm), 0);
}

function leaderboardRows() {
  return data.users
    .map((user) => ({
      id: user.id,
      nickname: user.nickname,
      totalKm: totalFor(user.id),
      runCount: userRuns(user.id).length,
    }))
    .filter((row) => row.totalKm > 0)
    .sort((a, b) => b.totalKm - a.totalKm || a.nickname.localeCompare(b.nickname, "th"));
}

function formatDistance(km) {
  return `${Number(km).toFixed(2)} กม.`;
}

function formatDate(dateText) {
  return new Date(`${dateText}T00:00:00`).toLocaleDateString("th-TH", { dateStyle: "medium" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function renderLeaderboard(targetId) {
  const rows = leaderboardRows();
  $(targetId).innerHTML = rows.length
    ? rows.map((row, index) => `
      <article class="leader-row">
        <span class="rank">#${index + 1}</span>
        <div>
          <strong>${escapeHtml(row.nickname)}</strong>
          <span>${row.runCount} ครั้ง</span>
        </div>
        <span class="distance">${formatDistance(row.totalKm)}</span>
      </article>
    `).join("")
    : '<div class="empty">ยังไม่มีข้อมูลการวิ่ง</div>';
}

function renderPublic() {
  renderLeaderboard("publicLeaderboard");
}

function renderDashboard() {
  const user = currentUser();
  if (!user) {
    state.currentUserId = null;
    localStorage.removeItem(SESSION_KEY);
    $("authView").classList.remove("hidden");
    $("dashboard").classList.add("hidden");
    renderPublic();
    return;
  }

  const runs = userRuns(user.id);
  const rows = leaderboardRows();
  const rank = rows.findIndex((row) => row.id === user.id);

  $("authView").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("welcomeName").textContent = user.nickname;
  $("myTotal").textContent = formatDistance(totalFor(user.id));
  $("myRuns").textContent = `${runs.length} ครั้ง`;
  $("myRank").textContent = rank >= 0 ? `#${rank + 1}` : "-";
  $("historyCount").textContent = `${runs.length} รายการ`;
  $("historyList").innerHTML = runs.length
    ? runs.map((run) => `
      <article class="run-item">
        <div>
          <strong>${formatDate(run.date)} · ${formatDistance(run.distanceKm)}</strong>
          <span>${escapeHtml(run.note || "ไม่มีหมายเหตุ")}</span>
        </div>
        <div class="run-actions">
          <button class="icon-button" type="button" data-edit="${run.id}">แก้ไข</button>
          <button class="icon-button danger" type="button" data-delete="${run.id}">ลบ</button>
        </div>
      </article>
    `).join("")
    : '<div class="empty">ยังไม่มีรายการวิ่งของคุณ</div>';

  renderLeaderboard("leaderboard");
}

function resetRunForm() {
  state.editingRunId = null;
  $("formTitle").textContent = "บันทึกการวิ่ง";
  $("saveRunButton").textContent = "บันทึก";
  $("cancelEditButton").classList.add("hidden");
  $("runForm").reset();
  $("runDate").value = today();
  setMessage("runMessage", "");
}

$("showLogin").addEventListener("click", () => showAuthMode("login"));
$("showSignup").addEventListener("click", () => showAuthMode("signup"));

$("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = clean($("signupUsername").value).toLowerCase();
  const password = $("signupPassword").value;
  const nickname = clean($("signupNickname").value);

  if (!username || !nickname || password.length < 4) {
    setMessage("authMessage", "กรุณากรอกข้อมูลให้ครบ และ Password อย่างน้อย 4 ตัวอักษร");
    return;
  }
  if (data.users.some((user) => user.username.toLowerCase() === username)) {
    setMessage("authMessage", "Username นี้ถูกใช้แล้ว");
    return;
  }

  const salt = crypto.randomUUID();
  data.users.push({
    id: crypto.randomUUID(),
    username,
    passwordHash: await hashPassword(password, salt),
    salt,
    nickname,
    isAdmin: data.users.length === 0,
    createdAt: new Date().toISOString(),
  });
  saveData(data);
  $("signupForm").reset();
  showAuthMode("login");
  setMessage("authMessage", "สมัครบัญชีสำเร็จ เข้าสู่ระบบได้เลย", true);
  renderPublic();
});

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = clean($("loginUsername").value).toLowerCase();
  const password = $("loginPassword").value;
  const user = data.users.find((item) => item.username.toLowerCase() === username);
  const valid = user && (!user.passwordHash || user.passwordHash === await hashPassword(password, user.salt));

  if (!valid) {
    setMessage("authMessage", "Username หรือ Password ไม่ถูกต้อง");
    return;
  }

  state.currentUserId = user.id;
  localStorage.setItem(SESSION_KEY, user.id);
  $("loginForm").reset();
  resetRunForm();
  renderDashboard();
});

$("logoutButton").addEventListener("click", () => {
  state.currentUserId = null;
  localStorage.removeItem(SESSION_KEY);
  resetRunForm();
  $("authView").classList.remove("hidden");
  $("dashboard").classList.add("hidden");
  renderPublic();
});

$("runForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const user = currentUser();
  if (!user) return;

  const date = $("runDate").value;
  const distanceKm = Number($("runDistance").value);
  const note = clean($("runNote").value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    setMessage("runMessage", "กรุณากรอกวันที่และระยะทางให้ถูกต้อง");
    return;
  }

  if (state.editingRunId) {
    const run = data.runs.find((item) => item.id === state.editingRunId && item.userId === user.id);
    if (run) {
      run.date = date;
      run.distanceKm = distanceKm;
      run.note = note;
      run.updatedAt = new Date().toISOString();
    }
  } else {
    data.runs.push({
      id: crypto.randomUUID(),
      userId: user.id,
      date,
      distanceKm,
      note,
      createdAt: new Date().toISOString(),
    });
  }

  saveData(data);
  resetRunForm();
  setMessage("runMessage", "บันทึกแล้ว", true);
  renderDashboard();
});

$("historyList").addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  const user = currentUser();
  if (!user) return;

  if (editId) {
    const run = data.runs.find((item) => item.id === editId && item.userId === user.id);
    if (!run) return;
    state.editingRunId = run.id;
    $("formTitle").textContent = "แก้ไขการวิ่ง";
    $("saveRunButton").textContent = "บันทึกการแก้ไข";
    $("cancelEditButton").classList.remove("hidden");
    $("runDate").value = run.date;
    $("runDistance").value = run.distanceKm;
    $("runNote").value = run.note || "";
    setMessage("runMessage", "");
  }

  if (deleteId && confirm("ลบรายการวิ่งนี้หรือไม่?")) {
    data.runs = data.runs.filter((item) => !(item.id === deleteId && item.userId === user.id));
    saveData(data);
    resetRunForm();
    renderDashboard();
  }
});

$("cancelEditButton").addEventListener("click", resetRunForm);

$("exportButton").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `run-club-tracker-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

$("importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.users) || !Array.isArray(imported.runs)) throw new Error("Invalid file");
    data = imported;
    saveData(data);
    renderDashboard();
  } catch {
    alert("ไฟล์ไม่ถูกต้อง");
  } finally {
    event.target.value = "";
  }
});

if (!$("runDate").value) $("runDate").value = today();
renderPublic();
renderDashboard();
