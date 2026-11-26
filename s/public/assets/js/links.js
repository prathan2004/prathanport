import { $, pageUrl } from './app.js';

export const shortUrl = alias => new URL(pageUrl(alias), location.origin).href;

export function validateForm(form) {
  const input = form.elements.url;
  input.setCustomValidity('');
  try {
    const url = new URL(input.value);
    if (!/^https?:\/\//i.test(input.value) || /[\s\p{Cc}\p{Cf}\\]/u.test(input.value) ||
        url.username || url.password || url.hostname.replace(/\.$/, '') === location.hostname) throw new Error();
  } catch { input.setCustomValidity('กรุณากรอก URL HTTP หรือ HTTPS ของเว็บไซต์อื่น โดยไม่มีช่องว่างหรือข้อมูลเข้าสู่ระบบ'); }
  return form.reportValidity();
}

export async function copyLink(alias) {
  try { await navigator.clipboard.writeText(shortUrl(alias)); }
  catch { throw new Error('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความลิงก์แล้วคัดลอก'); }
}

function anchor(url, label = url) {
  const node = document.createElement('a');
  node.href = url;
  node.textContent = label;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}

function action(label, glyph, callback, alias) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm btn-outline-secondary';
  button.title = label;
  button.setAttribute('aria-label', label + ' ' + alias);
  const icon = document.createElement('i');
  icon.className = 'bi bi-' + glyph;
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon);
  button.addEventListener('click', callback);
  return button;
}

export function renderLinks(links, query, actions) {
  const matches = links.filter(({ alias, url }) => [alias, url].some(value => value.toLowerCase().includes(query)));
  $('rows').replaceChildren(...matches.map((link, index) => {
    const row = document.createElement('tr');
    row.insertCell().textContent = String(index + 1);
    row.insertCell().textContent = link.alias;
    const short = row.insertCell();
    short.className = 'url-cell';
    short.append(anchor(shortUrl(link.alias)));
    const destination = row.insertCell();
    destination.className = 'url-cell';
    destination.append(anchor(link.url));
    const controls = document.createElement('div');
    controls.className = 'row-actions';
    const open = anchor(shortUrl(link.alias), '');
    open.className = 'btn btn-sm btn-outline-secondary';
    open.title = 'เปิดลิงก์';
    open.setAttribute('aria-label', 'เปิดลิงก์ ' + link.alias);
    const icon = document.createElement('i');
    icon.className = 'bi bi-box-arrow-up-right';
    icon.setAttribute('aria-hidden', 'true');
    open.append(icon);
    controls.append(
      action('คัดลอก', 'clipboard', () => actions.copy(link.alias), link.alias),
      open,
      action('QR Code', 'qr-code', () => actions.qr(link.alias), link.alias),
      action('แก้ไข', 'pencil', () => actions.edit(link), link.alias),
      action('ลบ', 'trash', () => actions.delete(link), link.alias)
    );
    row.insertCell().append(controls);
    return row;
  }));
  $('link-table').hidden = !matches.length;
  $('list-state').hidden = !!matches.length;
  $('list-state').textContent = query ? 'ไม่พบลิงก์ที่ตรงกับคำค้นหา' : 'ยังไม่มีลิงก์ เริ่มจากสร้างลิงก์สั้นด้านบน';
}

export function csvFor(links) {
  const escape = value => {
    // Prevent spreadsheet formula execution when an alias starts with a minus.
    const safe = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [['Alias', 'Short URL', 'Original URL'],
    ...links.map(({ alias, url }) => [alias, shortUrl(alias), url])]
    .map(row => row.map(escape).join(',')).join('\r\n');
}
