document.addEventListener('DOMContentLoaded', async () => {
  const runForm = document.querySelector('#runForm');
  const historyList = document.querySelector('#historyList');

  if (runForm) bindRunForm(runForm);
  if (historyList) loadHistory(historyList);
});

async function bindRunForm(runForm) {
  const runDate = document.querySelector('#runDate');
  const distanceKm = document.querySelector('#distanceKm');
  const durationMinutes = document.querySelector('#durationMinutes');
  const pacePreview = document.querySelector('#pacePreview');
  const runMessage = document.querySelector('#runMessage');
  const currentChallenge = await loadCurrentChallenge(runMessage);

  if (currentChallenge) {
    runDate.min = currentChallenge.start_date;
    runDate.max = currentChallenge.end_date < todayKey() ? currentChallenge.end_date : todayKey();
    runDate.value = runDate.max;
    setMessage(runMessage, `ส่งผลได้เฉพาะช่วง ${formatThaiDate(currentChallenge.start_date)} - ${formatThaiDate(currentChallenge.end_date)}`);
  } else {
    runDate.max = todayKey();
    runDate.value = todayKey();
    runForm.querySelectorAll('input, button').forEach(element => {
      element.disabled = true;
    });
    setMessage(runMessage, 'ยังไม่มี Challenge ปัจจุบัน กรุณาให้ Admin ตั้งค่า Challenge ก่อน', true);
  }

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

    if (!currentChallenge) {
      setMessage(runMessage, 'ยังไม่มี Challenge ปัจจุบัน ไม่สามารถส่งผลวิ่งได้', true);
      return;
    }
    if (!runDate.value || runDate.value > todayKey()) {
      setMessage(runMessage, 'วันที่วิ่งต้องไม่เป็นวันในอนาคต', true);
      return;
    }
    if (runDate.value < currentChallenge.start_date || runDate.value > currentChallenge.end_date) {
      setMessage(runMessage, 'วันที่วิ่งต้องอยู่ในช่วง Challenge ปัจจุบัน', true);
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
      runDate.value = runDate.max;
      pacePreview.value = '-';
      setMessage(runMessage, 'บันทึกผลการวิ่งแล้ว รอ Admin ตรวจสอบ');
    } catch (error) {
      console.error(error);
      setMessage(runMessage, error.message || 'บันทึกไม่สำเร็จ', true);
    }
  });
}

async function loadCurrentChallenge(messageElement) {
  const { data, error } = await sb
    .from('challenges')
    .select('id, challenge_name, start_date, end_date')
    .eq('is_current_challenge', true)
    .maybeSingle();

  if (error?.message?.includes('is_current_challenge')) {
    setMessage(messageElement, 'ต้องรัน SQL migration phase-12-current-challenge.sql ก่อน', true);
    return null;
  }
  if (error) throw error;
  return data;
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
