import React, { useEffect, useReducer, useState } from "react";
// import ReactDOM from "react-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  useQuery,
  useMutation,
} from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { request, gql } from "graphql-request";
import { useTable, usePagination, useRowSelect } from "react-table";
import styled from "styled-components";
import update from "immutability-helper";
import "./App.css";

const queryClient = new QueryClient();
const liveqlEndpoint = "http://localhost:4000/";

function querySelectedTrackDetailClip() {
  return request(
    liveqlEndpoint,
    gql`
      query SelectedTrackDetailClip {
        live_set {
          id
          view {
            selected_track {
              id
              name
            }
            detail_clip {
              id
              name
              start_time
              end_time
              length
              signature_numerator
              signature_denominator
              is_midi_clip
              is_arrangement_clip
              notes {
                start_time
                pitch
                velocity
                duration
                probability
                velocity_deviation
                release_velocity
                mute
                note_id
              }
            }
          }
        }
      }
    `
  );
}

// HACK: time_span is magic constant.
function mutateReplaceAllNotes(variables) {
  return request(
    liveqlEndpoint,
    gql`
      mutation ReplaceAllNotes(
        $id: Int!
        $notesDictionary: NotesDictionaryInput!
      ) {
        clip_remove_notes_extended(
          id: $id
          from_pitch: 0
          pitch_span: 127
          from_time: 0
          time_span: 1000000
        ) {
          id
        }
        clip_add_new_notes(id: $id, notes_dictionary: $notesDictionary) {
          id
          name
          notes {
            start_time
            pitch
            velocity
            duration
            probability
            velocity_deviation
            note_id
          }
        }
      }
    `,
    variables
  );
}

function mutateStart(variables) {
  return request(
    liveqlEndpoint,
    gql`
      mutation StartSong($id: Int!) {
        song_start_playing(id: $id) {
          id
        }
      }
    `,
    variables
  );
}

function mutateStop(variables) {
  return request(
    liveqlEndpoint,
    gql`
      mutation StopSong($id: Int!) {
        song_stop_playing(id: $id) {
          id
        }
      }
    `,
    variables
  );
}

function mutateFire(variables) {
  return request(
    liveqlEndpoint,
    gql`
      mutation Fire($id: Int!) {
        clip_fire(id: $id) {
          id
        }
      }
    `,
    variables
  );
}

const Styles = styled.div`
  padding: 1rem;

  table {
    border-spacing: 0;
    border: 1px solid black;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }
    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 0;
      }
    }
    input {
      font-size: 1rem;
      padding: 0;
      margin: 0;
      border: 0;
    }
  }
  .pagination {
    padding: 0.5rem;
  }
`;

const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = React.useRef();
    const resolvedRef = ref || defaultRef;

    React.useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate;
    }, [resolvedRef, indeterminate]);

    return (
      <>
        <input type="checkbox" ref={resolvedRef} {...rest} />
      </>
    );
  }
);

const cellConfig = {
  start_time: {
    type: "number",
    minValue: 0,
  },
  pitch: {
    type: "integer",
    minValue: 0,
    maxValue: 127,
  },
  velocity: {
    type: "number",
    minValue: 0,
    maxValue: 127,
  },
  duration: {
    type: "number",
    minValue: 0,
  },
  probability: {
    type: "number",
    minValue: 0,
    maxValue: 1,
  },
  velocity_deviation: {
    type: "number",
    minValue: -127,
    maxValue: 127,
  },
  step: {
    type: "number",
    minValue: 0,
  },
};

const EditableCell = ({
  value: initialValue,
  row: { index },
  column: { id },
  updateNote,
}) => {
  // We need to keep and update the state of the cell normally
  const [value, setValue] = React.useState(initialValue);

  const onChange = (e) => {
    if (!cellConfig[id].read_only) setValue(e.target.value);
  };

  // We'll only update the external data when the input is blurred
  const onBlur = () => {
    const c = cellConfig[id];
    let v = c.type === "integer" ? parseInt(value) : Number(value);
    if (isNaN(v)) {
      setValue(initialValue);
      return;
    }

    v = c.minValue !== undefined && v < c.minValue ? c.minValue : v;
    v = c.maxValue !== undefined && v > c.maxValue ? c.maxValue : v;

    setValue(v);
    updateNote(index, id, v);
  };

  const onFocus = (e) => e.target.select();

  // If the initialValue is changed external, sync it up with our state
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <input
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
    />
  );
};

// Set our editable cell renderer as the default Cell renderer
const defaultColumn = {
  Cell: EditableCell,
};

