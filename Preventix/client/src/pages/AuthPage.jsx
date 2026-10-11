import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, LockKeyhole } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || '/api';
export default function AuthPage({ mode = 'sign-in' }) {
  const signup = mode === 'sign-up';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${API}/auth/${signup ? 'sign-up' : 'sign-in'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(signup ? { name } : {}), email, password }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to authenticate.');
      localStorage.setItem('preventix-token', payload.data.token);
      localStorage.setItem('preventix-user', JSON.stringify(payload.data.user));
      navigate(payload.data.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) { setError(err.message || 'Unable to connect to the server.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-card"><Link to="/dashboard" className="auth-brand"><span className="brand-mark"><Activity size={21}/></span><strong>preventix</strong></Link><div className="auth-heading"><span className="auth-icon"><LockKeyhole size={19}/></span><h1>{signup ? 'Create your account' : 'Welcome back'}</h1><p>{signup ? 'Register to access the Preventix workspace.' : 'Sign in to continue to your workspace.'}</p></div><form onSubmit={submit} className="auth-form">{signup && <label>Full name<input required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your name"/></label>}<label>Email address<input required type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com"/></label><label>Password<input required type="password" minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} placeholder="At least 8 characters"/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button></form><p className="auth-switch">{signup ? 'Already have an account?' : 'New to Preventix?'} <Link to={signup ? '/sign-in' : '/sign-up'}>{signup ? 'Sign in' : 'Create an account'}</Link></p><p className="auth-note">Access is subject to your workspace permissions.</p></section></main>;
}
