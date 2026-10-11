import { useCallback, useEffect, useState } from 'react';
import { BrainCircuit, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import SectionTitle from './SectionTitle.jsx';
import RequestState from './RequestState.jsx';
import StatusBadge from './StatusBadge.jsx';
import { api } from '../utils/api.js';

const percent = value => value == null ? '—' : `${(Number(value) * 100).toFixed(1)}%`;

export default function PredictionTester() {
  const [machines, setMachines] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [notice, setNotice] = useState('');

  const loadMachines = useCallback(async () => {
    setLoadingMachines(true); setError('');
    try {
      const result = await api.getMachines({ page: 1, limit: 100, active: 'true' });
      const list = Array.isArray(result.data) ? result.data : [];
      setMachines(list);
      setSelectedId(current => list.some(machine => machine.machineId === current) ? current : (list[0]?.machineId || ''));
    } catch (err) { setError(err.message || 'Unable to load machines.'); }
    finally { setLoadingMachines(false); }
  }, []);
  useEffect(() => { loadMachines(); }, [loadMachines]);

  async function runPrediction() {
    if (!selectedId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api.inferMachinePrediction(selectedId);
      setPrediction(result.data || null);
      setNotice('Prediction generated from the latest saved sensor reading.');
    } catch (err) {
      setError(err.message || 'Prediction failed. Start the ML service and check the latest sensor reading.');
    } finally { setBusy(false); }
  }

  const risk = prediction?.riskLevel || 'Unknown';
  return <section className="panel full-panel">
    <SectionTitle title="ML failure prediction" subtitle="Score the latest saved reading for a selected machine using the Phase 5 model." action={<button className="btn btn-secondary" onClick={loadMachines} disabled={loadingMachines}><RefreshCw size={14}/> Refresh</button>} />
    <div className="simulator-controls">
      <label className="interval-select">Machine
        <select value={selectedId} onChange={event => { setSelectedId(event.target.value); setPrediction(null); setNotice(''); }} disabled={loadingMachines || !machines.length}>
          {!machines.length && <option value="">No active machines</option>}
          {machines.map(machine => <option key={machine.machineId} value={machine.machineId}>{machine.machineId} — {machine.name}</option>)}
        </select>
      </label>
      <button className="btn btn-primary" onClick={runPrediction} disabled={busy || loadingMachines || !selectedId}>
        <BrainCircuit size={15}/>{busy ? 'Predicting…' : 'Predict from latest reading'}
      </button>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="simulator-notice" role="status">{notice}</p>}
    {prediction ? <div className="metrics-grid compact-metrics prediction-result-grid">
      <div className="mini-stat"><span>Risk level</span><strong><StatusBadge status={risk}/></strong><small>{prediction.predictedFailure ? 'Model crossed its 0.5 threshold' : 'Model stayed below its 0.5 threshold'}</small></div>
      <div className="mini-stat"><span>Failure probability</span><strong>{percent(prediction.failureProbability)}</strong><small>Model estimate, not a guarantee</small></div>
      <div className="mini-stat"><span>Model version</span><strong>{prediction.modelVersion || '—'}</strong><small>{prediction.modelName || 'ML model'}</small></div>
      <div className="mini-stat"><span>Saved at</span><strong>{prediction.predictedAt ? new Date(prediction.predictedAt).toLocaleTimeString() : '—'}</strong><small>Stored in MongoDB</small></div>
    </div> : <div className="empty-state"><Sparkles size={22}/><strong>Ready to score a machine</strong><span>Start the simulator first so the selected machine has a saved sensor reading, then run a prediction.</span></div>}
    <div className="demo-notice"><div className="notice-icon"><ShieldAlert size={17}/></div><div><strong>Benchmark model — demonstration only</strong><span>Sensor temperatures are converted from °C to K for the AI4I model. Machine type is approximated from the machine's configured type. Do not use these scores for real maintenance or safety decisions.</span></div><span className="notice-tag">ML API</span></div>
  </section>;
}
