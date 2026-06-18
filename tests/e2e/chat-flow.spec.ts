import { test, expect } from "@playwright/test";

test.describe("Chat Flow", () => {
  test("user can send a message and receive a reply", async ({ page }) => {
    await page.goto("/chat");

    const input = page.getByPlaceholder(/ask about your pet/i);
    await expect(input).toBeVisible();

    await input.fill("My cat has been sneezing a lot.");
    await page.getByRole("button", { name: /send/i }).click();

    // Wait for the user message to appear
    await expect(page.getByText("My cat has been sneezing a lot.")).toBeVisible();

    // Wait for an assistant reply bubble
    await expect(page.locator(".chat-bubble--assistant").last()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("chat input clears after sending", async ({ page }) => {
    await page.goto("/chat");
    const input = page.getByPlaceholder(/ask about your pet/i);
    await input.fill("Test message");
    await page.getByRole("button", { name: /send/i }).click();
    await expect(input).toHaveValue("");
  });
});
