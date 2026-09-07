const state = {
  token: localStorage.getItem("mhahaoRunToken"),
  user: null,
  runs: [],
  leaderboard: [],
  editingRunId: null,
};

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
  return data;
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

function formatDistance(km) {
  return `${Number(km || 0).toFixed(2)} กม.`;
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
  const rows = state.leaderboard;
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

async function refreshPublic() {
  try {
    const data = await api("/api/leaderboard");
    state.leaderboard = data.leaderboard || [];
    renderLeaderboard("publicLeaderboard");
    if ($("leaderboard")) renderLeaderboard("leaderboard");
  } catch {
    $("publicLeaderboard").innerHTML = '<div class="empty">ยังโหลดอันดับไม่ได้</div>';
  }
}

async function refreshDashboard() {
  if (!state.token) {
    showSignedOut();
    return;
  }

  try {
    const data = await api("/api/dashboard");
    state.user = data.user;
    state.runs = data.runs || [];
    state.leaderboard = data.leaderboard || [];
    renderDashboard();
  } catch {
    state.token = null;
    localStorage.removeItem("mhahaoRunToken");
    showSignedOut();
  }
}

function showSignedOut() {
  $("authView").classList.remove("hidden");
  $("dashboard").classList.add("hidden");
  refreshPublic();
}

function renderDashboard() {
  const runs = state.runs;
  const rank = state.leaderboard.findIndex((row) => row.id === state.user.id);

  $("authView").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("welcomeName").textContent = state.user.nickname;
  $("myTotal").textContent = formatDistance(state.user.totalKm);
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

  try {
    await api("/api/signup", {
      method: "POST",
      body: JSON.stringify({ username, password, nickname }),
    });
    $("signupForm").reset();
    showAuthMode("login");
    setMessage("authMessage", "สมัครบัญชีสำเร็จ เข้าสู่ระบบได้เลย", true);
    await refreshPublic();
  } catch (error) {
    setMessage("authMessage", error.message);
  }
});

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = clean($("loginUsername").value).toLowerCase();
  const password = $("loginPassword").value;

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    state.token = data.token;
    localStorage.setItem("mhahaoRunToken", data.token);
    $("loginForm").reset();
    resetRunForm();
    await refreshDashboard();
  } catch (error) {
    setMessage("authMessage", error.message);
  }
});

$("logoutButton").addEventListener("click", async () => {
  try {
    if (state.token) await api("/api/logout", { method: "POST" });
  } catch {
    // Logging out locally is enough if the online session already expired.
  }
  state.token = null;
  state.user = null;
  localStorage.removeItem("mhahaoRunToken");
  resetRunForm();
  showSignedOut();
});

$("runForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const date = $("runDate").value;
  const distanceKm = Number($("runDistance").value);
  const note = clean($("runNote").value);
  const payload = JSON.stringify({ date, distanceKm, note });

  try {
    if (state.editingRunId) {
      await api(`/api/runs/${encodeURIComponent(state.editingRunId)}`, { method: "PUT", body: payload });
    } else {
      await api("/api/runs", { method: "POST", body: payload });
    }
    resetRunForm();
    setMessage("runMessage", "บันทึกแล้ว", true);
    await refreshDashboard();
  } catch (error) {
    setMessage("runMessage", error.message);
  }
});

$("historyList").addEventListener("click", async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const run = state.runs.find((item) => item.id === editId);
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
    try {
      await api(`/api/runs/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      resetRunForm();
      await refreshDashboard();
    } catch (error) {
      setMessage("runMessage", error.message);
    }
  }
});

$("cancelEditButton").addEventListener("click", resetRunForm);

$("exportButton").addEventListener("click", async () => {
  try {
    const data = await api("/api/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mhahao-run-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
});

$("importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    await api("/api/import", { method: "POST", body: JSON.stringify(imported) });
    await refreshDashboard();
  } catch (error) {
    alert(error.message || "ไฟล์ไม่ถูกต้อง");
  } finally {
    event.target.value = "";
  }
});

$("runDate").value = today();
refreshPublic();
refreshDashboard();
