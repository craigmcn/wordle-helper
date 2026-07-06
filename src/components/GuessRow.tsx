import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { Guess, LetterStatus } from "../types";

const nextStatus: Record<LetterStatus, LetterStatus> = {
  absent: "present",
  present: "correct",
  correct: "absent",
};

const previousStatus: Record<LetterStatus, LetterStatus> = {
  present: "absent",
  correct: "present",
  absent: "correct",
};

const statusLabel: Record<LetterStatus, string> = {
  absent: "not in word",
  present: "in word, wrong position",
  correct: "correct position",
};

interface GuessRowProps {
  guess: Guess;
  onChange: (guess: Guess) => void;
  onRemove: () => void;
  canRemove: boolean;
  focusFirstInput?: boolean;
}

export function GuessRow({
  guess,
  onChange,
  onRemove,
  canRemove,
  focusFirstInput = false,
}: GuessRowProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusFirstInputOnMount = useRef(focusFirstInput);

  useEffect(() => {
    if (focusFirstInputOnMount.current) {
      inputRefs.current[0]?.focus();
    }
  }, []);

  const handleLetterChange = (index: number, value: string) => {
    const letter = value
      .slice(-1)
      .toLowerCase()
      .replace(/[^a-z]/, "");
    const updated = [...guess];
    updated[index] = { ...updated[index], letter };
    onChange(updated);

    if (letter && index < guess.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !guess[index].letter && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      cycleStatus(index, nextStatus);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      cycleStatus(index, previousStatus);
    }
  };

  const cycleStatus = (
    index: number,
    statusMap: Record<LetterStatus, LetterStatus>,
  ) => {
    if (!guess[index].letter) return;
    const updated = [...guess];
    updated[index] = {
      ...updated[index],
      status: statusMap[updated[index].status],
    };
    onChange(updated);
  };

  return (
    <div className="guess-row">
      {guess.map((letter, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          className={`letter-box letter-box--${letter.status}`}
          type="text"
          inputMode="text"
          maxLength={1}
          value={letter.letter}
          onChange={(event) => handleLetterChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onClick={() => cycleStatus(index, nextStatus)}
          aria-label={`Letter ${index + 1}${
            letter.letter ? `, ${statusLabel[letter.status]}` : ""
          }`}
        />
      ))}
      <button
        type="button"
        className="remove-row"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove this guess"
      >
        &times;
      </button>
    </div>
  );
}
