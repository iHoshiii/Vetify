import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import PlannerPage from '../pages/planner/planner-page';
import { plannerDownload, plannerHighlights } from '../pages/planner/planner-content';

function showPage() {
  render(
    <MemoryRouter>
      <PlannerPage />
    </MemoryRouter>
  );
}

afterEach(() => {
  plannerDownload.url = null;
  plannerDownload.qrImageSrc = null;
  plannerHighlights.forEach((item) => {
    item.imageSrc = null;
  });
});

describe('Meal Planner app introduction', () => {
  it('puts the download QR first, six highlights next and account guidance last', () => {
    showPage();
    const qr = screen.getByRole('img', { name: 'App download QR code placeholder' });
    const photos = screen.getAllByRole('img', { name: /App highlight \d photo placeholder/ });
    const accounts = screen.getByRole('heading', { name: /One Vetify account/ });
    expect(photos).toHaveLength(6);
    expect(qr.compareDocumentPosition(photos[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      photos[5].compareDocumentPosition(accounts) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download link coming soon' })).toBeDisabled();
  });

  it('distinguishes the public download QR from private account connection', () => {
    showPage();
    expect(screen.getByText('Two QRs, two purposes.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Connect an existing account' })).toHaveAttribute(
      'href',
      '/settings/meal-planner'
    );
    expect(screen.getByText(/Connect another method in Vetify/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Create a Vetify account' })).toHaveAttribute(
      'href',
      '/signup'
    );
  });

  it('accepts the real QR and download link when supplied later', () => {
    plannerDownload.url = 'https://downloads.example.test/meal-planner';
    plannerDownload.qrImageSrc = '/meal-planner/download-qr.png';
    showPage();
    expect(
      screen.getByRole('img', { name: 'Scan to download the Vetify Meal Planner app' })
    ).toHaveAttribute('src', '/meal-planner/download-qr.png');
    expect(screen.getByRole('link', { name: 'Download the app' })).toHaveAttribute(
      'href',
      'https://downloads.example.test/meal-planner'
    );
  });

  it('falls back to a placeholder if a future highlight image cannot load', () => {
    plannerHighlights[0].imageSrc = '/meal-planner/first-photo.jpg';
    showPage();
    const photo = screen.getByRole('img', { name: plannerHighlights[0].title });
    fireEvent.error(photo);
    expect(screen.getByRole('img', { name: 'App highlight 1 photo placeholder' })).toBeVisible();
  });
});
