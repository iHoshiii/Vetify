import { ANON_QUOTA_WINDOW_HOURS, FREE_ANON_QUERIES } from '@shared/limits';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  anonQueriesRemaining,
  markAnonQuotaExhausted,
  readAnonQueryCount,
  recordAnonQuery,
  resetAnonQueryCount,
} from '../lib/chat-quota';

const HOUR_MS = 60 * 60 * 1000;
const OPENED_AT = new Date('2026-08-24T09:00:00.000Z');

/** Moves the clock to `hours` after the window opened. */
function hoursLater(hours: number): void {
  vi.setSystemTime(new Date(OPENED_AT.getTime() + hours * HOUR_MS));
}

function spendAll(): void {
  for (let i = 0; i < FREE_ANON_QUERIES; i++) recordAnonQuery();
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(OPENED_AT);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('anonymous chat allowance', () => {
  it('offers the whole allowance to a visitor who has asked nothing', () => {
    expect(readAnonQueryCount()).toBe(0);
    expect(anonQueriesRemaining()).toBe(FREE_ANON_QUERIES);
  });

  it('counts each question and stops at the cap', () => {
    for (let i = 1; i <= FREE_ANON_QUERIES; i++) {
      expect(recordAnonQuery()).toBe(i);
      expect(anonQueriesRemaining()).toBe(FREE_ANON_QUERIES - i);
    }
  });

  it('holds the count for the rest of the window', () => {
    spendAll();
    hoursLater(ANON_QUOTA_WINDOW_HOURS - 1);

    expect(readAnonQueryCount()).toBe(FREE_ANON_QUERIES);
    expect(anonQueriesRemaining()).toBe(0);
  });

  it('hands out a fresh allowance once the window has closed', () => {
    spendAll();
    hoursLater(ANON_QUOTA_WINDOW_HOURS);

    // The regression this pins: the count was stored on its own, so nothing
    // could tell how old it was and the composer stayed locked for good.
    expect(readAnonQueryCount()).toBe(0);
    expect(anonQueriesRemaining()).toBe(FREE_ANON_QUERIES);
  });

  it('opens the window on the first question, not the last', () => {
    recordAnonQuery();
    hoursLater(ANON_QUOTA_WINDOW_HOURS - 2);
    recordAnonQuery();

    // Two hours from the first question the window is done, even though the
    // second one was asked moments ago. A rolling window would never lapse for
    // someone who kept retrying after being refused.
    hoursLater(ANON_QUOTA_WINDOW_HOURS + 1);
    expect(readAnonQueryCount()).toBe(0);
  });

  it('lapses the pin the server asked for along with its window', () => {
    recordAnonQuery();
    markAnonQuotaExhausted();
    expect(anonQueriesRemaining()).toBe(0);

    hoursLater(ANON_QUOTA_WINDOW_HOURS - 1);
    expect(anonQueriesRemaining()).toBe(0);

    hoursLater(ANON_QUOTA_WINDOW_HOURS + 1);
    expect(anonQueriesRemaining()).toBe(FREE_ANON_QUERIES);
  });

  it('gives a cleared visitor a window of their own to wait out', () => {
    // Nothing stored — another browser, or storage wiped — and the server says
    // the allowance is gone. The lock has to start somewhere, so it starts now.
    markAnonQuotaExhausted();
    expect(anonQueriesRemaining()).toBe(0);

    hoursLater(ANON_QUOTA_WINDOW_HOURS + 1);
    expect(anonQueriesRemaining()).toBe(FREE_ANON_QUERIES);
  });

  it('forgets the timestamp-less count an older build left behind', () => {
    window.localStorage.setItem('vetify.chat.anonCount', String(FREE_ANON_QUERIES));

    expect(readAnonQueryCount()).toBe(0);
    expect(window.localStorage.getItem('vetify.chat.anonCount')).toBeNull();
  });

  it('ignores a record it cannot make sense of', () => {
    window.localStorage.setItem('vetify.chat.anonQuota', 'not json');
    expect(readAnonQueryCount()).toBe(0);

    window.localStorage.setItem('vetify.chat.anonQuota', JSON.stringify({ count: 'lots' }));
    expect(readAnonQueryCount()).toBe(0);

    window.localStorage.setItem(
      'vetify.chat.anonQuota',
      JSON.stringify({ count: 900, startedAt: Date.now() })
    );
    expect(readAnonQueryCount()).toBe(FREE_ANON_QUERIES);
  });

  it('clears on request, so logging in drops the countdown', () => {
    spendAll();
    resetAnonQueryCount();

    expect(readAnonQueryCount()).toBe(0);
    expect(window.localStorage.getItem('vetify.chat.anonQuota')).toBeNull();
  });
});
