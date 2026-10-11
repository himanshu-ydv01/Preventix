import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Activity, AlertTriangle, Wrench, Gauge } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import SectionTitle from '../components/SectionTitle.jsx';
import RequestState from '../components/RequestState.jsx';
import { api } from '../utils/api.js';

function csvDownload(rows) {
  const columns = ['recordedAt','airTemperature','processTemperature','rotationalSpeed','torque','toolWear','source'];
  const quote = value => `"${String(value ?? '').replaceAll('"','""')}"`;
  const csv = [columns.join(','), ...rows.map(row => columns.map(key => quote(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = 'preventix-sensor-readings-30d.csv'; a.click(); URL.revokeObjectURL(url);
}
export default function AnalyticsPage() {
  const [data,setData] = useState(null); const [loading,setLoading] = useState(true); const [error,setError] = useState('');
  const load = useCallback(async()=>{setLoading(true);setError('');try{const r=await api.getAnalytics();setData(r.data);}catch(e){setError(e.message||'Unable to load analytics.');}finally{setLoading(false);}},[]);
  useEffect(()=>{load();},[load]);
  const machineRows=(data?.machinesByStatus||[]).map(x=>({name:x._id,value:x.count}));
  const alertRows=(data?.alertsBySeverity||[]).map(x=>({name:x._id,value:x.count}));
  const taskRows=(data?.tasksByStatus||[]).map(x=>({name:x._id,value:x.count}));
  const predRows=(data?.predictionsByRisk||[]).map(x=>({name:x._id,value:x.count}));
  return <div className="subpage connected-page"><div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> OPERATIONS INTELLIGENCE</div><h2>Operational analytics</h2><p>Aggregated from saved MongoDB records for the last 30 days.</p></div><div className="page-actions"><button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button><button className="btn btn-primary" onClick={()=>csvDownload(data?.recentReadings||[])} disabled={!data?.recentReadings?.length}><Download size={15}/> Export readings CSV</button></div></div>
  <div className="demo-notice"><div className="notice-icon"><Activity size={17}/></div><div><strong>Database-backed analytics</strong><span>Charts show saved records only; an empty chart means the selected record group has no data.</span></div><span className="notice-tag">30 DAYS</span></div>
  <RequestState loading={loading} error={error} empty={false} onRetry={load}/>
  {!loading&&!error&&data&&<><div className="metrics-grid compact-metrics"><div className="mini-stat"><span>Registered machines</span><strong>{machineRows.reduce((n,x)=>n+x.value,0)}</strong><small>All statuses</small></div><div className="mini-stat"><span>Alerts in period</span><strong>{alertRows.reduce((n,x)=>n+x.value,0)}</strong><small>Last 30 days</small></div><div className="mini-stat"><span>Maintenance tasks</span><strong>{taskRows.reduce((n,x)=>n+x.value,0)}</strong><small>All task statuses</small></div><div className="mini-stat"><span>Predictions in period</span><strong>{predRows.reduce((n,x)=>n+x.value,0)}</strong><small>Last 30 days</small></div></div>
  <div className="feature-grid"><ChartPanel title="Machines by status" icon={Gauge} rows={machineRows}/><ChartPanel title="Alerts by severity" icon={AlertTriangle} rows={alertRows}/><ChartPanel title="Maintenance by status" icon={Wrench} rows={taskRows}/><ChartPanel title="Predictions by risk" icon={Activity} rows={predRows}/></div><p className="event-status-line">Generated {new Date(data.generatedAt).toLocaleString()}. Sensor export includes up to 500 most recent readings within 30 days.</p></>}</div>;
}
function ChartPanel({title,icon:Icon,rows}){return <section className="panel roadmap-card analytics-chart"><div className="panel-heading"><h3>{title}</h3><Icon size={17}/></div>{rows.length===0?<div className="api-state"><span>No records yet</span></div>:<ResponsiveContainer width="100%" height={210}><BarChart data={rows} margin={{top:10,right:8,left:-20,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke="#253449"/><XAxis dataKey="name" tick={{fontSize:10,fill:'#8da0b5'}}/><YAxis allowDecimals={false} tick={{fontSize:10,fill:'#8da0b5'}}/><Tooltip/><Bar dataKey="value" fill="#32c8d8" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>}</section>}
