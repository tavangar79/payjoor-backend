import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { createApp } from '../../src/app.js';

useMongo();

describe('mongo test helper and /healthz', () => {
  it('connects to the in-memory server', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('reports a healthy database', async () => {
    const res = await request(createApp()).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: true });
  });
});
