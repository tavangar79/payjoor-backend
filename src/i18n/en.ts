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
  help: 'Hi! To check a page, share its profile or one of its posts with us, or type its handle with @, e.g. @maashmamad',
  unresolved: "We couldn't read this. Please share the page's profile instead.",
  notFound:
    "We haven't reviewed this page yet. We've added it to our review list.\nIf you've bought from this page or want it reviewed, tell us here.",
  notReviewedYet: "This page is on our list, but we haven't published a review of it yet.",
  disclaimer: 'This is for information only. Buying is your own responsibility.',
  checking: 'Checking… one moment.',
  more: (n) => `+${n} more`,
  date: (d) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(d),
};
