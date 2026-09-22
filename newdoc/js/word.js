const DOCX_URL = 'https://esm.sh/docx@9.7.1';
const MM_TO_TWIP = 56.6929;
const twip = mm => Math.round(mm * MM_TO_TWIP);

async function pngBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('โหลดรูปประกอบเอกสารไม่สำเร็จ');
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('แปลงรูปประกอบเอกสารไม่สำเร็จ');
  return new Uint8Array(await blob.arrayBuffer());
}

function inlineRuns(node, TextRun, inherited = {}) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ? [new TextRun({ text: node.textContent, ...inherited })] : [];
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  if (node.tagName === 'BR') return [new TextRun({ break: 1 })];
  const style = {
    ...inherited,
    bold: inherited.bold || ['B', 'STRONG'].includes(node.tagName),
    italics: inherited.italics || ['I', 'EM'].includes(node.tagName),
    underline: inherited.underline || node.tagName === 'U' ? {} : undefined,
  };
  return [...node.childNodes].flatMap(child => inlineRuns(child, TextRun, style));
}

function contentParagraphs(html, api) {
  const { Paragraph, TextRun, AlignmentType } = api;
  if (!window.DOMPurify) throw new Error('โหลดระบบตรวจเนื้อหาไม่สำเร็จ');
  const root = document.createElement('div');
  root.innerHTML = DOMPurify.sanitize(html || '', { ALLOWED_TAGS: ['p', 'div', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'span'], ALLOWED_ATTR: ['style'] });
  const paragraphs = [];
  const alignment = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };
  const add = (node, marker = '', indent = true) => {
    const runs = inlineRuns(node, TextRun);
    if (marker) runs.unshift(new TextRun(marker));
    paragraphs.push(new Paragraph({
      children: runs.length ? runs : [new TextRun('')],
      alignment: alignment[node.style?.textAlign] || AlignmentType.LEFT,
      indent: indent ? { firstLine: twip(25) } : { left: twip(8) },
      spacing: { after: 170, line: 285 },
      widowControl: true,
    }));
  };
  for (const child of root.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE && ['UL', 'OL'].includes(child.tagName)) {
      [...child.children].forEach((item, index) => add(item, child.tagName === 'OL' ? `${index + 1}. ` : '• ', false));
    } else if (child.nodeType === Node.ELEMENT_NODE && ['P', 'DIV'].includes(child.tagName)) {
      add(child);
    } else if (child.textContent?.trim()) {
      add(child);
    }
  }
  return paragraphs.length ? paragraphs : [new Paragraph('')];
}

export async function downloadWord(values) {
  const api = await import(DOCX_URL);
  const { Document, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, Packer, AlignmentType, BorderStyle, WidthType, TabStopType, LeaderType } = api;
  const garuda = await pngBytes(new URL('../assets/images/garuda.png', import.meta.url));
  const signature = values.signatureUrl ? await pngBytes(values.signatureUrl) : null;
  const run = (text, options = {}) => new TextRun({ text, ...options });
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const heading = new Table({
    width: { size: twip(160), type: WidthType.DXA },
    columnWidths: [twip(20), twip(140)],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideVertical: noBorder, insideHorizontal: noBorder },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    rows: [new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ children: [new ImageRun({ data: garuda, type: 'png', transformation: { width: 57, height: 57 } })] })] }),
      new TableCell({ children: [new Paragraph({ children: [run('บันทึกข้อความ', { bold: true, size: 58 })], spacing: { after: 80 } })] }),
    ] })],
  });
  const metadata = (parts, stops = []) => new Paragraph({
    children: parts.flatMap(([label, value]) => [run(label, { bold: true, size: 40 }), run(` ${value || ''}\t`)]),
    tabStops: stops.length ? stops : [{ type: TabStopType.RIGHT, position: twip(160), leader: LeaderType.DOT }],
    spacing: { after: 70 },
  });
  const date = values.date ? new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${values.date}T12:00:00`)) : '';
  const children = [
    heading,
    metadata([['ส่วนราชการ', values.department]]),
    metadata([['ที่', values.number], ['วันที่', date]], [{ type: TabStopType.LEFT, position: twip(78) }, { type: TabStopType.RIGHT, position: twip(160), leader: LeaderType.DOT }]),
    metadata([['เรื่อง', values.subject]]),
    new Paragraph({ children: [run(`เรียน  ${values.recipient || ''}`)], spacing: { before: 120, after: 150 } }),
    ...contentParagraphs(values.content, api),
  ];
  if (signature) children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ data: signature, type: 'png', transformation: { width: 180, height: 68 } })], spacing: { before: 340 } }));
  children.push(
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(`ลงชื่อ  ${signature ? '' : '..............................................'}`)], spacing: { before: signature ? 0 : 340 } }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(`(${values.signer || ''})`)] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(values.position || '')] }),
  );
  const doc = new Document({
    styles: { default: { document: { run: { font: 'TH Sarabun New', size: 32 }, paragraph: { spacing: { line: 285 } } } } },
    sections: [{ properties: { page: { size: { width: twip(210), height: twip(297) }, margin: { top: twip(25), bottom: twip(20), left: twip(30), right: twip(20) } } }, children }],
  });
  const blob = await Packer.toBlob(doc);
  const stamp = (values.date || new Date().toISOString().slice(0, 10)).replaceAll('-', '');
  const fileName = `memo_${stamp}.docx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return fileName;
}
