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
    document.querySelector('#todayDistance').textContent = `${Number(summary?.today_distance || 0).toFixed(2)} km`;
    document.querySelector('#weekDistance').textContent = `${Number(summary?.week_distance || 0).toFixed(2)} km`;
    document.querySelector('#monthDistance').textContent = `${Number(summary?.month_distance || 0).toFixed(2)} km`;
    document.querySelector('#allTimeDistance').textContent = `${Number(summary?.all_time_distance || 0).toFixed(2)} km`;
    dashboardMessage.textContent = 'โหลดข้อมูลสำเร็จ';
  } catch (error) {
    console.error(error);
    dashboardMessage.textContent = 'ยังโหลด Dashboard ไม่สำเร็จ ตรวจสอบ Supabase URL, anon key และ SQL/RLS';
  }
});
