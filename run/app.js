const state = {
  token: localStorage.getItem("mhahaoRunToken"),
  user: null,
  runs: [],
  allRuns: [],
  members: [],
  seasons: [],
  currentSeason: null,
  leaderboard: [],
  editingRunId: null,
  editingAdminRunId: null,
  editingMemberId: null,
};

const $ = (id) => document.getElementById(id);
const API_BASE = window.location.pathname.startsWith("/run") ? "/run/api" : "/api";

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
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

function formatSeason(season) {
  if (!season) return "ยังไม่มี Season";
  const end = season.endDate ? formatDate(season.endDate) : "ไม่กำหนดวันสิ้นสุด";
  return `${season.name} · ${formatDate(season.startDate)} - ${end}`;
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

async function refreshPublic() {
  try {
    const data = await api("/leaderboard");
    state.leaderboard = data.leaderboard || [];
    state.currentSeason = data.currentSeason || null;
    $("publicSeasonLabel").textContent = formatSeason(state.currentSeason);
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
    const data = await api("/dashboard");
    applyDashboardData(data);
    renderDashboard();
  } catch {
    state.token = null;
    localStorage.removeItem("mhahaoRunToken");
    showSignedOut();
  }
}

async function refreshAfterChange(messageId, message) {
  await refreshDashboard();
  await refreshPublic();
  if (messageId && message) setMessage(messageId, message, true);
}

function applyDashboardData(data) {
  state.user = data.user;
  state.runs = data.runs || [];
  state.allRuns = data.allRuns || [];
  state.members = data.members || [];
  state.seasons = data.seasons || [];
  state.currentSeason = data.currentSeason || null;
  state.leaderboard = data.leaderboard || [];
}

function showSignedOut() {
  $("authView").classList.remove("hidden");
  $("dashboard").classList.add("hidden");
  refreshPublic();
}

function renderDashboard() {
  const rank = state.leaderboard.findIndex((row) => row.id === state.user.id);
  const isAdmin = Boolean(state.user.isAdmin);

  $("authView").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  $("welcomeName").textContent = state.user.nickname;
  $("myTotal").textContent = formatDistance(state.user.totalKm);
  $("myRuns").textContent = `${state.runs.length} ครั้ง`;
  $("myRank").textContent = rank >= 0 ? `#${rank + 1}` : "-";
  $("historyCount").textContent = `${state.runs.length} รายการ`;
  $("historyList").innerHTML = state.runs.length
    ? state.runs.map(renderRunRow).join("")
    : '<div class="empty">ยังไม่มีรายการวิ่งใน Season ปัจจุบัน</div>';

  renderLeaderboard("leaderboard");
  $("adminPanel").classList.toggle("hidden", !isAdmin);
  $("adminUsersPanel").classList.toggle("hidden", !isAdmin);
  $("adminRunsPanel").classList.toggle("hidden", !isAdmin);
  if (isAdmin) {
    renderSeasons();
    renderMembers();
    renderAdminRuns();
  }
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
    : '<div class="empty">ยังไม่มีข้อมูลการวิ่งใน Season ปัจจุบัน</div>';
}

function renderRunRow(run) {
  return `
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
  `;
}

function renderSeasons() {
  $("currentSeasonLabel").textContent = formatSeason(state.currentSeason);
  $("seasonList").innerHTML = state.seasons.length
    ? state.seasons.map((season) => `
      <article class="run-item season-row">
        <div>
          <strong>${escapeHtml(season.name)}${season.isCurrent ? '<span class="badge">ปัจจุบัน</span>' : ""}</strong>
          <span>${formatDate(season.startDate)} - ${season.endDate ? formatDate(season.endDate) : "ไม่กำหนดวันสิ้นสุด"}</span>
        </div>
        <div class="run-actions">
          <button class="icon-button" type="button" data-season-current="${season.id}" ${season.isCurrent ? "disabled" : ""}>ตั้งปัจจุบัน</button>
          <button class="icon-button danger" type="button" data-season-delete="${season.id}" ${season.isCurrent ? "disabled" : ""}>ลบ</button>
        </div>
      </article>
    `).join("")
    : '<div class="empty">ยังไม่มี Season</div>';
}

function renderAdminRuns() {
  $("adminCount").textContent = `${state.allRuns.length} รายการ`;
  $("adminRunsList").innerHTML = state.allRuns.length
    ? state.allRuns.map((run) => `
      <article class="run-item">
        <div>
          <strong>${escapeHtml(run.nickname)} · ${formatDate(run.date)} · ${formatDistance(run.distanceKm)}</strong>
          <span>${escapeHtml(run.seasonName || "ไม่ระบุ Season")} · ${escapeHtml(run.note || "ไม่มีหมายเหตุ")}</span>
        </div>
        <div class="run-actions">
          <button class="icon-button" type="button" data-admin-edit="${run.id}">แก้ไข</button>
          <button class="icon-button danger" type="button" data-admin-delete="${run.id}">ลบ</button>
        </div>
      </article>
    `).join("")
    : '<div class="empty">ยังไม่มีรายการวิ่งจากสมาชิก</div>';
}

function renderMembers() {
  $("memberCount").textContent = `${state.members.length} คน`;
  $("memberList").innerHTML = state.members.length
    ? state.members.map((member) => `
      <article class="run-item">
        <div>
          <strong>${escapeHtml(member.nickname)}${member.isAdmin ? '<span class="badge">admin</span>' : ""}</strong>
          <span>${escapeHtml(member.username)} · ${formatDistance(member.totalKm)} · ${member.runCount} ครั้ง</span>
        </div>
        <div class="run-actions">
          <button class="icon-button" type="button" data-member-edit="${member.id}">แก้ไข</button>
          <button class="icon-button danger" type="button" data-member-delete="${member.id}" ${member.id === state.user.id ? "disabled" : ""}>ลบ</button>
        </div>
      </article>
    `).join("")
    : '<div class="empty">ยังไม่มีสมาชิก</div>';
}

function resetRunForm() {
  state.editingRunId = null;
  state.editingAdminRunId = null;
  $("formTitle").textContent = "บันทึกการวิ่ง";
  $("saveRunButton").textContent = "บันทึก";
  $("cancelEditButton").classList.add("hidden");
  $("runForm").reset();
  $("runDate").value = today();
  setMessage("runMessage", "");
}

function resetMemberForm() {
  state.editingMemberId = null;
  $("memberForm").classList.add("hidden");
  $("memberForm").reset();
  setMessage("memberMessage", "");
}

function applyRunResult(run) {
  const normalized = {
    ...run,
    nickname: run.nickname || state.user?.nickname,
    seasonName: run.seasonName || state.currentSeason?.name,
  };
  state.allRuns = upsertById(state.allRuns, normalized);
  state.runs = upsertById(state.runs, normalized).filter(isCurrentSeasonRun).filter((item) => item.userId === state.user.id);
  rebuildLocalLeaderboard();
  updateMySummary();
}

function removeRunResult(id) {
  state.allRuns = state.allRuns.filter((run) => run.id !== id);
  state.runs = state.runs.filter((run) => run.id !== id);
  rebuildLocalLeaderboard();
  updateMySummary();
}

function upsertById(rows, row) {
  return [row, ...rows.filter((item) => item.id !== row.id)]
    .sort((a, b) => `${b.date} ${b.createdAt || ""}`.localeCompare(`${a.date} ${a.createdAt || ""}`));
}

function isCurrentSeasonRun(run) {
  if (!state.currentSeason) return false;
  if (run.seasonId) return run.seasonId === state.currentSeason.id;
  return run.date >= state.currentSeason.startDate && (!state.currentSeason.endDate || run.date <= state.currentSeason.endDate);
}

function rebuildLocalLeaderboard() {
  const currentRuns = state.allRuns.filter(isCurrentSeasonRun);
  state.members = state.members.map((member) => {
    const memberRuns = currentRuns.filter((run) => run.userId === member.id);
    return {
      ...member,
      totalKm: memberRuns.reduce((sum, run) => sum + Number(run.distanceKm), 0),
      runCount: memberRuns.length,
    };
  });
  state.leaderboard = state.members
    .map((member) => ({
      id: member.id,
      nickname: member.nickname,
      totalKm: member.totalKm,
      runCount: member.runCount,
    }))
    .filter((row) => row.totalKm > 0)
    .sort((a, b) => b.totalKm - a.totalKm || a.nickname.localeCompare(b.nickname, "th"));
}

function updateMySummary() {
  const myRuns = state.allRuns.filter((run) => run.userId === state.user.id).filter(isCurrentSeasonRun);
  state.runs = myRuns.sort((a, b) => `${b.date} ${b.createdAt || ""}`.localeCompare(`${a.date} ${a.createdAt || ""}`));
  state.user.totalKm = myRuns.reduce((sum, run) => sum + Number(run.distanceKm), 0);
}

$("showLogin").addEventListener("click", () => showAuthMode("login"));
$("showSignup").addEventListener("click", () => showAuthMode("signup"));

$("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/signup", {
      method: "POST",
      body: JSON.stringify({
        username: clean($("signupUsername").value).toLowerCase(),
        password: $("signupPassword").value,
        nickname: clean($("signupNickname").value),
      }),
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
  try {
    const data = await api("/login", {
      method: "POST",
      body: JSON.stringify({
        username: clean($("loginUsername").value).toLowerCase(),
        password: $("loginPassword").value,
      }),
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
    if (state.token) await api("/logout", { method: "POST" });
  } catch {
    // Ignore expired sessions during logout.
  }
  state.token = null;
  state.user = null;
  localStorage.removeItem("mhahaoRunToken");
  resetRunForm();
  showSignedOut();
});

$("runForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = JSON.stringify({
    date: $("runDate").value,
    distanceKm: Number($("runDistance").value),
    note: clean($("runNote").value),
  });

  try {
    let result;
    if (state.editingRunId) {
      result = await api(`/runs/${encodeURIComponent(state.editingRunId)}`, { method: "PUT", body: payload });
    } else if (state.editingAdminRunId) {
      result = await api(`/admin/runs/${encodeURIComponent(state.editingAdminRunId)}`, { method: "PUT", body: payload });
    } else {
      result = await api("/runs", { method: "POST", body: payload });
    }
    if (result.run) applyRunResult(result.run);
    resetRunForm();
    renderDashboard();
    await refreshAfterChange("runMessage", "บันทึกแล้ว");
  } catch (error) {
    setMessage("runMessage", error.message);
  }
});

