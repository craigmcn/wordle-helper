import { useMemo, useState } from "react";
import { GuessRow } from "./components/GuessRow";
import { WORDS } from "./data/words";
import { RECENT_SOLUTIONS } from "./data/recentSolutions";
import { filterWords, rankWords } from "./lib/wordFilter";
import type { Guess } from "./types";
import "./App.css";

const WORD_LENGTH = 5;
const RESULTS_SHOWN = 100;

function emptyGuess(): Guess {
  return Array.from({ length: WORD_LENGTH }, () => ({
    letter: "",
    status: "absent",
  }));
}

function guessFromWord(word: string): Guess {
  return word.split("").map((letter) => ({ letter, status: "absent" }));
}

function App() {
  const [guesses, setGuesses] = useState<Guess[]>([emptyGuess()]);

  const possibleWords = useMemo(() => {
    const filtered = filterWords(WORDS, guesses);
    return rankWords(filtered, RECENT_SOLUTIONS);
  }, [guesses]);

  const updateGuess = (index: number, guess: Guess) => {
    setGuesses((prev) => prev.map((g, i) => (i === index ? guess : g)));
  };

  const addGuess = () => {
    setGuesses((prev) => [...prev, emptyGuess()]);
  };

  const removeGuess = (index: number) => {
    setGuesses((prev) => prev.filter((_, i) => i !== index));
  };

  const applyWordAsGuess = (word: string) => {
    setGuesses((prev) => [...prev, guessFromWord(word)]);
  };

  return (
    <main id="wordle-helper">
      <h1>Wordle Helper</h1>
      <p className="instructions">
        Type each guess, then click a letter (or focus it and press &uarr;/
        &darr;) to cycle its status: grey (not in word) &rarr; yellow (wrong
        position) &rarr; green (correct).
      </p>

      <div className="guesses">
        {guesses.map((guess, index) => (
          <GuessRow
            key={index}
            guess={guess}
            onChange={(updated) => updateGuess(index, updated)}
            onRemove={() => removeGuess(index)}
            canRemove={guesses.length > 1}
            focusFirstInput={index === guesses.length - 1 && guesses.length > 1}
          />
        ))}
      </div>

      <button type="button" className="add-guess" onClick={addGuess}>
        Add guess
      </button>

      <section className="results">
        <h2>
          {possibleWords.length} possible word
          {possibleWords.length === 1 ? "" : "s"}
        </h2>
        <ul className="word-list">
          {possibleWords.slice(0, RESULTS_SHOWN).map((word) => (
            <li key={word}>
              <button
                type="button"
                className="word-suggestion"
                onClick={() => applyWordAsGuess(word)}
                aria-label={`Use ${word} as next guess`}
              >
                {word}
              </button>
            </li>
          ))}
        </ul>
        {possibleWords.length > RESULTS_SHOWN && (
          <p className="truncated-note">
            Showing the top {RESULTS_SHOWN} of {possibleWords.length} matches,
            ranked by how common each letter is among the remaining words.
          </p>
        )}
      </section>
    </main>
  );
}

export default App;
