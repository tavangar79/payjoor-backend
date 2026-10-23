// Small MongoDB helpers shared by services and routes.
import mongoose from 'mongoose';

export function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

/** A 24-hex ObjectId string, or null (so a bad id in a URL becomes a 404, not a cast error). */
export function toObjectId(id: string): mongoose.Types.ObjectId | null {
  return /^[0-9a-f]{24}$/i.test(id) ? new mongoose.Types.ObjectId(id) : null;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
