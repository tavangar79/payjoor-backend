import { beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { useMongo } from '../setup/mongo.js';
import { syncAllIndexes } from '../../src/models/index.js';
import { HttpError } from '../../src/lib/errorHandler.js';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../../src/services/categories.js';
import { createShop, findByHandle, listShops, saveShopImage, updateShop } from '../../src/services/shops.js';

useMongo();

beforeAll(async () => {
  await syncAllIndexes();
});

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png-body')]);

async function rejects(p: Promise<unknown>, status: number, message: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(HttpError);
  expect(err).toMatchObject({ status, message });
}

async function shop(over: Record<string, unknown> = {}) {
  const image = await saveShopImage(PNG);
  return createShop({ handle: '@MaashMamad', displayName: 'Maash Mamad', profileImageId: image.imageId, ...over });
}

describe('categories service', () => {
  it('creates with a slug, blocks a differently spelled duplicate', async () => {
    const c = await createCategory({ name: 'پوشاک', nameEn: 'Clothing' });
    expect(c).toMatchObject({ name: 'پوشاک', slug: 'clothing', nameNormalized: 'پوشاک' });
    await rejects(createCategory({ name: ' پوشاك ' }), 409, 'category_exists');
    const fa = await createCategory({ name: 'کیف' });
    expect(fa.slug).toBe('کیف');
  });

  it('gives a fresh slug on clash and keeps it on rename', async () => {
    await createCategory({ name: 'الف', nameEn: 'Food' });
    const b = await createCategory({ name: 'ب', nameEn: 'Food' });
    expect(b.slug).toBe('food-2');
    const renamed = await updateCategory(b._id, { name: 'خوراکی', nameEn: null });
    expect(renamed).toMatchObject({ name: 'خوراکی', slug: 'food-2' });
    expect(renamed.nameEn).toBeUndefined();
    await rejects(updateCategory(b._id, { name: 'الف' }), 409, 'category_exists');
  });

  it('counts shops and refuses to delete a category in use', async () => {
    const used = await createCategory({ name: 'پوشاک' });
    const free = await createCategory({ name: 'کیف' });
    await shop({ categoryIds: [used._id] });
    const list = await listCategories();
    expect(list.map((c) => [c.name, c.shopCount])).toEqual([
      ['پوشاک', 1],
      ['کیف', 0],
    ]);
    await rejects(deleteCategory(used._id), 409, 'category_in_use');
    await deleteCategory(free._id);
    await rejects(deleteCategory(free._id), 404, 'not_found');
  });
});

describe('shops service', () => {
  it('stores an image once per hash and rejects non-images', async () => {
    const a = await saveShopImage(PNG);
    const b = await saveShopImage(PNG);
    expect(String(a.imageId)).toBe(String(b.imageId));
    expect(a.mime).toBe('image/png');
    await rejects(saveShopImage(Buffer.from('<svg/>')), 400, 'image_unsupported_type');
  });

  it('creates with normalised handle, slug, tags and contact', async () => {
    const s = await shop({
      previousHandles: ['@Old.Name', 'maashmamad'],
      tags: [' slow  delivery ', 'slow delivery', ''],
      contact: { email: 'Hi@Maash.IR', website: 'maash.ir', phone: '0912 123 4567' },
    });
    expect(s).toMatchObject({
      handle: 'maashmamad',
      slug: 'maashmamad',
      previousHandles: ['old.name'],
      tags: ['slow delivery'],
      status: 'no_known_issues',
      contact: { email: 'hi@maash.ir', website: 'https://maash.ir/', phone: '+989121234567' },
      profileImage: { mime: 'image/png' },
    });
  });

  it('validates image, categories, handles and contact', async () => {
    const oid = new mongoose.Types.ObjectId();
    await rejects(createShop({ handle: 'x', displayName: 'X', profileImageId: oid }), 400, 'unknown_image');
    await rejects(shop({ categoryIds: [oid] }), 400, 'unknown_category');
    await rejects(shop({ handle: 'not a handle' }), 400, 'invalid_handle');
    await rejects(shop({ contact: { phone: '123' } }), 400, 'invalid_phone');
    await shop({ previousHandles: ['old.name'] });
    await rejects(shop({ handle: 'old.name' }), 409, 'handle_in_use');
    await rejects(shop({ handle: 'other', previousHandles: ['maashmamad'] }), 409, 'handle_in_use');
  });

  it('finds by current or previous handle', async () => {
    await shop({ previousHandles: ['old.name'] });
    expect((await findByHandle('@MaashMamad/'))?.handle).toBe('maashmamad');
    expect((await findByHandle('OLD.NAME'))?.handle).toBe('maashmamad');
    expect(await findByHandle('nobody')).toBeNull();
    expect(await findByHandle('not valid!')).toBeNull();
  });

  it('moves the old handle to previousHandles on rename and keeps the slug', async () => {
    const s = await shop();
    const renamed = await updateShop(s._id, { handle: 'maash.new' });
    expect(renamed).toMatchObject({ handle: 'maash.new', previousHandles: ['maashmamad'], slug: 'maashmamad' });
    const explicit = await updateShop(s._id, { previousHandles: [] });
    expect(explicit.previousHandles).toEqual([]);
  });

  it('clears contact fields with null and leaves missing ones alone', async () => {
    const s = await shop({ contact: { email: 'a@b.ir', phone: '09121234567' } });
    const u = await updateShop(s._id, { contact: { email: null, website: 'x.ir' } });
    expect(u.contact).toEqual({ website: 'https://x.ir/', phone: '+989121234567' });
  });

  it('lists newest first with search and paging', async () => {
    const a = await shop();
    const image = await saveShopImage(PNG);
    await createShop({ handle: 'kif.shop', displayName: 'Kif Store', profileImageId: image.imageId, status: 'warning' });
    expect((await listShops({ page: 1, limit: 10 })).items.map((s) => s.handle)).toEqual(['kif.shop', 'maashmamad']);
    expect((await listShops({ q: '@MAASH', page: 1, limit: 10 })).items).toHaveLength(1);
    expect((await listShops({ q: 'store', page: 1, limit: 10 })).items[0]?.handle).toBe('kif.shop');
    expect((await listShops({ q: '.*', page: 1, limit: 10 })).total).toBe(0);
    expect((await listShops({ status: 'warning', page: 1, limit: 10 })).total).toBe(1);
    const page2 = await listShops({ page: 2, limit: 1 });
    expect(page2).toMatchObject({ total: 2, items: [{ _id: a._id }] });
  });
});
