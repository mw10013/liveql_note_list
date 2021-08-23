import React, { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  useQuery,
  useMutation,
} from "react-query";
// import { ReactQueryDevtools } from "react-query/devtools";
import { request, gql } from "graphql-request";
import { useTable, usePagination, useRowSelect } from "react-table";
import styled from "styled-components";
import update from "immutability-helper";

const Button = ({ children, ...props }) => {
  return (
    <button
      type="button"
      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      {...props}
    >
      {children}
    </button>
  );
};

function ButtonGroup({
  left: { children: leftChildren, ...leftProps },
  right: { children: rightChildren, ...rightProps },
  middle: { children: middleChildren, ...middleProps },
}) {
  return (
    <span className="relative z-0 inline-flex shadow-sm rounded-md">
      <button
        type="button"
        className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        {...leftProps}
      >
        {leftChildren}
      </button>
      <button
        type="button"
        className="-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        {...middleProps}
      >
        {middleChildren}
      </button>
      <button
        type="button"
        className="-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        {...rightProps}
      >
        {rightChildren}
      </button>
    </span>
  );
}

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

function sanitizeValue(value, defaultValue, type, minValue, maxValue) {
  let v = type === "integer" ? parseInt(value) : Number(value);
  if (isNaN(v)) {
    return defaultValue;
  }

  v = minValue !== undefined && v < minValue ? minValue : v;
  v = maxValue !== undefined && v > maxValue ? maxValue : v;
  return v;
}

const EditableCell = ({
  value: initialValue,
  row: { index },
  column: { id },
  updateNote,
}) => {
  const [value, setValue] = React.useState(initialValue);
  const onChange = (e) => setValue(e.target.value);

  const onBlur = () => {
    const config = cellConfig[id];
    const v = sanitizeValue(
      value,
      initialValue,
      config.type,
      config.minValue,
      config.maxValue
    );
    setValue(v);
    updateNote(index, id, v);
  };

  const onFocus = (e) => e.target.select();
  const onKeyDown = (e) => {
    if (e.key === "Escape") setValue(initialValue);
  };

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
      onKeyDown={onKeyDown}
    />
  );
};

const defaultColumn = {
  Cell: EditableCell,
};

/* This example requires Tailwind CSS v2.0+ */
const people = [
  {
    name: "Jane Cooper",
    title: "Regional Paradigm Technician",
    role: "Admin",
    email: "jane.cooper@example.com",
  },
  {
    name: "John Cooper",
    title: "Regional Paradigm Technician",
    role: "Admin",
    email: "john.cooper@example.com",
  },
];

function TableExample() {
  return (
    <div className="flex flex-col p-2">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {people.map((person) => (
                  <tr key={person.email}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {person.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Table({ columns, data, updateNote, skipPageReset, setSelection }) {
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

  useEffect(() => {
    setSelection(selectedRowIds);
  }, [setSelection, selectedRowIds]);

  return (
    <div className="flex flex-col p-2">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table
              className="min-w-full divide-y divide-gray-200"
              {...getTableProps()}
            >
              <thead className="bg-gray-50">
                {headerGroups.map((headerGroup) => (
                  <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map((column) => (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        {...column.getHeaderProps()}
                      >
                        {column.render("Header")}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody
                className="bg-white divide-y divide-gray-200"
                {...getTableBodyProps()}
              >
                {page.map((row, i) => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()}>
                      {row.cells.map((cell) => {
                        return (
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                            {...cell.getCellProps()}
                          >
                            {cell.render("Cell")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
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
    const value = sanitizeValue(
      values[e.target.name],
      commitedValues[e.target.name],
      config.type,
      config.minValue,
      config.maxValue
    );
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
      <ButtonGroup
        left={{ onClick: insert, children: "Insert" }}
        middle={{ onClick: insertAndStep, children: "Insert+Step" }}
        right={{ onClick: step, children: "Step" }}
      />
      {/* <div className="flex gap-4">
        <pre>{JSON.stringify(values, null, 2)}</pre>
        <pre>{JSON.stringify(commitedValues, null, 2)}</pre>
      </div> */}
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
  const [selection, setSelection] = useState({});

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

  const insertNotes = (notes) => {
    setNotes((old) =>
      update(old, { $apply: (arr) => [...notes, ...arr] }).sort(compareNotes)
    );
  };

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
    <div className="">
      <Button
        onClick={(e) => {
          queryClient.setQueryData("selectedTrackDetailClip", null);
          refetch({ cancelRefresh: true });
        }}
      >
        Fetch
      </Button>
      React query status: {status}
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
                <Button
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
                </Button>
                <ButtonGroup
                  left={{
                    onClick: () =>
                      mutationFire.mutate({
                        id: data.live_set.view.detail_clip.id,
                      }),
                    children: "Fire",
                  }}
                  middle={{
                    onClick: () => {
                      mutatationStart.mutate({ id: data.live_set.id });
                    },
                    children: "Start",
                  }}
                  right={{
                    onClick: () => {
                      mutatationStop.mutate({ id: data.live_set.id });
                    },
                    children: "Stop",
                  }}
                />
                <Button
                  disabled={Object.keys(selection).length === 0}
                  onClick={() => {
                    applyToNotes((notes) => {
                      return notes.filter(
                        (el, index) => !selection.hasOwnProperty(index)
                      );
                    });
                  }}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
          <Table
            columns={columns}
            data={notes}
            updateNote={updateNote}
            skipPageReset={skipPageReset}
            setSelection={setSelection}
          />
          <InputSection insertNotes={insertNotes} />
          <TableExample />
          <div className="flex gap-4">
            <pre>{JSON.stringify(notes, null, 2)}</pre>
            <pre>{JSON.stringify(data, null, 2)}</pre>
            <pre>{JSON.stringify({ selection }, null, 2)}</pre>
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
      <div>
        <Content />
      </div>
    </QueryClientProvider>
  );
}

export default App;
