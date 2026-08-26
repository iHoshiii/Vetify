import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import Input from '@/components/ui/Input';

/**
 * The toggle lives on the shared Input, so every password field in the app gets
 * it from one place — login, signup, and the confirmation box beside it.
 */
describe('password field visibility', () => {
  it('masks what is typed until the toggle is pressed', async () => {
    render(<Input label="Password" type="password" />);

    const field = screen.getByLabelText('Password');
    expect(field).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(field).toHaveAttribute('type', 'text');
    // The label flips, because it has to say which way pressing it goes rather
    // than what the field is currently doing.
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('hides it again on a second press', async () => {
    render(<Input label="Password" type="password" />);

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('keeps what was already typed when it reveals it', async () => {
    render(<Input label="Password" type="password" />);

    const field = screen.getByLabelText('Password');
    await userEvent.type(field, 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    // The point of the whole thing: swapping the type must not remount the field
    // and throw away the half-typed password it was there to show.
    expect(field).toHaveValue('correct horse');
  });

  it('does not submit the form it sits in', async () => {
    let submitted = 0;

    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted += 1;
        }}
      >
        <Input label="Password" type="password" />
      </form>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    // A default-type button inside a form submits it. Looking at your password
    // should not attempt to log you in.
    expect(submitted).toBe(0);
  });

  it('offers no toggle on a field that was never masked', () => {
    render(<Input label="Email address" type="email" />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