function Table({ columns, data, applyToNotes, updateNote, skipPageReset }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize, selectedRowIds },
  } = useTable(
    {
      columns,
      data,
      initialState: { pageSize: 1000 }, // HACK: handle > 1000 items.
      defaultColumn,
      // use the skipPageReset option to disable page resetting temporarily
      autoResetPage: !skipPageReset,
      updateNote,
    },
    usePagination,
    useRowSelect, // After pagination.
    (hooks) => {
      hooks.visibleColumns.push((columns) => {
        return [
          // Let's make a column for selection
          {
            id: "selection",
            // The header can use the table's getToggleAllRowsSelectedProps method
            // to render a checkbox
            Header: ({ getToggleAllPageRowsSelectedProps }) => (
              <div>
                <IndeterminateCheckbox
                  {...getToggleAllPageRowsSelectedProps()}
                />
              </div>
            ),
            // The cell can use the individual row's getToggleRowSelectedProps method
            // to the render a checkbox
            Cell: ({ row }) => (
              <div>
                <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
              </div>
            ),
          },
          ...columns,
        ];
      });
    }
  );

  return (
    <>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render("Header")}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div>
        <button
          disabled={Object.keys(selectedRowIds).length === 0}
          onClick={() => {
            applyToNotes((notes) => {
              return notes.filter(
                (el, index) => !selectedRowIds.hasOwnProperty(index)
              );
            });
          }}
        >
          Delete
        </button>
      </div>
      <pre>
        <code>
          {JSON.stringify(
            {
              selectedRowIds: selectedRowIds,
              /* 'selectedFlatRows[].original': selectedFlatRows.map(
                  d => d.original
                ), */
            },
            null,
            2
          )}
        </code>
      </pre>
    </>
  );
}

const columns = [
  {
    Header: "Start",
    accessor: "start_time",
  },
  {
    Header: "Pitch",
    accessor: "pitch",
  },
  {
    Header: "Velocity",
    accessor: "velocity",
  },
  {
    Header: "Duration",
    accessor: "duration",
  },
  {
    Header: "Probability",
    accessor: "probability",
  },
  {
    Header: "Vel Dev",
    accessor: "velocity_deviation",
  },
  {
    Header: "Note Id",
    accessor: "note_id",
    Cell: ({ value }) => String(value),
  },
];

const DEFAULT_NOTE = {
  start_time: 0,
  pitch: 64,
  velocity: 100,
  duration: 1,
  mute: 0,
  probability: 1,
  velocity_deviation: 0,
  release_velocity: 64,
  note_id: 0, // HACK: undefined may show stale values in react table
};

function sanitizeValue({ value, commitedValue, type, minValue, maxValue }) {
  let v = type === "integer" ? parseInt(value) : Number(value);
  if (isNaN(v)) {
    return commitedValue;
  }

  v = minValue !== undefined && v < minValue ? minValue : v;
  v = maxValue !== undefined && v > maxValue ? maxValue : v;
  return v;
}

function InputSection({ insertNotes }) {
  const [commitedValues, setCommitedValues] = useState({
    ...DEFAULT_NOTE,
    step: 1,
  });
  const [values, setValues] = useState(commitedValues);

  const insert = () =>
    insertNotes([
      {
        ...DEFAULT_NOTE,
        start_time: values.start_time,
        pitch: values.pitch,
        velocity: values.velocity,
        duration: values.duration,
      },
    ]);
  const step = () => {
    const start_time = commitedValues.start_time + commitedValues.step;
    setValues((old) => ({ ...old, start_time }));
    setCommitedValues((old) => ({ ...old, start_time }));
  };
  const insertAndStep = () => {
    insert();
    step();
  };

  const onChange = (e) =>
    setValues((old) => {
      return { ...old, [e.target.name]: e.target.value };
    });

  const onFocus = (e) => e.target.select();

  const onBlur = (e) => {
    const config = cellConfig[e.target.name];
    const value = sanitizeValue({
      value: values[e.target.name],
      commitedValue: commitedValues[e.target.name],
      type: config.type,
      minValue: config.minValue,
      maxValue: config.maxValue,
    });
    setValues((old) => ({ ...old, [e.target.name]: value }));
    setCommitedValues((old) => ({ ...old, [e.target.name]: value }));
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setValues((old) => ({
        ...old,
        [e.target.name]: commitedValues[e.target.name],
      }));
    }
  };

  const getFieldProps = (name) => ({
    value: values[name],
    onChange,
    onBlur,
    onFocus,
    onKeyDown,
  });

  return (
    <div>
      Input Section
      <div>
        Start Time:
        <input name="start_time" {...getFieldProps("start_time")} />
        Pitch:
        <input name="pitch" {...getFieldProps("pitch")} />
        Velocity:
        <input name="velocity" {...getFieldProps("velocity")} />
        Duration:
        <input name="duration" {...getFieldProps("duration")} />
        Step:
        <input name="step" {...getFieldProps("step")} />
      </div>
      <button onClick={insert}>Insert</button>
      <button onClick={insertAndStep}>Insert And Step</button>
      <button onClick={step}>Step</button>
      <div style={{ display: "flex", gap: "16px" }}>
        <pre>{JSON.stringify(values, null, 2)}</pre>
        <pre>{JSON.stringify(commitedValues, null, 2)}</pre>
      </div>
    </div>
  );
}

