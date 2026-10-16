// DOCX input validation: size limits, ZIP magic, required package parts.
// Never trusts the file extension; inspects actual bytes and structure.

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_TEXT_RUNS = 200_000; // sanity cap on w:t elements per package

const ZIP_MAGIC_1 = 0x50; // 'P'
const ZIP_MAGIC_2 = 0x4b; // 'K'

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
