import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Factory, Filter, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SectionTitle from '../components/SectionTitle.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import RequestState from '../components/RequestState.jsx';
import { api, toDashboardMachine } from '../utils/api.js';

const initialForm = { machineId: '', name: '', type: 'CNC Machine', location: '', status: 'Healthy', healthScore: '100' };
const errorMessage = err => err?.message || 'An unexpected error occurred.';

export default function MachinesPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await api.getMachines({ page: 1, limit: 100 });
      setRecords(Array.isArray(result.data) ? result.data : []);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => records.map(raw => ({ raw, ...toDashboardMachine(raw), location: raw.location || '—', health: raw.healthScore ?? null })), [records]);
  const filtered = rows.filter(m => (filter === 'All' || m.status === filter) && `${m.name} ${m.id} ${m.type} ${m.location}`.toLowerCase().includes(query.toLowerCase()));
  const counts = { total: rows.length, healthy: rows.filter(m => m.status === 'Healthy').length, warning: rows.filter(m => m.status === 'Warning').length, critical: rows.filter(m => m.status === 'Critical').length };

  async function createMachine(e) {
    e.preventDefault(); setSaving(true); setFormError('');
    try {
      await api.createMachine({ ...form, machineId: form.machineId.trim().toUpperCase(), healthScore: form.healthScore === '' ? null : Number(form.healthScore) });
      setForm(initialForm); setShowForm(false); setNotice('Machine registered successfully.');
      await load();
    } catch (err) { setFormError(errorMessage(err)); }
    finally { setSaving(false); }
  }

  return <div className="subpage connected-page">
    <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> ASSET MANAGEMENT</div><h2>Machine registry</h2><p>Browse and manage equipment stored in your Preventix database.</p></div><div className="page-actions"><button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button><button className="btn btn-primary" onClick={() => { setShowForm(v => !v); setFormError(''); }}><Plus size={16}/>{showForm ? 'Cancel' : 'Register machine'}</button></div></div>
    <div className="demo-notice"><div className="notice-icon"><Factory size={17}/></div><div><strong>MongoDB-backed machine registry</strong><span>These records are loaded from the API. Health scores and statuses reflect stored records, not live sensor inference.</span></div><span className="notice-tag">API DATA</span></div>
    <div className="metrics-grid compact-metrics"><div className="mini-stat"><span>Total assets</span><strong>{loading ? '—' : counts.total}</strong><small>Database records</small></div><div className="mini-stat"><span>Healthy</span><strong className="good-number">{loading ? '—' : counts.healthy}</strong><small>Stored status</small></div><div className="mini-stat"><span>Warning</span><strong className="warn-number">{loading ? '—' : counts.warning}</strong><small>Review recommended</small></div><div className="mini-stat"><span>Critical</span><strong className="bad-number">{loading ? '—' : counts.critical}</strong><small>Action required</small></div></div>
    {showForm && <section className="panel full-panel form-panel"><div className="form-panel-heading"><div><h3>Register a machine</h3><p>Required fields are saved to MongoDB through the Express API.</p></div><button className="icon-button" aria-label="Close form" onClick={() => setShowForm(false)}><X size={18}/></button></div><form className="data-form" onSubmit={createMachine}><label>Machine ID<input required minLength={2} maxLength={40} value={form.machineId} onChange={e => setForm({...form, machineId:e.target.value})} placeholder="e.g. CNC-004"/></label><label>Machine name<input required minLength={2} value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="CNC Milling Center"/></label><label>Machine type<input required minLength={2} value={form.type} onChange={e => setForm({...form, type:e.target.value})} placeholder="CNC Machine"/></label><label>Location<input required minLength={2} value={form.location} onChange={e => setForm({...form, location:e.target.value})} placeholder="Production line A"/></label><label>Status<select value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option>Healthy</option><option>Warning</option><option>Critical</option><option>Offline</option></select></label><label>Health score (0–100)<input type="number" min="0" max="100" value={form.healthScore} onChange={e => setForm({...form,healthScore:e.target.value})}/></label><div className="form-submit-row">{formError && <p className="form-error" role="alert">{formError}</p>}<button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save machine'}</button></div></form></section>}
    <section className="panel full-panel"><SectionTitle title="All machines" subtitle={loading ? 'Fetching machine records…' : `${filtered.length} of ${rows.length} database records`} action={<button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={14}/> Refresh list</button>}/><div className="registry-toolbar"><div className="search-field"><Search size={16}/><input placeholder="Search name, ID, type, or location…" value={query} onChange={e => setQuery(e.target.value)}/></div><div className="filter-field"><Filter size={15}/><select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter by status"><option>All</option><option>Healthy</option><option>Warning</option><option>Critical</option><option>Offline</option></select></div></div>
      <RequestState loading={loading} error={error} empty={!loading && !error && filtered.length === 0} onRetry={load} emptyTitle={records.length ? 'No matching machines' : 'No machines registered'} emptyText={records.length ? 'Try a different search term or status filter.' : 'Register a machine above or run the seed script to add example records.'}/>
      {!loading && !error && filtered.length > 0 && <><div className="table-scroll"><table className="machine-table registry-table"><thead><tr><th>Machine</th><th>Location</th><th>Status</th><th>Health</th><th>Next service</th><th>Updated</th><th/></tr></thead><tbody>{filtered.map(m => <tr key={m.raw._id || m.id}><td><div className="machine-cell"><span className={`machine-avatar ${(m.status || 'offline').toLowerCase()}`}><Factory size={17}/></span><span><strong>{m.name}</strong><small>{m.id} · {m.type}</small></span></div></td><td>{m.location}</td><td><StatusBadge status={m.status}/></td><td><div className="health-score"><strong>{m.health == null ? '—' : `${m.health}%`}</strong><span className="mini-progress"><i className={(m.status || '').toLowerCase()} style={{width:`${m.health ?? 0}%`}}/></span></div></td><td>{m.nextService}</td><td>{m.updated}</td><td><button className="row-action" onClick={() => navigate(`/machines/${encodeURIComponent(m.id)}`)} aria-label={`Open ${m.name}`}><ArrowRight size={16}/></button></td></tr>)}</tbody></table></div><div className="table-bottom"><span>Persisted machine records</span><span>{filtered.length} visible</span></div></>}
    </section>{notice && <div className="toast" role="status">{notice}</div>}
  </div>;
}
