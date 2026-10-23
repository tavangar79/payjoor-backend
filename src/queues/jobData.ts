// Job payloads for the DM queues (PRD §5.1), shared by the webhook route and the workers.
import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';
import { z } from 'zod';

export const dmMessage = z.object({
  text: z.string().max(5_000).optional(),
  attachments: z
    .array(z.object({ type: z.string().optional(), payload: z.object({ url: z.string().optional(), title: z.string().optional() }).partial().optional() }))
    .max(20)
    .optional(),
});

export const dmInboundData = z.object({
  mid: z.string().min(1),
  senderIgsid: z.string().min(1),
  receivedAt: z.string(),
  message: dmMessage,
  // Set on the job the post-owner worker re-enqueues (§5.1).
  ownerLookupDone: z.boolean().optional(),
});
export type DmInboundData = z.infer<typeof dmInboundData>;

export const postOwnerData = z.object({ shortcode: z.string().min(1), dm: dmInboundData });
export type PostOwnerData = z.infer<typeof postOwnerData>;

export const dmSendData = z.object({
  mid: z.string().min(1),
  recipient: z.string().min(1),
  text: z.string().min(1),
  // The last part of the reply: sets dmEvents.replySentAt.
  last: z.boolean(),
});
export type DmSendData = z.infer<typeof dmSendData>;

/** BullMQ job ids can't contain `:`; Meta mids are base64 but play safe. Deterministic, so retries dedupe. */
export function dmJobId(mid: string, suffix?: string): string {
  const id = mid.replaceAll(':', '_');
  return suffix ? `${id}-${suffix}` : id;
}

/** True when BullMQ won't run this job again after the error. */
export function isFinalAttempt(job: Pick<Job, 'attemptsMade' | 'opts'>, err: unknown): boolean {
  return err instanceof UnrecoverableError || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
}
