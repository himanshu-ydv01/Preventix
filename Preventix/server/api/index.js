
import 'dotenv/config';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error('Preventix API error:', error.message);

    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable',
    });
  }
}
