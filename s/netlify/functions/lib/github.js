import { AppError } from './security.js';

function settings() {
  const { GITHUB_OWNER: owner, GITHUB_REPO: repo, GITHUB_TOKEN: token,
    GITHUB_BRANCH: branch = 'main', GITHUB_FILE_PATH: path = 's/public/_redirects' } = process.env;
  if (!owner || !repo || !token || !branch || !path || path.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new AppError(503, 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ GitHub');
  }
  const repository = [owner, repo].map(encodeURIComponent).join('/');
  return { token, branch, path, api: 'https://api.github.com/repos/' + repository +
    '/contents/' + path.split('/').map(encodeURIComponent).join('/'),
    history: 'https://github.com/' + repository + '/commits/' + encodeURIComponent(branch) + '/' +
      path.split('/').map(encodeURIComponent).join('/') };
}

async function send(url, config, options = {}) {
  let result;
  try {
    result = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(7000), headers: {
      Authorization: 'Bearer ' + config.token, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'
    } });
  } catch { throw new AppError(502, 'เชื่อมต่อ GitHub ไม่สำเร็จ'); }
  if (result.ok) return result.json();
  if (result.status === 429 || (result.status === 403 &&
      (result.headers.get('x-ratelimit-remaining') === '0' || result.headers.has('retry-after')))) {
    throw new AppError(429, 'GitHub จำกัดจำนวนคำขอ กรุณารอสักครู่');
  }
  if (result.status === 401) throw new AppError(502, 'GitHub Token ไม่ถูกต้องหรือหมดอายุ');
  if (result.status === 403) throw new AppError(502, 'GitHub ไม่อนุญาต กรุณาตรวจสอบสิทธิ์ Contents');
  if (result.status === 404) throw new AppError(502, 'ไม่พบไฟล์ _redirects หรือ GitHub Token ไม่มีสิทธิ์เข้าถึง');
  if (result.status === 409 || (result.status === 422 &&
      /sha.*(?:match|expected)|conflict/i.test(await result.text()))) {
    throw new AppError(409, 'ไฟล์ถูกแก้ไขพร้อมกัน กรุณาลองใหม่');
  }
  throw new AppError(502, 'GitHub ไม่สามารถประมวลผลคำขอได้ กรุณาตรวจสอบการตั้งค่าและสิทธิ์ของสาขา');
}

export async function readFile() {
  const config = settings();
  const result = await send(config.api + '?ref=' + encodeURIComponent(config.branch), config);
  if (result.type !== 'file' || result.encoding !== 'base64' ||
      typeof result.content !== 'string' || !result.sha) {
    throw new AppError(502, 'GitHub ไม่สามารถอ่านไฟล์ _redirects ในรูปแบบที่รองรับ');
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.from(result.content, 'base64'));
  } catch { throw new AppError(502, 'ไฟล์ _redirects ต้องเข้ารหัสเป็น UTF-8'); }
  return { text, sha: result.sha, history: config.history };
}

export async function mutate(transform) {
  const config = settings();
  // A retry reads the latest blob and reapplies only the requested change.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { text, sha } = await readFile();
    const change = transform(text);
    try {
      const result = await send(config.api, config, { method: 'PUT', body: JSON.stringify({
        branch: config.branch, sha, message: change.message,
        content: Buffer.from(change.text).toString('base64')
      }) });
      return { ...change.link, commit: result.commit.sha };
    } catch (error) {
      if (error.status !== 409 || attempt === 2) throw error;
    }
  }
}
