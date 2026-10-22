import { Layers3 } from 'lucide-react';
export default function SummaryCard({title,explanation}:{title:string;explanation:string}) { return <article className="summary-card"><div className="summary-icon"><Layers3 size={23}/></div><div><span className="eyebrow">สรุปผลทั้งสองวิธี</span><h3>{title}</h3><p>{explanation}</p></div></article>; }
