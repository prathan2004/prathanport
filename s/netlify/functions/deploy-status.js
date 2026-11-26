import { AppError, endpoint, response, siteOrigin } from './lib/security.js';
import { readFile } from './lib/github.js';
import { linksFrom } from './lib/redirects.js';

async function probe(origin, { alias, url }) {
  try {
    // Only contact the configured site. Never follow a user-supplied destination.
    const result = await fetch(new URL('/' + alias, origin), {
      method: 'HEAD', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(3000)
    });
    const location = result.headers.get('location');
    if (result.status === 302 && location && new URL(location, origin).href === new URL(url).href) return true;
    return result.status >= 500 ? null : false;
  } catch { return null; }
}

async function latestDeploy() {
  const { NETLIFY_SITE_ID: id, NETLIFY_API_TOKEN: token } = process.env;
  if (!id || !token) return { state: null, message: 'ยังไม่ได้ตั้งค่า Netlify API' };
  try {
    const result = await fetch('https://api.netlify.com/api/v1/sites/' + encodeURIComponent(id) +
      '/deploys?production=true&per_page=1', { redirect: 'error', signal: AbortSignal.timeout(4000),
      headers: { Authorization: 'Bearer ' + token } });
    if (!result.ok) return { state: null, message: 'ตรวจสอบสถานะ Netlify API ไม่สำเร็จ' };
    const [deploy] = await result.json();
    return { state: deploy?.state ?? null, commit: deploy?.commit_ref ?? null };
  } catch { return { state: null, message: 'เชื่อมต่อ Netlify API ไม่สำเร็จ' }; }
}

export default endpoint('GET', async ({ request }) => {
  const offset = Number(new URL(request.url).searchParams.get('offset') || 0);
  if (!Number.isSafeInteger(offset) || offset < 0) throw new AppError(400, 'ตำแหน่งรายการไม่ถูกต้อง');
  const origin = siteOrigin();
  const [file, deploy] = await Promise.all([readFile(), offset === 0 ? latestDeploy() : null]);
  const links = linksFrom(file.text);
  const page = links.slice(offset, offset + 25);
  const checks = await Promise.all(page.map(async link => ({ ...link, ready: await probe(origin, link) })));
  return response({ checks, sha: file.sha, deploy, next: offset + page.length < links.length ? offset + page.length : null });
});
