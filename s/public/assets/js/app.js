export const $ = id => document.getElementById(id);

export function setTheme(theme) {
  document.documentElement.dataset.bsTheme = theme;
  try { localStorage.setItem('shortlink-theme', theme); } catch {}
}

try {
  document.documentElement.dataset.bsTheme =
    localStorage.getItem('shortlink-theme') === 'dark' ? 'dark' : 'light';
} catch {}

export async function api(name, { method = 'GET', data, csrf, raw = false, signal } = {}) {
  let result;
  try {
    result = await fetch('/.netlify/functions/' + name, {
      method, signal, credentials: 'same-origin', cache: 'no-store',
      headers: data ? { 'Content-Type': 'application/json', ...(csrf && { 'X-CSRF-Token': csrf }) } : {},
      body: data ? JSON.stringify(data) : undefined
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่');
  }
  if (result.ok && raw) return result;
  const payload = await result.json().catch(() => null);
  if (!result.ok || !payload) {
    const error = new Error(payload?.error || (result.status === 429 ?
      'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' : 'ระบบไม่พร้อมใช้งาน กรุณาลองใหม่'));
    error.status = result.status;
    throw error;
  }
  return payload;
}

export async function busy(button, callback) {
  if (button.disabled) return;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  const spinner = document.createElement('span');
  spinner.className = 'spinner-border spinner-border-sm me-2';
  spinner.setAttribute('aria-hidden', 'true');
  button.prepend(spinner);
  try { await callback(); }
  finally {
    spinner.remove();
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

export function download(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
