// All Mongoose models (PRD §8).
import type { Model } from 'mongoose';
import { logger } from '../lib/logger.js';
import { Admin } from './Admin.js';
import { Category } from './Category.js';
import { DeletionRequest } from './DeletionRequest.js';
import { DmEvent } from './DmEvent.js';
import { JobRun } from './JobRun.js';
import { LoginAttempt } from './LoginAttempt.js';
import { PostCheck } from './PostCheck.js';
import { PostOwner } from './PostOwner.js';
import { Review } from './Review.js';
import { ReviewerSource } from './ReviewerSource.js';
import { Shop } from './Shop.js';
import { ShopImage } from './ShopImage.js';
import { Wishlist } from './Wishlist.js';

export {
  Admin,
  Category,
  DeletionRequest,
  DmEvent,
  JobRun,
  LoginAttempt,
  PostCheck,
  PostOwner,
  Review,
  ReviewerSource,
  Shop,
  ShopImage,
  Wishlist,
};

export const allModels: Model<any>[] = [
  Admin,
  Category,
  DeletionRequest,
  DmEvent,
  JobRun,
  LoginAttempt,
  PostCheck,
  PostOwner,
  Review,
  ReviewerSource,
  Shop,
  ShopImage,
  Wishlist,
];

/** Creates missing indexes and drops ones no longer in the schemas. Run at startup in development. */
export async function syncAllIndexes() {
  for (const model of allModels) {
    const dropped = await model.syncIndexes();
    if (dropped.length) logger.warn({ model: model.modelName, dropped }, 'dropped stale indexes');
  }
}
