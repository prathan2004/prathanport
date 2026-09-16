document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadAdminDashboard();
    bindChallengeForm();
  } catch (error) {
    const message = document.querySelector('#adminMessage');
    setMessage(message, error.message || 'โหลดข้อมูล Admin ไม่สำเร็จ', true);
  }
});

async function loadAdminDashboard() {
  await Promise.all([
    loadAdminMembers(),
    loadAdminPendingRuns(),
    loadAdminChallenges()
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
    .select('id, user_id, run_date, distance_km, pace, status, evidence_url, profiles(display_name)')
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
        ${record.evidence_url ? `<a href="#" data-evidence="${record.evidence_url}">ดูหลักฐาน</a>` : '<span>ไม่มีหลักฐาน</span>'}
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
  document.querySelectorAll('[data-evidence]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      openEvidence(link.dataset.evidence);
    });
  });
}

async function loadAdminChallenges() {
  const { count, error } = await sb
    .from('challenges')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  document.querySelector('#adminChallengeCount').textContent = count || 0;
}

async function updateRunStatus(id, status) {
  const { error } = await sb.from('running_records').update({ status }).eq('id', id);
  if (error) {
    alert(error.message);
    return;
  }
  await loadAdminPendingRuns();
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

async function openEvidence(path) {
  const { data, error } = await sb.storage.from('running-evidence').createSignedUrl(path, 60);
  if (error) {
    alert(error.message);
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

function bindChallengeForm() {
  const form = document.querySelector('#challengeForm');
  const message = document.querySelector('#adminMessage');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    setMessage(message, 'กำลังสร้าง Challenge...');

    const payload = {
      challenge_name: document.querySelector('#challengeName').value.trim(),
      description: document.querySelector('#challengeDescription').value.trim() || null,
      start_date: document.querySelector('#startDate').value,
      end_date: document.querySelector('#endDate').value,
      target_distance: Number(document.querySelector('#targetDistance').value),
      status: 'active'
    };

    if (payload.end_date < payload.start_date) {
      setMessage(message, 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่ม', true);
      return;
    }

    const { error } = await sb.from('challenges').insert(payload);
    if (error) {
      setMessage(message, error.message, true);
      return;
    }

    form.reset();
    setMessage(message, 'สร้าง Challenge แล้ว');
    await loadAdminChallenges();
  });
}
