export const machines = [
  { id: 'CNC-001', name: 'CNC Milling Center', type: 'CNC Machine', location: 'Production · Line A', status: 'Healthy', health: 98, probability: 'Low', temperature: 42.8, vibration: 1.2, nextService: 'Oct 24, 2026', updated: 'Just now' },
  { id: 'PRS-004', name: 'Hydraulic Press 04', type: 'Hydraulic Press', location: 'Assembly · Line B', status: 'Warning', health: 71, probability: 'Medium', temperature: 68.4, vibration: 3.8, nextService: 'Oct 13, 2026', updated: '12 sec ago' },
  { id: 'MTR-012', name: 'Conveyor Motor 12', type: 'Electric Motor', location: 'Packaging · Line C', status: 'Critical', health: 38, probability: 'Elevated', temperature: 84.1, vibration: 6.4, nextService: 'Overdue', updated: '8 sec ago' },
  { id: 'ROB-003', name: 'Assembly Robot 03', type: 'Robotic Arm', location: 'Assembly · Line A', status: 'Healthy', health: 94, probability: 'Low', temperature: 39.2, vibration: 0.9, nextService: 'Nov 02, 2026', updated: 'Just now' },
  { id: 'PMP-008', name: 'Cooling Pump 08', type: 'Centrifugal Pump', location: 'Utilities · Plant 1', status: 'Healthy', health: 91, probability: 'Low', temperature: 46.6, vibration: 1.5, nextService: 'Oct 29, 2026', updated: '24 sec ago' },
];
export const trendData = [
  { time: '08:00', temperature: 42, vibration: 1.2, torque: 34 }, { time: '09:00', temperature: 44, vibration: 1.3, torque: 36 },
  { time: '10:00', temperature: 43, vibration: 1.1, torque: 33 }, { time: '11:00', temperature: 48, vibration: 1.6, torque: 38 },
  { time: '12:00', temperature: 46, vibration: 1.4, torque: 36 }, { time: '13:00', temperature: 51, vibration: 1.8, torque: 40 },
  { time: '14:00', temperature: 49, vibration: 1.6, torque: 37 }, { time: '15:00', temperature: 53, vibration: 2.0, torque: 42 },
  { time: '16:00', temperature: 47, vibration: 1.5, torque: 35 }, { time: '17:00', temperature: 45, vibration: 1.3, torque: 34 },
];
export const alerts = [
  { id: 'ALT-2408', severity: 'Critical', title: 'Motor temperature above threshold', machine: 'Conveyor Motor 12 · MTR-012', time: '2 min ago', action: 'Inspect cooling and bearing assembly' },
  { id: 'ALT-2407', severity: 'Warning', title: 'Elevated torque deviation detected', machine: 'Hydraulic Press 04 · PRS-004', time: '14 min ago', action: 'Review pressure and load calibration' },
  { id: 'ALT-2406', severity: 'Info', title: 'Scheduled maintenance approaching', machine: 'Cooling Pump 08 · PMP-008', time: '1 hr ago', action: 'Confirm technician assignment' },
];
export const maintenance = [
  { title: 'Bearing inspection', machine: 'Conveyor Motor 12', due: 'Today', priority: 'Urgent', assigned: 'Unassigned' },
  { title: 'Hydraulic fluid check', machine: 'Hydraulic Press 04', due: 'Oct 13', priority: 'High', assigned: 'A. Sharma' },
  { title: 'Routine calibration', machine: 'CNC Milling Center', due: 'Oct 24', priority: 'Normal', assigned: 'R. Kumar' },
];
