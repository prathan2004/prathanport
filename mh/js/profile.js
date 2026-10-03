document.addEventListener('DOMContentLoaded', async () => {
  const profileForm = document.querySelector('#profileForm');
  const profileMessage = document.querySelector('#profileMessage');
  let profile = null;
  const passwordForm = document.querySelector('#passwordForm');
  passwordForm.addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.querySelector('#passwordMessage');
    const password = document.querySelector('#profilePassword').value;
    if (!profile || profile.status !== 'active') {
      setMessage(message, 'กรุณาเข้าสู่ระบบใหม่', true);
      return;
    }
    if (password !== document.querySelector('#profilePasswordConfirm').value) {
      setMessage(message, 'รหัสผ่านทั้งสองช่องไม่ตรงกัน', true);
      return;
    }
    const button = passwordForm.querySelector('button');
    button.disabled = true;
    setMessage(message, 'กำลังบันทึกรหัสผ่าน...');
    try {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      passwordForm.reset();
      setMessage(message, 'เปลี่ยนรหัสผ่านสำเร็จแล้ว');
    } catch (error) {
      setMessage(message, error.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', true);
    } finally {
      button.disabled = false;
    }
  });

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
