import { expect, test } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./env";

test.use({ storageState: STORAGE_STATE_PATH });

test.describe("scheduling", () => {
  test("opens the schedule suggestion modal for the visible range", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Suggest schedule" }).click();

    await expect(page.getByRole("heading", { name: "Suggested schedule" })).toBeVisible();
    await expect(page.getByText("Calculating...")).toHaveCount(0);
    await expect(
      page.getByText("Nothing to schedule in this range.").or(page.locator("ul li")).first(),
    ).toBeVisible();
  });
});
