import type { Message } from '@/services/messages.service';
import {
  shouldShowMessageTime,
  spansMultipleDays,
  startsNewDay,
} from '@/components/messaging/message-time';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function message(id: string, createdAt: string, fromYou = true): Message {
  return { id, threadId: 'thread', body: id, fromYou, editedAt: null, unsentAt: null, createdAt };
}

describe('message timestamp grouping', () => {
  let previousTimeZone: string | null = null;

  beforeEach(() => {
    previousTimeZone = localStorage.getItem('vetify-timezone');
    localStorage.setItem('vetify-timezone', 'Asia/Manila');
  });

  afterEach(() => {
    if (previousTimeZone === null) localStorage.removeItem('vetify-timezone');
    else localStorage.setItem('vetify-timezone', previousTimeZone);
  });

  it('hides an earlier time inside fifteen minutes and shows both sides of a larger gap', () => {
    const messages = [
      message('hello', '2026-09-22T09:00:00.000Z'),
      message('hi', '2026-09-22T09:10:00.000Z'),
      message('later', '2026-09-22T10:00:00.000Z'),
    ];

    expect(shouldShowMessageTime(messages, 0)).toBe(false);
    expect(shouldShowMessageTime(messages, 1)).toBe(true);
    expect(shouldShowMessageTime(messages, 2)).toBe(true);
  });

  it('ends a group when the sender or local day changes', () => {
    const reply = [
      message('mine', '2026-09-22T09:00:00.000Z'),
      message('theirs', '2026-09-22T09:01:00.000Z', false),
    ];
    const nextDay = [
      message('night', '2026-09-22T23:59:00+08:00'),
      message('morning', '2026-09-23T00:01:00+08:00'),
    ];

    expect(shouldShowMessageTime(reply, 0)).toBe(true);
    expect(shouldShowMessageTime(nextDay, 0)).toBe(true);
    expect(startsNewDay(nextDay, 1)).toBe(true);
    expect(spansMultipleDays(reply)).toBe(false);
    expect(spansMultipleDays(nextDay)).toBe(true);
  });

  it('groups the same timestamps by the selected timezone', () => {
    const messages = [
      message('night', '2026-09-22T15:59:00.000Z'),
      message('morning', '2026-09-22T16:01:00.000Z'),
    ];

    expect(shouldShowMessageTime(messages, 0)).toBe(true);
    expect(startsNewDay(messages, 1)).toBe(true);
    expect(spansMultipleDays(messages)).toBe(true);

    localStorage.setItem('vetify-timezone', 'America/New_York');

    expect(shouldShowMessageTime(messages, 0)).toBe(false);
    expect(startsNewDay(messages, 1)).toBe(false);
    expect(spansMultipleDays(messages)).toBe(false);
  });
});
