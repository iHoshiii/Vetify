import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MapPreview from '@/pages/map/_components/interactive-map/map-preview';

vi.mock('@/components/vetmap', () => ({
  default: () => <div>Map image</div>,
}));

describe('map preview', () => {
  it('opens from a keyboard-accessible button', async () => {
    const onExpand = vi.fn();
    render(<MapPreview onExpand={onExpand} vets={[]} userLocation={null} />);

    const trigger = await screen.findByRole('button', {
      name: 'Explore the interactive vet map',
    });
    await userEvent.click(trigger);

    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
