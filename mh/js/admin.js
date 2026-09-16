let adminChallenges = [];
let adminRuns = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    bindChallengeForm();
    bindAdminRunActions();
    await loadAdminDashboard();
  } catch (error) {
    const message = document.querySelector('#adminMessage');
    setMessage(message, error.message || 'โหลดข้อมูล Admin ไม่สำเร็จ', true);
  }
});

async function loadAdminDashboard() {
  await Promise.all([
    loadAdminMembers(),
    loadAdminPendingRuns(),
    loadAdminChallenges(),
    loadAdminRuns()
  ]);
}

async function loadAdminMembers() {
  const { data, error } = await sb
    .from('profiles')
    .select('id, display_name, email, role, status')
    .order('display_name');
  if (error) throw error;

  document.querySelector('#adminMemberCount').textContent = (data || []).length;
  document.querySelector('#adminMembers').innerHTML = (data || []).map(member => `
    <div class="leaderboard-item">
      <span class="rank">${member.role === 'admin' ? 'A' : 'M'}</span>
      <span>${escapeHtml(member.display_name)}<small>${escapeHtml(member.email)}</small></span>
      <button class="button secondary" data-toggle-member="${member.id}" data-status="${member.status}">
        ${member.status === 'active' ? 'ระงับ' : 'เปิดใช้'}
      </button>
    </div>
  `).join('');

  document.querySelectorAll('[data-toggle-member]').forEach(button => {
    button.addEventListener('click', () => toggleMemberStatus(button.dataset.toggleMember, button.dataset.status));
  });
}

