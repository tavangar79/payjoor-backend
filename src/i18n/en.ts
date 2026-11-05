// English bot reply strings (PRD §5.4).
import type { BotStrings } from './index.js';

export const en: BotStrings = {
  status: {
    serious_warning: 'Serious warning',
    warning: 'Warning',
    mixed: 'Mixed experiences',
    recommended: 'Recommended (tested)',
    no_known_issues: 'No reported issues',
  },
  labels: {
    categories: 'Categories',
    email: 'Email',
    website: 'Website',
    phone: 'Phone',
    status: 'Status',
    tags: 'Tags',
    reviews: 'Reviews',
  },
  listSeparator: ', ',
  help: 'Hi! To check a page, share its profile with us, or type its handle with @, e.g. @maashmamad',
  unresolved:
    "We can't check a page from this post. Please share the page's profile instead:\n1. Open the page's profile on Instagram.\n2. Tap ⋯ at the top right.\n3. Tap \"Share this profile\" and send it to us.\nOr type the page's handle with @, e.g. @maashmamad",
  notFound:
    "We haven't reviewed this page yet. We've added it to our review list.\nIf you've bought from this page or want it reviewed, tell us here.",
  notReviewedYet: "This page is on our list, but we haven't published a review of it yet.",
  disclaimer: 'This is for information only. Buying is your own responsibility.',
  more: (n) => `+${n} more`,
  date: (d) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(d),
};
