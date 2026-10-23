// Data deletion from Meta's callback (PRD §7.3, §8 deletionRequests, §12): delete the user's DM logs and
// keep a status record under a confirmation code. Only a keyed hash of the user's ID is kept.
import { createHmac, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { DeletionRequest } from '../models/DeletionRequest.js';
import { DmEvent } from '../models/DmEvent.js';
import type { DeletionStatus } from '../models/enums.js';

export function hashIgsid(id: string): string {
  return createHmac('sha256', env.DATA_ENCRYPTION_KEY).update(`igsid:${id}`).digest('hex');
}

export function statusUrl(code: string): string {
  return new URL(`/en/data-deletion/status?code=${encodeURIComponent(code)}`, env.PUBLIC_BASE_URL).toString();
}

/** Records the request, deletes the user's dmEvents, marks it done. Returns the confirmation code. */
export async function requestDeletion(userId: string): Promise<{ code: string; deleted: number }> {
  const code = randomBytes(8).toString('hex');
  const request = await DeletionRequest.create({ confirmationCode: code, igsidHash: hashIgsid(userId), status: 'pending' });
  const { deletedCount } = await DmEvent.deleteMany({ senderIgsid: userId });
  await DeletionRequest.updateOne({ _id: request._id }, { $set: { status: 'done' } });
  return { code, deleted: deletedCount };
}

export async function getDeletionStatus(code: string): Promise<DeletionStatus | null> {
  if (!/^[0-9a-f]{16}$/.test(code)) return null;
  return (await DeletionRequest.findOne({ confirmationCode: code }, { status: 1 }).lean())?.status ?? null;
}
