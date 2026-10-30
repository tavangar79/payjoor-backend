// Publish gate for AI-classified trusted reviewer posts (PRD §6). Pure: no DB, no env; the caller passes the
// confidence floor and the merged ignore set. Every reason is collected so the admin can see why a post was held.
import { normalizeHandle } from '../lib/handle.js';
import type { Outcome } from '../models/enums.js';
import type { PostAnalysis } from './postClassify.js';

export const GATE_REASONS = [
  'not_review',
  'no_shop',
  'several_shops',
  'low_confidence',
  'no_evidence',
  'paid_partnership',
  'direction_none',
  'outcome_none',
  'invalid_handle',
  'handle_not_in_post',
  'ignored_handle',
  'scam_contradiction',
] as const;
export type GateReason = (typeof GATE_REASONS)[number];

export type GateInput = {
  analysis: PostAnalysis;
  caption: string;
  tagged: string[];
  paidPartnership: boolean;
  ignored: Set<string>;
  minConfidence: number;
};

export type GateResult = { publish: boolean; handle: string | null; outcome: Outcome | null; reasons: GateReason[] };

/** A handle written only as plain text in the caption is fine; it must still appear in the post. */
export function handleInPost(handle: string, caption: string, tagged: string[]): boolean {
  return caption.toLowerCase().includes(handle) || tagged.some((t) => t.toLowerCase() === handle);
}

export function evaluateGate(input: GateInput): GateResult {
  const { analysis, caption, tagged, ignored } = input;
  const reasons: GateReason[] = [];

  if (!analysis.isReview) reasons.push('not_review');

  // Role "other" (police, sponsors, friends) never counts as a shop.
  const reviewed = analysis.shops.filter((s) => s.role === 'reviewed_shop');
  // One rule decides what a handle is; an invalid one stays distinct under its raw text.
  const distinct = new Set(reviewed.map((s) => normalizeHandle(s.handle) ?? s.handle.trim()));
  let handle: string | null = null;
  if (distinct.size === 0) reasons.push('no_shop');
  else if (distinct.size > 1) reasons.push('several_shops');
  else {
    handle = normalizeHandle([...distinct][0]!);
    if (!handle) reasons.push('invalid_handle');
    else {
      if (!handleInPost(handle, caption, tagged)) reasons.push('handle_not_in_post');
      if (ignored.has(handle)) reasons.push('ignored_handle');
    }
  }

  if (analysis.confidence < input.minConfidence) reasons.push('low_confidence');
  if (!analysis.hasEvidence) reasons.push('no_evidence');
  if (input.paidPartnership) reasons.push('paid_partnership');
  if (analysis.direction === 'none') reasons.push('direction_none');
  if (analysis.scamClaim && analysis.direction !== 'negative') reasons.push('scam_contradiction');

  let outcome: Outcome | null = null;
  if (analysis.outcome !== 'none') outcome = analysis.outcome;
  else if (analysis.scamClaim) outcome = 'scam_reported';
  else reasons.push('outcome_none');

  return { publish: reasons.length === 0, handle, outcome, reasons };
}
