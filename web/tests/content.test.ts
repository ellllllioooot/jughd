import { describe, expect, it } from "vitest";
import {
  EYE_BREAK_RULE,
  EXERCISES,
  TIPS,
  type ContentCategory,
  type ContentRecord,
} from "../src/content";
import { THRESHOLDS } from "../src/engine/thresholds";

const CATEGORIES: ContentCategory[] = ["NECK", "SHOULDER", "SLOUCH", "GENERAL"];

function checkCitation(record: { id: string; citation: { source: string; reference: string; url: string } }) {
  expect(record.citation.source, `${record.id} citation.source`).toBeTruthy();
  expect(record.citation.reference.length, `${record.id} citation.reference`).toBeGreaterThan(10);
  expect(() => new URL(record.citation.url), `${record.id} citation.url`).not.toThrow();
}

describe("wellness content completeness (constitution III / SC-007)", () => {
  it("every tip and exercise has Persian copy, category, and a citation", () => {
    for (const record of [...TIPS, ...EXERCISES] as ContentRecord[]) {
      expect(record.id).toBeTruthy();
      expect(record.title_fa.length).toBeGreaterThan(0);
      expect(record.body_fa.length).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(record.category);
      checkCitation(record);
      // Persian copy must actually be Persian (not Latin placeholders)
      expect(/[؀-ۿ]/.test(record.title_fa), `${record.id} title_fa`).toBe(true);
    }
  });

  it("every category is covered by at least one tip and one exercise", () => {
    for (const category of CATEGORIES) {
      expect(TIPS.some((t) => t.category === category), `tip ${category}`).toBe(true);
      expect(EXERCISES.some((e) => e.category === category), `exercise ${category}`).toBe(true);
    }
  });

  it("eye-break rule is 20-20-20 at 20-minute intervals, cited", () => {
    expect(EYE_BREAK_RULE.rule).toBe("20-20-20");
    expect(EYE_BREAK_RULE.intervalMinutes).toBe(20);
    expect(EYE_BREAK_RULE.title_fa.length).toBeGreaterThan(0);
    expect(EYE_BREAK_RULE.body_fa.length).toBeGreaterThan(0);
    checkCitation(EYE_BREAK_RULE);
  });

  it("every posture-threshold config entry cites its source (research §2)", () => {
    const allowed = new Set(["hansraj-2014", "niosh-97-141"]);
    for (const [category, t] of Object.entries(THRESHOLDS)) {
      checkCitation({ id: `threshold ${category}`, citation: t.citation });
      expect(allowed.has(t.citation.source), `${category} source`).toBe(true);
    }
  });

  it("thresholds keep their documented hysteresis relationship", () => {
    for (const t of Object.values(THRESHOLDS)) {
      expect(t.thetaLow).toBeCloseTo(t.thetaHigh * 0.7, 5);
      expect(t.sustainMs).toBeGreaterThan(0);
      expect(t.cooldownMs).toBeGreaterThan(t.sustainMs);
    }
  });
});
