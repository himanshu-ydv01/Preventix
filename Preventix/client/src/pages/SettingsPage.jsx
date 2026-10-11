import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, CircleAlert, Play, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { api } from '../utils/api.js';

async function checkMlService() {
  try {
    const response = await fetch('/api/ml/health', { signal: AbortSignal.timeout(3000) });
    const payload = await response.json();
    return payload.data || { online: false, message: 'Service status unavailable' };
  } catch {
    return { online: false, message: 'Service status unavailable' };
  }
}

export default function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [sim, setSim] = useState(null);
  const [ml, setMl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [upcoming, setUpcoming] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [healthResult, simulatorResult, mlResult] = await Promise.all([
        fetch('/api/health/ready').then(async response => ({ httpStatus: response.status, ...await response.json() })),
        api.getSimulatorStatus(),
        checkMlService()
      ]);
      setHealth(healthResult);
      setSim(simulatorResult.data || simulatorResult);
      setMl(mlResult);
    } catch (err) {
      setError(err.message || 'Unable to load service status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runAutomation() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.runAutomation({ includeOverdue: true, includeUpcoming: upcoming });
      setNotice(`Checks complete: ${result.data.alertsCreated} alert(s) created; ${result.data.duplicatesSkipped} duplicate(s) skipped.`);
    } catch (err) {
      setError(err.message || 'Maintenance checks failed.');
    } finally {
      setBusy(false);
    }
  }

  const services = [
    { title: 'API and database', detail: health?.status === 'ready' ? 'Connected and ready' : health?.database === 'connected' ? 'API available' : 'Database not ready', ok: health?.status === 'ready', icon: Server },
    { title: 'Sensor simulator', detail: sim?.running ? 'Generating simulated readings' : 'Currently stopped', ok: Boolean(sim?.running), icon: Activity },
    { title: 'ML inference service', detail: ml?.message || 'Checking service', ok: Boolean(ml?.online), icon: ShieldCheck }
  ];

  return <div className="subpage connected-page settings-page">
    <div className="page-intro">
      <div><div className="eyebrow"><span className="eyebrow-line"/> SYSTEM</div><h2>Settings</h2><p>Check service availability and run maintenance rules.</p></div>
      <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/> Refresh status</button>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="panel settings-status-panel">
      <div className="section-title"><div><h2>Service status</h2><p>Current availability from this browser session</p></div><span className="settings-updated">{loading ? 'Checking…' : 'Live check'}</span></div>
      <div className="settings-service-list">
        {services.map(({ title, detail, ok, icon: Icon }) => <div className="settings-service" key={title}>
          <span className="settings-service-icon"><Icon size={18}/></span>
          <span className="settings-service-copy"><strong>{title}</strong><small>{loading ? 'Checking…' : detail}</small></span>
          <span className={`settings-state ${loading ? 'checking' : ok ? 'ok' : 'issue'}`}>{loading ? 'Checking' : ok ? <><CheckCircle2 size={13}/> Ready</> : <><CircleAlert size={13}/> Check</>}</span>
        </div>)}
      </div>
    </section>
    <section className="panel settings-automation-panel">
      <div className="settings-automation-icon"><Activity size={19}/></div>
      <div className="settings-automation-content">
        <h3>Maintenance checks</h3>
        <p>Find overdue maintenance and machines that need attention. Existing unresolved rule alerts are skipped.</p>
        <label className="settings-checkbox"><input type="checkbox" checked={upcoming} onChange={event => setUpcoming(event.target.checked)}/> Include maintenance due in the next 7 days</label>
        <div className="settings-run-row"><button className="btn btn-primary" onClick={runAutomation} disabled={busy}><Play size={14}/>{busy ? 'Running checks…' : 'Run checks'}</button>{notice && <span className="settings-success" role="status">{notice}</span>}</div>
      </div>
    </section>
    <p className="settings-footnote">This workspace uses simulated sensor data unless a live source is explicitly configured.</p>
  </div>;
}
