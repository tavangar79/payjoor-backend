import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GATE_REASONS, evaluateGate, handleInPost } from '../../src/services/postGate.js';
import type { PostAnalysis } from '../../src/services/postClassify.js';

type FixturePost = {
  code: string;
  caption: { text: string };
  usertags?: { in: { user: { username: string } }[] };
  luna_reply: {
    is_review: boolean;
    shops: unknown[];
    direction: string;
    outcome: string;
    summary: string;
    category: string;
    scam_claim: boolean;
    has_evidence: boolean;
    confidence: number;
  };
};
const fixture: FixturePost[] = JSON.parse(
  readFileSync(new URL('../fixtures/boxapi/trusted-posts.nulbox.json', import.meta.url), 'utf8'),
);

const clear: PostAnalysis = {
  isReview: true,
  shops: [{ handle: 'ananas__collection', role: 'reviewed_shop' }],
  direction: 'positive',
  outcome: 'delivered_ok',
  summary: 'x',
  category: '',
  scamClaim: false,
  hasEvidence: true,
  confidence: 0.93,
  model: 'm',
};

const base = { caption: 'buy from ananas__collection', tagged: [] as string[], paidPartnership: false, ignored: new Set<string>(), minConfidence: 0.8 };
const gate = (analysis: Partial<PostAnalysis> = {}, over: Partial<typeof base> = {}) =>
  evaluateGate({ ...base, ...over, analysis: { ...clear, ...analysis } });

// Luna's recorded reply for a fixture post, in the camelCase shape the classifier returns.
function recorded(code: string) {
  const post = fixture.find((p) => p.code === code)!;
  const r = post.luna_reply;
  const analysis: PostAnalysis = {
    isReview: r.is_review,
    shops: r.shops as PostAnalysis['shops'],
    direction: r.direction as PostAnalysis['direction'],
    outcome: r.outcome as PostAnalysis['outcome'],
    summary: r.summary,
    category: r.category,
    scamClaim: r.scam_claim,
    hasEvidence: r.has_evidence,
    confidence: r.confidence,
    model: 'luna',
  };
  const tags = post.usertags?.in ?? [];
  return { analysis, caption: post.caption.text, tagged: tags.map((t) => t.user.username) };
}

