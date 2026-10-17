import type { Message } from '@/services/messages.service';
import {
  shouldShowMessageTime,
  spansMultipleDays,
  startsNewDay,
} from '@/components/messaging/message-time';
import { describe, expect, it } from 'vitest';

function message(id: string, createdAt: string, fromYou = true): Message {
  return { id, threadId: 'thread', body: id, fromYou, editedAt: null, unsentAt: null, createdAt };
}

describe('message timestamp grouping', () => {
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
      message('night', '2026-09-22T23:59:00'),
      message('morning', '2026-09-23T00:01:00'),
    ];

    expect(shouldShowMessageTime(reply, 0)).toBe(true);
    expect(shouldShowMessageTime(nextDay, 0)).toBe(true);
    expect(startsNewDay(nextDay, 1)).toBe(true);
    expect(spansMultipleDays(reply)).toBe(false);
    expect(spansMultipleDays(nextDay)).toBe(true);
  });
});
