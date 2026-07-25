import { expect, test } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./env";

test.use({ storageState: STORAGE_STATE_PATH });

test.describe("calendar", () => {
  test("creates an event via quick-create and deletes it from its details popover", async ({ page }) => {
    const title = `E2E event ${Date.now()}`;

    await page.goto("/");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("heading", { name: "New event" })).toBeVisible();

    await page.getByPlaceholder("Title").fill(title);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "New event" })).toHaveCount(0);

    const eventEl = page.getByText(title, { exact: true });
    await expect(eventEl).toBeVisible();
    await eventEl.click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  });
});
