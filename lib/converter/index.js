// Single entry point for the conversion engine (UI + document pipeline import this).
export { convertPreetiToUnicode, normalizePreeti } from "./preeti-to-unicode.js";
export { convertUnicodeToPreeti, normalizeUnicode } from "./unicode-to-preeti.js";

import { convertPreetiToUnicode } from "./preeti-to-unicode.js";
import { convertUnicodeToPreeti } from "./unicode-to-preeti.js";

export const DIRECTIONS = {
  PREETI_TO_UNICODE: "preeti-to-unicode",
  UNICODE_TO_PREETI: "unicode-to-preeti",
};

export function convertText(text, direction) {
  if (direction === DIRECTIONS.UNICODE_TO_PREETI) return convertUnicodeToPreeti(text);
  if (direction === DIRECTIONS.PREETI_TO_UNICODE) return convertPreetiToUnicode(text);
  throw new Error(`Unknown conversion direction: ${direction}`);
}
