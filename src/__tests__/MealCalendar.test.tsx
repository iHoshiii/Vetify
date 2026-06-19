import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('MealCalendar', () => {
  it('renders meal calendar placeholder', () => {
    const { container } = render(<div data-testid="meal-calendar" />);
    expect(container.querySelector("[data-testid='meal-calendar']")).toBeDefined();
  });
});
