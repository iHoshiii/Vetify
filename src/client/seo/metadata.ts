import pages from '@shared/public-pages.json';
import identity from '@shared/site-identity.json';

const ORIGIN = 'https://vetify.page';

function meta(attribute: 'name' | 'property', key: string, value?: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!value) return element?.remove();
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = value;
}

export function updateSearchMetadata(pathname: string): void {
  const path = pathname.replace(/\/+$/, '') || '/';
  const page = pages.find((entry) => entry.path === path);
  const url = page ? ORIGIN + page.path : undefined;
  document.title = page?.title ?? 'Vetify';
  meta(
    'name',
    'description',
    page?.description ?? 'Sign in to Vetify to manage your pet care and veterinary appointments.'
  );
  meta('name', 'robots', page ? 'index,follow' : 'noindex,follow');
  for (const [name, value] of Object.entries({
    'og:type': 'website',
    'og:site_name': 'Vetify',
    'og:title': page?.title,
    'og:description': page?.description,
    'og:url': url,
    'og:image': `${ORIGIN}/vetify_logo.jpg`,
    'og:image:alt': 'Vetify logo',
    'twitter:card': 'summary',
    'twitter:title': page?.title,
    'twitter:description': page?.description,
    'twitter:image': `${ORIGIN}/vetify_logo.jpg`,
  }))
    meta(name.startsWith('og:') ? 'property' : 'name', name, page ? value : undefined);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (url) {
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  } else canonical?.remove();

  let schema = document.getElementById('vetify-schema');
  if (path === '/') {
    if (!schema) {
      schema = document.createElement('script');
      schema.id = 'vetify-schema';
      schema.setAttribute('type', 'application/ld+json');
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify(identity);
  } else schema?.remove();
}
