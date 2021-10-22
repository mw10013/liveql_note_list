import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { selectedTrackDetailClipData } from "./mocks/handlers";

test("fetch and display", async () => {
  render(<App />);
  const fetch = screen.getByRole("button", { name: /fetch/i });
  expect(fetch).toBeInTheDocument();

  userEvent.click(fetch);
  const save = await screen.findByRole("button", { name: /save/i });
  expect(save).toBeInTheDocument();

  const table = screen
    .getByRole("columnheader", { name: /pitch/i })
    .closest("table");
  expect(table).toBeInTheDocument();
  const [columnHeaderRow, ...rows] = within(table).getAllByRole("row");
  expect(columnHeaderRow).toBeInTheDocument();

  // same keys as note.
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

  const notes = selectedTrackDetailClipData.live_set.view.detail_clip.notes;
  expect(rows).toHaveLength(notes.length);

  notes.forEach((note, index) => {
    for (const [key, cellIndex] of Object.entries(colIndexes)) {
      const cell = rows[index].cells[cellIndex];
      const textbox = within(cell).getByRole("textbox");
      expect({ index, key, value: Number(textbox.value) }).toEqual(
        expect.objectContaining({ value: notes[index][key] })
      );
    }
  });
});

test("fetch and edit", async () => {
  render(<App />);
  const fetch = screen.getByRole("button", { name: /fetch/i });
  expect(fetch).toBeInTheDocument();

  userEvent.click(fetch);
  const save = await screen.findByRole("button", { name: /save/i });
  expect(save).toBeInTheDocument();

  const table = screen
    .getByRole("columnheader", { name: /pitch/i })
    .closest("table");
  expect(table).toBeInTheDocument();
  const [columnHeaderRow, ...rows] = within(table).getAllByRole("row");
  expect(columnHeaderRow).toBeInTheDocument();

  // same keys as note.
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

  const pitchInput = within(rows[0].cells[colIndexes.pitch]).getByRole(
    "textbox"
  );
  userEvent.type(pitchInput, "-1");
  userEvent.tab();
  expect(pitchInput).toHaveDisplayValue("0");

  userEvent.type(pitchInput, "128");
  userEvent.tab();
  expect(pitchInput).toHaveDisplayValue("127");

  userEvent.type(pitchInput, "99");
  userEvent.tab();
  expect(pitchInput).toHaveDisplayValue("99");

  const startTimeInput = within(rows[0].cells[colIndexes.start_time]).getByRole(
    "textbox"
  );
  userEvent.type(startTimeInput, "-1");
  userEvent.tab();
  expect(startTimeInput).toHaveDisplayValue("0");

  const lastStartTimeInput = within(
    rows[rows.length - 1].cells[colIndexes.start_time]
  ).getByRole("textbox");
  const lastStartTimeOld = Number(lastStartTimeInput.value);
  const lastStartTimeNewDisplayValue = String(lastStartTimeOld + 1);

  userEvent.type(startTimeInput, lastStartTimeNewDisplayValue);
  userEvent.tab();
  expect(startTimeInput).not.toHaveDisplayValue(lastStartTimeNewDisplayValue);
  expect(lastStartTimeInput).toHaveDisplayValue(lastStartTimeNewDisplayValue);
});

test.only("fetch and delete", async () => {
  render(<App />);
  const fetch = screen.getByRole("button", { name: /fetch/i });
  expect(fetch).toBeInTheDocument();

  userEvent.click(fetch);
  const save = await screen.findByRole("button", { name: /save/i });
  expect(save).toBeInTheDocument();

  const table = screen
    .getByRole("columnheader", { name: /pitch/i })
    .closest("table");
  expect(table).toBeInTheDocument();
  const [columnHeaderRow, ...rows] = within(table).getAllByRole("row");
  expect(columnHeaderRow).toBeInTheDocument();

  // same keys as note.
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

  const deleteButton = screen.getByRole("button", { name: /delete/i });
  expect(deleteButton).toBeInTheDocument();
  expect(deleteButton).toBeDisabled();

  const toggle = within(rows[1]).getByRole("checkbox");
  expect(toggle).toBeInTheDocument();
  expect(toggle).not.toBeChecked();

  userEvent.click(toggle);
  expect(toggle).toBeChecked();
  expect(deleteButton).toBeEnabled();

  userEvent.click(deleteButton);
  expect(deleteButton).toBeDisabled();

  expect(rows).toHaveLength(3);
  const [, ...modifiedRows] = within(table).getAllByRole("row");
  expect(modifiedRows).toHaveLength(2);

  const toggleAll = within(columnHeaderRow).getByRole("checkbox");
  expect(toggleAll).toBeInTheDocument();
  userEvent.click(toggleAll);
  expect(deleteButton).toBeEnabled();

  userEvent.click(deleteButton);
  expect(deleteButton).toBeDisabled();
  const [, ...remainingRows] = within(table).getAllByRole("row");
  expect(remainingRows).toHaveLength(0);
});
