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

  const table = screen
    .getByRole("columnheader", { name: /pitch/i })
    .closest("table");
  expect(table).toBeInTheDocument();
  const [columnHeaderRow, ...rows] = within(table).getAllByRole("row");
  expect(columnHeaderRow).toBeInTheDocument();
  expect(rows).toHaveLength(3);

  // screen.debug(table);
  // screen.debug(columnHeaderRow);
  // screen.debug(startHeader);

  const colIndexes = [
    ["start_time", /start/i],
    ["pitch", /pitch/i],
    ["velocity", /velocity$/i],
    ["duration", /dur/i],
  ].reduce((acc, [key, regex]) => {
    const header = within(columnHeaderRow).getByRole("columnheader", {
      name: regex,
    });
    expect(header).toBeInTheDocument();
    return { ...acc, [key]: header.cellIndex };
  }, {});
  console.log(colIndexes);
});
