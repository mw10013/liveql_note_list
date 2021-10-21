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

  const notes = selectedTrackDetailClipData.live_set.view.detail_clip.notes;
  expect(rows).toHaveLength(notes.length);

  notes.forEach((note, index) => {
    for (const [key, cellIndex] of Object.entries(colIndexes)) {
      const cell = rows[index].cells[cellIndex];
      const textbox = within(cell).getByRole("textbox");
      expect({ index, key, value: Number(textbox.value) }).toEqual({
        index,
        key,
        value: notes[index][key],
      });
    }
  });
});
