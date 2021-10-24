import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { graphql } from "msw";
import App from "./App";
import { server } from "./mocks/server";
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

test("fetch and delete", async () => {
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

  const index = 1;
  const notes = selectedTrackDetailClipData.live_set.view.detail_clip.notes;
  const pitchInput = within(rows[index].cells[colIndexes.pitch]).getByRole(
    "textbox"
  );
  expect(pitchInput).toHaveDisplayValue(String(notes[index].pitch));

  const toggle = within(rows[index]).getByRole("checkbox");
  expect(toggle).toBeInTheDocument();
  expect(toggle).not.toBeChecked();

  userEvent.click(toggle);
  expect(toggle).toBeChecked();
  expect(deleteButton).toBeEnabled();

  userEvent.click(deleteButton);
  expect(deleteButton).toBeDisabled();
  const [, ...modifiedRows] = within(table).getAllByRole("row");
  expect(modifiedRows).toHaveLength(rows.length - 1);
  expect(pitchInput).toHaveDisplayValue(String(notes[index + 1].pitch));

  const toggleAll = within(columnHeaderRow).getByRole("checkbox");
  expect(toggleAll).toBeInTheDocument();
  userEvent.click(toggleAll);
  expect(deleteButton).toBeEnabled();

  userEvent.click(deleteButton);
  expect(deleteButton).toBeDisabled();
  const [, ...remainingRows] = within(table).getAllByRole("row");
  expect(remainingRows).toHaveLength(0);
});

test("fetch and insert", async () => {
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

  const insertNoteToggle = screen.getByRole("button", { name: /insert/i });
  expect(insertNoteToggle).toBeInTheDocument();
  userEvent.click(insertNoteToggle);

  const initialStartInputDisplayValue = "0";
  const startInput = screen.getByLabelText(/start/i);
  expect(startInput).toHaveDisplayValue(initialStartInputDisplayValue);

  // Insert note at start 0 with pitch 1 less than the first note so sorted first.
  const pitchDisplayValue = String(notes[0].pitch - 1);
  const pitchInput = screen.getByLabelText(/pitch/i);
  userEvent.click(pitchInput);
  userEvent.paste(pitchInput, pitchDisplayValue); // type seems not to work correctly.
  userEvent.tab();
  expect(pitchInput).toHaveDisplayValue(pitchDisplayValue);

  userEvent.click(screen.getByRole("button", { name: /^insert$/i }));
  expect(startInput).toHaveDisplayValue(initialStartInputDisplayValue);
  const [, ...rowsAfterInsert] = within(table).getAllByRole("row");
  expect(rowsAfterInsert).toHaveLength(rows.length + 1);
  const pitchTableInput = within(
    rowsAfterInsert[0].cells[colIndexes.pitch]
  ).getByRole("textbox");
  expect(pitchTableInput).toHaveDisplayValue(pitchDisplayValue);

  // Step start up by the last notes start time + 1
  const stepValue = notes[notes.length - 1].start_time + 1;
  const stepDisplayValue = String(stepValue);
  const stepInput = screen.getByLabelText(/step/i);
  userEvent.click(stepInput);
  userEvent.paste(stepInput, stepDisplayValue);
  userEvent.tab();
  expect(stepInput).toHaveDisplayValue(stepDisplayValue);

  userEvent.click(screen.getByRole("button", { name: /^step$/i }));
  expect(startInput).toHaveDisplayValue(stepDisplayValue);

  // Insert and step
  userEvent.click(
    screen.getByRole("button", {
      name: /^insert.+step$/i,
    })
  );
  const [, ...rowsAfterInsertAndStep] = within(table).getAllByRole("row");
  expect(rowsAfterInsertAndStep).toHaveLength(rowsAfterInsert.length + 1);
  const startTableInput = within(
    rowsAfterInsertAndStep[rowsAfterInsertAndStep.length - 1].cells[
      colIndexes.start_time
    ]
  ).getByRole("textbox");
  expect(startTableInput).toHaveDisplayValue(stepDisplayValue);
  expect(startInput).toHaveDisplayValue(String(stepValue * 2));
});

test("fetch, edit, and save", async () => {
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

  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  server.use(
    graphql.mutation("ReplaceAllNotes", (req, res, ctx) => {
      const { id } = req.variables;
      resolve(req.variables);
      return res(
        ctx.data({
          clip_remove_notes_extended: {
            id: id,
            name: "",
            notes: [],
            __typename: "Clip",
          },
          clip_add_new_notes: {
            id: id,
            name: "",
            notes: [
              {
                __typename: "Note",
                duration: 0.25,
                mute: 0,
                note_id: 99,
                pitch: 59,
                probability: 1,
                release_velocity: 64,
                start_time: 0,
                velocity: 100,
                velocity_deviation: 0,
              },
              {
                __typename: "Note",
                duration: 0.25,
                mute: 0,
                note_id: 100,
                pitch: 64,
                probability: 1,
                release_velocity: 64,
                start_time: 1,
                velocity: 100,
                velocity_deviation: 0,
              },
              {
                __typename: "Note",
                duration: 0.25,
                mute: 0,
                note_id: 101,
                pitch: 67,
                probability: 1,
                release_velocity: 64,
                start_time: 1.5,
                velocity: 100,
                velocity_deviation: 0,
              },
            ],
            __typename: "Clip",
          },
        })
      );
    })
  );

  const pitch = notes[0].pitch - 1;
  const pitchInput = within(rows[0].cells[colIndexes.pitch]).getByRole(
    "textbox"
  );
  userEvent.type(pitchInput, pitch.toString());
  userEvent.tab();
  expect(pitchInput).toHaveDisplayValue(pitch.toString());

  userEvent.click(screen.getByRole("button", { name: /save/i }));
  const { id, notesDictionary } = await promise;
  expect(id).toBe(selectedTrackDetailClipData.live_set.view.detail_clip.id);
  expect(notesDictionary.notes[0].pitch).toBe(pitch);
});
