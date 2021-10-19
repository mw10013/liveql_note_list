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

  const startHeader = within(columnHeaderRow).getByRole("columnheader", {
    name: /start/i,
  });

  // screen.debug(table);
  // screen.debug(columnHeaderRow);
  screen.debug(startHeader);
  // console.log(startHeader);
  const { cellIndex, tagName, nodeName } = startHeader;
  console.log({ cellIndex, tagName, nodeName });

  /* https://polvara.me/posts/five-things-you-didnt-know-about-testing-library
  values.forEach(([id, fruit]) => {
    const row = screen.getByText(id).closest("tr");
    // highlight-start
    const utils = within(row);
    expect(utils.getByText(id)).toBeInTheDocument();
    expect(utils.getByText(fruit)).toBeInTheDocument();
    */
  // within(columnNames).getByText("id")
  // within(columnNames).getByText("firstName")
  // within(columnNames).getByText("lastName")
});
