import { expect, test } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./env";

test.use({ storageState: STORAGE_STATE_PATH });

test.describe("task board and archive", () => {
  test("creates a task, resolves it, immolates it, and restores it from the archive", async ({ page }) => {
    const title = `E2E task ${Date.now()}`;

    await page.goto("/tasks");
    await page.getByPlaceholder("Quick-add a task...").fill(title);
    await page.getByRole("button", { name: "Add" }).click();

    const card = page.locator("div.cursor-pointer", { hasText: title });
    await expect(card).toBeVisible();

    // Resolve moves it into the Resolved column, which makes it selectable for immolation.
    await card.getByRole("button", { name: "Resolve", exact: true }).click();
    await expect(card.getByRole("button", { name: "Resolve" })).toHaveCount(0);

    // "Immolate all eligible" only takes tasks resolved a week+ ago; selecting this task
    // and using "Immolate selected" bypasses that age gate for an immediate manual archive.
    await card.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Immolate selected/ }).click();
    await expect(page.locator("div.cursor-pointer", { hasText: title })).toHaveCount(0);

    await page.goto("/archive");
    const archivedRow = page.locator("li", { hasText: title });
    await expect(archivedRow).toBeVisible();

    await archivedRow.getByRole("button", { name: "Restore" }).click();
    await expect(page.locator("li", { hasText: title })).toHaveCount(0);

    await page.goto("/tasks");
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  });
});
