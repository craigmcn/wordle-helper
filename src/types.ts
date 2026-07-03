export type LetterStatus = "absent" | "present" | "correct";

export interface GuessLetter {
  letter: string;
  status: LetterStatus;
}

export type Guess = GuessLetter[];
