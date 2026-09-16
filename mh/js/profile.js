document.addEventListener('DOMContentLoaded', async () => {
  const profileForm = document.querySelector('#profileForm');
  const profileMessage = document.querySelector('#profileMessage');
  let profile = null;

  try {
    profile = await getCurrentProfile();
    document.querySelector('#fullName').value = profile.full_name || '';
    document.querySelector('#displayName').value = profile.display_name || '';
    document.querySelector('#gender').value = profile.gender || '';
    document.querySelector('#birthYear').value = profile.birth_year || '';
  } catch (error) {
    setMessage(profileMessage, 'โหลดข้อมูล Profile ไม่สำเร็จ', true);
  }

  profileForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!profile) return;

    setMessage(profileMessage, 'กำลังบันทึก...');

    const updates = {
      full_name: document.querySelector('#fullName').value.trim(),
      display_name: document.querySelector('#displayName').value.trim(),
      gender: document.querySelector('#gender').value || null,
      birth_year: document.querySelector('#birthYear').value
        ? Number(document.querySelector('#birthYear').value)
        : null
    };

    try {
      const { error } = await sb
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;
      setMessage(profileMessage, 'บันทึกข้อมูลแล้ว');
    } catch (error) {
      setMessage(profileMessage, error.message || 'บันทึกไม่สำเร็จ', true);
    }
  });
});
