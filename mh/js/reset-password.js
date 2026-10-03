document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#newPasswordForm');
  const password = document.querySelector('#newPassword');
  const confirmation = document.querySelector('#confirmPassword');
  const button = document.querySelector('#savePasswordButton');
  const message = document.querySelector('#resetMessage');
  const params = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  let ready = false;

  function enableForm(enabled) {
    ready = enabled;
    password.disabled = !enabled;
    confirmation.disabled = !enabled;
    button.disabled = !enabled;
  }

  confirmation.addEventListener('input', () => confirmation.setCustomValidity(''));
  password.addEventListener('input', () => confirmation.setCustomValidity(''));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready) return;
    if (password.value !== confirmation.value) {
      confirmation.setCustomValidity('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      confirmation.reportValidity();
      return;
    }
    enableForm(false);
    setMessage(message, 'กำลังบันทึกรหัสผ่านใหม่...');
    try {
      const { error } = await sb.auth.updateUser({ password: password.value });
      if (error) throw error;
      form.reset();
      const { error: signOutError } = await sb.auth.signOut({ scope: 'local' });
      setMessage(message, signOutError
        ? 'ตั้งรหัสผ่านใหม่สำเร็จแล้ว แต่ยังออกจากระบบไม่สำเร็จ กรุณาออกจากระบบอีกครั้ง'
        : 'ตั้งรหัสผ่านใหม่สำเร็จแล้ว กลับหน้าเข้าสู่ระบบเพื่อใช้รหัสผ่านใหม่');
    } catch (error) {
      enableForm(true);
      setMessage(message, error.message || 'บันทึกรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง', true);
    }
  });

  try {
    if (params.has('error') || query.has('error')) throw new Error('Invalid recovery link');
    // getSession waits for the SDK to process the recovery tokens from the URL.
    const { data, error } = await sb.auth.getSession();
    if (error || !data.session) throw error || new Error('Missing recovery session');
    const { error: userError } = await sb.auth.getUser();
    if (userError) throw userError;
    window.history.replaceState(null, '', window.location.pathname);
    enableForm(true);
    setMessage(message, 'กรุณาตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร');
  } catch {
    window.history.replaceState(null, '', window.location.pathname);
    setMessage(message, 'ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณากลับหน้าเข้าสู่ระบบเพื่อขอลิงก์ใหม่', true);
  }
});
