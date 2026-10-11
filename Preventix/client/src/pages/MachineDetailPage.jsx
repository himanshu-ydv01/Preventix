import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, CalendarClock, Factory, Gauge, RefreshCw, Thermometer, Waves } from 'lucide-react';
import { api } from '../utils/api.js';
import RequestState from '../components/RequestState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const formatDate = value => value ? new Date(value).toLocaleString() : '—';
const readingValue = (reading, key, unit) => reading?.[key] == null ? '—' : `${reading[key]}${unit}`;

export default function MachineDetailPage() {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const machineResult = await api.getMachine(id);
      setRecord(machineResult.data);
      try {
        const readingsResult = await api.getMachineReadings(id, { limit: 20 });
        setReadings(Array.isArray(readingsResult.data) ? readingsResult.data : []);
      } catch {
        setReadings(machineResult.data?.latestReading ? [machineResult.data.latestReading] : []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load this machine.');
      setRecord(null);
      setReadings([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const machine = record?.machine;
  const latest = record?.latestReading || readings[0];
  const sensorMetrics = [
    { label: 'Air temperature', value: readingValue(latest, 'airTemperature', ' °C'), icon: Thermometer },
    { label: 'Process temperature', value: readingValue(latest, 'processTemperature', ' °C'), icon: Thermometer },
    { label: 'Rotational speed', value: readingValue(latest, 'rotationalSpeed', ' rpm'), icon: Gauge },
    { label: 'Vibration', value: readingValue(latest, 'vibration', ''), icon: Waves },
  ];

  return <div className="subpage connected-page machine-detail-page">
    <div className="page-intro">
      <div>
        <Link className="text-link machine-back-link" to="/machines"><ArrowLeft size={14}/> Back to machines</Link>
        <div className="eyebrow"><span className="eyebrow-line"/> ASSET DETAILS</div>
        <h2>{machine?.name || (loading ? 'Loading machine…' : 'Machine details')}</h2>
        <p>{machine ? `${machine.machineId} · ${machine.type || 'Equipment'}` : 'View stored machine information and recent sensor readings.'}</p>
      </div>
      <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/> Refresh</button>
    </div>
    <RequestState loading={loading} error={error} empty={!loading && !error && !machine} onRetry={load} emptyTitle="Machine not found" emptyText="This machine may have been removed or its ID is no longer available."/>
    {!loading && !error && machine && <>
      <section className="panel machine-detail-summary">
        <div className="machine-detail-identity">
          <span className={`machine-avatar ${(machine.status || 'offline').toLowerCase()}`}><Factory size={22}/></span>
          <div><h3>{machine.name}</h3><p>{machine.location || 'Location not set'} · {machine.machineId}</p></div>
        </div>
        <StatusBadge status={machine.status || 'Offline'}/>
        <div className="machine-health"><span>Health score</span><strong>{machine.healthScore == null ? '—' : `${machine.healthScore}%`}</strong><span className="mini-progress"><i style={{ width: `${Math.max(0, Math.min(100, machine.healthScore ?? 0))}%` }}/></span></div>
      </section>
      <div className="metrics-grid machine-sensor-grid">
        {sensorMetrics.map(({ label, value, icon: Icon }) => <section className="mini-stat machine-sensor-card" key={label}><span><Icon size={15}/>{label}</span><strong>{value}</strong><small>{latest ? `Recorded ${formatDate(latest.recordedAt)}` : 'No sensor reading recorded'}</small></section>)}
      </div>
      <div className="machine-detail-grid">
        <section className="panel full-panel">
          <div className="section-title"><div><h2>Machine information</h2><p>Stored equipment configuration</p></div></div>
          <dl className="machine-info-list">
            <div><dt>Machine ID</dt><dd>{machine.machineId}</dd></div>
            <div><dt>Type</dt><dd>{machine.type || '—'}</dd></div>
            <div><dt>Location</dt><dd>{machine.location || '—'}</dd></div>
            <div><dt>Data source</dt><dd>{machine.dataMode || 'unknown'}</dd></div>
            <div><dt>Installation date</dt><dd>{machine.installationDate ? new Date(machine.installationDate).toLocaleDateString() : '—'}</dd></div>
            <div><dt>Next maintenance</dt><dd><CalendarClock size={14}/>{machine.nextMaintenanceAt ? new Date(machine.nextMaintenanceAt).toLocaleDateString() : 'Not scheduled'}</dd></div>
            <div><dt>Last updated</dt><dd>{formatDate(machine.updatedAt)}</dd></div>
            <div><dt>Last sensor reading</dt><dd>{formatDate(latest?.recordedAt)}</dd></div>
          </dl>
          {machine.description && <p className="machine-description">{machine.description}</p>}
        </section>
        <section className="panel full-panel">
          <div className="section-title"><div><h2>Recent sensor readings</h2><p>Latest {readings.length} stored readings</p></div><Activity size={17}/></div>
          {readings.length ? <div className="table-scroll"><table className="machine-table"><thead><tr><th>Recorded</th><th>Air °C</th><th>Process °C</th><th>Speed rpm</th><th>Torque</th><th>Wear</th></tr></thead><tbody>{readings.map((r, i) => <tr key={r._id || `${r.recordedAt}-${i}`}><td>{formatDate(r.recordedAt)}</td><td>{r.airTemperature ?? '—'}</td><td>{r.processTemperature ?? '—'}</td><td>{r.rotationalSpeed ?? '—'}</td><td>{r.torque ?? '—'}</td><td>{r.toolWear ?? '—'}</td></tr>)}</tbody></table></div> : <div className="machine-reading-empty"><Activity size={22}/><strong>No sensor history yet</strong><span>Readings will appear here when the simulator or a sensor records data for this machine.</span></div>}
        </section>
      </div>
    </>}
  </div>;
}
