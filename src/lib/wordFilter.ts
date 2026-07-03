import type { Guess } from "../types";

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

/**
 * Ranks candidates by how common their letters are within the remaining
 * candidate pool itself (positional frequency + overall frequency, each
 * letter counted once per word). This is a heuristic stand-in for real
 * answer-popularity data, which isn't available offline.
 */
export function rankWords(words: string[]): string[] {
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
    return total;
  };

  return [...words].sort((a, b) => score(b) - score(a));
}
