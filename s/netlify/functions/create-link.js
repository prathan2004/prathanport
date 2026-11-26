import { endpoint, response } from './lib/security.js';
import { mutate } from './lib/github.js';
import { changeRedirect } from './lib/redirects.js';

export default endpoint('POST', async ({ body }) => response(
  await mutate(text => changeRedirect(text, 'create', body)), { status: 201 }
));
