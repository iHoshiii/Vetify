import { build } from 'esbuild';
import { mkdir, mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PUBLIC_PAGES, decorateHead, pageFile } from './seo-html.mjs';

export async function prerenderPublic(config) {
  const output = resolve(config.root, config.build.outDir);
  const template = await readFile(join(output, 'index.html'), 'utf8');
  const cache = join(config.root, 'node_modules', '.cache');
  await mkdir(cache, { recursive: true });
  const temporary = await mkdtemp(join(cache, 'seo-render-'));
  const bundle = join(temporary, 'render.mjs');
  try {
    await build({
      entryPoints: [join(config.root, 'src/client/seo/prerender.tsx')],
      outfile: bundle,
      bundle: true,
      platform: 'node',
      format: 'esm',
      packages: 'external',
      jsx: 'automatic',
      tsconfig: join(config.root, 'tsconfig.client.json'),
      alias: { '@': join(config.root, 'src/client'), '@shared': join(config.root, 'src/shared') },
      define: { 'import.meta.env': JSON.stringify(config.env), ...config.define },
    });
    const { renderPublicPage } = await import(pathToFileURL(bundle).href);
    await writeFile(join(output, 'app.html'), decorateHead(template), 'utf8');
    for (const page of PUBLIC_PAGES) {
      const markup = renderPublicPage(page.path);
      if (!/<h1\b/.test(markup)) throw new Error(`Missing public heading: ${page.path}`);
      const html = decorateHead(template, page).replace(
        '<div id="root"></div>',
        `<div id="root" data-prerendered="true">${markup}</div>`
      );
      if (!html.includes('data-prerendered="true"')) throw new Error('Missing React root');
      const target = join(output, pageFile(page.path));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, html, 'utf8');
    }
    console.log(`[seo] Pre-rendered ${PUBLIC_PAGES.length} public pages and an application shell.`);
  } finally {
    await rm(bundle, { force: true });
    await rmdir(temporary);
  }
}
