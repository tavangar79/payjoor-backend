// Persian bot reply strings (PRD §5.4). Status labels and the "not reviewed" guidance follow pagesanj's copy.
import { toPersianDigits } from '../lib/normalizeFa.js';
import type { BotStrings } from './index.js';

export const fa: BotStrings = {
  status: {
    serious_warning: 'هشدار جدی',
    warning: 'هشدار',
    mixed: 'تجربه‌های متفاوت',
    recommended: 'پیشنهادی (تست‌شده)',
    no_known_issues: 'مشکلی گزارش نشده',
  },
  labels: {
    categories: 'دسته‌بندی',
    email: 'ایمیل',
    website: 'وب‌سایت',
    phone: 'تلفن',
    status: 'وضعیت',
    tags: 'برچسب‌ها',
    reviews: 'نقدها',
  },
  listSeparator: '، ',
  help:
    'سلام! برای بررسی یک پیج، پروفایل آن را برای ما بفرستید (Share)، یا آیدی پیج را با @ بنویسید؛ مثلاً @maashmamad',
  unresolved:
    'از روی این پست نمی‌توانیم پیج را بررسی کنیم. لطفاً خود پروفایل پیج را برای ما بفرستید:\n۱. وارد پروفایل پیج در اینستاگرام شوید.\n۲. روی ⋯ بالای صفحه بزنید.\n۳. «Share this profile» (اشتراک‌گذاری پروفایل) را بزنید و برای ما بفرستید.\nیا آیدی پیج را با @ بنویسید؛ مثلاً @maashmamad',
  notFound:
    'این پیج را هنوز بررسی نکرده‌ایم و به فهرست بررسی اضافه‌اش کردیم.\nاگر تجربه‌ای از خرید از این پیج دارید یا می‌خواهید بررسی شود، همین‌جا به ما خبر دهید.',
  notReviewedYet: 'این پیج در فهرست ماست، اما هنوز نقدی برایش منتشر نکرده‌ایم.',
  disclaimer: 'این پاسخ فقط برای اطلاع‌رسانی است و مسئولیت خرید با خود شماست.',
  more: (n) => `+${toPersianDigits(n)} نقد دیگر`,
  date: (d) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(d),
};
