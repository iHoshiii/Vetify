import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { parseDocument } from 'yaml';
import { PUBLIC_PAGES, decorateHead, pageFile } from '../seo-html.mjs';

const read = (path) => readFileSync(path, 'utf8');
const compiled = (path) => read(`dist/client/${path}`);
const tags = ['Ref', 'Sub', 'GetAtt', 'If', 'Equals'].map((name) => ({
  tag: `!${name}`,
  resolve: (value) => value,
  collection: name === 'If' ? 'seq' : undefined,
}));
const template = parseDocument(read('deploy/frontend/template.yaml'), { customTags: tags }).toJS();
const handler = runInNewContext(`${template.Resources.SpaRoutes.Properties.FunctionCode}; handler`);

test('all sitemap pages ship real content, unique metadata and matching CloudFront routes', () => {
  const sitemap = read('public/sitemap.xml');
  assert.deepEqual(
    [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
    PUBLIC_PAGES.map((page) => `https://vetify.page${page.path}`)
  );
  assert.equal(new Set(PUBLIC_PAGES.map((page) => page.title)).size, PUBLIC_PAGES.length);
  assert.equal(new Set(PUBLIC_PAGES.map((page) => page.description)).size, PUBLIC_PAGES.length);
  for (const page of PUBLIC_PAGES) {
    const html = compiled(pageFile(page.path));
    assert.match(html, /<h1\b/);
    assert.match(html, /data-prerendered="true"/);
    assert.ok(html.includes(`<link rel="canonical" href="https://vetify.page${page.path}">`));
    assert.match(html, /name="robots" content="index,follow"/);
    assert.ok(html.includes('property="og:title"'));
    assert.equal((html.match(/<title>/g) ?? []).length, 1);
    for (const uri of [page.path, `${page.path === '/' ? '' : page.path}/`]) {
      assert.equal(handler({ request: { uri } }).uri, `/${pageFile(page.path)}`);
    }
  }
  assert.match(compiled('index.html'), /Vetify brings veterinary guidance/);
  assert.match(compiled('about/index.html'), /<h1\b/);
});

test('homepage identity is factual and consistent with its canonical URL', () => {
  const html = compiled('index.html');
  const schema = JSON.parse(html.match(/id="vetify-schema"[^>]*>(.*?)<\/script>/s)[1]);
  assert.equal(schema['@context'], 'https://schema.org');
  assert.deepEqual(
    schema['@graph'].map((entry) => entry['@type']),
    ['Organization', 'WebSite']
  );
  assert.equal(schema['@graph'][1].url, 'https://vetify.page/');
  assert.ok(schema['@graph'].every((entry) => entry.name === 'Vetify'));
});

test('application routes keep an empty noindex shell and assets and APIs bypass rewriting', () => {
  const shell = compiled('app.html');
  assert.match(shell, /name="robots" content="noindex,follow"/);
  assert.match(shell, /<div id="root"><\/div>/);
  assert.doesNotMatch(shell, /rel="canonical"|id="vetify-schema"|data-prerendered/);
  for (const uri of ['/login', '/settings/profile', '/call/private-id', '/unknown-page']) {
    assert.equal(handler({ request: { uri } }).uri, '/app.html');
  }
  for (const uri of [
    '/api/v1/health',
    '/assets/main.js',
    '/robots.txt',
    '/sitemap.xml',
    '/google06c88764fb5060b5.html',
  ]) {
    assert.equal(handler({ request: { uri } }).uri, uri);
  }
});

test('SEO values are escaped and stale canonical and robots tags are replaced once', () => {
  const html =
    '<head><title>Old</title><meta name="robots" content="noindex"><link rel="canonical" href="https://wrong.example/"></head>';
  const page = {
    path: '/about',
    title: 'Vetify & "pets" <care>',
    description: 'A "quoted" description',
  };
  const output = decorateHead(decorateHead(html, page), page);
  assert.equal((output.match(/<title>/g) ?? []).length, 1);
  assert.equal((output.match(/rel="canonical"/g) ?? []).length, 1);
  assert.doesNotMatch(output, /wrong\.example|content="noindex"|<care>/);
  assert.ok(output.includes('Vetify &amp; &quot;pets&quot; &lt;care&gt;'));
});

test('deployment uploads assets and page HTML before enabling the new CloudFront routing', () => {
  const script = read('scripts/deploy-aws.sh');
  const assets = script.indexOf('aws s3 sync');
  const pages = script.indexOf('aws s3 cp release/dist/client "s3://$bucket"');
  const routing = script.indexOf(
    'aws cloudformation deploy --template-file release/deploy/frontend/template.yaml'
  );
  const home = script.indexOf('aws s3 cp release/dist/client/index.html');
  assert.ok(assets < pages && pages < routing && routing < home);
  assert.match(script.slice(assets, pages), /--exclude '\*\.html'/);
  assert.match(script.slice(pages, routing), /--cache-control no-cache/);
});
