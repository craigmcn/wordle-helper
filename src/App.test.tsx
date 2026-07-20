import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import App from "./App";

describe("App", () => {
  it("has no detectable accessibility violations", async () => {
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("narrows the word list once a full guess is entered", async () => {
    const user = userEvent.setup();
    render(<App />);

    const initialCount = Number(
      screen.getByRole("heading", { level: 2 }).textContent?.match(/\d+/)?.[0],
    );

    // Fill in a full 5-letter guess; letters default to "absent" until
    // clicked, so this alone should exclude words containing "z".
    for (const input of screen.getAllByRole("textbox")) {
      await user.type(input, "z");
    }

    const updatedCount = Number(
      screen.getByRole("heading", { level: 2 }).textContent?.match(/\d+/)?.[0],
    );

    expect(updatedCount).toBeLessThan(initialCount);
  });

  it("cycles a letter's status with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<App />);

    const [firstInput] = screen.getAllByRole("textbox");
    await user.type(firstInput, "z");
    expect(firstInput).toHaveAccessibleName(/not in word/);

    // Typing auto-advances focus to the next box, so target the key
    // events at the first box directly rather than via document.activeElement.
    fireEvent.keyDown(firstInput, { key: "ArrowUp" });
    expect(firstInput).toHaveAccessibleName(/wrong position/);

    fireEvent.keyDown(firstInput, { key: "ArrowUp" });
    expect(firstInput).toHaveAccessibleName(/correct position/);

    fireEvent.keyDown(firstInput, { key: "ArrowDown" });
    expect(firstInput).toHaveAccessibleName(/wrong position/);
  });

  it("focuses the first letter of a newly added row", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /add guess/i }));

    const textboxes = screen.getAllByRole("textbox");
    const newRowFirstInput = textboxes[textboxes.length - 5];
    expect(newRowFirstInput).toHaveFocus();
  });

  it("adds a new guess row prefilled with a clicked suggestion", async () => {
    const user = userEvent.setup();
    render(<App />);

    const [suggestion] = screen.getAllByRole("button", {
      name: /^use .+ as next guess$/i,
    });
    const word = suggestion.textContent ?? "";

    await user.click(suggestion);

    const textboxes = screen.getAllByRole("textbox");
    const newRowInputs = textboxes.slice(-5);
    expect(
      newRowInputs.map((input) => (input as HTMLInputElement).value),
    ).toEqual(word.toLowerCase().split(""));
    expect(newRowInputs[0]).toHaveFocus();
    for (const input of newRowInputs) {
      expect(input).toHaveAccessibleName(/not in word/);
    }
  });

  it("activates a suggestion via the keyboard", async () => {
    const user = userEvent.setup();
    render(<App />);

    const [suggestion] = screen.getAllByRole("button", {
      name: /^use .+ as next guess$/i,
    });

    let guard = 0;
    while (document.activeElement !== suggestion && guard < 50) {
      await user.tab();
      guard += 1;
    }
    expect(suggestion).toHaveFocus();

    const initialInputCount = screen.getAllByRole("textbox").length;
    await user.keyboard("{Enter}");

    expect(screen.getAllByRole("textbox")).toHaveLength(initialInputCount + 5);
  });
});
