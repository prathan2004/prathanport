import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linksFrom } from '../s/netlify/functions/lib/redirects.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '.site-publish');
if (dirname(output) + sep !== resolve(root) + sep || !output.endsWith(sep + '.site-publish')) {
  throw new Error('Unexpected publish directory');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const paths = execFileSync('git', ['ls-files', '-z', '--cached'], { cwd: root, encoding: 'utf8' })
  .split('\0').filter(Boolean);
for (const path of new Set(paths)) {
  if (/^(?:s\/|netlify\/|scripts\/|\.git)/.test(path) || ['_redirects', '_headers'].includes(path) ||
      path.split('/').some(part => /^\.env(?:\.|$)/.test(part))) continue;
  const target = join(output, path);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(root, path), target);
}

const source = join(root, 's', 'public');
const shortlink = join(output, 's');
await mkdir(shortlink);
for (const file of await readdir(source, { withFileTypes: true })) {
  if (file.name.startsWith('_')) continue;
  const target = join(shortlink, file.name);
  if (file.name.endsWith('.html')) {
    const html = await readFile(join(source, file.name), 'utf8');
    await writeFile(target, html.replace(/\b(href|src)="\/(?!\/)/g, '$1="/s/'));
  } else {
    await cp(join(source, file.name), target, { recursive: file.isDirectory() });
  }
}

// Netlify reads redirects only at the published root. Mount the managed 302 rules under /s.
const redirects = linksFrom(await readFile(join(source, '_redirects'), 'utf8'))
  .map(({ alias, url }) => '/s/' + alias + ' ' + url + ' 302');
await writeFile(join(output, '_redirects'), [
  '/s /s/index.html 200',
  ...redirects,
  '/s/* /s/404.html 404',
  ''
].join('\n'));
