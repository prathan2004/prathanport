import { randomInt } from 'node:crypto';
import { AppError, siteOrigin } from './security.js';

const aliasPattern = /^[A-Za-z0-9_-]{1,80}$/;
const reserved = new Set(['admin', 'login', 'logout', 'dashboard', 'assets', 'index', 'api',
  'netlify', 'functions', '404', '_redirects', '_headers', 'favicon', 'robots', 'sitemap']);
const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function aliasAllowed(alias) {
  return aliasPattern.test(alias) && !reserved.has(alias.toLowerCase());
}

export function validateAlias(alias) {
  if (typeof alias !== 'string' || !aliasPattern.test(alias)) {
    throw new AppError(400, 'Alias ต้องมี 1–80 ตัว และใช้ได้เฉพาะ A–Z, 0–9, - และ _');
  }
  if (reserved.has(alias.toLowerCase())) throw new AppError(400, 'Alias นี้เป็นคำสงวน');
  return alias;
}

export function validateUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\p{Cc}\p{Cf}\\]/u.test(value) ||
      !/^https?:\/\//i.test(value)) throw new AppError(400, 'กรุณากรอก URL แบบ HTTP หรือ HTTPS ที่ไม่มีช่องว่าง');
  let url;
  try { url = new URL(value); }
  catch { throw new AppError(400, 'URL ไม่ถูกต้อง'); }
  if (url.username || url.password) throw new AppError(400, 'URL ต้องไม่มีข้อมูลสำหรับเข้าสู่ระบบ');
  // Reject direct redirects to this site and its Netlify production hostname.
  const hostnames = [siteOrigin(), process.env.URL].filter(Boolean).map(origin => new URL(origin).hostname);
  if (hostnames.includes(url.hostname.replace(/\.$/, ''))) {
    throw new AppError(400, 'URL ปลายทางต้องอยู่นอกเว็บไซต์นี้เพื่อป้องกัน Redirect Loop');
  }
  if (url.href.length > 2048) throw new AppError(400, 'URL มีความยาวเกิน 2048 ตัวอักษร');
  return url.href;
}

function split(text) {
  // Retain each original line ending, any BOM and whitespace on unrelated lines.
  return text.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/g) || [];
}

function managed(line) {
  const match = /^(\uFEFF?[ \t]*\/([\w-]+)[ \t]+)(\S+)([ \t]+302[ \t]*(?:#[^\r\n]*)?)(\r\n|\r|\n)?$/.exec(line);
  if (!match || !aliasAllowed(match[2]) || !/^https?:\/\//i.test(match[3])) return null;
  try {
    const target = new URL(match[3]);
    if (target.username || target.password) return null;
  } catch { return null; }
  return match;
}

export function linksFrom(text) {
  return split(text).flatMap(line => {
    const match = managed(line);
    return match ? [{ alias: match[2], url: match[3] }] : [];
  });
}

export function changeRedirect(text, operation, body) {
  const lines = split(text);
  const url = operation === 'delete' ? undefined : validateUrl(body.url);
  const occupied = new Set(lines.flatMap(line => {
    const rule = /^\uFEFF?[ \t]*\/([^\s?#]*)(?=[\s?#])/.exec(line);
    if (!rule) return [];
    try { return [decodeURIComponent(rule[1]).replace(/\/$/, '').toLowerCase()]; }
    catch { return [rule[1].toLowerCase()]; }
  }));

  let alias = body.alias;
  if (operation === 'create' && (alias === undefined || alias === '')) {
    do { alias = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); }
    while (occupied.has(alias.toLowerCase()));
  }
  validateAlias(alias);
  if (operation === 'create') {
    if (occupied.has(alias.toLowerCase())) throw new AppError(409, 'Alias นี้ถูกใช้งานแล้ว');
    const eol = text.match(/\r\n|\n|\r/)?.[0] || '\n';
    const separator = text && !/[\r\n]$/.test(text) && text !== '\uFEFF' ? eol : '';
    return { text: text + separator + '/' + alias + ' ' + url + ' 302' + eol,
      message: 'Add short link: ' + alias, link: { alias, url } };
  }
  const matches = lines.map(managed);
  const matching = matches.flatMap((match, index) => match?.[2].toLowerCase() === alias.toLowerCase() ? [index] : []);
  if (matching.length > 1) throw new AppError(409, 'พบ Alias ซ้ำในไฟล์ กรุณาแก้ไขผ่าน GitHub');
  const index = matching[0];
  const match = matches[index];
  if (!match || match[2] !== alias) throw new AppError(404, 'ไม่พบลิงก์ที่ต้องการ');
  if (match[3] !== body.expectedUrl) throw new AppError(409, 'URL ถูกแก้ไขแล้ว กรุณาโหลดรายการล่าสุด');
  const bom = lines[index].startsWith('\uFEFF') ? '\uFEFF' : '';
  lines[index] = operation === 'delete' ? bom : match[1] + url + match[4] + (match[5] || '');
  return { text: lines.join(''), message: (operation === 'delete' ? 'Delete' : 'Update') +
    ' short link: ' + alias, link: { alias, url } };
}
