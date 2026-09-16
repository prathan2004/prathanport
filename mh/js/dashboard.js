document.addEventListener('DOMContentLoaded', async () => {
  const welcomeName = document.querySelector('#welcomeName');
  const dashboardMessage = document.querySelector('#dashboardMessage');

  try {
    const profile = await getCurrentProfile();
    if (profile && welcomeName) {
      welcomeName.textContent = `สวัสดี ${profile.display_name}`;
    }

    const { data, error } = await sb.rpc('get_member_dashboard_summary');
    if (error) throw error;

    const summary = Array.isArray(data) ? data[0] : data;
    renderSummary(summary);
    await Promise.all([
      loadRunningInsights(),
      loadLeaderboardPreview()
    ]);
    dashboardMessage.textContent = 'โหลดข้อมูลสำเร็จ';
  } catch (error) {
    console.error(error);
    dashboardMessage.textContent = 'ยังโหลด Dashboard ไม่สำเร็จ ตรวจสอบ Supabase URL, anon key และ SQL/RLS';
  }
});

function renderSummary(summary) {
  document.querySelector('#todayDistance').textContent = `${formatDistance(summary?.today_distance)} km`;
  document.querySelector('#weekDistance').textContent = `${formatDistance(summary?.week_distance)} km`;
  document.querySelector('#monthDistance').textContent = `${formatDistance(summary?.month_distance)} km`;
  document.querySelector('#allTimeDistance').textContent = `${formatDistance(summary?.all_time_distance)} km`;
  document.querySelector('#totalRuns').textContent = Number(summary?.total_runs || 0).toLocaleString('th-TH');
  document.querySelector('#averagePace').textContent = formatPace(summary?.average_pace);
  document.querySelector('#currentRank').textContent = summary?.current_rank ? `#${summary.current_rank}` : '-';
}

async function loadRunningInsights() {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 11);
  startDate.setDate(1);

  const { data, error } = await sb
    .from('running_records')
    .select('id, run_date, distance_km, duration_minutes, pace, status, note, created_at')
    .gte('run_date', toDateKey(startDate))
    .order('run_date', { ascending: true });

  if (error) throw error;

  const records = data || [];
  const approvedRecords = records.filter(record => record.status === 'approved');
  const pendingCount = records.filter(record => record.status === 'pending').length;
  document.querySelector('#pendingRuns').textContent = pendingCount.toLocaleString('th-TH');

  renderWeeklyChart(approvedRecords);
  renderMonthlyChart(approvedRecords);
  renderRecentRuns(records.slice().sort((a, b) => new Date(b.run_date) - new Date(a.run_date)).slice(0, 5));
}

async function loadLeaderboardPreview() {
  const { data, error } = await sb.rpc('get_leaderboard', { range_key: 'month' });
  if (error) throw error;

  const container = document.querySelector('#leaderboardPreview');
  const rows = (data || []).slice(0, 5);

  if (!rows.length) {
    container.innerHTML = '<p class="muted">ยังไม่มีข้อมูลอันดับเดือนนี้</p>';
    return;
  }

  container.innerHTML = rows.map(row => `
    <div class="leaderboard-item">
      <span class="rank">#${row.rank}</span>
      <span>${escapeHtml(row.display_name || 'Member')}</span>
      <strong>${formatDistance(row.total_distance)} km</strong>
    </div>
  `).join('');
}

function renderWeeklyChart(records) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const totals = new Map(days.map(date => [toDateKey(date), 0]));

  records.forEach(record => {
    if (totals.has(record.run_date)) {
      totals.set(record.run_date, totals.get(record.run_date) + Number(record.distance_km || 0));
    }
  });

  renderBarChart('weeklyChart', days.map(formatShortDate), [...totals.values()], 'km');
}

function renderMonthlyChart(records) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    date.setDate(1);
    return date;
  });
  const totals = new Map(months.map(date => [toMonthKey(date), 0]));

  records.forEach(record => {
    const key = record.run_date.slice(0, 7);
    if (totals.has(key)) {
      totals.set(key, totals.get(key) + Number(record.distance_km || 0));
    }
  });

  renderBarChart('monthlyChart', months.map(formatMonth), [...totals.values()], 'km');
}

function renderBarChart(canvasId, labels, values, suffix) {
  const canvas = document.querySelector(`#${canvasId}`);
  if (!canvas || !window.Chart) return;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: '#21a67a',
        borderRadius: 6,
        maxBarThickness: 42
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${Number(context.raw || 0).toFixed(2)} ${suffix}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => `${value} ${suffix}`
          }
        }
      }
    }
  });
}

function renderRecentRuns(records) {
  const container = document.querySelector('#recentRuns');

  if (!records.length) {
    container.innerHTML = '<p class="muted">ยังไม่มีประวัติการวิ่ง</p>';
    return;
  }

  container.innerHTML = records.map(record => `
    <div class="run-item">
      <div>
        <strong>${formatDistance(record.distance_km)} km</strong>
        <span>${formatThaiDate(record.run_date)} · ${formatPace(record.pace)}</span>
      </div>
      <span class="status-pill ${record.status}">${formatStatus(record.status)}</span>
    </div>
  `).join('');
}

function formatDistance(value) {
  return Number(value || 0).toFixed(2);
}

function formatPace(value) {
  const pace = Number(value || 0);
  if (!pace) return '-';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')} min/km`;
}

function formatStatus(status) {
  const labels = {
    pending: 'รอตรวจ',
    approved: 'อนุมัติ',
    rejected: 'ไม่ผ่าน'
  };
  return labels[status] || status;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function toMonthKey(date) {
  return date.toISOString().slice(0, 7);
}

function formatShortDate(date) {
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function formatMonth(date) {
  return date.toLocaleDateString('th-TH', { month: 'short' });
}

function formatThaiDate(value) {
  return new Date(value).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
