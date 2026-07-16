import { describe, expect, it } from "vitest";
import { filterWords, isWordPossible, rankWords } from "./wordFilter";
import type { Guess, LetterStatus } from "../types";

function guess(...letters: Array<[string, LetterStatus]>): Guess {
  return letters.map(([letter, status]) => ({ letter, status }));
}

describe("isWordPossible", () => {
  it("requires correct letters in the correct position", () => {
    const guesses = [
      guess(
        ["a", "correct"],
        ["b", "correct"],
        ["c", "absent"],
        ["d", "absent"],
        ["e", "absent"],
      ),
    ];
    expect(isWordPossible("abxyz", guesses)).toBe(true);
    expect(isWordPossible("abcxy", guesses)).toBe(false);
  });

  it("requires present letters elsewhere in the word", () => {
    const guesses = [
      guess(
        ["f", "absent"],
        ["g", "present"],
        ["h", "absent"],
        ["i", "absent"],
        ["j", "absent"],
      ),
    ];
    expect(isWordPossible("zzgzz", guesses)).toBe(true);
    expect(isWordPossible("zgzzz", guesses)).toBe(false);
  });

  it("excludes words containing absent letters", () => {
    const guesses = [
      guess(
        ["k", "absent"],
        ["l", "absent"],
        ["m", "absent"],
        ["n", "absent"],
        ["o", "absent"],
      ),
    ];
    expect(isWordPossible("pqrst", guesses)).toBe(true);
    expect(isWordPossible("pqrsk", guesses)).toBe(false);
  });

  it("handles a letter marked both present and absent (duplicate letters)", () => {
    // "x" present once (not at index 0) and also absent means the word
    // contains exactly one "x", not more.
    const guesses = [
      guess(
        ["x", "present"],
        ["y", "absent"],
        ["x", "absent"],
        ["y", "absent"],
        ["y", "absent"],
      ),
    ];
    expect(isWordPossible("zxzzz", guesses)).toBe(true);
    expect(isWordPossible("xxzzz", guesses)).toBe(false);
  });

  it("combines constraints across multiple guesses", () => {
    const guesses = [
      guess(
        ["a", "correct"],
        ["b", "absent"],
        ["c", "absent"],
        ["d", "absent"],
        ["e", "absent"],
      ),
      guess(
        ["a", "correct"],
        ["f", "present"],
        ["g", "absent"],
        ["h", "absent"],
        ["i", "absent"],
      ),
    ];
    expect(isWordPossible("azfzz", guesses)).toBe(true);
    expect(isWordPossible("azzzz", guesses)).toBe(false);
  });
});

describe("filterWords", () => {
  it("ignores guesses with any empty letter", () => {
    const incomplete: Guess = [
      { letter: "c", status: "correct" },
      { letter: "", status: "absent" },
      { letter: "a", status: "absent" },
      { letter: "t", status: "absent" },
      { letter: "e", status: "absent" },
    ];
    const words = ["crane", "plush"];
    expect(filterWords(words, [incomplete])).toEqual(words);
  });

  it("narrows the word list down using a complete guess", () => {
    const words = ["abxyz", "abcxy", "xyzzy", "abxzz"];
    const guesses = [
      guess(
        ["a", "correct"],
        ["b", "correct"],
        ["c", "absent"],
        ["d", "absent"],
        ["e", "absent"],
      ),
    ];
    expect(filterWords(words, guesses)).toEqual(["abxyz", "abxzz"]);
  });
});

describe("rankWords", () => {
  it("ranks words with more common letters higher", () => {
    const ranked = rankWords(["zebra", "eases", "asset"]);
    expect(ranked[0]).not.toBe("zebra");
  });

  it("returns all input words", () => {
    const words = ["crane", "plush", "count"];
    expect(rankWords(words).sort()).toEqual([...words].sort());
  });

  it("de-prioritizes a word used as a Wordle answer yesterday", () => {
    const now = new Date("2026-07-15T00:00:00Z").getTime();
    const recentSolutions = [{ date: "2026-07-14", word: "crane" }];
    const ranked = rankWords(["crane", "count"], recentSolutions, now);
    expect(ranked[0]).toBe("count");
  });

  it("applies the maximum penalty to a same-day or future-dated entry", () => {
    const now = new Date("2026-07-15T00:00:00Z").getTime();
    const todayRecent = [{ date: "2026-07-15", word: "crane" }];
    const futureRecent = [{ date: "2026-07-16", word: "crane" }];
    const today = rankWords(["crane", "count"], todayRecent, now);
    const future = rankWords(["crane", "count"], futureRecent, now);
    expect(today[0]).toBe("count");
    expect(future[0]).toBe("count");
  });

  it("does not penalize a word used more than a year ago", () => {
    const now = new Date("2026-07-15T00:00:00Z").getTime();
    const recentSolutions = [{ date: "2024-01-01", word: "crane" }];
    const withRecent = rankWords(["crane", "count"], recentSolutions, now);
    const withoutRecent = rankWords(["crane", "count"]);
    expect(withRecent).toEqual(withoutRecent);
  });
});
