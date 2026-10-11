import { AlertCircle, LoaderCircle, RefreshCw, Inbox } from 'lucide-react';

export default function RequestState({ loading, error, empty, onRetry, emptyTitle = 'No records found', emptyText = 'Records will appear here when available.' }) {
  if (loading) return <div className="api-state" role="status"><LoaderCircle className="api-state-spin" size={22}/><strong>Loading data…</strong><span>Contacting the Preventix API.</span></div>;
  if (error) return <div className="api-state api-state-error" role="alert"><AlertCircle size={22}/><strong>Could not load data</strong><span>{error}</span>{onRetry && <button className="btn btn-secondary" onClick={onRetry}><RefreshCw size={14}/> Try again</button>}</div>;
  if (empty) return <div className="api-state"><Inbox size={22}/><strong>{emptyTitle}</strong><span>{emptyText}</span></div>;
  return null;
}
