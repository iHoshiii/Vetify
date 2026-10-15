import { expect, type Page } from '@playwright/test';

export async function tightLayout(page: Page) {
  const layout = await page.evaluate(() => {
    const visible = (element: Element) => {
      if (element.closest('.sr-only,[aria-hidden="true"],.leaflet-pane')) return false;
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return false;
      for (let parent: Element | null = element; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0')
          return false;
      }
      return true;
    };
    const describe = (element: Element) =>
      `${element.tagName}: ${(element.getAttribute('aria-label') || element.textContent || '')
        .trim()
        .slice(0, 90)}`;
    const outsideControls = [...document.querySelectorAll('button,input,select,textarea,a')]
      .filter(visible)
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.left < -1 || box.right > innerWidth + 1;
      })
      .map(describe);
    const sideways = [...document.querySelectorAll('body *')]
      .filter(visible)
      .filter((element) => {
        if (element.matches('input,textarea') || element.closest('.leaflet-container'))
          return false;
        return (
          /^(auto|scroll)$/.test(getComputedStyle(element).overflowX) &&
          element.scrollWidth > element.clientWidth + 1
        );
      })
      .map(describe);
    const clippedCells = [...document.querySelectorAll('.admin-data-table th,.admin-data-table td')]
      .filter(visible)
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map(describe);
    window.scrollTo({ left: 200, top: scrollY, behavior: 'instant' });
    if (document.scrollingElement) document.scrollingElement.scrollLeft = 200;
    return { outsideControls, sideways, clippedCells, scrollX };
  });
  expect(layout.outsideControls, 'Controls must fit without being clipped').toEqual([]);
  expect(layout.sideways, 'Panels, tabs and tables must not scroll sideways').toEqual([]);
  expect(layout.clippedCells, 'Table values must wrap inside their cells').toEqual([]);
  expect(layout.scrollX, 'Programmatic horizontal scrolling must stay locked').toBe(0);
}
