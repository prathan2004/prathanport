import { db, signedFile } from './supabase.js';
import { shell, escapeHtml, toast, busy, formatDate } from './ui.js';

const user = await shell('เซ็นและเกษียณ PDF', 'pdf-workflow');
if (user) {
  const root = document.querySelector('#page-content');
  root.innerHTML = `<div class="pdf-workspace"><section class="pdf-tools panel">
    <label class="span-all">อัปโหลดหนังสือ PDF<input id="pdf-file" type="file" accept="application/pdf,.pdf"></label>
    <button id="upload" class="primary span-all" type="button">อัปโหลด PDF</button>
    <label class="span-all">ลายเซ็น<select id="signature"><option value="">เลือกลายเซ็น</option></select></label>
    <label>ความกว้างลายเซ็น (มม.)<input id="sign-width" type="number" min="15" max="80" value="40"></label>
    <button id="add-sign" type="button">วางลายเซ็น</button>
    <label class="span-all">ข้อความเกษียณ<textarea id="endorsement" rows="5" placeholder="เรียน ...\nเพื่อโปรดพิจารณา"></textarea></label>
    <label>ขนาดตัวอักษร (pt)<input id="font-size" type="number" min="10" max="30" value="16"></label>
    <button id="add-note" type="button">วางข้อความ</button>
    <p class="pdf-hint span-all">ลากรายการบนหน้ากระดาษเพื่อปรับตำแหน่ง แล้วเลือกคำสั่งส่งออก PDF</p>
    <div class="pdf-action-bar span-all"><button id="remove-mark" type="button" disabled>ลบรายการที่เลือก</button><button id="export" class="primary" type="button" disabled>ส่งออก PDF</button></div>
  </section><section class="pdf-stage"><div class="pdf-stage-head"><strong id="current-name">ยังไม่ได้เปิดไฟล์</strong><div class="row"><button id="previous" type="button" aria-label="หน้าก่อน" disabled>‹</button><span id="page-count">0 / 0</span><button id="next" type="button" aria-label="หน้าถัดไป" disabled>›</button></div></div><div class="pdf-scroll"><div id="pdf-page" class="pdf-page" hidden><canvas id="pdf-canvas"></canvas><div id="mark-layer"></div></div></div></section></div>
  <section class="pdf-list"><div class="section-head"><h2>ไฟล์ที่อัปโหลด</h2></div><div class="table-wrap"><table><thead><tr><th>ชื่อไฟล์</th><th>วันที่</th><th>สถานะ</th><th>การจัดการ</th></tr></thead><tbody id="pdf-rows"></tbody></table></div></section>`;
  const $ = id => document.getElementById(id);
  let records = [], signatures = [], active = null, sourceBytes = null, pdf = null, pdfjs = null, pageNumber = 1, marks = [], selected = null, renderToken = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const niceError = error => error?.message || 'ทำรายการไม่สำเร็จ';

  async function loadList() {
    const { data, error } = await db.from('pdf_workflows').select('*').order('created_at', { ascending: false });
    if (error) { toast(error.code === '42P01' || error.code === 'PGRST205' ? 'กรุณารัน SQL 20260922_pdf_workflows.sql ก่อนใช้งาน' : niceError(error), true); return; }
    records = data || [];
    $('pdf-rows').innerHTML = records.map(item => `<tr><td>${escapeHtml(item.file_name)}</td><td>${formatDate(item.created_at)}</td><td>${item.output_path ? 'ส่งออกแล้ว' : 'รอดำเนินการ'}</td><td><div class="actions"><button type="button" data-action="open" data-id="${item.id}">เปิด</button>${item.output_path ? `<button type="button" data-action="download" data-id="${item.id}">ดาวน์โหลด</button>` : ''}<button type="button" class="danger" data-action="delete" data-id="${item.id}">ลบ</button></div></td></tr>`).join('') || '<tr><td colspan="4" class="empty">ยังไม่มีไฟล์ PDF</td></tr>';
  }
  async function loadSignatures() {
    const { data, error } = await db.from('signatures').select('id,signature_name,signature_url').order('created_at', { ascending: false });
    if (error) { toast(niceError(error), true); return; }
    signatures = data || [];
    $('signature').innerHTML = '<option value="">เลือกลายเซ็น</option>' + signatures.map(item => `<option value="${item.id}">${escapeHtml(item.signature_name)}</option>`).join('');
  }
  async function getPdfJs() {
    if (!pdfjs) {
      pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
    }
    return pdfjs;
  }
  async function openRecord(item) {
    const url = await signedFile('documents', item.source_path);
    const response = await fetch(url);
    if (!response.ok) throw new Error('เปิดไฟล์ PDF ไม่สำเร็จ');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const lib = await getPdfJs();
    const loaded = await lib.getDocument({ data: bytes.slice() }).promise;
    if (pdf) await pdf.destroy();
    active = item; sourceBytes = bytes; pdf = loaded; pageNumber = 1; marks = []; selected = null;
    $('current-name').textContent = item.file_name;
    $('export').disabled = false;
    renderPage();
  }
  async function renderPage() {
    if (!pdf) return;
    const token = ++renderToken;
    const page = await pdf.getPage(pageNumber);
    const unscaled = page.getViewport({ scale: 1 });
    const available = Math.max(260, $('pdf-page').parentElement.clientWidth - 32);
    const viewport = page.getViewport({ scale: Math.min(1.5, available / unscaled.width) });
    const canvas = $('pdf-canvas');
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    $('pdf-page').style.width = `${canvas.width}px`;
    $('pdf-page').style.height = `${canvas.height}px`;
    $('pdf-page').hidden = false;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (token !== renderToken) return;
    $('page-count').textContent = `${pageNumber} / ${pdf.numPages}`;
    $('previous').disabled = pageNumber <= 1;
    $('next').disabled = pageNumber >= pdf.numPages;
    renderMarks();
  }
  function renderMarks() {
    const layer = $('mark-layer'); layer.replaceChildren();
    for (const mark of marks.filter(item => item.page === pageNumber)) {
      const node = document.createElement('div');
      node.className = `pdf-mark ${mark.type === 'signature' ? 'signature' : ''} ${selected === mark ? 'selected' : ''}`;
      node.style.left = `${mark.x * 100}%`; node.style.top = `${mark.y * 100}%`;
      node.style.width = `${mark.width * 100}%`;
      if (mark.type === 'signature') {
        node.style.height = `${mark.height * 100}%`;
        const image = document.createElement('img'); image.src = mark.url; image.alt = 'ลายเซ็น'; node.append(image);
      } else {
        node.style.fontSize = `${mark.size * $('pdf-canvas').width / mark.pageWidth}px`;
        node.textContent = mark.text;
      }
      node.onpointerdown = event => {
        event.preventDefault(); selected = mark; $('remove-mark').disabled = false; renderMarks();
        const originX = event.clientX, originY = event.clientY, x = mark.x, y = mark.y;
        const move = moveEvent => {
          mark.x = clamp(x + (moveEvent.clientX - originX) / $('pdf-canvas').clientWidth, 0, 1 - mark.width);
          mark.y = clamp(y + (moveEvent.clientY - originY) / $('pdf-canvas').clientHeight, 0, 1 - (mark.height || 0.03));
          renderMarks();
        };
        const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop, { once: true });
      };
      layer.append(node);
    }
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  $('upload').onclick = async () => {
    const file = $('pdf-file').files[0], button = $('upload');
    if (!file || (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) || file.size > 20 * 1024 * 1024) { toast('เลือก PDF ขนาดไม่เกิน 20 MB', true); return; }
    busy(button, true);
    let path;
    try {
      const magic = new TextDecoder().decode((await file.slice(0, 5).arrayBuffer()));
      if (magic !== '%PDF-') throw new Error('ไฟล์นี้ไม่ใช่ PDF');
      path = `${user.id}/incoming/${crypto.randomUUID()}.pdf`;
      const uploaded = await db.storage.from('documents').upload(path, file, { contentType: 'application/pdf' });
      if (uploaded.error) throw uploaded.error;
      const { data, error } = await db.from('pdf_workflows').insert({ user_id: user.id, file_name: file.name, source_path: path }).select('*').single();
      if (error) throw error;
      path = null;
      await loadList(); await openRecord(data); toast('อัปโหลด PDF แล้ว');
    } catch (error) { if (path) await db.storage.from('documents').remove([path]); toast(niceError(error), true); }
    finally { busy(button, false); }
  };
  $('previous').onclick = () => { if (pageNumber > 1) { pageNumber--; selected = null; renderPage(); } };
  $('next').onclick = () => { if (pdf && pageNumber < pdf.numPages) { pageNumber++; selected = null; renderPage(); } };
  $('add-sign').onclick = async () => {
    if (!pdf) { toast('กรุณาเปิดไฟล์ PDF ก่อน', true); return; }
    const signature = signatures.find(item => item.id === $('signature').value);
    if (!signature) { toast('กรุณาเลือกลายเซ็น', true); return; }
    try {
      const url = await signedFile('signatures', signature.signature_url);
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      const page = await pdf.getPage(pageNumber), view = page.getViewport({ scale: 1 });
      const requestedWidth = clamp(Number($('sign-width').value) || 40, 15, 80) * 72 / 25.4 / view.width;
      const width = Math.min(requestedWidth, 0.14 * view.height * bitmap.width / bitmap.height / view.width);
      const height = width * bitmap.height / bitmap.width * view.width / view.height;
      bitmap.close();
      selected = { type: 'signature', page: pageNumber, x: 0.58, y: 0.72, width, height, url, path: signature.signature_url };
      marks.push(selected); $('remove-mark').disabled = false; renderMarks();
    } catch (error) { toast(niceError(error), true); }
  };
  $('add-note').onclick = async () => {
    if (!pdf) { toast('กรุณาเปิดไฟล์ PDF ก่อน', true); return; }
    const value = $('endorsement').value.trim();
    if (!value) { toast('กรุณากรอกข้อความเกษียณ', true); return; }
    const page = await pdf.getPage(pageNumber), view = page.getViewport({ scale: 1 });
    selected = { type: 'note', page: pageNumber, x: 0.08, y: 0.68, width: 0.78, size: clamp(Number($('font-size').value) || 16, 10, 30), pageWidth: view.width, text: value };
    marks.push(selected); $('remove-mark').disabled = false; renderMarks();
  };
  $('remove-mark').onclick = () => { marks = marks.filter(item => item !== selected); selected = null; $('remove-mark').disabled = true; renderMarks(); };
  $('export').onclick = async () => {
    if (!active || !sourceBytes) return;
    const button = $('export'); busy(button, true);
    try {
      const [{ PDFDocument, rgb }, fontkit] = await Promise.all([import('https://esm.sh/pdf-lib@1.17.1'), import('https://esm.sh/@pdf-lib/fontkit@1.1.1')]);
      const output = await PDFDocument.load(sourceBytes.slice());
      output.registerFontkit(fontkit.default || fontkit);
      const fontBytes = await (await fetch(new URL('../assets/fonts/THSarabunNew.ttf', import.meta.url))).arrayBuffer();
      const font = await output.embedFont(fontBytes, { subset: true });
      const imageCache = new Map();
      for (const mark of marks) {
        const page = output.getPage(mark.page - 1), { width, height } = page.getSize();
        if (mark.type === 'signature') {
          if (!imageCache.has(mark.path)) {
            const bitmap = await createImageBitmap(await (await fetch(await signedFile('signatures', mark.path))).blob());
            const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
            canvas.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
            imageCache.set(mark.path, await output.embedPng(await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer()));
          }
          page.drawImage(imageCache.get(mark.path), { x: mark.x * width, y: height - (mark.y + mark.height) * height, width: mark.width * width, height: mark.height * height });
        } else {
          const lines = [];
          const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
          for (const paragraph of mark.text.split('\n')) {
            let line = '';
            for (const { segment } of segmenter.segment(paragraph)) {
              if (line && font.widthOfTextAtSize(line + segment, mark.size) > mark.width * width) { lines.push(line); line = segment.trimStart(); }
              else line += segment;
            }
            lines.push(line);
          }
          lines.forEach((line, index) => page.drawText(line || ' ', { x: mark.x * width, y: height - mark.y * height - mark.size * (index + 1) * 1.2, size: mark.size, font, color: rgb(0.08, 0.14, 0.17) }));
        }
      }
      const bytes = await output.save(), blob = new Blob([bytes], { type: 'application/pdf' });
      const path = `${user.id}/incoming/${active.id}-signed.pdf`;
      const { error: uploadError } = await db.storage.from('documents').upload(path, blob, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;
      const { error: updateError } = await db.from('pdf_workflows').update({ output_path: path, updated_at: new Date().toISOString() }).eq('id', active.id);
      if (updateError) throw updateError;
      active.output_path = path;
      download(blob, active.file_name.replace(/\.pdf$/i, '') + '-signed.pdf');
      await loadList(); toast('สร้างและดาวน์โหลด PDF แล้ว');
    } catch (error) { toast(niceError(error), true); }
    finally { busy(button, false); }
  };
  $('pdf-rows').onclick = async event => {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const item = records.find(record => record.id === button.dataset.id); if (!item) return;
    busy(button, true);
    try {
      if (button.dataset.action === 'open') await openRecord(item);
      if (button.dataset.action === 'download') {
        const response = await fetch(await signedFile('documents', item.output_path));
        if (!response.ok) throw new Error('ดาวน์โหลดไฟล์ไม่สำเร็จ');
        download(await response.blob(), item.file_name.replace(/\.pdf$/i, '') + '-signed.pdf');
      }
      if (button.dataset.action === 'delete') {
        if (!confirm(`ลบ ${item.file_name} และไฟล์ที่ส่งออกหรือไม่?`)) return;
        const { error } = await db.from('pdf_workflows').delete().eq('id', item.id); if (error) throw error;
        await db.storage.from('documents').remove([item.source_path, item.output_path].filter(Boolean));
        if (active?.id === item.id) { active = null; sourceBytes = null; pdf = null; marks = []; $('pdf-page').hidden = true; $('current-name').textContent = 'ยังไม่ได้เปิดไฟล์'; $('export').disabled = true; }
        await loadList(); toast('ลบไฟล์แล้ว');
      }
    } catch (error) { toast(niceError(error), true); }
    finally { busy(button, false); }
  };
  await Promise.all([loadList(), loadSignatures()]);
  addEventListener('resize', () => { if (pdf) renderPage(); });
}
