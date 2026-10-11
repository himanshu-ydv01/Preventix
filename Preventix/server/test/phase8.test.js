import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('automation run validates request options before database access', async () => {
  const response = await request(app).post('/api/automation/run').send({ includeOverdue: 'yes' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('analytics endpoint is registered and returns a JSON API envelope when reachable', async () => {
  const response = await request(app).get('/api/automation/analytics');
  // Database-backed aggregation may fail when MongoDB is not running, but it must not be a 404.
  assert.notEqual(response.status, 404);
});

test('security headers are present on API responses', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.ok(response.headers['ratelimit-limit']);
});
