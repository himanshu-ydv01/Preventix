import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('GET /api/health returns liveness without requiring MongoDB', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'preventix-api');
});

test('unknown routes return a consistent 404 envelope', async () => {
  const response = await request(app).get('/api/not-a-route');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'NOT_FOUND');
});

test('machine creation rejects malformed payload before database access', async () => {
  const response = await request(app).post('/api/machines').send({ machineId: 'x', name: '', type: 3 });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(response.body.error.details));
});

test('machine listing validates bounded pagination before database access', async () => {
  const response = await request(app).get('/api/machines?limit=1000');
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});
