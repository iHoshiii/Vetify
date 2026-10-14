import { test, expect } from './fixtures';

test.describe('Chat flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/chat', async (route) => {
      await route.fulfill({
        json: { reply: 'Your veterinarian can help with persistent sneezing.', anonRemaining: 4 },
      });
    });
  });

  test('user can send a message and receive a reply', async ({ page }) => {
    await page.goto('/chat');

    const input = page.getByPlaceholder(/ask about your pet/i);
    await expect(input).toBeVisible();

    await input.fill('My cat has been sneezing a lot.');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(
      page.getByRole('paragraph').filter({ hasText: 'My cat has been sneezing a lot.' })
    ).toBeVisible();

    await expect(
      page.getByText('Your veterinarian can help with persistent sneezing.')
    ).toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('chat input clears after sending', async ({ page }) => {
    await page.goto('/chat');
    const input = page.getByPlaceholder(/ask about your pet/i);
    await input.fill('Test message');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(input).toHaveValue('');
  });

  test('keyboard submission sends the conversation history', async ({ page }) => {
    await page.goto('/chat');
    const input = page.getByPlaceholder(/ask about your pet/i);
    await input.fill('My cat is sneezing.');
    await input.press('Enter');
    await expect(
      page.getByText('Your veterinarian can help with persistent sneezing.')
    ).toBeVisible();
    await input.fill('What should I tell the vet?');
    const request = page.waitForRequest('**/api/v1/chat');
    await input.press('Enter');
    expect((await request).postDataJSON()).toMatchObject({
      message: 'What should I tell the vet?',
      history: [
        { role: 'user', content: 'My cat is sneezing.' },
        { role: 'assistant', content: 'Your veterinarian can help with persistent sneezing.' },
      ],
    });
  });

  test('a service failure is shown and another message can be sent', async ({ page }) => {
    await page.route('**/api/v1/chat', async (route) => {
      await route.fulfill({ status: 503, json: { error: 'Chat is temporarily unavailable.' } });
    });
    await page.goto('/chat');
    const input = page.getByPlaceholder(/ask about your pet/i);
    await input.fill('My cat is sneezing.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Chat is temporarily unavailable.')).toBeVisible();
    await expect(input).toBeEnabled();
    await input.fill('Please try again.');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });
});
