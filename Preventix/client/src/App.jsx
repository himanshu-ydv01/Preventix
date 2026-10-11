import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import MachineDetailPage from './pages/MachineDetailPage.jsx';
import MachinesPage from './pages/MachinesPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import LiveMonitorPage from './pages/LiveMonitorPage.jsx';
import DigitalTwinPage from './pages/DigitalTwinPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import PredictionsPage from './pages/PredictionsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AuthPage from './pages/AuthPage.jsx';

export default function App() {
  return <Routes><Route path="sign-in" element={<AuthPage mode="sign-in"/>}/><Route path="sign-up" element={<AuthPage mode="sign-up"/>}/><Route element={<AppLayout/>}><Route index element={<Navigate to="/dashboard" replace/>}/><Route path="dashboard" element={<Dashboard/>}/><Route path="machines" element={<MachinesPage/>}/><Route path="machines/:id" element={<MachineDetailPage/>}/><Route path="digital-twin" element={<DigitalTwinPage/>}/><Route path="predictions" element={<PredictionsPage/>}/><Route path="analytics" element={<AnalyticsPage/>}/><Route path="live-monitor" element={<LiveMonitorPage/>}/><Route path="alerts" element={<AlertsPage/>}/><Route path="maintenance" element={<MaintenancePage/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="admin" element={<AdminPage/>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Route></Routes>;
}
