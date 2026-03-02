import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Social fragrance profiles and discovery.")).toBeVisible();
});
