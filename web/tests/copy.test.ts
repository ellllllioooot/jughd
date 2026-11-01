import { describe, expect, it } from "vitest";
import { CATEGORY_FA, ERROR_MESSAGES } from "../src/lib/messages";
import { fa, faDuration } from "../src/design/persian";

// The complete error-code list from contracts/api.md.
const CONTRACT_CODES = [
  "VALIDATION_ERROR",
  "EMAIL_TAKEN",
  "USERNAME_TAKEN",
  "INVALID_CREDENTIALS",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "NO_BASELINE",
  "QUOTA_EXHAUSTED",
  "ALREADY_VERIFIED",
  "RATE_LIMITED",
  "INTERNAL",
] as const;

const PERSIAN = /[؀-ۿ]/;

describe("Persian copy review (T051 / constitution VII)", () => {
  it("maps every contract error code to a Persian message", () => {
    for (const code of CONTRACT_CODES) {
      const message = (ERROR_MESSAGES as Record<string, string>)[code];
      expect(message, code).toBeTruthy();
      expect(PERSIAN.test(message), `${code} must be Persian: ${message}`).toBe(true);
    }
  });

  it("names every alert category in Persian", () => {
    for (const category of ["NECK", "SHOULDER", "SLOUCH"] as const) {
      expect(PERSIAN.test(CATEGORY_FA[category]), category).toBe(true);
    }
  });

  it("formats numbers with Persian digits", () => {
    expect(fa("1234567890")).toBe("۱۲۳۴۵۶۷۸۹۰");
    expect(PERSIAN.test(faDuration(3661))).toBe(true);
  });
});
