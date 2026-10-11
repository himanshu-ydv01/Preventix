import 'dotenv/config';
import app from './app.js';
import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { attachSocketServer, getSimulatorStatus, stopSimulator } from './services/simulator.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';

const port = Number(process.env.PORT || 4000);
const httpServer = createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(origin => origin.trim()) } });
attachSocketServer(io);
io.on('connection', socket => { socket.emit('simulator:status', getSimulatorStatus()); });
let server;

try {
  await connectDatabase();
  server = httpServer.listen(port, () => console.log(`Preventix API + realtime socket listening on http://localhost:${port}`));
} catch (error) {
  console.error(`Preventix could not start: ${error.message}`);
  process.exitCode = 1;
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down Preventix API…`);
  stopSimulator('server-shutdown');
  if (server) await new Promise(resolve => io.close(resolve));
  else io.close();
  await disconnectDatabase();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
