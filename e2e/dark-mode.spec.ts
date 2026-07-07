import { test, expect, type Page } from "@playwright/test";

function hexToRgb(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

async function markFirstLetterCorrect(page: Page) {
  const box = page.getByRole("textbox", { name: /^Letter 1(?:,|$)/ });
  await box.click();
  await page.keyboard.type("a");
  await box.click();
  await box.click();
  await expect(box).toHaveClass(/letter-box--correct/);
  return box;
}

test("uses light theme colors when the OS prefers light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    hexToRgb("#ffffff"),
  );

  const box = await markFirstLetterCorrect(page);
  await expect(box).toHaveCSS("background-color", hexToRgb("#6aaa64"));
});

test("uses dark theme colors when the OS prefers dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    hexToRgb("#16171d"),
  );

  const box = await markFirstLetterCorrect(page);
  await expect(box).toHaveCSS("background-color", hexToRgb("#538d4e"));
});
