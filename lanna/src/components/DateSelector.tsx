import { CalendarDays, ArrowRight, RotateCcw } from 'lucide-react';
import { isISODate, buddhistYear } from '../lib/dateUtils';
const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
interface Props {date:string; setDate:(s:string)=>void; onToday:()=>void; onSubmit:()=>void; busy:boolean; error:string;}
export default function DateSelector({date,setDate,onToday,onSubmit,busy,error}:Props) {
 const [y,m,d]=date.split('-').map(Number);
 function update(part:'day'|'month'|'year',v:number) {
  const year=part==='year'?v:y, month=part==='month'?v:m;
  const last=new Date(year,month,0).getDate();
  const day=part==='day'?v:Math.min(d,last);
  setDate(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
 }
 return <section className="selector-card" aria-labelledby="date-heading"><div className="selector-heading"><span className="section-kicker"><CalendarDays size={18}/> เริ่มต้นตรวจสอบ</span><button className="text-button" onClick={onToday}><RotateCcw size={14}/> วันนี้</button></div><h2 id="date-heading">อยากตรวจสอบวันไหน?</h2><p className="muted">เลือกวันที่ที่คุณสนใจ ตามเวลาประเทศไทย</p><form onSubmit={e=>{e.preventDefault();onSubmit();}}><div className="date-fields"><label>วัน<select aria-label="วัน" value={d} onChange={e=>update('day',+e.target.value)}>{Array.from({length:new Date(y,m,0).getDate()},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label><label>เดือน<select aria-label="เดือน" value={m} onChange={e=>update('month',+e.target.value)}>{months.map((v,i)=><option key={v} value={i+1}>{v}</option>)}</select></label><label>ปี พ.ศ.<select aria-label="ปี พ.ศ." value={y} onChange={e=>update('year',+e.target.value)}>{Array.from({length:301},(_,i)=><option key={i} value={1900+i}>{buddhistYear(1900+i)}</option>)}</select></label></div><div className="native-date"><label htmlFor="native-date">เลือกจากปฏิทิน</label><input id="native-date" type="date" value={date} min="1900-01-01" max="2200-12-31" onChange={e=>setDate(e.target.value)}/></div>{error&&<p className="error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={busy||!isISODate(date)}>{busy?'กำลังตรวจสอบ…':'ตรวจสอบวัน'}<ArrowRight size={19}/></button></form><div className="selector-note"><span className="tiny-dot"/> ไม่ต้องสมัครสมาชิก · ไม่บันทึกวันที่ที่คุณเลือก</div></section>;
}
