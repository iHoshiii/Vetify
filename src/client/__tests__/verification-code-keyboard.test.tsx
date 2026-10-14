import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { inputs, renderCode, values } from './verification-code-input-fixtures';

describe('confirmation code keyboard and disabled behavior', () => {
  it('clears the current digit before moving backward from an empty box', async () => {
    const user = userEvent.setup();
    renderCode('012345');
    await user.click(inputs()[2]);
    await user.keyboard('{Backspace}');
    expect(values()).toEqual(['0', '1', '', '3', '4', '5']);
    expect(inputs()[2]).toHaveFocus();
    await user.keyboard('{Backspace}');
    expect(values()).toEqual(['0', '', '', '3', '4', '5']);
    expect(inputs()[1]).toHaveFocus();
    await user.keyboard('7');
    expect(values()).toEqual(['0', '7', '', '3', '4', '5']);
  });

  it('moves between boxes with arrow keys and stops at the boundaries', async () => {
    const user = userEvent.setup();
    renderCode('012345');
    await user.click(inputs()[0]);
    await user.keyboard('{ArrowLeft}');
    expect(inputs()[0]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(inputs()[1]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(inputs()[0]).toHaveFocus();
    await user.click(inputs()[5]);
    await user.keyboard('{ArrowRight}');
    expect(inputs()[5]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(inputs()[4]).toHaveFocus();
    expect(values()).toEqual(['0', '1', '2', '3', '4', '5']);
  });

  it('disables all six fields and prevents typing while disabled', async () => {
    const user = userEvent.setup();
    renderCode('012345', true);
    inputs().forEach((input) => expect(input).toBeDisabled());
    await user.click(inputs()[0]);
    await user.keyboard('9');
    expect(values()).toEqual(['0', '1', '2', '3', '4', '5']);
  });
});