function compareNotes(a, b) {
  // start_time ascending, pitch ascending
  if (a.start_time < b.start_time) return -1;
  if (a.start_time > b.start_time) return 1;
  return a.pitch - b.pitch;
}

function Content() {
  const [data, setData] = useState();
  const [notes, setNotes] = useState([]);
  const [skipPageReset, setSkipPageReset] = React.useState(false);

  const updateNote = (rowIndex, columnId, value) => {
    setSkipPageReset(true); // Turn on flag to not reset page
    setNotes((old) => {
      let notes = update(old, { [rowIndex]: { [columnId]: { $set: value } } });
      if (columnId === "start_time" || columnId === "pitch") {
        notes.sort(compareNotes);
      }
      return notes;
    });
  };

  const applyToNotes = (fn) =>
    setNotes((old) => update(old, { $apply: fn }).sort(compareNotes));

  const insertNotes = (notes) =>
    setNotes((old) =>
      update(old, { $apply: (arr) => [...notes, ...arr] }).sort(compareNotes)
    );

  // After data chagnes, we turn the flag back off
  // so that if data actually changes when we're not
  // editing it, the page is reset
  React.useEffect(() => {
    setSkipPageReset(false);
  }, [notes]);

  const queryClient = useQueryClient();
  const {
    isLoading,
    error,
    data: queryData,
    status,
    refetch,
  } = useQuery("selectedTrackDetailClip", querySelectedTrackDetailClip, {
    refetchOnWindowFocus: false,
    enabled: false,
  });
  useEffect(() => {
    if (queryData) {
      setData(queryData);
      if (queryData.live_set.view.detail_clip) {
        setNotes(queryData.live_set.view.detail_clip.notes);
      }
    }
  }, [queryData]);

  const mutationReplaceAllNotes = useMutation(mutateReplaceAllNotes);
  const mutationFire = useMutation(mutateFire);
  const mutatationStart = useMutation(mutateStart);
  const mutatationStop = useMutation(mutateStop);

  if (isLoading) return "Loading...";
  if (error) return "An error has occurred: " + error.message;
  return (
    <div>
      <p>React query status: {status}</p>
      <button
        onClick={(e) => {
          queryClient.setQueryData("selectedTrackDetailClip", null);
          refetch({ cancelRefresh: true });
        }}
      >
        Fetch
      </button>
      {data && data.live_set.view.detail_clip ? (
        <div>
          <h1>{data.live_set.view.selected_track.name}</h1>
          <h2>{data.live_set.view.detail_clip.name}</h2>
          <div>
            {mutationReplaceAllNotes.isLoading ? (
              "Replacing..."
            ) : (
              <>
                {mutationReplaceAllNotes.isError ? (
                  <div>
                    An error occurred: {mutationReplaceAllNotes.error.message}
                  </div>
                ) : null}
                {mutationReplaceAllNotes.isSuccess ? (
                  <div>All notes replaced.</div>
                ) : null}
                <button
                  onClick={() => {
                    mutationReplaceAllNotes.mutate({
                      id: data.live_set.view.detail_clip.id,
                      notesDictionary: {
                        notes: notes.map(({ note_id, ...n }) => n),
                      },
                    });
                  }}
                >
                  Replace All Notes
                </button>
                <button
                  onClick={() =>
                    mutationFire.mutate({
                      id: data.live_set.view.detail_clip.id,
                    })
                  }
                >
                  Fire
                </button>
                <button
                  onClick={() => {
                    mutatationStart.mutate({ id: data.live_set.id });
                  }}
                >
                  Start
                </button>
                <button
                  onClick={() => {
                    mutatationStop.mutate({ id: data.live_set.id });
                  }}
                >
                  Stop
                </button>
              </>
            )}
          </div>
          <Styles>
            <Table
              columns={columns}
              data={notes}
              applyToNotes={applyToNotes}
              updateNote={updateNote}
              skipPageReset={skipPageReset}
            />
          </Styles>
          <InputSection insertNotes={insertNotes} />
          <div style={{ display: "flex", gap: "16px" }}>
            <pre>{JSON.stringify(notes, null, 2)}</pre>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      ) : (
        <div>
          <h2>No clip selected.</h2>
        </div>
      )}
      {/* <ReactQueryDevtools initialIsOpen /> */}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App-">
        <Content />
      </div>
    </QueryClientProvider>
  );
}

export default App;
