import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// jest.setTimeout(10_000);

test("fetch clip", async () => {
  render(<App />);
  const fetch = screen.getByRole("button", { name: /fetch/i });
  expect(fetch).toBeInTheDocument();

  userEvent.click(fetch);
  const save = await screen.findByRole("button", { name: /save/i });
  expect(save).toBeInTheDocument();
  // screen.debug();

  expect(screen.queryAllByRole("row")).toHaveLength(4);
});
