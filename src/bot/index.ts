// handleMessage(message) -> reply plan. Pure and transport-agnostic (PRD §5, §10.8): the caller (the
// dm-inbound worker, or later ManyChat) sends the replies and runs the owner lookup when asked to.
import type { DmResult } from '../models/enums.js';
import { strings } from '../i18n/index.js';
import { detectLang, type Lang } from './language.js';
import { lookupHandle, type LookupDeps } from './lookup.js';
import { parseMessage, type IncomingMessage, type Target } from './parse.js';
import { buildShopReply } from './reply.js';
import { resolveTarget, type ResolveDeps } from './resolve.js';

export type BotDeps = ResolveDeps &
  LookupDeps & {
    categoryNames(ids: string[], lang: Lang): Promise<string[]>;
    /** Not found: add to the wishlist or bump its count (§5.1 step 7). */
    addWishlistRequest(handle: string): Promise<void>;
  };

export type BotOutcome = {
  kind: Target['kind'];
  lang: Lang;
  targetHandle?: string;
  /** Unset while an owner lookup is pending. */
  result?: DmResult;
  replies: string[];
  /** Run the post-owner lookup for this shortcode, then call handleMessage again with ownerLookupDone. */
  needsOwnerLookup?: string;
};

export async function handleMessage(
  msg: IncomingMessage,
  deps: BotDeps,
  opts: { ownerLookupDone?: boolean } = {},
): Promise<BotOutcome> {
  const lang = detectLang(msg.text);
  const t = strings[lang];
  const target = parseMessage(msg);
  const base = { kind: target.kind, lang };

  const resolved = await resolveTarget(target, deps, opts);
  if ('none' in resolved) return { ...base, result: 'help', replies: [t.help] };
  if ('unresolved' in resolved) return { ...base, result: 'unresolved', replies: [t.unresolved] };
  if ('needsLookup' in resolved) return { ...base, replies: [t.checking], needsOwnerLookup: resolved.needsLookup };

  const handle = resolved.handle;
  const found = await lookupHandle(handle, deps);
  if (!found.found) {
    await deps.addWishlistRequest(handle);
    return { ...base, targetHandle: handle, result: 'wishlisted', replies: [t.notFound] };
  }
  const categoryNames = await deps.categoryNames(found.shop.categoryIds, lang);
  return {
    ...base,
    targetHandle: found.shop.handle,
    result: 'found',
    replies: buildShopReply({ ...found, categoryNames }, lang),
  };
}