async function loadAdminPendingRuns() {
  const { data, error } = await sb
    .from('running_records')
    .select('id, user_id, run_date, distance_km, pace, status, profiles(display_name)')
    .eq('status', 'pending')
    .order('run_date', { ascending: false });
  if (error) throw error;

  document.querySelector('#adminPendingCount').textContent = (data || []).length;
  const container = document.querySelector('#adminPendingRuns');
  if (!data?.length) {
    container.innerHTML = '<p class="muted">ไม่มีรายการรอตรวจ</p>';
    return;
  }

  container.innerHTML = data.map(record => `
    <div class="run-item">
      <div>
        <strong>${formatDistance(record.distance_km)} km</strong>
        <span>${escapeHtml(record.profiles?.display_name || 'Member')} · ${formatThaiDate(record.run_date)} · ${formatPace(record.pace)}</span>
      </div>
      <div class="actions compact">
        <button class="button primary" data-approve="${record.id}">อนุมัติ</button>
        <button class="button secondary" data-reject="${record.id}">ไม่ผ่าน</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('[data-approve]').forEach(button => {
    button.addEventListener('click', () => updateRunStatus(button.dataset.approve, 'approved'));
  });
  document.querySelectorAll('[data-reject]').forEach(button => {
    button.addEventListener('click', () => updateRunStatus(button.dataset.reject, 'rejected'));
  });
}

async function loadAdminRuns() {
  const { data, error } = await sb
    .from('running_records')
    .select('id, user_id, run_date, distance_km, duration_minutes, pace, status, note, profiles(display_name)')
    .order('run_date', { ascending: false });
  if (error) throw error;

  adminRuns = data || [];
  renderAdminRuns();
}

function renderAdminRuns() {
  const container = document.querySelector('#adminRunList');
  if (!container) return;

  if (!adminRuns.length) {
    container.innerHTML = '<p class="muted">ยังไม่มีข้อมูลการวิ่ง</p>';
    return;
  }

  container.innerHTML = adminRuns.map(record => `
    <div class="run-item">
      <div>
        <strong>${formatDistance(record.distance_km)} km</strong>
        <span>${escapeHtml(record.profiles?.display_name || 'Member')} · ${formatThaiDate(record.run_date)} · ${formatPace(record.pace)} · ${formatStatus(record.status)}</span>
        ${record.note ? `<small class="muted">${escapeHtml(record.note)}</small>` : ''}
      </div>
      <button class="button danger" data-delete-run="${record.id}">ลบ</button>
    </div>
  `).join('');

  document.querySelectorAll('[data-delete-run]').forEach(button => {
    button.addEventListener('click', () => deleteRunRecord(button.dataset.deleteRun));
  });
}

async function loadAdminChallenges() {
  const { data, error, count } = await sb
    .from('challenges')
    .select('id, challenge_name, description, start_date, end_date, target_distance, status, is_current_challenge', { count: 'exact' })
    .order('start_date', { ascending: false });

  if (error?.message?.includes('is_current_challenge')) {
    throw new Error('ต้องรัน SQL migration phase-12-current-challenge.sql ก่อน เพื่อเพิ่มคอลัมน์ is_current_challenge');
  }
  if (error) throw error;

  adminChallenges = data || [];
  document.querySelector('#adminChallengeCount').textContent = count || adminChallenges.length;
  renderAdminChallenges();
}

function renderAdminChallenges() {
  const container = document.querySelector('#adminChallengeList');
  if (!container) return;

  if (!adminChallenges.length) {
    container.innerHTML = '<p class="muted">ยังไม่มี Challenge</p>';
    return;
  }

  container.innerHTML = adminChallenges.map(challenge => `
    <div class="run-item ${challenge.is_current_challenge ? 'current-user' : ''}">
      <div>
        <strong>${escapeHtml(challenge.challenge_name)}</strong>
        <span>${formatDistance(challenge.target_distance)} km · ${formatThaiDate(challenge.start_date)} - ${formatThaiDate(challenge.end_date)} · ${escapeHtml(challenge.status)}${challenge.is_current_challenge ? ' · Challenge ปัจจุบัน' : ''}</span>
        ${challenge.description ? `<small class="muted">${escapeHtml(challenge.description)}</small>` : ''}
      </div>
      <div class="actions compact">
        <button class="button primary" data-current-challenge="${challenge.id}" ${challenge.is_current_challenge ? 'disabled' : ''}>ตั้งเป็นปัจจุบัน</button>
        <button class="button secondary" data-edit-challenge="${challenge.id}">แก้ไข</button>
        <button class="button danger" data-delete-challenge="${challenge.id}">ลบ</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('[data-current-challenge]').forEach(button => {
    button.addEventListener('click', () => setCurrentChallenge(button.dataset.currentChallenge));
  });
  document.querySelectorAll('[data-edit-challenge]').forEach(button => {
    button.addEventListener('click', () => startEditChallenge(button.dataset.editChallenge));
  });
  document.querySelectorAll('[data-delete-challenge]').forEach(button => {
    button.addEventListener('click', () => deleteChallenge(button.dataset.deleteChallenge));
  });
}

function bindAdminRunActions() {
  const clearButton = document.querySelector('#clearAllRunsButton');
  if (!clearButton) return;

  clearButton.addEventListener('click', clearAllRunRecords);
}

async function updateRunStatus(id, status) {
  const { error } = await sb.from('running_records').update({ status }).eq('id', id);
  if (error) {
    alert(error.message);
    return;
  }
  await Promise.all([loadAdminPendingRuns(), loadAdminRuns()]);
}

async function deleteRunRecord(id) {
  const record = adminRuns.find(item => item.id === id);
  const name = record?.profiles?.display_name || 'สมาชิก';
  const confirmed = confirm(`ต้องการลบข้อมูลวิ่งของ ${name} วันที่ ${formatThaiDate(record?.run_date)} ใช่ไหม?`);
  if (!confirmed) return;

  const { error } = await sb.from('running_records').delete().eq('id', id);
  if (error) {
    alert(error.message || 'ลบข้อมูลวิ่งไม่สำเร็จ');
    return;
  }

  await Promise.all([loadAdminPendingRuns(), loadAdminRuns()]);
}

async function clearAllRunRecords() {
  const confirmed = confirm('ต้องการเคลียร์ข้อมูลการวิ่งทั้งหมดใช่ไหม? การกระทำนี้ลบทุกสมาชิกและย้อนกลับไม่ได้');
  if (!confirmed) return;

  const { error } = await sb.from('running_records').delete().not('id', 'is', null);
  if (error) {
    alert(error.message || 'เคลียร์ข้อมูลทั้งหมดไม่สำเร็จ');
    return;
  }

  await Promise.all([loadAdminPendingRuns(), loadAdminRuns()]);
}

async function toggleMemberStatus(id, currentStatus) {
  const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const { error } = await sb.from('profiles').update({ status: nextStatus }).eq('id', id);
  if (error) {
    alert(error.message);
    return;
  }
  await loadAdminMembers();
}

function bindChallengeForm() {
  const form = document.querySelector('#challengeForm');
  const cancelButton = document.querySelector('#challengeCancelButton');
  const message = document.querySelector('#adminMessage');

  cancelButton.addEventListener('click', resetChallengeForm);

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const challengeId = document.querySelector('#challengeId').value;
    const payload = {
      challenge_name: document.querySelector('#challengeName').value.trim(),
      description: document.querySelector('#challengeDescription').value.trim() || null,
      start_date: document.querySelector('#startDate').value,
      end_date: document.querySelector('#endDate').value,
      target_distance: Number(document.querySelector('#targetDistance').value),
      status: document.querySelector('#challengeStatus').value
    };

    if (payload.end_date < payload.start_date) {
      setMessage(message, 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่ม', true);
      return;
    }

    setMessage(message, challengeId ? 'กำลังบันทึก Challenge...' : 'กำลังสร้าง Challenge...');

    const query = challengeId
      ? sb.from('challenges').update(payload).eq('id', challengeId)
      : sb.from('challenges').insert(payload);
    const { error } = await query;

    if (error) {
      setMessage(message, error.message, true);
      return;
    }

    resetChallengeForm();
    setMessage(message, challengeId ? 'บันทึก Challenge แล้ว' : 'สร้าง Challenge แล้ว');
    await loadAdminChallenges();
  });
}

