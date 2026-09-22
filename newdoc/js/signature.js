import { db, signedFile } from './supabase.js';
import { shell, escapeHtml, toast, busy } from './ui.js';
const user = await shell('ลายเซ็นของฉัน','signature');
if (user) {
  document.querySelector('#page-content').innerHTML = `<div class="panel narrow"><div class="toolbar"><h2>วาดลายเซ็น</h2><div class="row"><button id="clear">ล้าง</button><button id="save-drawn" class="primary">บันทึกลายเซ็น</button></div></div><canvas id="pad" class="signature-canvas"></canvas><p class="muted small">รองรับเมาส์และการสัมผัสหน้าจอ</p><div class="section-head"><h2>อัปโหลดรูปภาพ</h2></div><form id="upload-form" class="row"><input id="signature-file" type="file" accept="image/png,image/jpeg,image/webp" required style="max-width:330px"><button class="primary">อัปโหลด</button></form></div><div class="section-head" style="margin-top:28px"><h2>ลายเซ็นที่บันทึกไว้</h2></div><div id="signature-list" class="signature-list"></div>`;
  const canvas = document.querySelector('#pad'); const ctx = canvas.getContext('2d'); let drawing = false, hasInk = false;
  function size() { const previous = hasInk ? canvas.toDataURL() : null; canvas.width = canvas.clientWidth * devicePixelRatio; canvas.height = canvas.clientHeight * devicePixelRatio; ctx.scale(devicePixelRatio,devicePixelRatio); ctx.strokeStyle='#162c36'; ctx.lineWidth=2.3; ctx.lineCap='round'; ctx.lineJoin='round'; if(previous){ const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,canvas.clientWidth,canvas.clientHeight); img.src=previous; } }
  size(); addEventListener('resize',size);
  function point(e){ const rect=canvas.getBoundingClientRect(); return [e.clientX-rect.left,e.clientY-rect.top]; }
  canvas.onpointerdown=e=>{drawing=true;canvas.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...point(e));};
  canvas.onpointermove=e=>{if(!drawing)return;ctx.lineTo(...point(e));ctx.stroke();hasInk=true;};
  canvas.onpointerup=()=>drawing=false;
  document.querySelector('#clear').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);hasInk=false};
  async function save(file,button){ busy(button,true); let path;
    try {
      if(file.size>5*1024*1024 || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('รองรับรูป PNG, JPG หรือ WEBP ขนาดไม่เกิน 5 MB');
      path=`${user.id}/${crypto.randomUUID()}.${file.type.split('/')[1]==='jpeg'?'jpg':file.type.split('/')[1]}`;
      const upload=await db.storage.from('signatures').upload(path,file,{contentType:file.type}); if(upload.error)throw upload.error;
      const {error}=await db.from('signatures').insert({user_id:user.id,signature_url:path,signature_name:file.name}); if(error)throw error;
      toast('บันทึกลายเซ็นเรียบร้อยแล้ว'); await load();
    } catch(error){if(path)await db.storage.from('signatures').remove([path]);toast(error.message,true)} finally{busy(button,false)}
  }
  document.querySelector('#save-drawn').onclick=()=>{if(!hasInk){toast('กรุณาวาดลายเซ็นก่อน',true);return} canvas.toBlob(blob=>save(new File([blob],`signature-${Date.now()}.png`,{type:'image/png'}),document.querySelector('#save-drawn')),'image/png')};
  document.querySelector('#upload-form').onsubmit=e=>{e.preventDefault();const file=document.querySelector('#signature-file').files[0];if(file)save(file,e.target.querySelector('button'))};
  async function load(){const {data,error}=await db.from('signatures').select('*').order('created_at',{ascending:false}); if(error){toast(error.message,true);return}const list=document.querySelector('#signature-list');list.innerHTML=data?.length?'':'<p class="muted">ยังไม่มีลายเซ็น</p>'; for(const item of data||[]){const node=document.createElement('div');node.className='signature-item';const url=await signedFile('signatures',item.signature_url).catch(()=>null);node.innerHTML=`${url?`<img alt="ลายเซ็น" src="${escapeHtml(url)}">`:''}<p>${escapeHtml(item.signature_name)}</p><button class="danger" aria-label="ลบลายเซ็น">ลบ</button>`;node.querySelector('button').onclick=async()=>{if(!confirm('ลบลายเซ็นนี้หรือไม่?'))return;const {error}=await db.from('signatures').delete().eq('id',item.id);if(error){toast(error.message,true);return}await db.storage.from('signatures').remove([item.signature_url]);toast('ลบลายเซ็นแล้ว');load()};list.append(node)} }
  await load();
}
