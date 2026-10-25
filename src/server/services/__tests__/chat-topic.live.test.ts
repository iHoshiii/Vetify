import { setTimeout as delay } from 'node:timers/promises';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CHAT_SCOPE_CASES } from '../../test-utils/chat-scope-cases';
import { isVeterinaryTopic } from '../chat-topic.service';
import { generateReply } from '../chat.service';
import { OUT_OF_SCOPE_REPLY } from '../chat-scope';
import { CHAT_ASSISTANT_NAME } from '@shared/chat-assistant';

// The account's on-demand Nova Lite limit is 10 RPM. Space all live calls so
// throttling does not get confused with a classification or generation failure.
let lastRequestAt = 0;
async function paceRequest(): Promise<void> {
  await delay(Math.max(0, 6_500 - (Date.now() - lastRequestAt)));
  lastRequestAt = Date.now();
}

// Explicitly opt in: this invokes real Bedrock, needs AWS credentials, and incurs
// usage charges. Never substitute canned model responses in this suite.
describe.skipIf(process.env.VETIFY_LIVE_CHAT_TESTS !== '1')(
  'live semantic veterinary scope',
  () => {
    beforeAll(async () => {
      // Stop the suite immediately if credentials or the model are unavailable.
      await paceRequest();
      expect(await isVeterinaryTopic('Explain the anatomy of a dog heart.')).toBe(true);
    });

    beforeEach(paceRequest);

    it.each(CHAT_SCOPE_CASES)(
      '$label (allowed=$allowed)',
      async ({ message, history = [], allowed }) => {
        expect(await isVeterinaryTopic(message, history)).toBe(allowed);
      }
    );

    it.each(
      CHAT_SCOPE_CASES.filter(({ label }) =>
        [
          'fever',
          'short anatomy',
          'reptile medicine',
          'clinical code meaning',
          'long care question',
          'contextual bathing followup',
          'greeting',
          'greeting Tagalog',
          'identity name',
        ].includes(label)
      )
    )(
      'answers an accepted request: $label',
      async ({ label, message, history = [] }) => {
        expect(await isVeterinaryTopic(message, history)).toBe(true);
        await paceRequest();
        const reply = await generateReply({
          message,
          history,
          model: 'amazon.nova-lite-v1:0',
          session_id: 'synthetic-live-scope-test',
        });
        expect(reply.trim().length).toBeGreaterThan(0);
        expect(reply).not.toBe(OUT_OF_SCOPE_REPLY);
        expect(reply).not.toBe('I could not generate a response.');
        if (['greeting', 'greeting Tagalog', 'identity name'].includes(label)) {
          expect(reply).toContain(CHAT_ASSISTANT_NAME);
        }
        // Keep real answers visible for review; assertions above alone cannot
        // establish the medical accuracy or helpfulness of a model's wording.
        console.info(`[live answer: ${label}] ${reply}`);
      },
      30_000
    );
  }
);
