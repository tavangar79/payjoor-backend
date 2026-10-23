// apify-profile worker (PRD §5.6): one profile run per handle. Without a shopId it returns a draft for the
// "new shop" form; with one it applies the result to that shop (refresh). Always writes a jobRuns record.
import { UnrecoverableError, type Job } from 'bullmq';
import type { Logger } from 'pino';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { canRun } from '../../apify/budget.js';
import { ApifyError, runActor, type ApifyClientOptions } from '../../apify/client.js';
import { mapProfile, type ProfileItem } from '../../apify/profile.js';
import { withJobRun } from '../../jobs/jobRun.js';
import { downloadImage } from '../../lib/download.js';
import { normalizeHandle } from '../../lib/handle.js';
import { toObjectId } from '../../lib/mongo.js';
import { saveShopImage, updateShop, type StoredImage } from '../../services/shops.js';
import { QUEUES } from '../names.js';
import type { WorkerDefinition } from './index.js';

export const profileJobData = z.object({
  handle: z.string().min(1),
  shopId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
});
export type ProfileJobData = z.infer<typeof profileJobData>;

export type ProfileDraft = {
  handle: string;
  displayName?: string;
  image: (StoredImage & { url: string }) | null;
  // Why there is no image: the admin must upload one before saving (§5.6).
  imageError?: string;
  contact: { email: string | null; website: string | null; phone: string | null };
  fetchedAt: string;
};

export type ProfileDeps = ApifyClientOptions & { download?: typeof downloadImage };

export async function fetchProfile(data: ProfileJobData, log: Logger, deps: ProfileDeps = {}): Promise<ProfileDraft> {
  const handle = normalizeHandle(data.handle);
  if (!handle) throw new UnrecoverableError('invalid_handle');

  return withJobRun('profile_fetch', async (ctx) => {
    const budget = await canRun('profile', deps);
    if (!budget.ok) {
      log.warn({ usageUsd: budget.usageUsd, reason: budget.reason }, 'apify budget: profile fetch skipped');
      throw new UnrecoverableError(`apify_${budget.reason}`);
    }

    const { run, items } = await runActor<ProfileItem>(env.APIFY_PROFILE_ACTOR, { usernames: [handle] }, {
      ...deps,
      onStart: (r) => (ctx.apifyRunId = r.id),
    });
    ctx.costUsd = run.usageTotalUsd;
    ctx.counts.items = items.length;

    const profile = mapProfile(items, handle);
    if (!profile) throw new UnrecoverableError('profile_not_found');

    let image: StoredImage | null = null;
    let imageError: string | undefined;
    if (!profile.imageUrl) imageError = 'no_image_url';
    else {
      try {
        image = await saveShopImage(await (deps.download ?? downloadImage)(profile.imageUrl, deps.fetch));
      } catch (err) {
        imageError = err instanceof Error ? err.message : String(err);
        log.warn({ handle, imageError }, 'profile image not stored');
      }
    }
    ctx.counts.imageStored = image ? 1 : 0;

    const fetchedAt = new Date();
    const contact = { email: profile.email ?? null, website: profile.website ?? null, phone: profile.phone ?? null };

    // Refresh: replace the image if we got one, and the contact fields; fields the page no longer shows are cleared.
    if (data.shopId) {
      await updateShop(toObjectId(data.shopId)!, {
        ...(image && { profileImageId: image.imageId }),
        contact,
        profileFetchedAt: fetchedAt,
      });
    }

    return {
      handle,
      displayName: profile.fullName,
      image: image && { ...image, url: `/media/shop/${image.sha256}` },
      imageError,
      contact,
      fetchedAt: fetchedAt.toISOString(),
    };
  });
}

export const apifyProfileWorker: WorkerDefinition = {
  queue: QUEUES.apifyProfile,
  // A 4xx or a failed run won't fix itself, and every retry is another paid run.
  processor: (job: Job, log) =>
    fetchProfile(profileJobData.parse(job.data), log).catch((err) => {
      if (err instanceof ApifyError && !err.retryable) throw new UnrecoverableError(err.message);
      throw err;
    }),
  options: { concurrency: 2 },
};
