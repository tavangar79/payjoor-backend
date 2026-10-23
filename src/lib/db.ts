// Mongoose connection (PRD §11). Logs the host only, never the URI (it may hold credentials).
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export async function connectDb(uri: string = env.MONGODB_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info({ host: mongoose.connection.host, db: mongoose.connection.name }, 'mongodb connected');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

export function isDbConnected() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
