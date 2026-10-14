import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import VerificationCodeInput from '@/pages/signup/_components/verification-code-input';

export function renderCode(initial = '', disabled = false) {
  function ControlledCode() {
    const [value, setValue] = useState(initial);
    return (
      <>
        <VerificationCodeInput value={value} onChange={setValue} disabled={disabled} />
        <output data-testid="code-value">{value}</output>
        <button type="button" onClick={() => setValue('')}>
          Reset code
        </button>
      </>
    );
  }
  return render(<ControlledCode />);
}

export function inputs(): HTMLInputElement[] {
  return within(screen.getByRole('group', { name: 'Confirmation code' })).getAllByRole(
    'textbox'
  ) as HTMLInputElement[];
}

export const values = () => inputs().map((input) => input.value);