$("historyList").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const editId = button.dataset.edit;
  const deleteId = button.dataset.delete;

  if (editId) {
    const run = state.runs.find((item) => item.id === editId);
    if (!run) return;
    state.editingRunId = run.id;
    state.editingAdminRunId = null;
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
      await api(`/runs/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      removeRunResult(deleteId);
      resetRunForm();
      renderDashboard();
      await refreshAfterChange("runMessage", "ลบรายการแล้ว");
    } catch (error) {
      setMessage("runMessage", error.message);
    }
  }
});

$("adminRunsList").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const editId = button.dataset.adminEdit;
  const deleteId = button.dataset.adminDelete;

  if (editId) {
    const run = state.allRuns.find((item) => item.id === editId);
    if (!run) return;
    state.editingRunId = null;
    state.editingAdminRunId = run.id;
    $("formTitle").textContent = `แก้ไขผลของ ${run.nickname}`;
    $("saveRunButton").textContent = "บันทึกการแก้ไข";
    $("cancelEditButton").classList.remove("hidden");
    $("runDate").value = run.date;
    $("runDistance").value = run.distanceKm;
    $("runNote").value = run.note || "";
    setMessage("runMessage", "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (deleteId && confirm("admin ต้องการลบรายการวิ่งนี้หรือไม่?")) {
    try {
      await api(`/admin/runs/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      removeRunResult(deleteId);
      resetRunForm();
      renderDashboard();
      await refreshAfterChange("runMessage", "ลบรายการแล้ว");
    } catch (error) {
      setMessage("runMessage", error.message);
    }
  }
});

