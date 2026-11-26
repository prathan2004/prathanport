import { readFileSync } from 'node:fs';
import { hashPassword } from '../netlify/functions/lib/security.js';

const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '');
if (password.length < 12 || Buffer.byteLength(password) > 1024) {
  console.error('รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษรและไม่เกิน 1024 ไบต์');
  process.exitCode = 1;
} else {
  console.log(await hashPassword(password));
}
