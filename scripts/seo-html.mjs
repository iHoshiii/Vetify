import { readFileSync } from 'node:fs';

export const SITE_URL = 'https://vetify.page';
export const PUBLIC_PAGES = JSON.parse(
  readFileSync(new URL('../src/shared/public-pages.json', import.meta.url), 'utf8')
);
const identity = JSON.parse(
  readFileSync(new URL('../src/shared/site-identity.json', import.meta.url), 'utf8')
);

export function findPublicPage(pathname) {
  return PUBLIC_PAGES.find((page) => page.path === (pathname.replace(/\/+$/, '') || '/'));
}

export function pageFile(pathname) {
  const page = findPublicPage(pathname);
  return page
    ? page.path === '/'
      ? 'index.html'
      : `${page.path.slice(1)}/index.html`
    : 'app.html';
}

const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

export function decorateHead(html, page) {
  const clean = html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(
      /<meta\b[^>]*(?:name=["'](?:description|robots|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>/gi,
      ''
    )
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*id=["']vetify-schema["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const description =
    page?.description ?? 'Sign in to Vetify to manage your pet care and veterinary appointments.';
  const tags = [
    `<title>${escape(page?.title ?? 'Vetify')}</title>`,
    `<meta name="description" content="${escape(description)}">`,
    `<meta name="robots" content="${page ? 'index,follow' : 'noindex,follow'}">`,
  ];
  if (page) {
    const url = SITE_URL + page.path;
    tags.push(`<link rel="canonical" href="${url}">`);
    for (const [name, value] of Object.entries({
      'og:type': 'website',
      'og:site_name': 'Vetify',
      'og:title': page.title,
      'og:description': description,
      'og:url': url,
      'og:image': `${SITE_URL}/vetify_logo.jpg`,
      'og:image:alt': 'Vetify logo',
      'twitter:card': 'summary',
      'twitter:title': page.title,
      'twitter:description': description,
      'twitter:image': `${SITE_URL}/vetify_logo.jpg`,
    })) {
      tags.push(
        `<meta ${name.startsWith('og:') ? 'property' : 'name'}="${name}" content="${escape(
          value
        )}">`
      );
    }
    if (page.path === '/') {
      tags.push(
        `<script id="vetify-schema" type="application/ld+json">${JSON.stringify(identity).replace(
          /</g,
          '\\u003c'
        )}</script>`
      );
    }
  }
  return clean.replace('</head>', `${tags.join('\n    ')}\n  </head>`);
}
