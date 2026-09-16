document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
});

async function loadLeaderboard() {
  const container = document.querySelector('#leaderboardList');
  container.innerHTML = '<p class="muted">กำลังโหลดอันดับ...</p>';

  try {
    const user = await getCurrentUser();
    const { data, error } = await sb.rpc('get_leaderboard', { range_key: 'all' });
    if (error) throw error;

    const rows = data || [];
    if (!rows.length) {
      container.innerHTML = '<p class="muted">ยังไม่มีข้อมูลในช่วง Challenge ปัจจุบัน</p>';
      return;
    }

    container.innerHTML = rows.map(row => `
      <div class="leaderboard-item ${row.user_id === user.id ? 'current-user' : ''}">
        <span class="rank">#${row.rank}</span>
        <span>${escapeHtml(row.display_name || 'Member')}<small>${row.total_runs} ครั้ง · ${formatPace(row.average_pace)}</small></span>
        <strong>${formatDistance(row.total_distance)} km</strong>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = `<p class="message error">${escapeHtml(error.message || 'โหลด Leaderboard ไม่สำเร็จ')}</p>`;
  }
}
