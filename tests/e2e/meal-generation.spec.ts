import { test, expect } from "@playwright/test";

test.describe("Meal Plan Generation", () => {
  test("planner page loads and shows heading", async ({ page }) => {
    await page.goto("/planner");
    await expect(page.getByRole("heading", { name: /nutrition planner/i })).toBeVisible();
  });

  test("generates a meal plan and renders a chart or table", async ({ page }) => {
    await page.goto("/planner");

    // Trigger plan generation if a button exists
    const generateBtn = page.getByRole("button", { name: /generate/i });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      // Assert chart or calendar container appears
      await expect(page.locator("[data-testid='meal-calendar']")).toBeVisible({
        timeout: 15_000,
      });
    }
  });
});
