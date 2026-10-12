export const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
export const btn = (label,action,name='plus',attrs='') => `<button type="button" data-action="${action}" ${attrs}>${icon(name)}${label}</button>`;
export function icons() {window.lucide?.createIcons();}
export function toast(message,error=false) {const el=document.querySelector('#toast');el.textContent=message;el.className=error?'error':'';el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,error?10000:5000);}
export function download(data,name,type='application/json') {const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);}
export function pickFile(accept,callback) {const input=document.createElement('input');input.type='file';input.accept=accept;input.onchange=()=>{if(input.files[0])Promise.resolve(callback(input.files[0])).catch(e=>toast(e.message,true));};input.click();}
const scripts=new Map();
export function loadScript(file) {
  if(!scripts.has(file)) scripts.set(file,new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL(`../assets/vendor/${file}`,import.meta.url).href;
    script.onload=resolve;script.onerror=()=>{scripts.delete(file);script.remove();reject(new Error(`โหลด ${file} ไม่สำเร็จ กรุณาตรวจไฟล์ assets/vendor`));};document.head.append(script);
  }));
  return scripts.get(file);
}
export function field(label,name,value='',type='text',attrs='') {return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs} required></label>`;}
export function select(label,name,options,value) {return `<label><span>${label}</span><select name="${name}" aria-label="${esc(label)}" required>${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
export function table(headers,rows) {return rows.length?`<div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty">${icon('folder-open')}<h3>ยังไม่มีรายการ</h3></div>`;}
export const format = value => Number(value).toLocaleString('th-TH',{maximumFractionDigits:2});
