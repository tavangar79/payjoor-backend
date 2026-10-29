// Post shortcode -> author via the BoxAPI Data API `media/get_info_by_shortcode` (PRD §5.3), cached forever in
// postOwners. Writes a jobRuns record.
import { BoxApiError } from '../boxapi/dm.js';
import { getMediaByShortcode, type DataOptions } from '../boxapi/data.js';
import { withJobRun } from '../jobs/jobRun.js';
import { normalizeHandle } from '../lib/handle.js';
import { PostOwner } from '../models/PostOwner.js';

/** The cached owner, else one Data API call. Returns null if the post can't be read (private, deleted). */
export async function lookupPostOwner(shortcode: string, opts: DataOptions = {}): Promise<string | null> {
  const cached = await PostOwner.findOne({ shortcode }, { ownerUsername: 1 }).lean();
  if (cached) return cached.ownerUsername;

  return withJobRun('post_owner_lookup', async (ctx) => {
    const post = await getMediaByShortcode(shortcode, opts).catch((err) => {
      // Instagram says there's no such post (deleted or private): nothing to look up.
      if (err instanceof BoxApiError && (err.status === 400 || err.status === 404)) return null;
      throw err;
    });
    const owner = post?.user?.username ? normalizeHandle(post.user.username) : null;
    ctx.counts.found = owner ? 1 : 0;
    if (owner) {
      await PostOwner.updateOne(
        { shortcode },
        { $setOnInsert: { shortcode, ownerUsername: owner, fetchedAt: new Date() } },
        { upsert: true },
      );
    }
    return owner;
  });
}
