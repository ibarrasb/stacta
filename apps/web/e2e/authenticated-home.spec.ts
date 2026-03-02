import { expect, test } from "@playwright/test";

test("authenticated user can open home feed", async ({ page }) => {
  await page.addInitScript(() => {
    window.__STACTA_E2E_ACCESS_TOKEN__ = "playwright-e2e-token";
  });

  await page.goto("/home");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "Following activity" })).toBeVisible();
});
