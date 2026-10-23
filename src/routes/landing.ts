// Public website: server-renders the web/ React app (PRD §7, §11).
import { Router } from 'express';

export const landingRouter = Router();

// TODO GET /: redirect to /fa or /en by Accept-Language (default fa).
// TODO serve ../web/dist/client/assets statically.
// TODO for /:locale(fa|en)/*: import ../web/dist/server/entry-server.js, call
// render(url, data) and fill ../web/dist/client/index.html (lang, dir, app HTML, data).
// The status page passes the deletionRequests status for ?code= as data.
