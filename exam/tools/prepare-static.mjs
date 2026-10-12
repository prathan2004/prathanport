import { copyFile, cp, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
await rename(path.join(root, 'dist/source.html'), path.join(root, 'dist/index.html'));
await copyFile(path.join(root, 'dist/index.html'), path.join(root, 'index.html'));
for (const folder of ['assets', 'fonts']) {
  await cp(path.join(root, 'dist', folder), path.join(root, folder), { recursive: true });
}
console.log('Ready: upload prathanport with exam/index.html, exam/assets and exam/fonts.');
