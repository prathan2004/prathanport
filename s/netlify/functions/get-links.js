import { endpoint, response } from './lib/security.js';
import { readFile } from './lib/github.js';
import { linksFrom } from './lib/redirects.js';

export default endpoint('GET', async ({ request }) => {
  const { text, history } = await readFile();
  if (new URL(request.url).searchParams.get('download') === '1') {
    return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="_redirects"', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff' } });
  }
  return response({ links: linksFrom(text), history });
});
