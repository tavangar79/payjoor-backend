import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { useMongo } from '../setup/mongo.js';
import { DeletionRequest, DmEvent } from '../../src/models/index.js';
import { getDeletionStatus, hashIgsid, requestDeletion } from '../../src/services/deletion.js';
import { createApp } from '../../src/app.js';

useMongo();

describe('data deletion', () => {
  const dm = (mid: string, senderIgsid: string) => DmEvent.create({ mid, senderIgsid, kind: 'text', result: 'found' });

  it('deletes only that user\'s DM logs and keeps a hashed status record', async () => {
    await dm('a', '111');
    await dm('b', '111');
    await dm('c', '222');
    const { code, deleted } = await requestDeletion('111');
    expect(deleted).toBe(2);
    expect(await DmEvent.countDocuments()).toBe(1);
    const record = await DeletionRequest.findOne().lean();
    expect(record).toMatchObject({ confirmationCode: code, status: 'done', igsidHash: hashIgsid('111') });
    expect(record?.igsidHash).not.toContain('111');
    expect(await getDeletionStatus(code)).toBe('done');
    expect(await getDeletionStatus('0'.repeat(16))).toBeNull();
    expect(await getDeletionStatus('not-a-code')).toBeNull();
  });
});

describe('deletion status API', () => {
  it('returns the status for a code, null for unknown or malformed codes, never cached', async () => {
    const { code } = await requestDeletion('999');
    const app = createApp();
    const res = await request(app).get(`/api/deletion-status?code=${code}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'done' });
    expect(res.headers['cache-control']).toBe('no-store');
    expect((await request(app).get('/api/deletion-status?code=nope')).body).toEqual({ status: null });
    expect((await request(app).get('/api/deletion-status')).body).toEqual({ status: null });
  });
});
