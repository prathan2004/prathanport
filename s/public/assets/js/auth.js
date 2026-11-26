import { $, api, busy, pageUrl } from './app.js';

const form = $('login-form');
const button = form.querySelector('button');
form.addEventListener('submit', event => {
  event.preventDefault();
  busy(button, async () => {
    $('login-error').hidden = true;
    try {
      await api('login', { method: 'POST', data: Object.fromEntries(new FormData(form)) });
      location.replace(pageUrl('dashboard.html'));
    } catch (error) {
      $('login-error').textContent = error.message;
      $('login-error').hidden = false;
    }
  });
});
