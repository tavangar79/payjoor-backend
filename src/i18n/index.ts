// Bot reply strings by locale (PRD §5.4).
import type { ShopStatus } from '../models/enums.js';
import type { Lang } from '../bot/language.js';
import { en } from './en.js';
import { fa } from './fa.js';

export type BotStrings = {
  status: Record<ShopStatus, string>;
  labels: Record<'categories' | 'email' | 'website' | 'phone' | 'status' | 'tags' | 'reviews', string>;
  listSeparator: string;
  help: string;
  unresolved: string;
  notFound: string;
  notReviewedYet: string;
  disclaimer: string;
  checking: string;
  more: (n: number) => string;
  date: (d: Date) => string;
};

export const strings: Record<Lang, BotStrings> = { fa, en };
