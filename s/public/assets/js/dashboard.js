import { $, api, busy, download, pageUrl, setTheme } from './app.js';
import { copyLink, csvFor, renderLinks, shortUrl, validateForm } from './links.js';
import { showQr } from './qrcode.js';

let session;
let links = [];
let selected;
let created;
let changedCommit;
let checked = new Map();
let checkController;
let checkTimer;
let pollUntil = 0;
let loadSequence = 0;

const deployLabels = {
  ready: 'สำเร็จ', error: 'ไม่สำเร็จ', building: 'กำลัง Build', enqueued: 'รอคิว',
  new: 'รอเริ่ม', uploading: 'กำลังอัปโหลด', processing: 'กำลังประมวลผล',
  preparing: 'กำลังเตรียม', retrying: 'กำลังลองใหม่', rejected: 'ถูกปฏิเสธ',
  pending_review: 'รอตรวจสอบ'
};

const submit = id => document.querySelector('[form="' + id + '"]') || $(id).querySelector('button[type="submit"]');
const modal = id => window.bootstrap.Modal.getOrCreateInstance($(id));

function notify(text) {
  $('toast-text').textContent = text;
  if (window.bootstrap) window.bootstrap.Toast.getOrCreateInstance($('toast')).show();
  else {
    $('load-error').textContent = text;
    $('load-error').hidden = false;
  }
}

function handle(error) {
  if (error.status === 401) location.replace(pageUrl('login.html'));
  else notify(error.message);
}

async function request(name, options) {
  return api(name, { ...options, csrf: session.csrf });
}

async function copy(alias) {
  try {
    await copyLink(alias);
    notify('คัดลอกลิงก์แล้ว');
  } catch (error) { handle(error); }
}

const actions = {
  copy,
  qr(alias) {
    try { showQr(alias); } catch (error) { handle(error); }
  },
  edit(link) {
    selected = link;
    $('edit-alias').textContent = '/' + link.alias;
    $('edit-url').value = link.url;
    $('edit-url').setCustomValidity('');
    modal('edit-modal').show();
  },
  delete(link) {
    selected = link;
    $('delete-message').textContent = 'ต้องการลบ /' + link.alias + ' หรือไม่? การเปลี่ยนแปลงจะมีผลหลัง Deploy';
    modal('delete-modal').show();
  }
};

function render() {
  renderLinks(links, $('search').value.trim().toLowerCase(), actions);
}

function paintStatus(deploy) {
  const states = links.map(link => checked.get(link.alias)?.url === link.url ?
    checked.get(link.alias).ready : null);
  const ready = states.filter(value => value === true).length;
  const unknown = states.some(value => value == null);
  $('ready').textContent = unknown ? (ready ? ready + ' (ตรวจได้บางส่วน)' : 'ตรวจสอบไม่ได้') : String(ready);
  $('deploy').textContent = deploy?.state ? (deployLabels[deploy.state] || deploy.state) : 'ตรวจสอบไม่ได้';
  $('deploy').title = deploy?.message || '';
  if (created) {
    const check = checked.get(created.alias);
    const state = check?.url === created.url ? check.ready : null;
    $('created-state').textContent = state === true ? 'พร้อมใช้งานแล้ว' :
      deploy?.state === 'error' && deploy.commit === created.commit ? 'Deploy ไม่สำเร็จ' :
      state === false ? 'ยังไม่พบ Redirect ที่ตรงกันบนเว็บไซต์' : 'ตรวจสอบ Redirect ไม่ได้';
  }
}

