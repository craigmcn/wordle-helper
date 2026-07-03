import { render, screen } from "@testing-library/react";
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
});
