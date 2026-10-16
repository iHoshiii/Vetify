import { expect, type Page } from '@playwright/test';
import { tightLayout } from './styling-assertions';

export async function mapContentFits(page: Page) {
  const problems = await page.locator('main').evaluate((main) => {
    const outside: string[] = [];
    const inspect = (element: Element) => {
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height || element.closest('.leaflet-container')) return;
      const parent = element.parentElement!.getBoundingClientRect();
      if (box.left < -1 || box.right > innerWidth + 1 || box.right > parent.right + 1)
        outside.push(`${element.tagName}: ${element.textContent?.trim().slice(0, 50)}`);
      if (
        innerWidth < 1280 &&
        element.matches('li span') &&
        element.clientWidth > 0 &&
        element.scrollWidth > element.clientWidth + 1
      )
        outside.push(`Text overflows: ${element.textContent?.trim().slice(0, 50)}`);
    };
    main.querySelectorAll('li,li span,li a,li img,h1,p,button').forEach(inspect);
    for (const card of main.querySelectorAll('li')) {
      const profile = card.querySelector('a[aria-label$=", profile"]');
      const booking = card.querySelector('a[href^="/book-appointment"]');
      if (profile && booking) {
        const row = card.getBoundingClientRect();
        const action = booking.getBoundingClientRect();
        if (action.right > row.right || action.bottom > row.bottom)
          outside.push('Booking action exceeds its card');
        for (const text of card.querySelectorAll('span.block')) {
          const box = text.getBoundingClientRect();
          if (
            box.left < action.right &&
            box.right > action.left &&
            box.top < action.bottom &&
            box.bottom > action.top
          )
            outside.push('Booking action overlaps the name');
        }
      }
    }
    return outside;
  });
  expect(problems, 'All populated text, controls and cards must remain contained').toEqual([]);
  await tightLayout(page);
}
