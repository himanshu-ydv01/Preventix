const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const api = {
  getDashboardSummary: () => request('/dashboard/summary'),
  getMachines: (params = {}) => request(`/machines?${new URLSearchParams(params)}`),
  getMachine: id => request(`/machines/${encodeURIComponent(id)}`),
  getAlerts: (params = {}) => request(`/alerts?${new URLSearchParams(params)}`),
  getMaintenance: (params = {}) => request(`/maintenance?${new URLSearchParams(params)}`),
  createMachine: body => request('/machines', { method: 'POST', body: JSON.stringify(body) }),
  updateMachine: (id, body) => request(`/machines/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createMaintenance: body => request('/maintenance', { method: 'POST', body: JSON.stringify(body) }),
  updateMaintenanceStatus: (id, status) => request(`/maintenance/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateAlertStatus: (id, status) => request(`/alerts/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getMachineReadings: (id, params = {}) => request(`/machines/${encodeURIComponent(id)}/readings?${new URLSearchParams(params)}`),
  inferMachinePrediction: machineId => request('/ml/infer', { method: 'POST', body: JSON.stringify({ machineId }) }),
  simulateMachinePrediction: (machineId, features) => request('/ml/simulate', { method: 'POST', body: JSON.stringify({ machineId, features }) }),
  getPredictions: (params = {}) => request(`/predictions?${new URLSearchParams(params)}`),
  getAnalytics: () => request('/automation/analytics'),
  getAuditEvents: (params = {}) => request(`/automation/audit?${new URLSearchParams(params)}`),
  runAutomation: body => request('/automation/run', { method: 'POST', body: JSON.stringify(body) }),
  getSimulatorStatus: () => request('/simulator/status'),
  startSimulator: (intervalMs = 5000) => request('/simulator/start', { method: 'POST', body: JSON.stringify({ intervalMs }) }),
  stopSimulator: () => request('/simulator/stop', { method: 'POST', body: JSON.stringify({}) }),
};

export function toDashboardMachine(machine) {
  const next = machine.nextMaintenanceAt ? new Date(machine.nextMaintenanceAt) : null;
  return {
    id: machine.machineId,
    name: machine.name,
    type: machine.type,
    location: machine.location,
    status: machine.status,
    health: machine.healthScore ?? null,
    probability: 'Unknown',
    temperature: null,
    vibration: null,
    nextService: next ? next.toLocaleDateString(undefined, { month: 'short', day: '2-digit' }) : 'Not scheduled',
    updated: machine.updatedAt ? new Date(machine.updatedAt).toLocaleString() : 'No reading yet',
  };
}

export function toDashboardAlert(alert) {
  return {
    id: alert.alertId || alert._id,
    severity: alert.severity,
    title: alert.title,
    machine: alert.machine ? `${alert.machine.name} · ${alert.machine.machineId}` : 'Factory-wide',
    time: alert.occurredAt ? new Date(alert.occurredAt).toLocaleString() : 'Recently',
    action: alert.recommendedAction || alert.description || 'Review alert details',
    status: alert.status,
  };
}

export function toDashboardMaintenance(task) {
  return {
    id: task.taskId || task._id,
    title: task.title,
    machine: task.machine?.name || 'Unknown machine',
    due: task.dueAt ? new Date(task.dueAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit' }) : 'Not scheduled',
    priority: task.priority,
    assigned: task.assignedTo || 'Unassigned',
    status: task.status,
  };
}
