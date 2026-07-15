import type { Guess } from "../types";
import type { RecentSolution } from "../data/recentSolutions";

function countOccurrences(word: string, letter: string): number {
  let count = 0;
  for (const char of word) {
    if (char === letter) count += 1;
  }
  return count;
}

export function isWordPossible(candidate: string, guesses: Guess[]): boolean {
  for (const guess of guesses) {
    const minCount: Record<string, number> = {};
    const markedAbsent = new Set<string>();

    for (const { letter, status } of guess) {
      if (status === "correct" || status === "present") {
        minCount[letter] = (minCount[letter] ?? 0) + 1;
      }
    }
    for (const { letter, status } of guess) {
      if (status === "absent") markedAbsent.add(letter);
    }

    for (let i = 0; i < guess.length; i += 1) {
      const { letter, status } = guess[i];
      if (status === "correct" && candidate[i] !== letter) return false;
      if (
        status === "present" &&
        (candidate[i] === letter || !candidate.includes(letter))
      ) {
        return false;
      }
    }

    for (const letter of markedAbsent) {
      const required = minCount[letter] ?? 0;
      const actual = countOccurrences(candidate, letter);
      if (actual !== required) return false;
    }
  }

  return true;
}

export function filterWords(
  words: readonly string[],
  guesses: Guess[],
): string[] {
  const completeGuesses = guesses.filter((guess) =>
    guess.every((letter) => letter.letter),
  );
  return words.filter((word) => isWordPossible(word, completeGuesses));
}

const RECENCY_WINDOW_DAYS = 365;
const MIN_RECENCY_FACTOR = 0.3;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Scales a word's letter-commonality score down if it was a recent Wordle
 * answer, so freshly-used words sink in the ranking without being excluded
 * outright (NYT does occasionally repeat answers). The penalty fades
 * linearly to no effect at the edge of the one-year window.
 */
function recencyFactor(
  word: string,
  recentSolutions: readonly RecentSolution[],
  now: number,
): number {
  let mostRecentDaysAgo = Infinity;
  for (const { word: usedWord, date } of recentSolutions) {
    if (usedWord !== word) continue;
    const daysAgo = (now - new Date(date).getTime()) / MS_PER_DAY;
    if (daysAgo < mostRecentDaysAgo) mostRecentDaysAgo = daysAgo;
  }

  if (mostRecentDaysAgo >= RECENCY_WINDOW_DAYS) return 1;
  if (mostRecentDaysAgo < 0) return 1;

  const t = mostRecentDaysAgo / RECENCY_WINDOW_DAYS;
  return MIN_RECENCY_FACTOR + (1 - MIN_RECENCY_FACTOR) * t;
}

/**
 * Ranks candidates by how common their letters are within the remaining
 * candidate pool itself (positional frequency + overall frequency, each
 * letter counted once per word). This is a heuristic stand-in for real
 * answer-popularity data, which isn't available offline. Words used as a
 * Wordle answer within the past year (`recentSolutions`) are scaled down so
 * they de-prioritize behind fresher candidates.
 */
export function rankWords(
  words: string[],
  recentSolutions: readonly RecentSolution[] = [],
  now: number = Date.now(),
): string[] {
  const wordLength = words[0]?.length ?? 5;
  const positionalCounts: Array<Record<string, number>> = Array.from(
    { length: wordLength },
    () => ({}),
  );
  const overallCounts: Record<string, number> = {};

  for (const word of words) {
    const seen = new Set<string>();
    for (let i = 0; i < word.length; i += 1) {
      const letter = word[i];
      positionalCounts[i][letter] = (positionalCounts[i][letter] ?? 0) + 1;
      if (!seen.has(letter)) {
        overallCounts[letter] = (overallCounts[letter] ?? 0) + 1;
        seen.add(letter);
      }
    }
  }

  const score = (word: string): number => {
    const seen = new Set<string>();
    let total = 0;
    for (let i = 0; i < word.length; i += 1) {
      const letter = word[i];
      total += positionalCounts[i][letter] ?? 0;
      if (!seen.has(letter)) {
        total += overallCounts[letter] ?? 0;
        seen.add(letter);
      }
    }
    return total * recencyFactor(word, recentSolutions, now);
  };

  return [...words].sort((a, b) => score(b) - score(a));
}
