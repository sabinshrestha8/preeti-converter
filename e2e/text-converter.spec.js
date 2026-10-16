import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("tab", { name: "Text Converter" }).click();
});

test("pastes Preeti and sees live Unicode output", async ({ page }) => {
  await page.locator("#converter-input").fill("g]kfn");
  await expect(page.locator("#converter-output")).toHaveValue("नेपाल");
  await expect(page.getByRole("status").first()).toContainText("Converted");
});

test("sample, clear and character counts work", async ({ page }) => {
  await page.getByRole("button", { name: "Load sample" }).click();
  const out = await page.locator("#converter-output").inputValue();
  expect(out.length).toBeGreaterThan(0);
  expect(out).toContain("नेपाल");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator("#converter-input")).toBeEmpty();
  await expect(page.locator("#converter-output")).toBeEmpty();
});

test("copies output to the clipboard", async ({ page }) => {
  await page.locator("#converter-input").fill("/fd");
  await page.getByRole("button", { name: "Copy output" }).click();
  await expect(page.getByRole("button", { name: /Copied/ })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("राम");
});

test("swaps direction and converts back", async ({ page }) => {
  await page.locator("#converter-input").fill("g]kfn");
  await expect(page.locator("#converter-output")).toHaveValue("नेपाल");
  await page.getByRole("button", { name: /Swap/ }).click();
  await expect(page.locator("#converter-input")).toHaveValue("नेपाल");
  await expect(page.locator("#converter-output")).toHaveValue("g]kfn");
});

test("switching direction tabs updates labels", async ({ page }) => {
  await page.getByRole("button", { name: "Unicode → Preeti" }).first().click();
  await expect(page.locator("#converter-input")).toHaveAttribute(
    "placeholder",
    /Unicode Nepali/
  );
});

test("keyboard-only flow converts text", async ({ page }) => {
  await page.locator("#converter-input").click();
  await page.keyboard.type("g]kfn", { delay: 10 });
  await expect(page.locator("#converter-output")).toHaveValue("नेपाल");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.textContent);
  expect(focused).toMatch(/Load sample|Clear|Copy/);
});
