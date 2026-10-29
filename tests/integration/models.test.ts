import { beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { useMongo } from '../setup/mongo.js';
import {
  Admin,
  Category,
  DeletionRequest,
  DmEvent,
  JobRun,
  LoginAttempt,
  PostOwner,
  Review,
  ReviewerSource,
  Shop,
  ShopImage,
  Wishlist,
  allModels,
  syncAllIndexes,
} from '../../src/models/index.js';
import { DM_EVENT_TTL_SECONDS } from '../../src/models/DmEvent.js';

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});

const oid = () => new mongoose.Types.ObjectId();
const sha = (c: string) => c.repeat(64);
const DUP = { code: 11000 };

function shopInput(over: Record<string, unknown> = {}) {
  return {
    slug: 'maash-mamad',
    displayName: 'Maash Mamad',
    handle: 'maashmamad',
    profileImage: { imageId: oid(), sha256: sha('a'), mime: 'image/jpeg' },
    ...over,
  };
}

function reviewInput(over: Record<string, unknown> = {}) {
  return {
    reviewerSourceId: oid(),
    postShortcode: 'Deyc1w9hwTI',
    postUrl: 'https://www.instagram.com/p/Deyc1w9hwTI/',
    occurredAt: new Date('2026-10-01'),
    ...over,
  };
}

