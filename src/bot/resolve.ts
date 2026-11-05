// Resolve a target to the handle we look up (PRD §5.3). A post resolves to its author only from data we already
// have (posts we store, then the postOwners cache); otherwise we ask for the profile and never call the paid
// Data API. Pure; lookups are injected.
import type { Target } from './parse.js';

export type ResolveDeps = {
  /** Author of a reviewer post we already store, or null. */
  ownerFromReviews(shortcode: string): Promise<string | null>;
  /** Cached author from postOwners, or null. */
  ownerFromCache(shortcode: string): Promise<string | null>;
};

export type Resolved = { handle: string } | { unresolved: true } | { none: true };

export async function resolveTarget(target: Target, deps: ResolveDeps): Promise<Resolved> {
  switch (target.kind) {
    case 'profile':
    case 'text':
      return { handle: target.handle };
    case 'post': {
      const owner = (await deps.ownerFromReviews(target.shortcode)) ?? (await deps.ownerFromCache(target.shortcode));
      return owner ? { handle: owner } : { unresolved: true };
    }
    default:
      return { none: true };
  }
}
