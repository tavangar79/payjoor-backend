// Apify budget guard (PRD §6.2): read monthly usage before each run. Backfills stop above
// APIFY_BUDGET_STOP_USD; daily checks, post-owner lookups and profile fetches go on until the hard limit.
import { env } from '../config/env.js';
import { getUsage, type ApifyClientOptions } from './client.js';

export type RunKind = 'daily' | 'backfill' | 'post_owner' | 'profile';

export type BudgetCheck =
  | { ok: true; usageUsd: number }
  | { ok: false; usageUsd: number; reason: 'budget_stop' | 'hard_limit' };

export async function canRun(kind: RunKind, opts: ApifyClientOptions = {}): Promise<BudgetCheck> {
  const { monthlyUsageUsd: usageUsd, maxMonthlyUsageUsd } = await getUsage(opts);
  if (maxMonthlyUsageUsd !== null && usageUsd >= maxMonthlyUsageUsd) return { ok: false, usageUsd, reason: 'hard_limit' };
  if (kind === 'backfill' && usageUsd > env.APIFY_BUDGET_STOP_USD) return { ok: false, usageUsd, reason: 'budget_stop' };
  return { ok: true, usageUsd };
}
