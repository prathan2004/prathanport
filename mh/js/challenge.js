document.addEventListener('DOMContentLoaded', loadChallenges);

async function loadChallenges() {
  const container = document.querySelector('#challengeList');
  container.innerHTML = '<p class="muted">กำลังโหลด Challenge...</p>';

  try {
    const user = await getCurrentUser();
    const { data: challenges, error } = await sb
      .from('challenges')
      .select('id, challenge_name, description, start_date, end_date, target_distance, status')
      .order('start_date', { ascending: false });
    if (error) throw error;

    const { data: memberships } = await sb
      .from('challenge_members')
      .select('challenge_id')
      .eq('user_id', user.id);
    const joined = new Set((memberships || []).map(item => item.challenge_id));

    if (!challenges?.length) {
      container.innerHTML = '<p class="muted">ยังไม่มี Challenge ที่เปิดอยู่</p>';
      return;
    }

    const progressByChallenge = new Map();
    await Promise.all(challenges.map(async challenge => {
      const { data } = await sb.rpc('get_challenge_progress', { challenge_id_input: challenge.id });
      const ownProgress = (data || []).find(row => row.user_id === user.id);
      progressByChallenge.set(challenge.id, ownProgress || {
        total_distance: 0,
        target_distance: challenge.target_distance,
        progress_percent: 0
      });
    }));

    container.innerHTML = challenges.map(challenge => {
      const progress = progressByChallenge.get(challenge.id);
      const percent = Math.min(Number(progress?.progress_percent || 0), 100);
      return `
      <article class="card challenge-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${challenge.status}</p>
            <h2>${escapeHtml(challenge.challenge_name)}</h2>
          </div>
          <strong>${formatDistance(challenge.target_distance)} km</strong>
        </div>
        <p class="muted">${escapeHtml(challenge.description || '')}</p>
        <p>${formatThaiDate(challenge.start_date)} - ${formatThaiDate(challenge.end_date)}</p>
        <div>
          <div class="progress"><span style="width:${percent}%"></span></div>
          <p class="muted">${formatDistance(progress?.total_distance)} / ${formatDistance(challenge.target_distance)} km (${percent.toFixed(0)}%)</p>
        </div>
        <button class="button ${joined.has(challenge.id) ? 'secondary' : 'primary'}" data-join="${challenge.id}" ${joined.has(challenge.id) ? 'disabled' : ''}>
          ${joined.has(challenge.id) ? 'เข้าร่วมแล้ว' : 'เข้าร่วม Challenge'}
        </button>
      </article>
    `;
    }).join('');

    document.querySelectorAll('[data-join]').forEach(button => {
      button.addEventListener('click', () => joinChallenge(button.dataset.join));
    });
  } catch (error) {
    container.innerHTML = `<p class="message error">${escapeHtml(error.message || 'โหลด Challenge ไม่สำเร็จ')}</p>`;
  }
}

async function joinChallenge(challengeId) {
  try {
    const user = await getCurrentUser();
    const { error } = await sb
      .from('challenge_members')
      .insert({ challenge_id: challengeId, user_id: user.id });
    if (error) throw error;
    await loadChallenges();
  } catch (error) {
    alert(error.message || 'เข้าร่วมไม่สำเร็จ');
  }
}
