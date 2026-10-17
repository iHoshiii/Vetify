import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertBudgetOpen } from '../check-budget.mjs';

test('permits deployment before any budget shutdown and after an explicit restore', () => {
  assert.doesNotThrow(() => assertBudgetOpen(() => '{"shutdown":false}'));
  assert.doesNotThrow(() =>
    assertBudgetOpen(() => {
      throw Object.assign(new Error('missing'), {
        stderr: 'An error occurred (ParameterNotFound)',
      });
    })
  );
});

test('blocks deployment after a shutdown even when the recorded month is old', () => {
  assert.throws(() => assertBudgetOpen(() => '{"shutdown":true,"month":"2026-09"}'), /shutdown/);
});

test('fails closed when access is denied, the flag is missing, or the response is malformed', () => {
  for (const value of ['{}', 'null', '{"shutdown":"false"}', 'not-json']) {
    assert.throws(() => assertBudgetOpen(() => value));
  }
  assert.throws(
    () =>
      assertBudgetOpen(() => {
        throw Object.assign(new Error('denied'), { stderr: '(AccessDeniedException)' });
      }),
    /Cannot verify/
  );
});
