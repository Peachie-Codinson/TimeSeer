import { expect, test } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./env";

test.use({ storageState: STORAGE_STATE_PATH });

test.describe("quotas", () => {
  test("updates the daily quota target from the dashboard", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Edit daily target" }).click();
    await page.locator("input[type=number]").fill("90");
    await page.getByRole("button", { name: "Save" }).click();

    // Scope to the "Target" stat block specifically: with nothing completed or scheduled
    // yet, "Remaining" reads the same 90m value, so an unscoped text match is ambiguous.
    const targetStat = page.locator("div.rounded-md", { hasText: "Target" });
    await expect(targetStat.getByText("90m", { exact: true })).toBeVisible();
  });
});
