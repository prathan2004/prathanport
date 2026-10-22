import type { ReactNode } from 'react';
import { Clock3, CheckCircle2, CircleAlert } from 'lucide-react';
import type { Result } from '../lib/wanSia';
export default function ResultCard({number,label,result,children}:{number:string;label:string;result:Result;children?:ReactNode}) { const Icon=result.verdict==='pending'?Clock3:result.verdict==='bad'?CircleAlert:CheckCircle2; return <article className={`result-card ${result.verdict}`}><div className="card-top"><span className="card-number">{number}</span><span>{label}</span><Icon size={19}/></div><span className="status-tag">{result.verdict==='pending'?'ยังไม่ยืนยัน':'ตรวจสอบตามเกณฑ์แล้ว'}</span><h3>{result.title}</h3><p>{result.explanation}</p>{children}</article>; }
