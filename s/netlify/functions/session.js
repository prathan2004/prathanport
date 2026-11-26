import { endpoint, response } from './lib/security.js';

export default endpoint('GET', ({ session }) => response({ username: session.username, csrf: session.csrf }));
