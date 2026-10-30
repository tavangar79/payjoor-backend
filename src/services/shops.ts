// Shops (PRD §5.6, §8 shops, §9.2.3): create and update with normalised handles and contact details,
// stored profile images, and lookup by current or previous handle.
import type { Types } from 'mongoose';
import { Shop, type ShopDoc } from '../models/Shop.js';
import { ShopImage } from '../models/ShopImage.js';
import { Category } from '../models/Category.js';
import type { ShopStatus } from '../models/enums.js';
import { HttpError } from '../lib/errorHandler.js';
import { normalizeHandle } from '../lib/handle.js';
import { checkImage, type ImageMime } from '../lib/imageCheck.js';
import { normalizeEmail, normalizePhone, normalizeWebsite } from '../lib/contact.js';
import { escapeRegex, isDuplicateKey } from '../lib/mongo.js';
import { slugify, uniqueSlug } from '../lib/slug.js';

export type StoredImage = { imageId: Types.ObjectId; sha256: string; mime: ImageMime };

/** `null` or `''` clears a field; `undefined` leaves it as it is. */
export type ContactInput = { email?: string | null; website?: string | null; phone?: string | null };

export type ShopInput = {
  handle: string;
  displayName: string;
  previousHandles?: string[];
  status?: ShopStatus;
  tags?: string[];
  categoryIds?: Types.ObjectId[];
  bio?: string | null;
  profileImageId: Types.ObjectId;
  contact?: ContactInput;
  profileFetchedAt?: Date;
  /** Set by the publish gate when it creates the shop from a post (§6.3). */
  autoCreated?: boolean;
};

export type ShopPatch = Partial<ShopInput>;

/** Checks the bytes (§5.6) and stores them once per sha256. Shared by the upload route and the profile fetch. */
export async function saveShopImage(bytes: Buffer): Promise<StoredImage> {
  const check = checkImage(bytes);
  if (!check.ok) throw new HttpError(400, `image_${check.reason}`);
  const doc = await ShopImage.findOneAndUpdate(
    { sha256: check.sha256 },
    { $setOnInsert: { data: bytes, mime: check.mime, sha256: check.sha256 } },
    { upsert: true, new: true, projection: { data: 0 } },
  ).catch(async (err) => {
    // Two uploads of the same new image at once: the loser's upsert hits the unique index.
    if (isDuplicateKey(err)) return ShopImage.findOne({ sha256: check.sha256 }, { data: 0 });
    throw err;
  });
  return { imageId: doc!._id, sha256: check.sha256, mime: check.mime };
}

export async function findByHandle(input: string): Promise<ShopDoc | null> {
  const handle = normalizeHandle(input);
  if (!handle) return null;
  return Shop.findOne({ $or: [{ handle }, { previousHandles: handle }] }).lean<ShopDoc>();
}

function handleOrThrow(input: string): string {
  const handle = normalizeHandle(input);
  if (!handle) throw new HttpError(400, 'invalid_handle');
  return handle;
}

function normalizeContactField(
  value: string | null | undefined,
  normalize: (s: string) => string | null,
  error: string,
): string | undefined | null {
  if (value === undefined) return undefined;
  if (value === null || !value.trim()) return null;
  const out = normalize(value);
  if (!out) throw new HttpError(400, error);
  return out;
}

function normalizeContact(input: ContactInput) {
  return {
    email: normalizeContactField(input.email, normalizeEmail, 'invalid_email'),
    website: normalizeContactField(input.website, normalizeWebsite, 'invalid_website'),
    phone: normalizeContactField(input.phone, normalizePhone, 'invalid_phone'),
  };
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().replace(/\s+/g, ' ')).filter(Boolean))];
}

async function imageOrThrow(imageId: Types.ObjectId) {
  const image = await ShopImage.findById(imageId, { sha256: 1, mime: 1 }).lean();
  if (!image) throw new HttpError(400, 'unknown_image');
  return { imageId: image._id, sha256: image.sha256, mime: image.mime };
}

async function assertCategoriesExist(ids: Types.ObjectId[]) {
  const unique = [...new Set(ids.map(String))];
  if ((await Category.countDocuments({ _id: { $in: unique } })) !== unique.length) {
    throw new HttpError(400, 'unknown_category');
  }
}

/** No other shop may use any of these handles, as its current or a previous handle. */
async function assertHandlesFree(handles: string[], exceptId?: Types.ObjectId) {
  const clash = await Shop.exists({
    ...(exceptId && { _id: { $ne: exceptId } }),
    $or: [{ handle: { $in: handles } }, { previousHandles: { $in: handles } }],
  });
  if (clash) throw new HttpError(409, 'handle_in_use');
}

