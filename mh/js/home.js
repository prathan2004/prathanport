document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadHomeChallenge(),
    loadHomeLeaderboard()
  ]);
});

async function loadHomeChallenge() {
  const name = document.querySelector('#homeChallengeName');
  const description = document.querySelector('#homeChallengeDescription');
  const date = document.querySelector('#homeChallengeDate');
  const target = document.querySelector('#homeChallengeTarget');

  try {
    const { data, error } = await sb.rpc('get_current_challenge_summary');
    if (error) throw error;

    const challenge = Array.isArray(data) ? data[0] : data;
    if (!challenge) {
      name.textContent = 'ยังไม่มี Challenge ปัจจุบัน';
      description.textContent = 'รอ Admin ตั้งค่า Challenge เพื่อเริ่มสะสมระยะและจัดอันดับ';
      date.textContent = '-';
      target.textContent = '0.00 km';
      return;
    }

    name.textContent = challenge.challenge_name || 'Challenge ปัจจุบัน';
    description.textContent = challenge.description || 'สะสมระยะวิ่งภายในช่วงเวลาที่กำหนด';
    date.textContent = `${formatThaiDate(challenge.start_date)} - ${formatThaiDate(challenge.end_date)}`;
    target.textContent = `${formatDistance(challenge.target_distance)} km`;
  } catch (error) {
    name.textContent = 'โหลด Challenge ไม่สำเร็จ';
    description.textContent = error.message || 'กรุณาตรวจสอบ SQL migration สำหรับหน้าแรก';
  }
}

async function loadHomeLeaderboard() {
  const container = document.querySelector('#homeLeaderboard');
  container.innerHTML = '<p class="muted">กำลังโหลดอันดับ...</p>';

  try {
    const { data, error } = await sb.rpc('get_public_leaderboard');
    if (error) throw error;

    const rows = (data || []).slice(0, 10);
    if (!rows.length) {
      container.innerHTML = '<p class="muted">ยังไม่มีข้อมูลอันดับใน Challenge ปัจจุบัน</p>';
      return;
    }

    container.innerHTML = rows.map(row => `
      <div class="leaderboard-item">
        <span class="rank">#${row.rank}</span>
        <span>${escapeHtml(row.display_name || 'Member')}<small>${row.total_runs} ครั้ง · ${formatPace(row.average_pace)}</small></span>
        <strong>${formatDistance(row.total_distance)} km</strong>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = `<p class="message error">${escapeHtml(error.message || 'โหลด Leaderboard ไม่สำเร็จ')}</p>`;
  }
}
