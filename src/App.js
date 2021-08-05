import React, { useEffect, useState } from "react";
// import ReactDOM from "react-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
} from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { request, gql } from "graphql-request";
import { useTable, usePagination } from "react-table";
import styled from "styled-components";
// import logo from "./logo.svg";
import "./App.css";

const query = gql`
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
            note_id
          }
        }
      }
    }
  }
`;

const mutateql = gql`
  mutation ReplaceAllNotes($id: Int!, $notesDictionary: NotesDictionaryInput!) {
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
`;
// const mutateql = gql`
//   mutation ApplyNoteModifications(
//     $id: Int!
//     $notesDictionary: NotesDictionaryInput!
//   ) {
//     clip_apply_note_modifications(id: $id, notes_dictionary: $notesDictionary) {
//       id
//       name
//       notes {
//         start_time
//         pitch
//         velocity
//         duration
//         probability
//         velocity_deviation
//         note_id
//       }
//     }
//   }
// `;

const queryClient = new QueryClient();

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

const cellConfig = {
  start_time: {
    type: "number",
    min_value: 0,
  },
  pitch: {
    type: "integer",
    min_value: 0,
    max_value: 127,
  },
  velocity: {
    type: "number",
    min_value: 0,
    max_value: 127,
  },
  duration: {
    type: "number",
    min_value: 0,
  },
  probability: {
    type: "number",
    min_value: 0,
    max_value: 1,
  },
  velocity_deviation: {
    type: "number",
    min_value: -127,
    max_value: 127,
  },
  note_id: {
    read_only: true,
  },
};

const EditableCell = ({
  value: initialValue,
  row: { index },
  column: { id },
  updateMyData, // This is a custom function that we supplied to our table instance
}) => {
  // We need to keep and update the state of the cell normally
  const [value, setValue] = React.useState(initialValue);

  const onChange = (e) => {
    if (!cellConfig[id].read_only) setValue(e.target.value);
  };

  // We'll only update the external data when the input is blurred
  const onBlur = () => {
    const c = cellConfig[id];
    if (c.read_only) return;

    let v = c.type === "integer" ? parseInt(value) : Number(value);
    if (isNaN(v)) {
      setValue(initialValue);
      return;
    }

    v = c.min_value !== undefined && v < c.min_value ? c.min_value : v;
    v = c.max_value !== undefined && v > c.max_value ? c.max_value : v;

    setValue(v);
    updateMyData(index, id, v);
  };

  // If the initialValue is changed external, sync it up with our state
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return <input value={value} onChange={onChange} onBlur={onBlur} />;
};

// Set our editable cell renderer as the default Cell renderer
const defaultColumn = {
  Cell: EditableCell,
};

function Table({ columns, data, updateMyData, skipPageReset }) {
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
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      // use the skipPageReset option to disable page resetting temporarily
      autoResetPage: !skipPageReset,
      // updateMyData isn't part of the API, but
      // anything we put into these options will
      // automatically be available on the instance.
      // That way we can call this function from our
      // cell renderer!
      updateMyData,
    },
    usePagination
  );

  return (
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
                return <td {...cell.getCellProps()}>{cell.render("Cell")}</td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
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
  },
];

function Content() {
  const [data, setData] = useState();
  const [skipPageReset, setSkipPageReset] = React.useState(false);

  const updateMyData = (rowIndex, columnId, value) => {
    // We also turn on the flag to not reset the page
    setSkipPageReset(true);
    setData((old) => {
      return {
        ...old,
        live_set: {
          ...old.live_set,
          view: {
            ...old.live_set.view,
            detail_clip: {
              ...old.live_set.view.detail_clip,
              notes: old.live_set.view.detail_clip.notes.map((row, index) => {
                if (index === rowIndex) {
                  return {
                    ...row,
                    [columnId]: value,
                  };
                }
                return row;
              }),
            },
          },
        },
      };
    });
  };

  // After data chagnes, we turn the flag back off
  // so that if data actually changes when we're not
  // editing it, the page is reset
  React.useEffect(() => {
    setSkipPageReset(false);
  }, [data]);

  const {
    isLoading,
    error,
    data: queryData,
    isFetching,
    status,
    refetch,
  } = useQuery(
    "selectedTrackDetailClip",
    () => request("http://localhost:4000/", query),
    { refetchOnWindowFocus: false, enabled: false }
  );
  useEffect(() => {
    if (queryData) setData(queryData);
  }, [queryData]);

  const mutation = useMutation((variables) =>
    request("http://localhost:4000/", mutateql, variables)
  );
  const mutatationStart = useMutation((variables) =>
    request(
      "http://localhost:4000/",
      gql`
        mutation StartSong($id: Int!) {
          song_start_playing(id: $id) {
            id
          }
        }
      `,
      variables
    )
  );
  const mutatationStop = useMutation((variables) =>
    request(
      "http://localhost:4000/",
      gql`
        mutation StopSong($id: Int!) {
          song_stop_playing(id: $id) {
            id
          }
        }
      `,
      variables
    )
  );

  if (isLoading) return "Loading...";
  if (error) return "An error has occurred: " + error.message;
  return (
    <div>
      <p>React query status: {status}</p>
      <button onClick={(e) => refetch({ cancelRefresh: true })}>Fetch</button>
      {data && data.live_set.view.detail_clip ? (
        <div>
          <h1>{data.live_set.view.selected_track.name}</h1>
          <h2>{data.live_set.view.detail_clip.name}</h2>
          <div>
            {mutation.isLoading ? (
              "Mutating..."
            ) : (
              <>
                {mutation.isError ? (
                  <div>An error occurred: {mutation.error.message}</div>
                ) : null}
                {mutation.isSuccess ? <div>Mutated!</div> : null}
                <button
                  onClick={() => {
                    mutation.mutate({
                      id: data.live_set.view.detail_clip.id,
                      notesDictionary: {
                        notes: data.live_set.view.detail_clip.notes.map(
                          ({ note_id, ...n }) => n
                        ),
                      },
                    });
                  }}
                >
                  Mutate
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
              data={data.live_set.view.detail_clip.notes}
              updateMyData={updateMyData}
              skipPageReset={skipPageReset}
            />
          </Styles>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : (
        <div>
          <h2>No clip selected.</h2>
        </div>
      )}
      <ReactQueryDevtools initialIsOpen />
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
