import type { Guess, LetterStatus } from "../types";

const nextStatus: Record<LetterStatus, LetterStatus> = {
  absent: "present",
  present: "correct",
  correct: "absent",
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
}

export function GuessRow({
  guess,
  onChange,
  onRemove,
  canRemove,
}: GuessRowProps) {
  const handleLetterChange = (index: number, value: string) => {
    const letter = value
      .slice(-1)
      .toLowerCase()
      .replace(/[^a-z]/, "");
    const updated = [...guess];
    updated[index] = { ...updated[index], letter };
    onChange(updated);
  };

  const handleStatusCycle = (index: number) => {
    if (!guess[index].letter) return;
    const updated = [...guess];
    updated[index] = {
      ...updated[index],
      status: nextStatus[updated[index].status],
    };
    onChange(updated);
  };

  return (
    <div className="guess-row">
      {guess.map((letter, index) => (
        <input
          key={index}
          className={`letter-box letter-box--${letter.status}`}
          type="text"
          inputMode="text"
          maxLength={1}
          value={letter.letter}
          onChange={(event) => handleLetterChange(index, event.target.value)}
          onClick={() => handleStatusCycle(index)}
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
