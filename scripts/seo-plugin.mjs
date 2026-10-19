import { SITE_URL, decorateHead, findPublicPage, pageFile } from './seo-html.mjs';
import { prerenderPublic } from './prerender-public.mjs';

export function publicSeo() {
  let config;
  return {
    name: 'vetify-public-seo',
    enforce: 'post',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml(html, context) {
      const pathname = new URL(context.originalUrl ?? context.path, SITE_URL).pathname;
      return decorateHead(html, findPublicPage(pathname === '/index.html' ? '/' : pathname));
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        const pathname = new URL(request.url ?? '/', SITE_URL).pathname;
        if (!pathname.startsWith('/api/') && !pathname.includes('.')) {
          request.url = `/${pageFile(pathname)}`;
        }
        next();
      });
    },
    async writeBundle() {
      await prerenderPublic(config);
    },
  };
}
