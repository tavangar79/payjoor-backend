// admins: people who can log in to the admin panel (PRD §8, §9.1).
// Same fields and formats as pagesanj's AdminAccount, so `admin:import` copies a record as is.
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { ADMIN_ROLES } from './enums.js';

export const TOTP_AAD = 'admin:totp';

const adminSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // scrypt$N$r$p$<salt>$<hash>
    passwordHash: { type: String, required: true },
    // encryptField(secret, DATA_ENCRYPTION_KEY, TOTP_AAD)
    totpSecretEnc: { type: String, required: true },
    role: { type: String, enum: ADMIN_ROLES, default: 'owner' },
    lastTotpStep: Number,
    lastLoginAt: Date,
  },
  { timestamps: true, collection: 'admins' },
);

export type AdminDoc = InferSchemaType<typeof adminSchema> & { _id: mongoose.Types.ObjectId };
export const Admin =
  (mongoose.models.Admin as mongoose.Model<AdminDoc>) || mongoose.model<AdminDoc>('Admin', adminSchema);
