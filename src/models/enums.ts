// Enum values shared by models, services and the admin API (PRD §8). Same values as pagesanj where they overlap.
export const SHOP_STATUSES = ['serious_warning', 'warning', 'mixed', 'recommended', 'no_known_issues'] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];

export const OUTCOMES = [
  'delivered_ok',
  'delivered_not_as_described',
  'not_delivered',
  'return_refused',
  'other_problem',
] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const DIRECTIONS = ['positive', 'negative', 'mixed'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const REVIEW_STATUSES = ['pending', 'published', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_SOURCE_TYPES = ['reviewer_post'] as const;

export const REVIEWER_PERMISSIONS = ['link_only', 'screenshot', 'embed'] as const;

export const WISHLIST_SOURCES = ['dm', 'reviewer_post'] as const;
export type WishlistSource = (typeof WISHLIST_SOURCES)[number];

export const WISHLIST_STATUSES = ['open', 'promoted', 'dismissed'] as const;

export const DM_KINDS = ['profile', 'post', 'text', 'unknown'] as const;
export type DmKind = (typeof DM_KINDS)[number];
export const DM_RESULTS = ['found', 'wishlisted', 'unresolved', 'help'] as const;
export type DmResult = (typeof DM_RESULTS)[number];

export const JOB_TYPES = ['daily_check', 'backfill', 'post_owner_lookup', 'profile_fetch', 'token_refresh', 'ai_classify', 'post_publish'] as const;
export type JobType = (typeof JOB_TYPES)[number];

// Trusted-reviewer posts: queued for AI, classified, then published by the gate or left for a person.
export const POST_CHECK_STATUSES = ['queued', 'classified', 'needs_person', 'published', 'dismissed'] as const;
export type PostCheckStatus = (typeof POST_CHECK_STATUSES)[number];

export const DELETION_STATUSES = ['pending', 'done'] as const;
export type DeletionStatus = (typeof DELETION_STATUSES)[number];

export const ADMIN_ROLES = ['owner', 'moderator'] as const;

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// Normalised Instagram handle (lowercase, no `@`); see src/lib/handle.ts.
export const HANDLE_MATCH = /^[a-z0-9._]{1,30}$/;
