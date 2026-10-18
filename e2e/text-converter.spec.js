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
  await expect(page.locator("#converter-output")).toHaveValue("नेपाल सरकार\nसरकार नेपाल हो");
  await expect(page.locator(".count").first()).toHaveText("27 characters");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator("#converter-input")).toBeEmpty();
  await expect(page.locator("#converter-output")).toBeEmpty();
  await expect(page.locator(".count")).toHaveText(["0 characters", "0 characters"]);
  await expect(page.getByRole("button", { name: "Clear" })).toBeDisabled();
});

test("converts Unicode to Preeti with exact output", async ({ page }) => {
  await page.getByRole("button", { name: "Unicode → Preeti" }).first().click();
  await page.locator("#converter-input").fill("प्रिय नेपाल, Nepal");
  await expect(page.locator("#converter-output")).toHaveValue("lk|o g]kfn, Nepal");
});

test("Unicode to Preeti sample and swap back", async ({ page }) => {
  await page.getByRole("button", { name: "Unicode → Preeti" }).first().click();
  await page.getByRole("button", { name: "Load sample" }).click();
  await expect(page.locator("#converter-output")).toHaveValue("g]kfn ;/sf/\n;/sf/ g]kfn xf]");
  await page.getByRole("button", { name: /Swap/ }).click();
  await expect(page.locator("#converter-output")).toHaveValue("नेपाल सरकार\nसरकार नेपाल हो");
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