$("seasonForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/admin/seasons", {
      method: "POST",
      body: JSON.stringify({
        name: clean($("seasonName").value),
        startDate: $("seasonStart").value,
        endDate: $("seasonEnd").value,
      }),
    });
    $("seasonForm").reset();
    await refreshAfterChange("seasonMessage", "เพิ่ม Season แล้ว");
  } catch (error) {
    setMessage("seasonMessage", error.message);
  }
});

$("seasonList").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  const seasonId = button.dataset.seasonCurrent;
  const deleteId = button.dataset.seasonDelete;

  if (seasonId) {
    try {
      await api(`/admin/seasons/${encodeURIComponent(seasonId)}/current`, { method: "POST" });
      await refreshAfterChange("seasonMessage", "ตั้ง Season ปัจจุบันแล้ว");
    } catch (error) {
      setMessage("seasonMessage", error.message);
    }
  }

  if (deleteId && confirm("ลบ Season นี้หรือไม่?")) {
    try {
      await api(`/admin/seasons/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      await refreshAfterChange("seasonMessage", "ลบ Season แล้ว");
    } catch (error) {
      setMessage("seasonMessage", error.message);
    }
  }
});

$("memberList").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  const editId = button.dataset.memberEdit;
  const deleteId = button.dataset.memberDelete;

  if (editId) {
    const member = state.members.find((item) => item.id === editId);
    if (!member) return;
    state.editingMemberId = member.id;
    $("memberUsername").value = member.username;
    $("memberNickname").value = member.nickname;
    $("memberPassword").value = "";
    $("memberForm").classList.remove("hidden");
    setMessage("memberMessage", "");
  }

  if (deleteId && confirm("ลบสมาชิกนี้หรือไม่? รายการวิ่งของสมาชิกคนนี้จะถูกลบด้วย")) {
    try {
      await api(`/admin/users/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      resetMemberForm();
      await refreshAfterChange("memberMessage", "ลบสมาชิกแล้ว");
    } catch (error) {
      setMessage("memberMessage", error.message);
    }
  }
});

$("memberForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.editingMemberId) return;

  try {
    await api(`/admin/users/${encodeURIComponent(state.editingMemberId)}`, {
      method: "PUT",
      body: JSON.stringify({
        username: clean($("memberUsername").value).toLowerCase(),
        nickname: clean($("memberNickname").value),
        password: $("memberPassword").value,
      }),
    });
    resetMemberForm();
    await refreshAfterChange("memberMessage", "บันทึกสมาชิกแล้ว");
  } catch (error) {
    setMessage("memberMessage", error.message);
  }
});

$("cancelMemberEditButton").addEventListener("click", resetMemberForm);
$("cancelEditButton").addEventListener("click", resetRunForm);

$("runDate").value = today();
refreshPublic();
refreshDashboard();