async function checkStatus() {
  checkController?.abort();
  clearTimeout(checkTimer);
  const controller = new AbortController();
  checkController = controller;
  const results = new Map();
  let offset = 0;
  let sha;
  let deploy;
  try {
    do {
      const page = await request('deploy-status?offset=' + offset, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (sha && sha !== page.sha) throw new Error('มีการแก้ไขรายการระหว่างตรวจสอบ กรุณารีเฟรช');
      sha = page.sha;
      deploy ||= page.deploy;
      for (const check of page.checks) results.set(check.alias, check);
      offset = page.next;
    } while (offset !== null);
    checked = results;
    paintStatus(deploy);
  } catch (error) {
    if (controller.signal.aborted) return;
    checked = results;
    paintStatus(deploy);
    handle(error);
  }
  const expected = changedCommit?.link;
  const observed = expected && checked.get(expected.alias);
  const matched = expected && (expected.url ? observed?.url === expected.url && observed.ready :
    deploy?.state === 'ready' && deploy.commit === changedCommit.commit);
  const failed = deploy?.state === 'error' && deploy.commit === changedCommit?.commit;
  if (!matched && !failed && Date.now() < pollUntil) {
    if (created && checked.get(created.alias)?.ready === false) $('created-state').textContent = 'รอ Deploy และตรวจสอบ Redirect';
    checkTimer = setTimeout(checkStatus, 12000);
  }
}

async function load() {
  const sequence = ++loadSequence;
  clearTimeout(checkTimer);
  checkController?.abort();
  $('load-error').hidden = true;
  $('ready').textContent = 'กำลังตรวจสอบ';
  if (!$('rows').childElementCount) $('list-state').textContent = 'กำลังโหลดรายการ…';
  try {
    const result = await request('get-links');
    if (sequence !== loadSequence) return;
    links = result.links;
    $('total').textContent = String(links.length);
    $('github').textContent = 'เชื่อมต่อแล้ว';
    $('history').href = result.history;
    $('history').hidden = $('download').disabled = $('csv').disabled = false;
    render();
    void checkStatus();
  } catch (error) {
    if (sequence !== loadSequence) return;
    if (error.status === 401) return handle(error);
    $('github').textContent = 'เชื่อมต่อไม่ได้';
    $('ready').textContent = 'ตรวจสอบไม่ได้';
    $('load-error').textContent = error.message;
    $('load-error').hidden = false;
    $('list-state').textContent = 'โหลดรายการไม่สำเร็จ';
  }
}

async function save(name, method, data, onSuccess) {
  try {
    const result = await request(name, { method, data });
    changedCommit = { commit: result.commit, link: result };
    pollUntil = Date.now() + 180000;
    onSuccess(result);
    await load();
  } catch (error) { handle(error); }
}

function setup() {
  for (const id of ['new-url', 'edit-url']) {
    $(id).addEventListener('input', event => event.target.setCustomValidity(''));
  }

  $('create-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm(event.target)) return;
    busy(submit('create-form'), () => save('create-link', 'POST', Object.fromEntries(new FormData(event.target)), result => {
      created = result;
      const url = shortUrl(result.alias);
      $('created-link').href = $('created-open').href = url;
      $('created-link').textContent = url;
      $('created-state').textContent = 'กำลังตรวจสอบ Redirect';
      $('created').hidden = false;
      event.target.reset();
      notify('บันทึกลิงก์ใน GitHub แล้ว');
    }));
  });

  $('edit-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!validateForm(event.target)) return;
    const { alias, url: expectedUrl } = selected;
    busy(submit('edit-form'), () => save('update-link', 'PATCH', { alias, expectedUrl, url: $('edit-url').value }, result => {
      modal('edit-modal').hide();
      if (created?.alias === alias) created = result;
      notify('บันทึก URL ปลายทางแล้ว กำลังตรวจสอบ Redirect');
    }));
  });

  $('delete-confirm').addEventListener('click', () => {
    const { alias, url: expectedUrl } = selected;
    busy($('delete-confirm'), () => save('delete-link', 'DELETE', { alias, expectedUrl }, () => {
      modal('delete-modal').hide();
      if (created?.alias === alias) {
        created = null;
        $('created').hidden = true;
      }
      notify('ลบลิงก์จาก GitHub แล้ว การเปลี่ยนแปลงจะมีผลหลัง Deploy');
    }));
  });

  $('created-copy').onclick = () => copy(created.alias);
  $('refresh').onclick = () => busy($('refresh'), load);
  $('search').oninput = render;
  $('theme').checked = document.documentElement.dataset.bsTheme === 'dark';
  $('theme').onchange = event => setTheme(event.target.checked ? 'dark' : 'light');
  $('csv').onclick = () => download(new Blob([csvFor(links)], { type: 'text/csv;charset=utf-8' }), 'shortlinks.csv');
  $('download').onclick = () => busy($('download'), async () => {
    try {
      const result = await request('get-links?download=1', { raw: true });
      download(await result.blob(), '_redirects');
    } catch (error) { handle(error); }
  });
  $('logout').onclick = () => busy($('logout'), async () => {
    try {
      await request('logout', { method: 'POST', data: {} });
      location.replace(pageUrl('login.html'));
    } catch (error) { handle(error); }
  });

  const nav = [...document.querySelectorAll('.side-link[href]')];
  function selectSection() {
    const active = nav.find(link => link.hash === location.hash) || nav[0];
    for (const link of nav) {
      if (link === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  nav.forEach(link => link.addEventListener('click', () => window.bootstrap?.Offcanvas.getInstance($('sidebar'))?.hide()));
  window.addEventListener('hashchange', selectSection);
  selectSection();
}

async function start() {
  try {
    session = await api('session');
    $('account').textContent = session.username;
    $('main').hidden = false;
    $('boot').hidden = true;
    setup();
    await busy($('refresh'), load);
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (error) {
    if (error.status === 401) return handle(error);
    $('boot').textContent = error.message;
    const retry = document.createElement('button');
    retry.textContent = 'ลองใหม่';
    retry.className = 'btn btn-outline-secondary ms-2';
    retry.onclick = () => location.reload();
    $('boot').append(retry);
  }
}

void start();