function startEditChallenge(id) {
  const challenge = adminChallenges.find(item => item.id === id);
  if (!challenge) return;

  document.querySelector('#challengeId').value = challenge.id;
  document.querySelector('#challengeName').value = challenge.challenge_name || '';
  document.querySelector('#targetDistance').value = challenge.target_distance || '';
  document.querySelector('#startDate').value = challenge.start_date || '';
  document.querySelector('#endDate').value = challenge.end_date || '';
  document.querySelector('#challengeStatus').value = challenge.status || 'active';
  document.querySelector('#challengeDescription').value = challenge.description || '';
  document.querySelector('#challengeFormTitle').textContent = 'แก้ไข Challenge';
  document.querySelector('#challengeSubmitButton').textContent = 'บันทึก Challenge';
  document.querySelector('#challengeCancelButton').hidden = false;
  document.querySelector('#challengeForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetChallengeForm() {
  document.querySelector('#challengeForm').reset();
  document.querySelector('#challengeId').value = '';
  document.querySelector('#challengeStatus').value = 'active';
  document.querySelector('#challengeFormTitle').textContent = 'สร้าง Challenge';
  document.querySelector('#challengeSubmitButton').textContent = 'สร้าง Challenge';
  document.querySelector('#challengeCancelButton').hidden = true;
}

async function setCurrentChallenge(id) {
  const { error: clearError } = await sb
    .from('challenges')
    .update({ is_current_challenge: false })
    .neq('id', id);
  if (clearError) {
    alert(clearError.message || 'ตั้งค่า Challenge ปัจจุบันไม่สำเร็จ');
    return;
  }

  const { error } = await sb
    .from('challenges')
    .update({ is_current_challenge: true, status: 'active' })
    .eq('id', id);
  if (error) {
    alert(error.message || 'ตั้งค่า Challenge ปัจจุบันไม่สำเร็จ');
    return;
  }

  const message = document.querySelector('#adminMessage');
  setMessage(message, 'ตั้งค่า Challenge ปัจจุบันแล้ว');
  await loadAdminChallenges();
}

async function deleteChallenge(id) {
  const challenge = adminChallenges.find(item => item.id === id);
  const name = challenge?.challenge_name || 'Challenge นี้';
  const confirmed = confirm(`ต้องการลบ "${name}" ใช่ไหม? สมาชิกที่เข้าร่วม Challenge นี้จะถูกลบออกด้วย`);
  if (!confirmed) return;

  const { error } = await sb.from('challenges').delete().eq('id', id);
  if (error) {
    alert(error.message || 'ลบ Challenge ไม่สำเร็จ');
    return;
  }

  const message = document.querySelector('#adminMessage');
  setMessage(message, 'ลบ Challenge แล้ว');
  resetChallengeForm();
  await loadAdminChallenges();
}
