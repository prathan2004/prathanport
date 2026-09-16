document.addEventListener('DOMContentLoaded', async () => {
  const runForm = document.querySelector('#runForm');
  const historyList = document.querySelector('#historyList');

  if (runForm) bindRunForm(runForm);
  if (historyList) loadHistory(historyList);
});

function bindRunForm(runForm) {
  const runDate = document.querySelector('#runDate');
  const distanceKm = document.querySelector('#distanceKm');
  const durationMinutes = document.querySelector('#durationMinutes');
  const pacePreview = document.querySelector('#pacePreview');
  const runMessage = document.querySelector('#runMessage');
  runDate.max = todayKey();
  runDate.value = todayKey();

  function updatePace() {
    const distance = Number(distanceKm.value);
    const duration = Number(durationMinutes.value);
    pacePreview.value = distance > 0 && duration > 0 ? formatPace(duration / distance) : '-';
  }

  distanceKm.addEventListener('input', updatePace);
  durationMinutes.addEventListener('input', updatePace);

  runForm.addEventListener('submit', async event => {
    event.preventDefault();
    setMessage(runMessage, 'กำลังบันทึก...');

    const distance = Number(distanceKm.value);
    const duration = Number(durationMinutes.value);

    if (!runDate.value || runDate.value > todayKey()) {
      setMessage(runMessage, 'วันที่วิ่งต้องไม่เป็นวันในอนาคต', true);
      return;
    }
    if (!distance || distance <= 0 || !duration || duration <= 0) {
      setMessage(runMessage, 'ระยะทางและเวลาต้องมากกว่า 0', true);
      return;
    }
    try {
      const user = await getCurrentUser();
      const { error: insertError } = await sb
        .from('running_records')
        .insert({
          user_id: user.id,
          run_date: runDate.value,
          distance_km: distance,
          duration_minutes: duration,
          note: document.querySelector('#runNote').value.trim() || null,
          status: 'pending'
        });

      if (insertError) throw insertError;

      runForm.reset();
      runDate.value = todayKey();
      pacePreview.value = '-';
      setMessage(runMessage, 'บันทึกผลการวิ่งแล้ว รอ Admin ตรวจสอบ');
    } catch (error) {
      console.error(error);
      setMessage(runMessage, error.message || 'บันทึกไม่สำเร็จ', true);
    }
  });
}

async function loadHistory(container) {
  try {
    const { data, error } = await sb
      .from('running_records')
      .select('*')
      .order('run_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const records = data || [];
    if (!records.length) {
      container.innerHTML = '<p class="muted">ยังไม่มีประวัติการวิ่ง</p>';
      return;
    }

    container.innerHTML = records.map(record => `
      <div class="run-item">
        <div>
          <strong>${formatDistance(record.distance_km)} km</strong>
          <span>${formatThaiDate(record.run_date)} · ${formatPace(record.pace)}</span>
          ${record.note ? `<span>${escapeHtml(record.note)}</span>` : ''}
        </div>
        <span class="status-pill ${record.status}">${formatStatus(record.status)}</span>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = `<p class="message error">${escapeHtml(error.message || 'โหลดประวัติไม่สำเร็จ')}</p>`;
  }
}
