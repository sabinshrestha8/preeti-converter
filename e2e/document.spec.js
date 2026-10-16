import { test, expect } from "@playwright/test";
import fs from "node:fs";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { makeUnicodeDocx, makePreetiDocx } from "./helpers.js";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Word Document" }).click();
});

async function upload(page, buffer, filename) {
  await page.locator('input[type="file"]').setInputFiles([{ name: filename, mimeType: "application/octet-stream", buffer }]);
}

test("converts Unicode docx to Preeti and downloads a valid file", async ({ page }) => {
  await page.getByRole("button", { name: "Unicode → Preeti" }).first().click();
  await upload(page, await makeUnicodeDocx(), "letter.docx");
  await expect(page.getByText("letter.docx")).toBeVisible();
  await expect(page.getByText(/KB/)).toBeVisible();
  await page.getByRole("button", { name: "Convert document" }).click();
  await expect(page.getByText("Conversion complete")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /Download/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/-preeti\.docx$/);
  const path = await download.path();
  const zip = await JSZip.loadAsync(fs.readFileSync(path));
  expect(zip.files["word/document.xml"]).toBeTruthy();
  const xml = await zip.files["word/document.xml"].async("string");
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const texts = Array.from(doc.getElementsByTagNameNS(W, "t")).map((n) => n.textContent);
  expect(texts).toEqual(["g]kfn", ";/sf/"]);
  expect(xml).toContain('w:ascii="Preeti"');
});

test("converts Preeti docx to Unicode", async ({ page }) => {
  await upload(page, await makePreetiDocx(), "chitthi.docx");
  await page.getByRole("button", { name: "Convert document" }).click();
  await expect(page.getByText("Conversion complete")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /Download/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/-unicode\.docx$/);
});

test("rejects non-docx files with a clear error", async ({ page }) => {
  await upload(page, Buffer.from("just some text"), "notes.txt");
  await expect(page.locator("p.error")).toContainText(/Only .docx files/);
});

test("rejects malformed docx safely without leaking contents", async ({ page }) => {
  const marker = "SECRET-MARKER-STRING";
  const buf = Buffer.concat([Buffer.from("PK"), Buffer.from(marker), Buffer.from("not-a-zip")]);
  await upload(page, buf, "broken.docx");
  await page.getByRole("button", { name: "Convert document" }).click();
  const alert = page.locator("p.error");
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText(marker);
});

test("reset clears the upload state", async ({ page }) => {
  await upload(page, await makeUnicodeDocx(), "letter.docx");
  await expect(page.getByText("letter.docx")).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("letter.docx")).not.toBeVisible();
});
