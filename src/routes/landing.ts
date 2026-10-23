// Public website (PRD §7, §11): server-renders the web/ React app. `/` redirects by Accept-Language
// (default fa); `/fa/...` and `/en/...` render directly with no redirects, as Meta's checks need (§7.3).
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import express, { Router, type Request } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { getDeletionStatus } from '../services/deletion.js';

type RenderResult = { html: string; lang: string; dir: string; title: string; status: number };
type WebServer = { render: (url: string, data?: Record<string, unknown>) => RenderResult };

export const DEFAULT_WEB_DIST = fileURLToPath(new URL('../../../web/dist', import.meta.url));

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
// JSON inside <script>: escape `<` so the data can't close the tag.
const scriptJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

export function fillTemplate(template: string, page: RenderResult, data: Record<string, unknown>): string {
  return template
    .replace('<!--lang-->', page.lang)
    .replace('<!--dir-->', page.dir)
    .replace('<!--title-->', escapeHtml(page.title))
    .replace('<!--app-html-->', () => page.html)
    .replace('<!--ssr-data-->', () => `<script id="ssr-data" type="application/json">${scriptJson(data)}</script>`);
}

// Every page gets the contact email (legal pages must show it, §7.3); the status page also gets the status.
async function pageData(req: Request): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = { contactEmail: env.CONTACT_EMAIL };
  if (/^\/(fa|en)\/data-deletion\/status\/?$/.test(req.path)) {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    data.deletionStatus = code ? await getDeletionStatus(code) : null;
  }
  return data;
}

export function createLandingRouter(webDist: string = DEFAULT_WEB_DIST) {
  const router = Router();
  let loaded: Promise<{ server: WebServer; template: string }> | undefined;
  const load = () =>
    (loaded ??= Promise.all([
      import(pathToFileURL(path.join(webDist, 'server/entry-server.js')).href) as Promise<WebServer>,
      readFile(path.join(webDist, 'client/index.html'), 'utf8'),
    ])
      .then(([server, template]) => ({ server, template }))
      .catch((err) => {
        loaded = undefined;
        throw err;
      }));

  // Hashed build assets can be cached forever; index.html is never served as a static file.
  router.use('/assets', express.static(path.join(webDist, 'client/assets'), { immutable: true, maxAge: '1y', index: false }));
  router.use(express.static(path.join(webDist, 'client'), { index: false, maxAge: '1d' }));

  router.get('/', (req, res) => {
    res.vary('Accept-Language').redirect(302, req.acceptsLanguages('fa', 'en') === 'en' ? '/en' : '/fa');
  });

  router.get(/.*/, async (req, res) => {
    let web: Awaited<ReturnType<typeof load>>;
    try {
      web = await load();
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err), webDist }, 'web build missing: run npm run build -w web');
      res.status(503).type('text/plain').send('Website build not found. Run `npm run build -w web`.');
      return;
    }
    const data = await pageData(req);
    const page = web.server.render(req.originalUrl, data);
    res
      .status(page.status)
      .set('Cache-Control', 'deletionStatus' in data ? 'no-store' : 'no-cache')
      .type('html')
      .send(fillTemplate(web.template, page, data));
  });

  return router;
}

export const landingRouter = createLandingRouter();
