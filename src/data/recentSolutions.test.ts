import { describe, expect, it } from "vitest";
import { RECENT_SOLUTIONS } from "./recentSolutions";
import { WORDS } from "./words";

describe("RECENT_SOLUTIONS", () => {
  it("has strictly increasing, non-duplicate dates in order", () => {
    for (let i = 1; i < RECENT_SOLUTIONS.length; i++) {
      const prev = RECENT_SOLUTIONS[i - 1].date;
      const curr = RECENT_SOLUTIONS[i].date;
      expect(new Date(curr).getTime()).toBeGreaterThan(
        new Date(prev).getTime(),
      );
    }
  });

  it("has no gaps between consecutive dates", () => {
    const oneDayMs = 24 * 60 * 60 * 1000;
    for (let i = 1; i < RECENT_SOLUTIONS.length; i++) {
      const prev = new Date(RECENT_SOLUTIONS[i - 1].date).getTime();
      const curr = new Date(RECENT_SOLUTIONS[i].date).getTime();
      expect(curr - prev).toBe(oneDayMs);
    }
  });

  it("uses well-formed ISO dates (YYYY-MM-DD)", () => {
    for (const { date } of RECENT_SOLUTIONS) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("uses five-letter lowercase-alphabetic words", () => {
    for (const { word } of RECENT_SOLUTIONS) {
      expect(word).toMatch(/^[a-z]{5}$/);
    }
  });

  it("only uses words from the canonical Wordle answer list", () => {
    const wordSet = new Set(WORDS);
    for (const { word } of RECENT_SOLUTIONS) {
      expect(wordSet.has(word)).toBe(true);
    }
  });
});
