import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
export default function MetricCard({ label, value, suffix, change, positive, icon: Icon, tone = 'blue', detail }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={18} /></span></div><div className="metric-value">{value}<small>{suffix}</small></div><div className="metric-bottom"><span className={`metric-change ${positive ? 'positive' : 'negative'}`}>{positive ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {change}</span><span className="metric-detail">{detail}</span></div></article>;
}
