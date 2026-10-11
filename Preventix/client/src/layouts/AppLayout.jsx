import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, Bell, RadioTower, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Factory, Gauge, LayoutDashboard, Menu, Search, Settings, ShieldCheck, Wrench, X, Boxes, UserRound, Moon, Sun } from 'lucide-react';

const navGroups = [
  { label: 'WORKSPACE', items: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { to: '/machines', label: 'Machines', icon: Factory }, { to: '/live-monitor', label: 'Live Sensor Monitor', icon: RadioTower },
    { to: '/digital-twin', label: 'Digital Twin', icon: Boxes }, { to: '/predictions', label: 'Predictive Maintenance', icon: Activity },
  ]},
  { label: 'INTELLIGENCE', items: [
    { to: '/analytics', label: 'Analytics', icon: BarChart3 }, { to: '/alerts', label: 'Alerts', icon: AlertTriangle, count: '3' },
    { to: '/maintenance', label: 'Maintenance History', icon: Wrench },
  ]},
  { label: 'SYSTEM', items: [{ to: '/settings', label: 'Settings', icon: Settings }] },
];
const titles = { '/dashboard': 'Dashboard', '/machines': 'Machines', '/live-monitor': 'Live Sensor Monitor', '/digital-twin': 'Digital Twin', '/predictions': 'Predictive Maintenance', '/analytics': 'Analytics', '/alerts': 'Alerts & Events', '/maintenance': 'Maintenance History', '/settings': 'Settings', '/admin': 'Admin' };

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('preventix-theme') || 'light'; } catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#171b18' : '#f7f8f5');
    try { localStorage.setItem('preventix-theme', theme); } catch {}
  }, [theme]);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const title = titles[location.pathname] || (location.pathname.startsWith('/machines/') ? 'Machine Overview' : 'Dashboard');
  return <div className="app-shell">
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={21} strokeWidth={2.5}/></div>{!collapsed && <div className="brand-copy"><strong className="preventix-wordmark">preventix</strong><small>UNDERSTAND. PREDICT. PREVENT.</small></div>}<button className="brand-toggle icon-button" onClick={() => { if (window.matchMedia('(max-width: 900px)').matches) setMobileOpen(false); else setCollapsed(value => !value); }} aria-label={mobileOpen ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={mobileOpen ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{mobileOpen ? <X size={18}/> : collapsed ? <ChevronRight size={18}/> : <X size={18}/>}</button></div>
      <button className="plant-select"><span className="plant-icon"><Factory size={17}/></span>{!collapsed && <><span className="plant-copy"><strong>North Plant</strong><small>Lucknow, India</small></span><ChevronDown size={15} className="muted-icon"/></>}</button>
      <nav className="side-nav">{navGroups.map(group => <div className="nav-group" key={group.label}><div className="nav-label">{!collapsed && group.label}</div>{group.items.map(({ to, label, icon: Icon, count }) => <NavLink key={to} to={to} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive || (to === '/machines' && location.pathname.startsWith('/machines/')) ? 'active' : ''}`}><Icon size={18}/>{!collapsed && <><span>{label}</span>{count && <em>{count}</em>}</>}</NavLink>)}</div>)}</nav>
      <div className="sidebar-bottom"><button className="nav-link help-link"><CircleHelp size={18}/>{!collapsed && <span>Help & documentation</span>}</button><button className="collapse-button" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={17}/> : <><ChevronLeft size={17}/><span>Collapse sidebar</span></>}</button></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><div><div className="breadcrumb">OVERVIEW <span>/</span> <strong>{title.toUpperCase()}</strong></div><h1>{title}</h1></div></div><div className="topbar-actions"><div className="environment-pill"><span className="status-dot"/> Demo environment</div><button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button search-trigger" aria-label="Search" onClick={() => setSearchOpen(!searchOpen)}><Search size={18}/></button><button className="notification-button" aria-label="Notifications" onClick={() => window.location.assign('/alerts')}><Bell size={18}/><span/></button><div className="topbar-divider"/><div className="profile-wrap"><button className="profile-button" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}><span className="avatar">HY</span><span className="profile-copy"><strong>Plant Admin</strong><small>Administrator</small></span><ChevronDown size={15}/></button>{profileOpen && <div className="profile-menu"><button onClick={() => { setProfileOpen(false); navigate('/admin'); }}>Admin page</button><button onClick={() => { setProfileOpen(false); navigate('/sign-in'); }}>Sign in</button><button onClick={() => { setProfileOpen(false); navigate('/sign-up'); }}>Create account</button></div>}</div></div>
      {searchOpen && <div className="global-search"><Search size={17}/><input autoFocus placeholder="Search machines, alerts, pages…" onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); }}/><kbd>ESC</kbd></div>}</header><div className="page-content"><Outlet/></div><footer className="app-footer"><span>© 2026 Preventix</span><span>Industrial monitoring dashboard</span><span>Platform v0.1.0</span></footer></main>
  </div>;
}