describe('evaluateGate', () => {
  it('publishes a clear review', () => {
    expect(gate()).toEqual({ publish: true, handle: 'ananas__collection', outcome: 'delivered_ok', reasons: [] });
  });

  it('holds crop_shoop: outcome none, no scam, confidence 0.69', () => {
    const r = evaluateGate({ ...base, ...recorded('DfAarGWThaQ') });
    expect(r.publish).toBe(false);
    expect(r.reasons).toEqual(expect.arrayContaining(['low_confidence', 'outcome_none']));
  });

  it('publishes a scam claim with outcome none as scam_reported', () => {
    const r = gate({ scamClaim: true, outcome: 'none', direction: 'negative' });
    expect(r).toMatchObject({ publish: true, outcome: 'scam_reported' });
  });

  it('allows a plain-text handle written in the caption, vebo.ir', () => {
    const r = evaluateGate({ ...base, ...recorded('DbGtnuJoiHd') });
    expect(r).toEqual({ publish: true, handle: 'vebo.ir', outcome: 'scam_reported', reasons: [] });
  });

  it('holds a handle in neither caption nor tags', () => {
    const r = gate({}, { caption: 'something else' });
    expect(r.publish).toBe(false);
    expect(r.reasons).toContain('handle_not_in_post');
  });

  it('accepts a handle found only in the tags', () => {
    expect(gate({}, { caption: 'hello', tagged: ['ananas__collection'] }).publish).toBe(true);
  });

  it('drops role other: police tags do not count as shops', () => {
    const r = gate({ shops: [{ handle: 'policefata_faraja', role: 'other' }, ...clear.shops] });
    expect(r.publish).toBe(true);
    expect(r.handle).toBe('ananas__collection');
  });

  it('strips @ from @crop_shoop', () => {
    const r = gate({ shops: [{ handle: '@Crop_Shoop', role: 'reviewed_shop' }] }, { caption: 'page @crop_shoop' });
    expect(r.handle).toBe('crop_shoop');
    expect(r.publish).toBe(true);
  });

  it('holds a Persian non-handle such as دیجیکالا', () => {
    const r = gate({ shops: [{ handle: 'دیجیکالا', role: 'reviewed_shop' }] });
    expect(r.publish).toBe(false);
    expect(r.handle).toBeNull();
    expect(r.reasons).toContain('invalid_handle');
  });

  it('holds two reviewed shops', () => {
    const r = gate({ shops: [...clear.shops, { handle: 'other.shop', role: 'reviewed_shop' }] });
    expect(r.reasons).toContain('several_shops');
    expect(r.publish).toBe(false);
  });

  it('holds no reviewed shop and a non-review', () => {
    expect(gate({ shops: [] }).reasons).toContain('no_shop');
    expect(gate({ isReview: false }).reasons).toContain('not_review');
  });

  it('holds direction none, paid partnership, ignored handle, and no evidence', () => {
    expect(gate({ direction: 'none' }).reasons).toContain('direction_none');
    expect(gate({}, { paidPartnership: true }).reasons).toContain('paid_partnership');
    expect(gate({}, { ignored: new Set(['ananas__collection']) }).reasons).toContain('ignored_handle');
    expect(gate({ hasEvidence: false }).reasons).toContain('no_evidence');
  });

  it('collects every reason, not just the first', () => {
    const r = gate({ confidence: 0.1, direction: 'none', outcome: 'none', hasEvidence: false }, { paidPartnership: true });
    expect(r.reasons).toEqual(
      expect.arrayContaining(['low_confidence', 'direction_none', 'outcome_none', 'no_evidence', 'paid_partnership']),
    );
  });

  it('holds a scam claim that is not negative: scam_contradiction', () => {
    expect(gate({ scamClaim: true, direction: 'positive' }).reasons).toContain('scam_contradiction');
    expect(gate({ scamClaim: true, direction: 'mixed' }).publish).toBe(false);
    expect(gate({ scamClaim: true, direction: 'negative' }).reasons).not.toContain('scam_contradiction');
  });

  it('holds a scam_reported outcome with no scam claim: scam_contradiction', () => {
    const r = gate({ outcome: 'scam_reported', scamClaim: false, direction: 'negative' });
    expect(r.publish).toBe(false);
    expect(r.reasons).toEqual(['scam_contradiction']);
    expect(gate({ outcome: 'scam_reported', scamClaim: true, direction: 'negative' })).toMatchObject({ publish: true, outcome: 'scam_reported' });
  });

  it.each(['not_delivered', 'return_refused', 'scam_reported'] as const)('holds positive with %s: model_contradiction', (outcome) => {
    const r = gate({ direction: 'positive', outcome, scamClaim: outcome === 'scam_reported' });
    expect(r.publish).toBe(false);
    expect(r.reasons).toContain('model_contradiction');
  });

  it('a positive direction fits a good outcome, and a bad outcome fits other directions', () => {
    expect(gate({ direction: 'positive', outcome: 'delivered_ok' }).reasons).toEqual([]);
    expect(gate({ direction: 'negative', outcome: 'not_delivered' }).reasons).toEqual([]);
    expect(gate({ direction: 'mixed', outcome: 'return_refused' }).reasons).toEqual([]);
  });

  it('holds an empty or over-long summary: bad_summary', () => {
    expect(gate({ summary: '' }).reasons).toEqual(['bad_summary']);
    expect(gate({ summary: '   ' }).reasons).toEqual(['bad_summary']);
    expect(gate({ summary: 'x'.repeat(501) }).reasons).toEqual(['bad_summary']);
    expect(gate({ summary: 'x'.repeat(500) }).publish).toBe(true);
  });

  it('holds a truncated handle: vebo against vebo.ir, siamak against @siamak_kala', () => {
    const shop = (handle: string) => ({ shops: [{ handle, role: 'reviewed_shop' as const }] });
    expect(gate(shop('vebo'), { caption: 'خرید از vebo.ir کلاهبرداری بود' }).reasons).toContain('handle_not_in_post');
    expect(gate(shop('siamak'), { caption: 'پیج @siamak_kala' }).reasons).toContain('handle_not_in_post');
  });

  it('counts one shop written two ways as one', () => {
    const r = gate({ shops: [...clear.shops, { handle: '@Ananas__Collection', role: 'reviewed_shop' }] });
    expect(r.reasons).not.toContain('several_shops');
  });

  it('exports the reason list for the admin', () => {
    expect(GATE_REASONS).toHaveLength(14);
    expect(GATE_REASONS).toContain('ignored_handle');
  });
});

describe('handleInPost', () => {
  it.each([
    ['vebo.ir', 'vebo.ir'],
    ['vebo.ir', 'سایت vebo.ir.'],
    ['vebo.ir', 'سایت vebo.ir... بود'],
    ['vebo.ir', 'Vebo.IR را ببینید'],
    ['vebo.ir', 'پیج @vebo.ir، خرید نکنید'],
    ['vebo.ir', 'https://vebo.ir/shop'],
    ['crop_shoop', '#crop_shoop'],
    ['crop_shoop', '(crop_shoop)'],
    ['crop_shoop', 'پیجcrop_shoopبود'],
  ])('finds %s in %j', (handle, caption) => {
    expect(handleInPost(handle, caption, [])).toBe(true);
  });

  it.each([
    ['vebo', 'vebo.ir'],
    ['ir', 'vebo.ir'],
    ['siamak', '@siamak_kala'],
    ['kala', '@siamak_kala'],
    ['shop', '#shop_online'],
    ['shop', 'shop1'],
    ['vebo.i', 'vebo.ir'],
  ])('does not find %s inside %j', (handle, caption) => {
    expect(handleInPost(handle, caption, [])).toBe(false);
  });

  it('matches a tagged handle exactly, whatever its case', () => {
    expect(handleInPost('siamak_kala', 'x', ['Siamak_Kala'])).toBe(true);
    expect(handleInPost('siamak', 'x', ['siamak_kala'])).toBe(false);
  });
});
