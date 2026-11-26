export { default } from '../../s/netlify/functions/login.js';

export const config = { rateLimit: { windowLimit: 8, windowSize: 60, aggregateBy: 'ip' } };
