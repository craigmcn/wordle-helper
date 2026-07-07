import { test, expect } from "@playwright/test";

test("filters the word list down as a guess is completed", async ({ page }) => {
  await page.goto("/");

  const letterBoxes = page.getByRole("textbox", { name: /^Letter \d/ });
  await expect(letterBoxes).toHaveCount(5);

  await expect(page.locator(".results h2")).toHaveText(/^\d+ possible words$/);

  await letterBoxes.first().click();
  await page.keyboard.type("toddy");

  // Mark every letter "correct": absent -> present -> correct, two clicks each.
  for (let i = 0; i < 5; i++) {
    const box = letterBoxes.nth(i);
    await box.click();
    await box.click();
    await expect(box).toHaveClass(/letter-box--correct/);
  }

  await expect(page.locator(".results h2")).toHaveText("1 possible word");
  await expect(page.locator(".word-list li")).toHaveText("toddy");
});

test("adding and removing guess rows", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".guess-row")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Remove this guess" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Add guess" }).click();
  await expect(page.locator(".guess-row")).toHaveCount(2);

  const removeButtons = page.getByRole("button", {
    name: "Remove this guess",
  });
  await expect(removeButtons.first()).toBeEnabled();
  await removeButtons.last().click();

  await expect(page.locator(".guess-row")).toHaveCount(1);
});
