import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { Activity, AlertTriangle, CircleStop, Clock3, Play, RefreshCw, RadioTower, Thermometer, Waves } from 'lucide-react';
import SectionTitle from '../components/SectionTitle.jsx';
import RequestState from '../components/RequestState.jsx';
import { api } from '../utils/api.js';
import PredictionTester from '../components/PredictionTester.jsx';

const fmt = (value, unit = '') => value == null || !Number.isFinite(Number(value)) ? '—' : `${Number(value).toFixed(1)}${unit}`;
const time = value => value ? new Date(value).toLocaleTimeString() : '—';

export default function LiveMonitorPage() {
  const [machines, setMachines] = useState([]);
  const [latest, setLatest] = useState({});
  const [history, setHistory] = useState([]);
  const [simulator, setSimulator] = useState({ running: false, readingsCreated: 0, intervalMs: 5000 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [intervalMs, setIntervalMs] = useState(5000);
  const [socketState, setSocketState] = useState('connecting');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [machineResult, simResult] = await Promise.all([api.getMachines({ page: 1, limit: 100, active: 'true' }), api.getSimulatorStatus()]);
      const activeMachines = Array.isArray(machineResult.data) ? machineResult.data : [];
      setMachines(activeMachines);
      setSimulator(simResult.data || { running: false });
      const pairs = await Promise.all(activeMachines.map(async machine => {
        try {
          const result = await api.getMachineReadings(machine.machineId, { limit: 12 });
          return [machine.machineId, result.data || []];
        } catch { return [machine.machineId, []]; }
      }));
      const map = {};
      for (const [id, readings] of pairs) if (readings.length) map[id] = readings[0];
      setLatest(map);
      setHistory(pairs.flatMap(([machineId, readings]) => readings.map(reading => ({ ...reading, machineId }))).sort((a,b) => new Date(b.recordedAt)-new Date(a.recordedAt)).slice(0,30));
    } catch (err) { setError(err.message || 'Unable to load sensor monitor.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => setSocketState('connected'));
    socket.on('disconnect', () => setSocketState('disconnected'));
    socket.on('connect_error', () => setSocketState('disconnected'));
    socket.on('simulator:status', status => setSimulator(status));
    socket.on('sensor:reading', payload => {
      if (!payload?.reading || !payload.machineId) return;
      setLatest(old => ({ ...old, [payload.machineId]: payload.reading }));
      setHistory(old => [{ ...payload.reading, machineId: payload.machineId }, ...old].slice(0, 30));
    });
    return () => socket.close();
  }, []);

  async function toggleSimulator() {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = simulator.running ? await api.stopSimulator() : await api.startSimulator(intervalMs);
      setSimulator(result.data || simulator);
      setNotice(result.message || (simulator.running ? 'Simulation stopped.' : 'Simulation started.'));
    } catch (err) { setError(err.message || 'Unable to change simulator state.'); }
    finally { setBusy(false); }
  }

  const values = useMemo(() => Object.values(latest), [latest]);
  const avgTemp = values.length ? values.reduce((sum, item) => sum + Number(item.processTemperature || 0), 0) / values.length : null;
  const avgVibration = values.length ? values.reduce((sum, item) => sum + Number(item.vibration || 0), 0) / values.length : null;

  return <div className="subpage connected-page">
    <div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> SENSOR OPERATIONS</div><h2>Live sensor monitor</h2><p>Watch persisted sensor readings arrive over Socket.IO in simulation mode.</p></div><div className="page-actions"><button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div></div>
    <div className="demo-notice"><div className="notice-icon"><RadioTower size={17}/></div><div><strong>Simulation only · no physical equipment connected</strong><span>Readings are synthetic and are saved to MongoDB. They are not safety-critical measurements or validated predictions.</span></div><span className="notice-tag">{socketState === 'connected' ? 'SOCKET CONNECTED' : 'SOCKET OFFLINE'}</span></div>
    <div className="metrics-grid compact-metrics"><div className="mini-stat"><span>Active machines</span><strong>{loading ? '—' : machines.length}</strong><small>Eligible for simulation</small></div><div className="mini-stat"><span>Latest process temp.</span><strong>{fmt(avgTemp, '°C')}</strong><small>Average of latest readings</small></div><div className="mini-stat"><span>Latest vibration</span><strong>{fmt(avgVibration, ' mm/s')}</strong><small>Average of latest readings</small></div><div className="mini-stat"><span>Session readings</span><strong>{simulator.readingsCreated ?? 0}</strong><small>{simulator.readingsRemaining ?? 1000} remaining this session</small></div></div>
    <section className="panel full-panel"><SectionTitle title="Simulation controls" subtitle="Bounded session: maximum 50 machines per tick, 1,000 readings per session, 30 minutes per session."/><div className="simulator-controls"><div className="simulator-state"><span className={`status-dot ${simulator.running ? 'sim-running' : ''}`}/><div><strong>{simulator.running ? 'Simulator running' : 'Simulator stopped'}</strong><small>{simulator.startedAt ? `Session started ${new Date(simulator.startedAt).toLocaleTimeString()}` : 'Start a session to generate readings'}</small></div></div><label className="interval-select">Interval<select value={intervalMs} onChange={e => setIntervalMs(Number(e.target.value))} disabled={simulator.running}><option value={2000}>2 seconds</option><option value={5000}>5 seconds</option><option value={10000}>10 seconds</option><option value={30000}>30 seconds</option><option value={60000}>60 seconds</option></select></label><button className={`btn ${simulator.running ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleSimulator} disabled={busy || loading || (machines.length === 0 && !simulator.running)}>{simulator.running ? <CircleStop size={15}/> : <Play size={15}/>} {busy ? 'Please wait…' : simulator.running ? 'Stop simulator' : 'Start simulator'}</button></div>{simulator.lastError && <p className="form-error" role="alert">{simulator.lastError}</p>}{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="simulator-notice" role="status">{notice}</p>}</section>
    <section className="panel full-panel"><SectionTitle title="Latest readings by machine" subtitle="Latest persisted value for each active machine; values update live when the simulator emits new readings."/><RequestState loading={loading} error={error && !machines.length ? error : ''} empty={!loading && !machines.length} onRetry={load} emptyTitle="No active machines" emptyText="Register a machine or run the seed script before starting simulation."/>{!loading && machines.length > 0 && <div className="table-scroll"><table className="machine-table registry-table"><thead><tr><th>Machine</th><th><Thermometer size={12} style={{display:'inline',verticalAlign:'middle'}}/> Process temp.</th><th>Air temp.</th><th>Speed</th><th>Torque</th><th>Wear</th><th><Waves size={12} style={{display:'inline',verticalAlign:'middle'}}/> Vibration</th><th>Recorded</th></tr></thead><tbody>{machines.map(machine => { const r = latest[machine.machineId]; return <tr key={machine.machineId}><td><div className="machine-cell"><span className="machine-avatar"><Activity size={16}/></span><span><strong>{machine.name}</strong><small>{machine.machineId}</small></span></div></td><td>{fmt(r?.processTemperature, ' °C')}</td><td>{fmt(r?.airTemperature, ' °C')}</td><td>{fmt(r?.rotationalSpeed, ' rpm')}</td><td>{fmt(r?.torque, ' Nm')}</td><td>{fmt(r?.toolWear)}</td><td>{fmt(r?.vibration, ' mm/s')}</td><td>{time(r?.recordedAt)}</td></tr>; })}</tbody></table></div>}</section>
    <PredictionTester />
    <section className="panel full-panel"><SectionTitle title="Recent live events" subtitle={`${history.length} recent readings held in this browser view`}/>{history.length ? <div className="event-list">{history.slice(0,15).map((item, i) => <div className="event-row" key={`${item._id || item.recordedAt}-${item.machineId}-${i}`}><div className="event-icon"><Activity size={16}/></div><div className="event-main"><div className="event-top"><strong>{item.machineId}</strong><span>{time(item.recordedAt)}</span></div><p>Process {fmt(item.processTemperature, ' °C')} · Vibration {fmt(item.vibration, ' mm/s')} · Speed {fmt(item.rotationalSpeed, ' rpm')}</p></div></div>)}</div> : <div className="empty-state"><Clock3 size={22}/><strong>Waiting for readings</strong><span>Start the simulator to see new sensor events stream into this panel.</span></div>}</section>
    <p className="dashboard-note"><AlertTriangle size={13}/> Sensor values are synthetic demo data. ML predictions are benchmark estimates and are not validated for operational use.</p>
  </div>;
}
