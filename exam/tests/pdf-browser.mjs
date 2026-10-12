import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1000,height:1400}});
  await page.goto('http://localhost:5173');
  const result=await page.evaluate(async()=>{
    const pdfjs=await import('/node_modules/pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='/node_modules/pdfjs-dist/build/pdf.worker.mjs';
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/node_modules/jsqr/dist/jsQR.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});
    const jsQR=window.jsQR;
    const pdf=await pdfjs.getDocument({url:'/qa/personalized.pdf'}).promise;
    const page=await pdf.getPage(1);const viewport=page.getViewport({scale:1.5});
    document.body.replaceChildren();const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;document.body.append(canvas);
    const ctx=canvas.getContext('2d');await page.render({canvasContext:ctx,viewport}).promise;
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    const qr=jsQR(pixels.data,pixels.width,pixels.height);
    return {qr:qr?.data,text:(await page.getTextContent()).items.map(x=>x.str).join(' ')};
  });
  assert.ok(result.text.replace(/\s/g,'').includes('00123456'));assert.ok(result.text.includes('ทดสอบ'));
  const qr=JSON.parse(result.qr);assert.equal(qr.v,'sec-a4-v1');assert.equal(qr.p,1);assert.ok(qr.s);assert.ok(!result.qr.includes('00123456'));
  await page.locator('canvas').screenshot({path:'qa/pdf-page.png'});
  console.log('PASS: actual PDF renders, Thai text and leading zeros present, QR decodes without student PII');
}finally{await browser.close();}
