import { render, screen, within } from "@testing-library/react";
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

  const table = screen.getByRole("table");
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(within(table).queryAllByRole("row")).toHaveLength(4);

  const [columnNames, ...rows] = within(table).getAllByRole("rowgroup");
  console.log(columnNames[0]);
  // within(columnNames).getByText("id")
  // within(columnNames).getByText("firstName")
  // within(columnNames).getByText("lastName")
});
