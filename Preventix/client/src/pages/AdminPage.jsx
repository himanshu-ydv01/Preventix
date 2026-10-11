import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, ShieldCheck, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || '/api';
export default function AdminPage() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('preventix-user') || 'null'); } catch { return null; } });
  const [users, setUsers] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('preventix-token');
    if (!token || user?.role !== 'admin') { setError('Sign in with an administrator account to view this page.'); setLoading(false); return; }
    fetch(`${API}/auth/users`, { headers: { Authorization: `Bearer ${token}` } }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data?.error?.message || 'Unable to load users.'); setUsers(data.data.users || []); }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  function signOut() { localStorage.removeItem('preventix-token'); localStorage.removeItem('preventix-user'); navigate('/sign-in', { replace: true }); }
  return <div className="subpage admin-page"><div className="page-intro"><div><div className="eyebrow"><span className="eyebrow-line"/> WORKSPACE</div><h2>Admin</h2><p>Manage workspace access and review registered accounts.</p></div><button className="btn btn-secondary" onClick={signOut}><LogOut size={15}/> Sign out</button></div>{error ? <section className="panel admin-message"><ShieldCheck size={24}/><h3>Administrator access</h3><p>{error}</p><Link className="btn btn-primary" to="/sign-in">Go to sign in</Link></section> : <section className="panel admin-users"><div className="section-title"><div><h2><Users size={17}/> User accounts</h2><p>Registered Preventix accounts</p></div><span className="settings-updated">{users.length} accounts</span></div>{loading ? <p className="admin-empty">Loading accounts…</p> : users.length ? <div className="admin-user-list">{users.map(item => <div className="admin-user" key={item.id}><span className="avatar">{(item.name || item.email || 'U').slice(0,2).toUpperCase()}</span><span><strong>{item.name}</strong><small>{item.email}</small></span><span className="settings-state ok">{item.role}</span></div>)}</div> : <p className="admin-empty">No accounts found.</p>}</section>}<Link className="admin-back" to="/dashboard"><ArrowLeft size={14}/> Back to dashboard</Link></div>;
}
