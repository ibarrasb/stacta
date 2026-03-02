import { expect, test } from "@playwright/test";

test("authenticated user can open home feed", async ({ page }) => {
  await page.addInitScript(() => {
    window.__STACTA_E2E_ACCESS_TOKEN__ = "playwright-e2e-token";
  });

  await page.goto("/home");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("tablist", { name: "Feed scope" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Following", selected: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /all|reviews|posts/i })).toBeVisible();
});
