document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('#loginForm');
  const registerForm = document.querySelector('#registerForm');
  const logoutButton = document.querySelector('#logoutButton');
  const resetPasswordButton = document.querySelector('#resetPasswordButton');
  const authMessage = document.querySelector('#authMessage');

  protectRoute();

  if (loginForm) {
    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      setMessage(authMessage, 'กำลังเข้าสู่ระบบ...');

      const email = document.querySelector('#email').value.trim();
      const password = document.querySelector('#password').value;

      try {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = 'dashboard.html';
      } catch (error) {
        setMessage(authMessage, error.message || 'เข้าสู่ระบบไม่สำเร็จ', true);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async event => {
      event.preventDefault();
      setMessage(authMessage, 'กำลังสมัครสมาชิก...');

      const fullName = document.querySelector('#fullName').value.trim();
      const displayName = document.querySelector('#displayName').value.trim();
      const email = document.querySelector('#email').value.trim();
      const password = document.querySelector('#password').value;

      if (!displayName) {
        setMessage(authMessage, 'กรุณากรอกชื่อที่แสดง', true);
        return;
      }

      try {
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              display_name: displayName
            }
          }
        });
        if (error) throw error;
        setMessage(authMessage, 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 900);
      } catch (error) {
        setMessage(authMessage, error.message || 'สมัครสมาชิกไม่สำเร็จ', true);
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await sb.auth.signOut();
      window.location.href = 'index.html';
    });
  }

  if (resetPasswordButton) {
    resetPasswordButton.addEventListener('click', async () => {
      const email = document.querySelector('#email').value.trim();
      if (!email) {
        setMessage(authMessage, 'กรุณากรอกอีเมลก่อน', true);
        return;
      }

      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${window.location.pathname.replace(/(login|index)\.html$/, '')}index.html`
        });
        if (error) throw error;
        setMessage(authMessage, 'ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว');
      } catch (error) {
        setMessage(authMessage, error.message || 'ส่งลิงก์รีเซ็ตไม่สำเร็จ', true);
      }
    });
  }
});

async function protectRoute() {
  if (document.body.dataset.protected !== 'true') return;

  try {
    const session = await getSession();
    if (!session) {
      window.location.href = 'index.html';
      return;
    }

    const profile = await getCurrentProfile();
    if (!profile || profile.status !== 'active') {
      await sb.auth.signOut();
      window.location.href = 'index.html';
      return;
    }

    if (document.body.dataset.admin === 'true' && profile.role !== 'admin') {
      window.location.href = 'dashboard.html';
    }
  } catch (error) {
    console.error(error);
    window.location.href = 'index.html';
  }
}
