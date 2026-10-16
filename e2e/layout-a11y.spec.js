import { test, expect } from "@playwright/test";

test("has one h1 and labelled landmarks", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
});

test("tab buttons are keyboard-operable", async ({ page }) => {
  await page.goto("/");
  const docTab = page.getByRole("tab", { name: "Word Document" });
  await docTab.focus();
  await expect(docTab).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Word document converter" })).toBeVisible();
});

test("mobile layout stacks without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Text Converter" }).click();
  await page.locator("#converter-input").fill("g]kfn");
  const inputBox = await page.locator("#converter-input").boundingBox();
  const outputBox = await page.locator("#converter-output").boundingBox();
  expect(outputBox.y).toBeGreaterThan(inputBox.y + inputBox.height - 1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "Copy output" })).toBeVisible();
});

test("key controls expose accessible names", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel(/input/)).toBeVisible();
  await expect(page.getByLabel(/output/)).toBeVisible();
  await page.getByRole("tab", { name: "Word Document" }).click();
  await expect(page.getByLabel("Choose file")).toBeAttached();
});
