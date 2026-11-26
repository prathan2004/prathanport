import { endpoint, response } from './lib/security.js';
import { mutate } from './lib/github.js';
import { changeRedirect } from './lib/redirects.js';

export default endpoint('PATCH', async ({ body }) => response(
  await mutate(text => changeRedirect(text, 'update', body)), { status: 200 }
));
