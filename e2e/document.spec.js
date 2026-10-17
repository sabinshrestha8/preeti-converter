import { test, expect } from "@playwright/test";
import fs from "node:fs";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { makeUnicodeDocx, makePreetiDocx, makeDocxBuffer } from "./helpers.js";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Word Document" }).click();
});

async function readDocumentXml(download) {
  const zip = await JSZip.loadAsync(fs.readFileSync(await download.path()));
  return zip.files["word/document.xml"].async("string");
}

function textsOf(xml) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return Array.from(doc.getElementsByTagNameNS(W, "t")).map((n) => n.textContent);
}

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
  const xml = await readDocumentXml(download);
  expect(textsOf(xml)).toEqual(["नेपाल", "सरकार"]);
  expect(xml).toContain('w:ascii="Nirmala UI"');
  await expect(page.getByText("2 of 2 text runs converted")).toBeVisible();
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

test("rejects files over 10 MB before reading them", async ({ page }) => {
  await upload(page, Buffer.alloc(10 * 1024 * 1024 + 1), "huge.docx");
  await expect(page.locator("p.error")).toHaveText("“huge.docx” is 10.0 MB, above the 10 MB limit.");
  await expect(page.getByRole("button", { name: "Convert document" })).toBeDisabled();
});

const conversionErrors = [
  ["an empty file", async () => Buffer.alloc(0), /The file is empty/],
  [
    "a ZIP without word/document.xml",
    async () => {
      const zip = new JSZip();
      zip.file("[Content_Types].xml", "<Types/>");
      return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
    },
    /missing its main document/,
  ],
  [
    "a password-protected (OLE) file",
    async () => Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    /password-protected or in the old Word 97-2003/,
  ],
];
for (const [name, make, message] of conversionErrors) {
  test(`shows a specific error for ${name}`, async ({ page }) => {
    await upload(page, await make(), "input.docx");
    await page.getByRole("button", { name: "Convert document" }).click();
    await expect(page.locator('p.error[role="alert"]')).toHaveText(message);
  });
}

test("changing direction clears a finished result", async ({ page }) => {
  await upload(page, await makePreetiDocx(), "chitthi.docx");
  await page.getByRole("button", { name: "Convert document" }).click();
  await expect(page.getByRole("link", { name: /Download/ })).toBeVisible();
  await page.getByRole("button", { name: "Unicode → Preeti" }).click();
  await expect(page.getByRole("link", { name: /Download/ })).toHaveCount(0);
  await expect(page.getByText("chitthi.docx")).toBeVisible();
});

test("convert and download with the keyboard only", async ({ page }) => {
  await upload(page, await makePreetiDocx(), "chitthi.docx");
  await page.locator('input[type="file"]').focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Convert document" })).toBeFocused();
  await page.keyboard.press("Enter");
  const link = page.getByRole("link", { name: /Download/ });
  await expect(link).toBeVisible();
  await page.keyboard.press("Tab"); // Reset
  await page.keyboard.press("Tab"); // Download link
  await expect(link).toBeFocused();
  const [download] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
  expect(textsOf(await readDocumentXml(download))).toEqual(["नेपाल", "सरकार"]);
});

test("document contents never leave the page (no cross-origin or upload requests)", async ({ page, baseURL }) => {
  const foreign = [];
  const nonGet = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith(baseURL) && !url.startsWith("blob:") && !url.startsWith("data:")) foreign.push(url);
    if (req.method() !== "GET") nonGet.push(`${req.method()} ${url}`);
  });
  await upload(page, await makeDocxBuffer("<w:p><w:r><w:t>g]kfn PRIVATE-CONTENT</w:t></w:r></w:p>"), "private.docx");
  await page.getByRole("button", { name: "Convert document" }).click();
  await expect(page.getByText("Conversion complete")).toBeVisible();
  await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Download/ }).click()]);
  expect(foreign).toEqual([]);
  expect(nonGet).toEqual([]);
});

test("document tab fits a 375px screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await upload(page, await makePreetiDocx(), "a-rather-long-file-name-for-a-phone-screen.docx");
  await page.getByRole("button", { name: "Convert document" }).click();
  await expect(page.getByRole("link", { name: /Download/ })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
