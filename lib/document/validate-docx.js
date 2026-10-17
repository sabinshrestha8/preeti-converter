// DOCX input validation: size limits, ZIP magic, required package parts.
// Never trusts the file extension; inspects actual bytes and structure.

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_TEXT_RUNS = 200_000; // sanity cap on w:t elements per XML part
// Zip-bomb guards, checked against the sizes the ZIP declares before anything
// is inflated. A 40-page document.xml is a few MB; images are stored ~1:1.
export const MAX_ZIP_ENTRIES = 5_000;
export const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100 MB, whole package
export const MAX_PART_BYTES = 25 * 1024 * 1024; // 25 MB, per converted XML part

const ZIP_MAGIC_1 = 0x50; // 'P'
const ZIP_MAGIC_2 = 0x4b; // 'K'
// OLE compound file: password-protected .docx and legacy .doc both use it.
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

export function validateDocxBytes(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength === 0) {
    throw new Error("The file is empty. Please choose a valid .docx file.");
  }
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error(
      `The file is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB, above the ${MAX_FILE_BYTES / 1024 / 1024} MB limit. Split it into smaller documents and convert each part.`
    );
  }
  if (OLE_MAGIC.every((b, i) => bytes[i] === b)) {
    throw new Error(
      "This file is password-protected or in the old Word 97-2003 (.doc) format. Remove the password or save it as .docx in Word, then try again."
    );
  }
  if (bytes[0] !== ZIP_MAGIC_1 || bytes[1] !== ZIP_MAGIC_2) {
    throw new Error("This is not a Word (.docx) file. Only editable .docx files are supported (not PDFs, images, or scanned documents).");
  }
  return bytes;
}

export function validateDocxPackage(filenames) {
  const names = new Set(filenames);
  if (!names.has("word/document.xml")) {
    throw new Error("The .docx package is missing its main document (word/document.xml). The file may be corrupted.");
  }
  if (!names.has("[Content_Types].xml")) {
    throw new Error("The .docx package is missing [Content_Types].xml. The file may be corrupted.");
  }
}

// entries: [{ name, size, isTextPart }] using the ZIP's declared uncompressed sizes.
// ponytail: declared sizes can be forged; JSZip only detects the mismatch after
// inflating. Upgrade path: stream each part and abort past MAX_PART_BYTES.
export function validateDocxSizes(entries) {
  const tooLarge = "This document expands to more data than the converter can safely handle. Split it into smaller documents and convert each part.";
  if (entries.length > MAX_ZIP_ENTRIES) throw new Error(tooLarge);
  let total = 0;
  for (const { size, isTextPart } of entries) {
    if (isTextPart && size > MAX_PART_BYTES) throw new Error(tooLarge);
    total += size;
  }
  if (total > MAX_UNCOMPRESSED_BYTES) throw new Error(tooLarge);
}
