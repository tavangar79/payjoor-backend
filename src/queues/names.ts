// BullMQ queue names (PRD §11).
export const QUEUES = {
  dmInbound: 'dm-inbound',
  postOwner: 'post-owner',
  dmSend: 'dm-send',
  apifyDaily: 'apify-daily',
  apifyBackfill: 'apify-backfill',
  apifyProfile: 'apify-profile',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
