// Resolve a target to the handle we look up (PRD §5.3). A post resolves to its author: first from posts we
// already store (free), then the postOwners cache, else it needs an Apify lookup. Pure; lookups are injected.
import type { Target } from './parse.js';

export type ResolveDeps = {
  /** Author of a reviewer post we already store, or null. */
  ownerFromReviews(shortcode: string): Promise<string | null>;
  /** Cached author from postOwners, or null. */
  ownerFromCache(shortcode: string): Promise<string | null>;
};

export type Resolved = { handle: string } | { needsLookup: string } | { unresolved: true } | { none: true };

/** `ownerLookupDone`: the Apify lookup already ran for this message, so a cache miss means unresolved. */
export async function resolveTarget(
  target: Target,
  deps: ResolveDeps,
  opts: { ownerLookupDone?: boolean } = {},
): Promise<Resolved> {
  switch (target.kind) {
    case 'profile':
    case 'text':
      return { handle: target.handle };
    case 'post': {
      const owner = (await deps.ownerFromReviews(target.shortcode)) ?? (await deps.ownerFromCache(target.shortcode));
      if (owner) return { handle: owner };
      return opts.ownerLookupDone ? { unresolved: true } : { needsLookup: target.shortcode };
    }
    default:
      return { none: true };
  }
}
