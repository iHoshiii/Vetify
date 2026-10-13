import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { inputs, renderCode, values } from './verification-code-input-fixtures';

describe('six-box confirmation code input', () => {
  it('renders six real labeled numeric inputs with one-time-code autofill', () => {
    renderCode();
    expect(inputs()).toHaveLength(6);
    inputs().forEach((input, index) => {
      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAccessibleName(`Digit ${index + 1} of 6`);
      expect(input).toHaveAttribute('inputmode', 'numeric');
      expect(input).toHaveValue('');
    });
    expect(inputs()[0]).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('advances focus with each typed digit and preserves a leading zero', async () => {
    const user = userEvent.setup();
    renderCode();
    await user.click(inputs()[0]);
    for (const [index, digit] of [...'012345'].entries()) {
      await user.keyboard(digit);
      expect(inputs()[index]).toHaveValue(digit);
      expect(inputs()[Math.min(index + 1, 5)]).toHaveFocus();
    }
    expect(screen.getByTestId('code-value')).toHaveTextContent('012345');
  });

  it('distributes a full code pasted into any box from the first box', async () => {
    const user = userEvent.setup();
    renderCode('999999');
    await user.click(inputs()[3]);
    await user.paste('012345');
    expect(values()).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(screen.getByTestId('code-value')).toHaveTextContent('012345');
  });

  it('pastes a partial code from the selected box without shifting other digits', async () => {
    const user = userEvent.setup();
    renderCode('123456');
    await user.click(inputs()[2]);
    await user.paste('09');
    expect(values()).toEqual(['1', '2', '0', '9', '5', '6']);
  });

  it('ignores nonnumeric typing and clipboard text', async () => {
    const user = userEvent.setup();
    renderCode();
    await user.click(inputs()[0]);
    await user.keyboard('abc!?');
    await user.paste('letters only');
    expect(values()).toEqual(['', '', '', '', '', '']);
    expect(inputs()[0]).toHaveFocus();
  });

  it.each([0, 2, 5])(
    'replaces box %i without moving or dropping neighboring digits',
    async (index) => {
      const user = userEvent.setup();
      renderCode('012345');
      await user.click(inputs()[index]);
      await user.keyboard('9');
      const expected = [...'012345'];
      expected[index] = '9';
      expect(values()).toEqual(expected);
      expect(inputs()[Math.min(index + 1, 5)]).toHaveFocus();
    }
  );

  it('accepts full six-digit autofill through an input change', () => {
    renderCode('999999');
    fireEvent.change(inputs()[0], { target: { value: '012345' } });
    expect(values()).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(screen.getByTestId('code-value')).toHaveTextContent('012345');
  });

  it('clears every box when the controlled value is reset externally', async () => {
    const user = userEvent.setup();
    renderCode('012345');
    await user.click(screen.getByRole('button', { name: 'Reset code' }));
    expect(values()).toEqual(['', '', '', '', '', '']);
  });
});
