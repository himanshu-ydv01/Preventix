import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, ArrowUpRight, CalendarClock, CheckCircle2, ChevronDown, Clock3, Download, Factory, Gauge, MoreHorizontal, Plus, RefreshCw, ShieldCheck, Thermometer, Wrench, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import MetricCard from '../components/MetricCard.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { alerts as demoAlerts, machines as demoMachines, maintenance as demoMaintenance, trendData } from '../utils/demoData.js';
import { api, toDashboardAlert, toDashboardMachine, toDashboardMaintenance } from '../utils/api.js';

function Panel({ children, className = '' }) { return <section className={`panel ${className}`}>{children}</section>; }
function ChartTooltip({ active, payload, label }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><strong>{label}</strong>{payload.map(p => <div key={p.dataKey}><span style={{ background: p.color }}/>{p.name}: <b>{p.value}{p.dataKey === 'temperature' ? '°C' : p.dataKey === 'vibration' ? ' mm/s' : ''}</b></div>)}</div>; }

export default function Dashboard() {
  const [selectedMachine, setSelectedMachine] = useState('All machines');
  const [refreshed, setRefreshed] = useState(false);
  const [chartMetric, setChartMetric] = useState('temperature');
  const [source, setSource] = useState('loading');
  const [summary, setSummary] = useState(null);
  const [machines, setMachines] = useState(demoMachines);
  const [alerts, setAlerts] = useState(demoAlerts);
  const [maintenance, setMaintenance] = useState(demoMaintenance);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getDashboardSummary(), api.getMachines({ page: 1, limit: 100, active: 'true' }), api.getAlerts({ limit: 10 }), api.getMaintenance({ limit: 10 })])
      .then(([summaryResponse, machineResponse, alertResponse, maintenanceResponse]) => {
        if (cancelled) return;
        setSummary(summaryResponse.data);
        setMachines(machineResponse.data.map(toDashboardMachine));
        setAlerts(alertResponse.data.map(toDashboardAlert));
        setMaintenance(maintenanceResponse.data.map(toDashboardMaintenance));
        setSource('database');
      })
      .catch(() => {
        if (cancelled) return;
        setSummary(null);
        setMachines(demoMachines);
        setAlerts(demoAlerts);
        setMaintenance(demoMaintenance);
        setSource('demo');
      });
    return () => { cancelled = true; };
  }, [refreshKey]);
  const refreshData = () => { setRefreshed(true); setRefreshKey(key => key + 1); setTimeout(() => setRefreshed(false), 1200); };
  const filteredMachines = useMemo(() => selectedMachine === 'All machines' ? machines : machines.filter(m => m.name === selectedMachine), [selectedMachine, machines]);
  const statusCounts = { healthy: machines.filter(m => m.status === 'Healthy').length, warning: machines.filter(m => m.status === 'Warning').length, critical: machines.filter(m => m.status === 'Critical').length, offline: machines.filter(m => m.status === 'Offline').length };
  const total = source === 'database' ? (summary?.totalMachines ?? machines.length) : machines.length;
  const healthy = source === 'database' ? (summary?.healthy ?? statusCounts.healthy) : statusCounts.healthy;
  const warning = source === 'database' ? (summary?.warning ?? statusCounts.warning) : statusCounts.warning;
  const critical = source === 'database' ? (summary?.critical ?? statusCounts.critical) : statusCounts.critical;
  const attention = warning + critical;
  const availability = source === 'database' ? summary?.availabilityPercent : null;
  const donutHealthy = total ? healthy / total * 100 : 0;
  const donutWarning = total ? warning / total * 100 : 0;
  const donutCritical = total ? critical / total * 100 : 0;
  const donutBackground = `conic-gradient(#4b8460 0 ${donutHealthy}%, #c49a4c ${donutHealthy}% ${donutHealthy + donutWarning}%, #b95c52 ${donutHealthy + donutWarning}% ${donutHealthy + donutWarning + donutCritical}%, #9aa49a ${donutHealthy + donutWarning + donutCritical}% 100%)`;
  return <div className="dashboard-page">
    <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> FACTORY OPERATIONS</div><h2>Operations overview</h2><p>Machine status, maintenance priorities and recent sensor readings.</p></div><div className="welcome-actions"><button className="btn btn-secondary" onClick={refreshData}><RefreshCw size={15} className={refreshed ? 'spin' : ''}/>{refreshed ? 'Updated just now' : 'Refresh data'}</button><button className="btn btn-primary" onClick={() => window.location.assign('/machines')}><Plus size={16}/> Add machine</button></div></div>
    <div className="demo-notice"><div className="notice-icon"><Activity size={17}/></div><div><strong>{source === 'database' ? 'Database data is connected' : source === 'loading' ? 'Connecting to Preventix API…' : 'Sample data is being displayed'}</strong><span>{source === 'database' ? 'Machine, alert, and maintenance records are loaded from MongoDB. Sensor trend chart remains illustrative until enough readings are available.' : source === 'loading' ? 'Loading persisted machine, alert, and maintenance records.' : 'The API is unavailable; these fallback figures are illustrative and are not connected to live equipment.'}</span></div><span className="notice-tag">{source === 'database' ? 'DATABASE' : source === 'loading' ? 'CONNECTING' : 'DEMO DATA'}</span></div>
    <div className="metrics-grid">
      <MetricCard label="Total machines" value={source === 'database' ? total : machines.length} change={source === 'database' ? 'From database' : 'Illustrative fleet'} positive icon={Factory} tone="blue" detail="Registered assets"/>
      <MetricCard label="Healthy machines" value={healthy} change={total ? `${Math.round(healthy / total * 100)}% of fleet` : 'No assets'} positive icon={ShieldCheck} tone="green" detail="Current healthy status"/>
      <MetricCard label="Need attention" value={attention} change={`${warning} warning · ${critical} critical`} positive={attention === 0} icon={AlertTriangle} tone="amber" detail="Warnings and critical status"/>
      <MetricCard label="Active alerts" value={source === 'database' ? (summary?.activeAlerts ?? alerts.length) : alerts.length} change={source === 'database' ? 'Persisted alerts' : 'Sample events'} positive={alerts.length === 0} icon={Zap} tone="red" detail="Require review"/>
    </div>
    <div className="overview-grid"><Panel className="health-panel"><div className="panel-heading"><div><h3>Fleet health overview</h3><p>Current operating status across all assets</p></div><button className="icon-button"><MoreHorizontal size={19}/></button></div><div className="health-content"><div className="donut-wrap"><div className="donut" style={{ background: donutBackground }}><div className="donut-center"><strong>{total}</strong><span>Total assets</span></div></div></div><div className="health-legend"><div><span className="legend-dot green-dot"/><span>Healthy</span><strong>{healthy} <small>{total ? Math.round(healthy / total * 100) : 0}%</small></strong></div><div><span className="legend-dot amber-dot"/><span>Warning</span><strong>{warning} <small>{total ? Math.round(warning / total * 100) : 0}%</small></strong></div><div><span className="legend-dot red-dot"/><span>Critical</span><strong>{critical} <small>{total ? Math.round(critical / total * 100) : 0}%</small></strong></div></div></div><div className="panel-divider"/><div className="availability-row"><div><span className="subtle-label">Overall availability</span><strong>{availability == null ? '—' : availability}<span>{availability == null ? '' : '%'}</span></strong></div><div className="availability-right"><span className="positive-text"><ArrowUpRight size={14}/> {availability == null ? '—' : 'Database'}</span><small>{availability == null ? 'Availability unavailable' : 'Calculated from active assets'}</small></div></div><div className="progress-track"><div className="progress-fill" style={{ width: `${availability ?? 0}%` }}/></div></Panel>
      <Panel className="trend-panel"><div className="panel-heading"><div><h3>Sensor trends</h3><p>CNC Milling Center · sample readings</p></div><div className="chart-controls"><select value={chartMetric} onChange={e => setChartMetric(e.target.value)} aria-label="Sensor metric"><option value="temperature">Temperature</option><option value="vibration">Vibration</option><option value="torque">Torque</option></select><button className="icon-button"><MoreHorizontal size={19}/></button></div></div><div className="chart-legend"><span><i className="legend-line cyan-line"/>{chartMetric === 'temperature' ? 'Air temperature (°C)' : chartMetric === 'vibration' ? 'Vibration (mm/s)' : 'Torque (Nm)'}</span><span className="chart-live"><span className="status-dot"/> Illustrative data</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="sensorGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4c7d70" stopOpacity={0.16}/><stop offset="95%" stopColor="#4c7d70" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e6eae4" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="time" tick={{ fill: '#7b857d', fontSize: 11 }} tickLine={false} axisLine={false} interval={1}/><YAxis tick={{ fill: '#7b857d', fontSize: 11 }} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']}/><Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey={chartMetric} name={chartMetric === 'temperature' ? 'Temperature' : chartMetric === 'vibration' ? 'Vibration' : 'Torque'} stroke="#4c7d70" strokeWidth={2} fill="url(#sensorGradient)" activeDot={{ r: 4, fill: '#4c7d70', stroke: '#ffffff', strokeWidth: 2 }}/></AreaChart></ResponsiveContainer></div><div className="chart-foot"><span><Clock3 size={13}/> Sample interval: 10 hours</span><span>Illustrative data</span></div></Panel></div>
    <div className="lower-grid"><Panel className="machines-panel"><SectionTitle title="Machine status" subtitle="Monitor health across your production floor" action={<button className="text-link" onClick={() => window.location.assign('/machines')}>View all <ArrowRight size={14}/></button>}/><div className="table-toolbar"><div className="table-count"><span className="status-dot"/> Showing {filteredMachines.length} of {machines.length} {source === 'database' ? 'database machines' : 'demo machines'}</div><select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} aria-label="Filter machines"><option>All machines</option>{machines.map(m => <option key={m.id}>{m.name}</option>)}</select></div><div className="table-scroll"><table className="machine-table"><thead><tr><th>Machine</th><th>Status</th><th>Health score</th><th>Failure risk</th><th>Next service</th><th/></tr></thead><tbody>{filteredMachines.map(m => <tr key={m.id}><td><div className="machine-cell"><span className={`machine-avatar ${m.status.toLowerCase()}`}><Gauge size={17}/></span><span><strong>{m.name}</strong><small>{m.id} · {m.type}</small></span></div></td><td><StatusBadge status={m.status}/></td><td><div className="health-score"><strong>{m.health == null ? '—' : `${m.health}%`}</strong><span className="mini-progress"><i className={m.status.toLowerCase()} style={{ width: `${m.health ?? 0}%` }}/></span></div></td><td><span className={`risk-text ${m.probability.toLowerCase()}`}>{m.probability}</span></td><td><span className={m.nextService === 'Overdue' ? 'overdue' : 'service-date'}>{m.nextService}</span></td><td><button className="row-action" aria-label={`Open ${m.name}`} onClick={() => window.location.assign(`/machines/${m.id}`)}><ArrowRight size={16}/></button></td></tr>)}</tbody></table></div><div className="table-bottom"><span>{source === 'database' ? 'Persisted asset records' : 'Sample asset records'}</span><button className="text-link" onClick={() => window.location.assign('/machines')}>Manage machines <ArrowRight size={14}/></button></div></Panel>
      <div className="right-stack"><Panel className="alerts-panel"><SectionTitle title="Recent alerts" subtitle="Events that may need attention" action={<button className="icon-button" onClick={() => window.location.assign('/alerts')} aria-label="View alerts"><ArrowRight size={17}/></button>}/><div className="alert-list">{alerts.map(a => <div className="alert-item" key={a.id}><div className={`alert-severity-icon ${a.severity.toLowerCase()}`}>{a.severity === 'Critical' ? <AlertTriangle size={16}/> : a.severity === 'Warning' ? <Activity size={16}/> : <CalendarClock size={16}/>}</div><div className="alert-content"><div className="alert-item-top"><StatusBadge status={a.severity}/><span>{a.time}</span></div><strong>{a.title}</strong><small>{a.machine}</small></div></div>)}</div><button className="panel-footer-link" onClick={() => window.location.assign('/alerts')}>View all alerts <ArrowRight size={14}/></button></Panel>
      <Panel className="maintenance-panel"><SectionTitle title="Upcoming maintenance" subtitle="Keep your assets running smoothly" action={<button className="icon-button" onClick={() => window.location.assign('/maintenance')} aria-label="View maintenance"><ArrowRight size={17}/></button>}/><div className="maintenance-list">{maintenance.map((task, i) => <div className="maintenance-item" key={task.title}><div className={`maintenance-icon m-${i}`}><Wrench size={16}/></div><div className="maintenance-copy"><strong>{task.title}</strong><small>{task.machine}</small><div className="maintenance-meta"><span className={task.priority.toLowerCase()}>{task.priority}</span><span><CalendarClock size={12}/>{task.due}</span></div></div></div>)}</div><button className="panel-footer-link" onClick={() => window.location.assign('/maintenance')}>Open maintenance planner <ArrowRight size={14}/></button></Panel></div></div>
    <div className="dashboard-note"><ShieldCheck size={16}/><span><strong>Built for informed decisions.</strong> Risk indicators and sample predictions are illustrative only. Validate thresholds and model performance against machine-specific data before operational use.</span></div>
  </div>;
}
