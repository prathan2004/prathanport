import { $, download } from './app.js';
import { shortUrl } from './links.js';

export function showQr(alias) {
  const url = shortUrl(alias);
  const target = $('qr-code');
  target.replaceChildren();
  if (!window.QRCode) throw new Error('โหลดเครื่องมือสร้าง QR Code ไม่สำเร็จ');
  new window.QRCode(target, { text: url, width: 240, height: 240,
    colorDark: '#000000', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
  $('qr-url').textContent = url;
  $('qr-download').onclick = () => {
    const source = target.querySelector('canvas');
    if (!source) return;
    // Keep the white quiet zone in the exported image.
    const canvas = document.createElement('canvas');
    const margin = 36;
    canvas.width = source.width + margin * 2;
    canvas.height = source.height + margin * 2;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, margin, margin);
    canvas.toBlob(blob => { if (blob) download(blob, alias + '-qr.png'); }, 'image/png');
  };
  window.bootstrap.Modal.getOrCreateInstance($('qr-modal')).show();
}
