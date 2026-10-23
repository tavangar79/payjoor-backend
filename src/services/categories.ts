// Category CRUD (PRD §8 categories, §9.2.4): normalised unique names, stable slugs, no delete while in use.
import type { Types } from 'mongoose';
import { Category, type CategoryDoc } from '../models/Category.js';
import { Shop } from '../models/Shop.js';
import { HttpError } from '../lib/errorHandler.js';
import { isDuplicateKey } from '../lib/mongo.js';
import { normalizeFa } from '../lib/normalizeFa.js';
import { slugify, uniqueSlug } from '../lib/slug.js';

export type CategoryInput = { name: string; nameEn?: string | null; slug?: string };

const duplicate = () => new HttpError(409, 'category_exists');

async function assertNameFree(name: string, exceptId?: Types.ObjectId) {
  const clash = await Category.exists({ nameNormalized: normalizeFa(name), ...(exceptId && { _id: { $ne: exceptId } }) });
  if (clash) throw duplicate();
}

export async function createCategory(input: CategoryInput): Promise<CategoryDoc> {
  await assertNameFree(input.name);
  // The slug is set once and kept on rename, so category URLs don't change.
  const base = slugify(input.slug || input.nameEn || input.name);
  const slug = await uniqueSlug(base, async (s) => !!(await Category.exists({ slug: s })));
  try {
    const doc = await Category.create({ name: input.name, nameEn: input.nameEn || undefined, slug });
    return doc.toObject();
  } catch (err) {
    if (isDuplicateKey(err)) throw duplicate();
    throw err;
  }
}

/** Renames a category; `nameEn: null` clears the English name. The slug stays. */
export async function updateCategory(
  id: Types.ObjectId,
  patch: { name?: string; nameEn?: string | null },
): Promise<CategoryDoc> {
  const doc = await Category.findById(id);
  if (!doc) throw new HttpError(404, 'not_found');
  if (patch.name !== undefined) {
    await assertNameFree(patch.name, id);
    doc.name = patch.name;
  }
  if (patch.nameEn !== undefined) doc.nameEn = patch.nameEn || undefined;
  try {
    await doc.save();
  } catch (err) {
    if (isDuplicateKey(err)) throw duplicate();
    throw err;
  }
  return doc.toObject();
}

export async function deleteCategory(id: Types.ObjectId): Promise<void> {
  if (await Shop.exists({ categoryIds: id })) throw new HttpError(409, 'category_in_use');
  const res = await Category.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new HttpError(404, 'not_found');
}

export async function listCategories(): Promise<(CategoryDoc & { shopCount: number })[]> {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }).lean<CategoryDoc[]>(),
    Shop.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $unwind: '$categoryIds' },
      { $group: { _id: '$categoryIds', n: { $sum: 1 } } },
    ]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  return categories.map((c) => ({ ...c, shopCount: byId.get(String(c._id)) ?? 0 }));
}
