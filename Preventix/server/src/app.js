import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import machinesRouter from './routes/machines.js';
import alertsRouter from './routes/alerts.js';
import maintenanceRouter from './routes/maintenance.js';
import predictionsRouter from './routes/predictions.js';
import mlRouter from './routes/ml.js';
import dashboardRouter from './routes/dashboard.js';
import simulatorRouter from './routes/simulator.js';
import automationRouter from './routes/automation.js';
import authRouter from './routes/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(origin => origin.trim());
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use('/api', rateLimit({ windowMs: 60_000, max: 240 }));
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS.'));
} }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'preventix-api', timestamp: new Date().toISOString(), database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.get('/api/health/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not-ready', database: ready ? 'connected' : 'disconnected' });
});
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/machines', machinesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/ml', mlRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/automation', automationRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