describe('models', () => {
  it('registers every collection with the PRD name', () => {
    expect(allModels.map((m) => m.collection.collectionName).sort()).toEqual(
      [
        'admins',
        'categories',
        'deletionRequests',
        'dmEvents',
        'jobRuns',
        'loginAttempts',
        'postOwners',
        'reviewerSources',
        'reviews',
        'shopImages',
        'shops',
        'wishlist',
      ].sort(),
    );
  });

  describe('Category', () => {
    it('derives nameNormalized and rejects a respelled duplicate', async () => {
      const c = await Category.create({ name: 'پوشاك', slug: 'clothing' });
      expect(c.nameNormalized).toBe('پوشاک');
      await expect(Category.create({ name: 'پوشاک', slug: 'clothing-2' })).rejects.toMatchObject(DUP);
      await expect(Category.create({ name: 'کفش', slug: 'clothing' })).rejects.toMatchObject(DUP);
    });
  });

  describe('ShopImage', () => {
    it('stores bytes and enforces a unique sha256 and an allowed mime', async () => {
      await ShopImage.create({ data: Buffer.from([1, 2]), mime: 'image/png', sha256: sha('b') });
      await expect(ShopImage.create({ data: Buffer.from([3]), mime: 'image/png', sha256: sha('b') })).rejects.toMatchObject(DUP);
      await expect(ShopImage.create({ data: Buffer.from([3]), mime: 'image/gif', sha256: sha('c') })).rejects.toThrow(
        /mime/,
      );
    });
  });

  describe('Shop', () => {
    it('normalises handles, defaults status and requires a profile image', async () => {
      const s = await Shop.create(shopInput({ handle: 'MaashMamad', previousHandles: ['Old.Name'] }));
      expect(s.handle).toBe('maashmamad');
      expect(s.previousHandles).toEqual(['old.name']);
      expect(s.status).toBe('no_known_issues');
      await expect(Shop.create(shopInput({ slug: 'x', handle: 'other', profileImage: undefined }))).rejects.toThrow(
        /profileImage/,
      );
    });

    it('rejects invalid handles, statuses and duplicate handles or slugs', async () => {
      await Shop.create(shopInput());
      await expect(Shop.create(shopInput({ slug: 'y', handle: 'bad handle' }))).rejects.toThrow(/handle/);
      await expect(Shop.create(shopInput({ slug: 'y', handle: 'y', status: 'great' }))).rejects.toThrow(/status/);
      await expect(Shop.create(shopInput({ slug: 'y' }))).rejects.toMatchObject(DUP);
      await expect(Shop.create(shopInput({ handle: 'y' }))).rejects.toMatchObject(DUP);
    });
  });

  describe('ReviewerSource', () => {
    it('applies PRD defaults', async () => {
      const r = await ReviewerSource.create({ handle: 'Sadegh.Delicious', name: 'Sadegh' });
      expect(r).toMatchObject({
        handle: 'sadegh.delicious',
        follow: true,
        backfillLimit: 50,
        backfillDone: false,
        permission: 'link_only',
      });
    });
  });

  describe('Wishlist', () => {
    it('applies defaults and keeps handles unique', async () => {
      const w = await Wishlist.create({ handle: 'newshop', sources: ['dm'] });
      expect(w).toMatchObject({ requestCount: 1, status: 'open' });
      expect(w.firstRequestedAt).toBeInstanceOf(Date);
      await expect(Wishlist.create({ handle: 'newshop' })).rejects.toMatchObject(DUP);
      await expect(Wishlist.create({ handle: 'x', sources: ['email'] })).rejects.toThrow(/sources/);
    });
  });

  describe('Review', () => {
    it('requires exactly one of shopId and wishlistId', async () => {
      await expect(Review.create(reviewInput())).rejects.toThrow(/Exactly one/);
      await expect(Review.create(reviewInput({ shopId: oid(), wishlistId: oid() }))).rejects.toThrow(/Exactly one/);
      const r = await Review.create(reviewInput({ wishlistId: oid() }));
      expect(r).toMatchObject({ status: 'pending', sourceType: 'reviewer_post', paidPartnership: false });
    });

    it('requires outcome and direction to publish', async () => {
      await expect(Review.create(reviewInput({ shopId: oid(), status: 'published' }))).rejects.toThrow(/required to publish/);
      await Review.create(
        reviewInput({ shopId: oid(), status: 'published', outcome: 'delivered_ok', direction: 'positive' }),
      );
    });

    it('allows one live review per (target, shortcode), but a new one after rejection', async () => {
      const shopId = oid();
      const first = await Review.create(reviewInput({ shopId }));
      await expect(Review.create(reviewInput({ shopId }))).rejects.toMatchObject(DUP);
      // Same post on another shop is fine (a post can tag several businesses).
      await Review.create(reviewInput({ shopId: oid() }));
      first.status = 'rejected';
      await first.save();
      await Review.create(reviewInput({ shopId }));

      const wishlistId = oid();
      await Review.create(reviewInput({ wishlistId }));
      await expect(Review.create(reviewInput({ wishlistId }))).rejects.toMatchObject(DUP);
    });
  });

  describe('PostOwner', () => {
    it('caches one owner per shortcode', async () => {
      const p = await PostOwner.create({ shortcode: 'abc', ownerUsername: 'Shop.One' });
      expect(p.ownerUsername).toBe('shop.one');
      await expect(PostOwner.create({ shortcode: 'abc', ownerUsername: 'b' })).rejects.toMatchObject(DUP);
    });
  });

  describe('DmEvent', () => {
    it('dedupes by mid and expires after 90 days', async () => {
      await DmEvent.create({ mid: 'm1', senderIgsid: '123' });
      await expect(DmEvent.create({ mid: 'm1', senderIgsid: '123' })).rejects.toMatchObject(DUP);
      const indexes = await DmEvent.collection.indexes();
      const ttl = indexes.find((i) => i.key.receivedAt === 1);
      expect(ttl?.expireAfterSeconds).toBe(DM_EVENT_TTL_SECONDS);
    });
  });

  describe('JobRun', () => {
    it('accepts known types and keeps empty counts', async () => {
      const j = await JobRun.create({ type: 'daily_check' });
      expect(j.counts).toEqual({});
      expect(j.startedAt).toBeInstanceOf(Date);
      await expect(JobRun.create({ type: 'nope' })).rejects.toThrow(/type/);
    });
  });

  describe('DeletionRequest', () => {
    it('keeps confirmation codes unique', async () => {
      const d = await DeletionRequest.create({ confirmationCode: 'c1', igsidHash: 'h' });
      expect(d.status).toBe('pending');
      await expect(DeletionRequest.create({ confirmationCode: 'c1', igsidHash: 'h2' })).rejects.toMatchObject(DUP);
    });
  });

  describe('Admin and LoginAttempt', () => {
    it('stores pagesanj compatible admin records', async () => {
      const a = await Admin.create({ username: 'Mohamad', passwordHash: 'scrypt$16384$8$1$s$h', totpSecretEnc: 'v1:a:b:c' });
      expect(a).toMatchObject({ username: 'mohamad', role: 'owner' });
      await expect(
        Admin.create({ username: 'mohamad', passwordHash: 'x', totpSecretEnc: 'y' }),
      ).rejects.toMatchObject(DUP);
    });

    it('keys login attempts uniquely', async () => {
      await LoginAttempt.create({ key: '1.2.3.4|mohamad', windowStart: new Date() });
      await expect(LoginAttempt.create({ key: '1.2.3.4|mohamad', windowStart: new Date() })).rejects.toMatchObject(DUP);
    });
  });
});
