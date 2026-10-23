// AES-256-GCM field encryption, copied from trust-me src/server/crypto.ts (PRD §9.1).
// Keep byte-compatible: `v1:<iv b64>:<tag b64>:<ciphertext b64>`, AAD per use (`admin:totp`, `meta:token`).
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function encryptField(plain: string, key: Buffer = env.DATA_ENCRYPTION_KEY, aad = ''): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

/** Throws on unknown version, malformed token, or failed GCM authentication (tampering). */
export function decryptField(token: string, key: Buffer = env.DATA_ENCRYPTION_KEY, aad = ''): string {
  const parts = token.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Unsupported or malformed encrypted field');
  }
  const [, ivB64, tagB64, ctB64] = parts as [string, string, string, string];
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('Malformed encrypted field: bad IV or auth tag length');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_BYTES });
  decipher.setAuthTag(tag);
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}