async function saveOrConflict(doc: InstanceType<typeof Shop>) {
  try {
    await doc.save();
  } catch (err) {
    if (isDuplicateKey(err)) throw new HttpError(409, 'handle_in_use');
    throw err;
  }
}

export async function createShop(input: ShopInput): Promise<ShopDoc> {
  const handle = handleOrThrow(input.handle);
  const previousHandles = [...new Set((input.previousHandles ?? []).map(handleOrThrow))].filter((h) => h !== handle);
  await assertHandlesFree([handle, ...previousHandles]);
  if (input.categoryIds?.length) await assertCategoriesExist(input.categoryIds);
  const profileImage = await imageOrThrow(input.profileImageId);
  const contact = normalizeContact(input.contact ?? {});
  const slug = await uniqueSlug(slugify(handle), async (s) => !!(await Shop.exists({ slug: s })));

  const doc = new Shop({
    slug,
    displayName: input.displayName,
    handle,
    previousHandles,
    status: input.status,
    // A status picked by hand sticks (§6.3); the default is not a decision.
    statusManual: input.status !== undefined && input.status !== 'no_known_issues',
    tags: normalizeTags(input.tags ?? []),
    categoryIds: input.categoryIds ?? [],
    bio: input.bio || undefined,
    profileImage,
    contact: {
      email: contact.email ?? undefined,
      website: contact.website ?? undefined,
      phone: contact.phone ?? undefined,
    },
    autoCreated: input.autoCreated === true,
    profileFetchedAt: input.profileFetchedAt,
  });
  await saveOrConflict(doc);
  return doc.toObject();
}

/**
 * Applies a partial update. A changed handle moves the old one to `previousHandles` (§8), unless the
 * patch sets `previousHandles` itself. The slug never changes, so shop URLs stay stable.
 */
export async function updateShop(id: Types.ObjectId, patch: ShopPatch): Promise<ShopDoc> {
  const doc = await Shop.findById(id);
  if (!doc) throw new HttpError(404, 'not_found');

  const handle = patch.handle !== undefined ? handleOrThrow(patch.handle) : doc.handle;
  let previousHandles: string[];
  if (patch.previousHandles !== undefined) previousHandles = patch.previousHandles.map(handleOrThrow);
  else previousHandles = handle !== doc.handle ? [...doc.previousHandles, doc.handle] : [...doc.previousHandles];
  previousHandles = [...new Set(previousHandles)].filter((h) => h !== handle);
  await assertHandlesFree([handle, ...previousHandles], id);
  doc.handle = handle;
  doc.previousHandles = previousHandles;

  if (patch.displayName !== undefined) doc.displayName = patch.displayName;
  if (patch.status !== undefined) {
    // A hand-picked status sticks (§6.3); setting the value it already has is not a decision.
    if (patch.status !== doc.status) doc.statusManual = true;
    doc.status = patch.status;
  }
  if (patch.tags !== undefined) doc.tags = normalizeTags(patch.tags);
  if (patch.categoryIds !== undefined) {
    await assertCategoriesExist(patch.categoryIds);
    doc.categoryIds = patch.categoryIds;
  }
  if (patch.bio !== undefined) doc.bio = patch.bio || undefined;
  if (patch.profileImageId !== undefined) doc.profileImage = await imageOrThrow(patch.profileImageId);
  if (patch.contact !== undefined) {
    const contact = normalizeContact(patch.contact);
    for (const key of ['email', 'website', 'phone'] as const) {
      if (contact[key] !== undefined) doc.set(`contact.${key}`, contact[key] ?? undefined);
    }
  }
  if (patch.profileFetchedAt !== undefined) doc.profileFetchedAt = patch.profileFetchedAt;

  await saveOrConflict(doc);
  return doc.toObject();
}

export async function getShop(id: Types.ObjectId): Promise<ShopDoc> {
  const shop = await Shop.findById(id).lean<ShopDoc>();
  if (!shop) throw new HttpError(404, 'not_found');
  return shop;
}

export type ShopListQuery = {
  q?: string;
  status?: ShopStatus;
  categoryId?: Types.ObjectId;
  page: number;
  limit: number;
};

/** Newest first. `q` matches the name anywhere, or the start of the current or a previous handle. */
export async function listShops(query: ShopListQuery): Promise<{ items: ShopDoc[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.categoryId) filter.categoryIds = query.categoryId;
  const q = query.q?.trim();
  if (q) {
    const handlePrefix = new RegExp(`^${escapeRegex(q.replace(/^@/, '').toLowerCase())}`);
    filter.$or = [
      { displayName: new RegExp(escapeRegex(q), 'i') },
      { handle: handlePrefix },
      { previousHandles: handlePrefix },
    ];
  }
  const [items, total] = await Promise.all([
    Shop.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean<ShopDoc[]>(),
    Shop.countDocuments(filter),
  ]);
  return { items, total };
}
