import { beforeAll, describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';
import { useMongo } from '../setup/mongo.js';
import { Review, ReviewerSource, Shop, syncAllIndexes } from '../../src/models/index.js';
import { createShop, saveShopImage, updateShop } from '../../src/services/shops.js';
import { approveReview, rejectReview } from '../../src/services/reviews.js';
import { deriveShopStatus, syncShopStatus } from '../../src/services/shopStatus.js';

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('x')]);

async function newShop(over: Record<string, unknown> = {}) {
  return createShop({ handle: 'maashmamad', displayName: 'Maash', profileImageId: (await saveShopImage(PNG)).imageId, ...over });
}

let n = 0;
async function review(shopId: Types.ObjectId, direction: 'positive' | 'negative' | 'mixed', status = 'published') {
  const src = (await ReviewerSource.findOne()) ?? (await ReviewerSource.create({ handle: 'src', name: 'Src' }));
  n++;
  return Review.create({
    shopId,
    reviewerSourceId: src._id,
    postShortcode: `C${n}`,
    postUrl: `https://www.instagram.com/p/C${n}/`,
    occurredAt: new Date(),
    status,
    direction,
    outcome: 'delivered_ok',
  });
}

describe('deriveShopStatus', () => {
  it('all positive: recommended', () => expect(deriveShopStatus(['positive', 'positive'], [])).toBe('recommended'));
  it('all negative: warning', () => expect(deriveShopStatus(['negative'], [])).toBe('warning'));
  it('both, or any mixed: mixed', () => {
    expect(deriveShopStatus(['positive', 'negative'], [])).toBe('mixed');
    expect(deriveShopStatus(['mixed'], [])).toBe('mixed');
    expect(deriveShopStatus(['positive', 'mixed'], [])).toBe('mixed');
  });
  it('scammer tag: serious_warning whatever the reviews', () => {
    expect(deriveShopStatus(['positive'], ['scammer'])).toBe('serious_warning');
    expect(deriveShopStatus([], ['scammer'])).toBe('serious_warning');
  });
  it('no reviews and no tag: null', () => expect(deriveShopStatus([], ['other'])).toBeNull());
});

describe('syncShopStatus', () => {
  it('derives from published reviews only and leaves status unchanged with none', async () => {
    const shop = await newShop();
    await syncShopStatus(shop._id);
    expect((await Shop.findById(shop._id))!.status).toBe('no_known_issues');
    await review(shop._id, 'positive');
    await review(shop._id, 'negative', 'pending');
    await syncShopStatus(shop._id);
    expect(await Shop.findById(shop._id)).toMatchObject({ status: 'recommended', statusManual: false });
  });

  it('skips a shop with statusManual, unless it has the scammer tag', async () => {
    const shop = await newShop({ status: 'warning' });
    await Shop.updateOne({ _id: shop._id }, { statusManual: true });
    await review(shop._id, 'positive');
    await syncShopStatus(shop._id);
    expect((await Shop.findById(shop._id))!.status).toBe('warning');
    await Shop.updateOne({ _id: shop._id }, { tags: ['scammer'] });
    await syncShopStatus(shop._id);
    expect(await Shop.findById(shop._id)).toMatchObject({ status: 'serious_warning', statusManual: true });
  });

  it('approve and reject keep the status in sync; rejecting keeps the scammer tag status', async () => {
    const shop = await newShop();
    const r = await review(shop._id, 'negative', 'pending');
    await approveReview(r._id, { outcome: 'not_delivered', direction: 'negative' });
    expect((await Shop.findById(shop._id))!.status).toBe('warning');
    await rejectReview(r._id, 'wrong');
    expect((await Shop.findById(shop._id))!.status).toBe('warning');

    const scam = await newShop({ handle: 'vebo.ir', tags: ['scammer'], status: 'serious_warning' });
    const sr = await review(scam._id, 'negative', 'published');
    await rejectReview(sr._id, 'no');
    expect(await Shop.findById(scam._id)).toMatchObject({ status: 'serious_warning', tags: ['scammer'] });
  });
});

describe('updateShop statusManual', () => {
  it('is set only when the status value changes', async () => {
    const shop = await newShop();
    await updateShop(shop._id, { status: 'no_known_issues', displayName: 'New' });
    expect((await Shop.findById(shop._id))!.statusManual).toBe(false);
    await updateShop(shop._id, { status: 'warning' });
    expect((await Shop.findById(shop._id))!.statusManual).toBe(true);
  });
});
