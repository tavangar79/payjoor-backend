// metaToken: the Instagram access token, a single document (PRD §8, §10.6).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const META_TOKEN_KEY = 'instagram';
export const META_TOKEN_AAD = 'meta:token';

const metaTokenSchema = new Schema(
  {
    // Fixed value with a unique index, so there is only ever one document.
    key: { type: String, required: true, unique: true, default: META_TOKEN_KEY, enum: [META_TOKEN_KEY] },
    // encryptField(token, DATA_ENCRYPTION_KEY, META_TOKEN_AAD)
    accessTokenEnc: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    refreshedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'metaToken' },
);

export type MetaTokenDoc = InferSchemaType<typeof metaTokenSchema> & { _id: mongoose.Types.ObjectId };
export const MetaToken =
  (mongoose.models.MetaToken as mongoose.Model<MetaTokenDoc>) ||
  mongoose.model<MetaTokenDoc>('MetaToken', metaTokenSchema);
