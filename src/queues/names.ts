// BullMQ queue names (PRD §11).
export const QUEUES = {
  dmInbound: 'dm-inbound',
  postOwner: 'post-owner',
  dmSend: 'dm-send',
  reviewerDaily: 'reviewer-daily',
  reviewerBackfill: 'reviewer-backfill',
  shopProfile: 'shop-profile',
  ai: 'ai',
  postPublish: 'post-publish',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
