// loginAttempts: failed-login lockout, as in pagesanj (PRD §8, §9.1).
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const loginAttemptSchema = new Schema(
  {
    // `<ip>|<username>`
    key: { type: String, required: true, unique: true },
    failures: { type: Number, required: true, default: 0 },
    windowStart: { type: Date, required: true },
    lockedUntil: Date,
  },
  { collection: 'loginAttempts' },
);

export type LoginAttemptDoc = InferSchemaType<typeof loginAttemptSchema> & { _id: mongoose.Types.ObjectId };
export const LoginAttempt =
  (mongoose.models.LoginAttempt as mongoose.Model<LoginAttemptDoc>) ||
  mongoose.model<LoginAttemptDoc>('LoginAttempt', loginAttemptSchema);
