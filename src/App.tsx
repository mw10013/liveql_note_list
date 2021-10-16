import React, {
  useEffect,
  useState,
  Fragment,
  Dispatch,
  SetStateAction,
} from "react";
import { Disclosure, Transition } from "@headlessui/react";
import { XCircleIcon } from "@heroicons/react/outline";
import { XIcon, ChevronUpIcon } from "@heroicons/react/solid";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useLazyQuery,
  useMutation,
  gql,
} from "@apollo/client";
import {
  SelectedTrackDetailClip,
  SelectedTrackDetailClip_live_set_view_detail_clip_notes,
} from "./__generated__/SelectedTrackDetailClip";
import {
  ReplaceAllNotes,
  ReplaceAllNotesVariables,
} from "./__generated__/ReplaceAllNotes";
import { FireClip, FireClipVariables } from "./__generated__/FireClip";
import { StartSong, StartSongVariables } from "./__generated__/StartSong";
import { StopSong, StopSongVariables } from "./__generated__/StopSong";
import update from "immutability-helper";
import {
  useTable,
  usePagination,
  useRowSelect,
  Column,
  Row,
  Cell,
  UseRowSelectInstanceProps,
  UseRowSelectState,
  TableToggleCommonProps,
} from "react-table";

// TODO: disclosure box, table; dupes, pagination reset

type UpdateNoteFn = (rowIndex: number, columnId: string, value: number) => void;
type InsertNotesFn = (
  notes: SelectedTrackDetailClip_live_set_view_detail_clip_notes[]
) => void;

const Button = ({
  children,
  disabled,
  ...props
}: React.ComponentPropsWithoutRef<"button">) => {
  return (
    <button
      type="button"
      className={`${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
      } inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

type ButtonGroupProps = {
  left: React.ComponentPropsWithoutRef<"button">;
  middle: React.ComponentPropsWithoutRef<"button">;
  right: React.ComponentPropsWithoutRef<"button">;
};

function ButtonGroup({
  left: { children: leftChildren, ...leftProps },
  right: { children: rightChildren, ...rightProps },
  middle: { children: middleChildren, ...middleProps },
}: ButtonGroupProps) {
  return (
    <span className="relative z-0 inline-flex shadow-sm rounded">
      <button
        type="button"
        className="relative inline-flex items-center px-2.5 py-1.5 rounded-l border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        {...leftProps}
      >
        {leftChildren}
      </button>
      <button
        type="button"
        className="-ml-px relative inline-flex items-center px-2.5 py-1.5 border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        {...middleProps}
      >
        {middleChildren}
      </button>
      <button
        type="button"
        className="-ml-px relative inline-flex items-center px-2.5 py-1.5 rounded-r border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        {...rightProps}
      >
        {rightChildren}
      </button>
    </span>
  );
}

// HACK: TableToggleCommonProps don't seem to line up with React.ComponentPropsWithoutRef<"input">
const IndeterminateCheckbox = ({
  indeterminate,
  ...rest
}: TableToggleCommonProps) => {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref && ref.current && indeterminate !== undefined) {
      ref.current.indeterminate = indeterminate;
    }
  }, [ref, indeterminate]);

  return (
    <>
      <input
        type="checkbox"
        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
        ref={ref}
        {...rest}
      />
    </>
  );
};

const apolloClient = new ApolloClient({
  uri: "http://localhost:4000/",
  cache: new InMemoryCache(),
});

const GET_SELECTED_TRACK_DETAIL_CLIP = gql`
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
`;

// HACK: time_span is magic constant.
const REPLACE_ALL_NOTES = gql`
  mutation ReplaceAllNotes($id: Int!, $notesDictionary: NotesDictionaryInput!) {
    clip_remove_notes_extended(
      id: $id
      from_pitch: 0
      pitch_span: 128
      from_time: 0
      time_span: 1000000
    ) {
      id
      name
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
        release_velocity
        mute
        note_id
      }
    }
  }
`;

const FIRE_CLIP = gql`
  mutation FireClip($id: Int!) {
    clip_fire(id: $id) {
      id
    }
  }
`;

const START_SONG = gql`
  mutation StartSong($id: Int!) {
    song_start_playing(id: $id) {
      id
    }
  }
`;

const STOP_SONG = gql`
  mutation StopSong($id: Int!) {
    song_stop_playing(id: $id) {
      id
    }
  }
`;

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

function sanitizeValue(
  value: string | number,
  defaultValue: number,
  type: string,
  minValue: number,
  maxValue?: number
) {
  // let v = type === "integer" ? parseInt(value) : Number(value);
  let v =
    typeof value === "string"
      ? type === "integer"
        ? parseInt(value)
        : Number(value)
      : type === "integer"
      ? Math.round(value)
      : value;
  if (isNaN(v)) {
    return defaultValue;
  }

  v = minValue !== undefined && v < minValue ? minValue : v;
  v = maxValue !== undefined && v > maxValue ? maxValue : v;
  return v;
}

interface EditableCellProps extends Cell {
  updateNote: UpdateNoteFn;
}

const EditableCell = ({
  value: initialValue,
  row: { index },
  column: { id },
  updateNote,
}: EditableCellProps) => {
  const [value, setValue] = React.useState(initialValue);

  const onBlur = () => {
    const config = cellConfig[id as keyof typeof cellConfig];
    const v = sanitizeValue(
      value,
      initialValue,
      config.type,
      config.minValue,
      "maxValue" in config ? config.maxValue : undefined
    );
    setValue(v);
    updateNote(index, id, v);
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setValue(initialValue);
  };

  // If the initialValue is changed external, sync it up with our state
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <input
      type="text"
      className={`block w-full text-sm text-right ${
        id === "start_time" || id === "pitch"
          ? "font-medium text-gray-900"
          : "text-gray-500"
      } focus:shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 border-opacity-0 rounded-md`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    />
  );
};

const defaultColumn = {
  Cell: EditableCell,
};

/*
function Table({ columns, data, updateNote, skipPageReset, setSelection }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    state: { pageIndex, pageSize, selectedRowIds },
  } = useTable(
    {
      columns,
      data,
      initialState: { pageSize: 100 },
      defaultColumn,
      autoResetPage: !skipPageReset, // skipPageReset to disable page ressting temporarily
      updateNote,
    },
    usePagination,
    useRowSelect // After pagination.
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
                        className={`px-6 ${
                          column.id === "selection" ? "py-0" : "py-3"
                        } text-left- text-xs font-medium text-gray-500 uppercase tracking-wider`}
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
                            className="px-6 py-1 whitespace-nowrap text-sm font-medium text-gray-900"
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
      <nav
        className="bg-white px-4 py-3 flex items-center justify-between sm:px-6"
        aria-label="Pagination"
      >
        <div className="hidden sm:block">
          <p className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{pageIndex * pageSize + 1}</span> to{" "}
            <span className="font-medium">
              {pageIndex * pageSize + page.length}
            </span>{" "}
            of <span className="font-medium">{data.length}</span> notes
          </p>
        </div>
        <div className="flex-1 flex justify-between sm:justify-end sm:gap-3">
          <Button disabled={!canPreviousPage} onClick={previousPage}>
            Previous
          </Button>
          <Button disabled={!canNextPage} onClick={nextPage}>
            Next
          </Button>
        </div>
      </nav>
    </div>
  );
}
*/

type SelectedRowIds =
  UseRowSelectState<SelectedTrackDetailClip_live_set_view_detail_clip_notes>["selectedRowIds"];

interface TableProps {
  columns: readonly Column<object>[];
  data: readonly SelectedTrackDetailClip_live_set_view_detail_clip_notes[];
  setSelection: Dispatch<SetStateAction<SelectedRowIds>>;
  skipPageReset: boolean;
  updateNote: UpdateNoteFn;
}

function Table({
  columns,
  data,
  updateNote,
  skipPageReset,
  setSelection,
}: TableProps) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    state: { pageIndex, pageSize, selectedRowIds },
  } = useTable(
    {
      columns,
      data,
      initialState: { pageSize: 100 },
      defaultColumn,
      autoResetPage: !skipPageReset, // skipPageReset to disable page ressting temporarily
      updateNote,
    },
    usePagination,
    useRowSelect // After pagination.
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
                        className={`px-6 ${
                          column.id === "selection" ? "py-0" : "py-3"
                        } text-left- text-xs font-medium text-gray-500 uppercase tracking-wider`}
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
                            className="px-6 py-1 whitespace-nowrap text-sm font-medium text-gray-900"
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
      <nav
        className="bg-white px-4 py-3 flex items-center justify-between sm:px-6"
        aria-label="Pagination"
      >
        <div className="hidden sm:block">
          <p className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{pageIndex * pageSize + 1}</span> to{" "}
            <span className="font-medium">
              {pageIndex * pageSize + page.length}
            </span>{" "}
            of <span className="font-medium">{data.length}</span> notes
          </p>
        </div>
        <div className="flex-1 flex justify-between sm:justify-end sm:gap-3">
          <Button disabled={!canPreviousPage} onClick={previousPage}>
            Previous
          </Button>
          <Button disabled={!canNextPage} onClick={nextPage}>
            Next
          </Button>
        </div>
      </nav>
    </div>
  );
}

const columns = [
  {
    id: "selection",
    Header: ({
      getToggleAllPageRowsSelectedProps,
    }: UseRowSelectInstanceProps<SelectedTrackDetailClip_live_set_view_detail_clip_notes>) => (
      <IndeterminateCheckbox {...getToggleAllPageRowsSelectedProps()} />
    ),
    Cell: ({ row }: { row: Row }) => (
      <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
    ),
  },
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
    Header: "Dur",
    accessor: "duration",
  },
  {
    Header: "Prob",
    accessor: "probability",
  },
  {
    Header: "Vel Dev",
    accessor: "velocity_deviation",
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
};

interface InputFieldProps {
  id: string;
  label: string;
}

function InputField({ id, label, ...props }: InputFieldProps) {
  return (
    <div className="relative border border-gray-300 rounded-md px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-indigo-600 focus-within:border-indigo-600">
      <label
        htmlFor={id}
        className="absolute -top-2 left-2 -mt-px inline-block px-1 bg-white text-xs font-medium text-gray-900"
      >
        {label}
      </label>
      <input
        type="text"
        name={id}
        id={id}
        className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
        {...props}
      />
    </div>
  );
}

interface InputSectionProps {
  insertNotes: InsertNotesFn;
}

function InputSection({ insertNotes }: InputSectionProps) {
  const [commitedValues, setCommitedValues] = useState({
    ...DEFAULT_NOTE,
    step: 1,
  });
  const [values, setValues] = useState(commitedValues);

  const insert = () =>
    insertNotes([
      {
        __typename: "Note",
        note_id: 0,
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

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((old) => {
      return { ...old, [e.target.name]: e.target.value };
    });

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const config = cellConfig[e.target.name as keyof typeof cellConfig];
    const value = sanitizeValue(
      values[e.target.name as keyof typeof values],
      commitedValues[e.target.name as keyof typeof commitedValues],
      config.type,
      config.minValue,
      "maxValue" in config ? config.maxValue : undefined
    );
    setValues((old) => ({ ...old, [e.target.name]: value }));
    setCommitedValues((old) => ({ ...old, [e.target.name]: value }));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setValues((old) => ({
        ...old,
        [e.currentTarget.name]:
          commitedValues[e.currentTarget.name as keyof typeof commitedValues],
      }));
    }
  };

  const getFieldProps = (name: keyof typeof values) => ({
    value: values[name],
    onChange,
    onBlur,
    onFocus,
    onKeyDown,
  });

  return (
    <Disclosure as="div" className="mt-2">
      {({ open }) => (
        <>
          <Disclosure.Button className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <span>Insert Note</span>
            <ChevronUpIcon
              className={`${
                open ? "transform rotate-180" : ""
              } w-5 h-5 text-gray-900`}
            />
          </Disclosure.Button>
          <Disclosure.Panel>
            <div className="mt-3 flex gap-1 w-96">
              <InputField
                id="start_time"
                label="Start"
                {...getFieldProps("start_time")}
              />
              <InputField
                id="pitch"
                label="Pitch"
                {...getFieldProps("pitch")}
              />
              <InputField
                id="velocity"
                label="Velocity"
                {...getFieldProps("velocity")}
              />
              <InputField
                id="duration"
                label="Duration"
                {...getFieldProps("duration")}
              />
              <InputField id="step" label="Step" {...getFieldProps("step")} />
            </div>
            <div className="mt-3">
              <ButtonGroup
                left={{ onClick: insert, children: "Insert" }}
                middle={{ onClick: insertAndStep, children: "Insert+Step" }}
                right={{ onClick: step, children: "Step" }}
              />
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

interface NotificationProps {
  message: string;
  show: boolean;
  setShow: (flag: boolean) => void;
}

function Notification({ message, show, setShow }: NotificationProps) {
  return (
    <>
      {/* Global notification live region, render this permanently at the end of the document */}
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {/* Notification panel, dynamically insert this into the live region when it needs to be displayed */}
          <Transition
            show={show}
            as={Fragment}
            enter="transform ease-out duration-300 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <XCircleIcon
                      className="h-6 w-6 text-red-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">Error</p>
                    <p role="alert" className="mt-1 text-sm text-gray-500">
                      {message}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={() => {
                        setShow(false);
                      }}
                    >
                      <span className="sr-only">Close</span>
                      <XIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </>
  );
}

function compareNotes(
  a: SelectedTrackDetailClip_live_set_view_detail_clip_notes,
  b: SelectedTrackDetailClip_live_set_view_detail_clip_notes
) {
  // start_time ascending, pitch ascending
  if (a.start_time < b.start_time) return -1;
  if (a.start_time > b.start_time) return 1;
  return a.pitch - b.pitch;
}

function Content() {
  const [data, setData] = useState<SelectedTrackDetailClip>();
  const [notes, setNotes] =
    useState<SelectedTrackDetailClip_live_set_view_detail_clip_notes[]>();
  const [skipPageReset, setSkipPageReset] = React.useState(false);
  const [selection, setSelection] = useState<SelectedRowIds>({});
  const [notificationMessage, setNotificationMessage] = useState("");
  const [showNotification, setShowNotification] = useState(false);

  const onApolloError = (error: Error) => {
    setNotificationMessage(error.message);
    setShowNotification(true);
  };

  const updateNote: UpdateNoteFn = (
    rowIndex: number,
    columnId: string,
    value: number
  ) => {
    setSkipPageReset(true); // Turn on flag to not reset page
    setNotes((old) => {
      let notes = update(old, { [rowIndex]: { [columnId]: { $set: value } } });
      if (columnId === "start_time" || columnId === "pitch") {
        notes?.sort(compareNotes);
      }
      return notes;
    });
  };

  const applyToNotes = (
    fn: (
      notes: SelectedTrackDetailClip_live_set_view_detail_clip_notes[]
    ) => SelectedTrackDetailClip_live_set_view_detail_clip_notes[]
  ) =>
    setNotes((old) =>
      old ? update(old, { $apply: fn }).sort(compareNotes) : old
    );

  const insertNotes: InsertNotesFn = (notes) => {
    setNotes((old) =>
      old
        ? update(old, {
            $apply: (
              arr: SelectedTrackDetailClip_live_set_view_detail_clip_notes[]
            ) => [...notes, ...arr],
          }).sort(compareNotes)
        : old
    );
  };

  // After data changes, we turn the flag back off
  // so that if data actually changes when we're not
  // editing it, the page is reset
  React.useEffect(() => {
    setSkipPageReset(false);
  }, [notes]);

  const [fetch] = useLazyQuery<SelectedTrackDetailClip>(
    GET_SELECTED_TRACK_DETAIL_CLIP,
    {
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        // if (data === null) return; // React query seems to null out data enabled: false queries.
        if (data.live_set.view.detail_clip?.is_midi_clip === 1) {
          setData(data);
          setNotes(data.live_set.view.detail_clip.notes!);
        } else {
          setData(undefined);
          setNotes(undefined);
          setNotificationMessage("No single midi clip selected in Live.");
          setShowNotification(true);
        }
      },
      onError: onApolloError,
    }
  );

  const [replaceAllNotes] = useMutation<
    ReplaceAllNotes,
    ReplaceAllNotesVariables
  >(REPLACE_ALL_NOTES, {
    onError: onApolloError,
  });
  const [fireClip] = useMutation<FireClip, FireClipVariables>(FIRE_CLIP, {
    onError: onApolloError,
  });
  const [startSong] = useMutation<StartSong, StartSongVariables>(START_SONG, {
    onError: onApolloError,
  });
  const [stopSong] = useMutation<StopSong, StopSongVariables>(STOP_SONG, {
    onError: onApolloError,
  });

  return (
    <>
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Liveql Note List{" "}
            <span className="text-gray-400 text-xs">
              {process.env.REACT_APP_VERSION}
            </span>
          </h1>
          {data && (
            <p className="text-sm font-medium text-gray-500">
              {data.live_set.view.detail_clip?.name ?? "Untitled"} on{" "}
              {data.live_set.view.selected_track?.name} track
            </p>
          )}
        </div>
        <Button
          onClick={(e) => {
            // queryClient.setQueryData("selectedTrackDetailClip", null);
            fetch();
          }}
        >
          Fetch
        </Button>
      </div>
      {data && notes && (
        <div>
          <InputSection insertNotes={insertNotes} />

          <div className="mt-2 flex gap-4">
            <Button
              onClick={() => {
                if (data.live_set.view.detail_clip) {
                  replaceAllNotes({
                    variables: {
                      id: data.live_set.view.detail_clip?.id,
                      notesDictionary: {
                        notes: notes.map(({ note_id, __typename, ...n }) => n),
                      },
                    },
                  });
                }
              }}
            >
              Save
            </Button>
            <ButtonGroup
              left={{
                onClick: () => {
                  if (data.live_set.view.detail_clip?.id) {
                    fireClip({
                      variables: {
                        id: data.live_set.view.detail_clip.id,
                      },
                    });
                  }
                },
                children: "Fire",
              }}
              middle={{
                onClick: () =>
                  startSong({
                    variables: {
                      id: data.live_set.id,
                    },
                  }),
                children: "Start",
              }}
              right={{
                onClick: () =>
                  stopSong({
                    variables: {
                      id: data.live_set.id,
                    },
                  }),
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
          </div>

          <Table
            columns={columns}
            data={notes}
            updateNote={updateNote}
            skipPageReset={skipPageReset}
            setSelection={setSelection}
          />
          <div className="flex gap-4">
            <pre>{JSON.stringify(notes, null, 2)}</pre>
            <pre>{JSON.stringify(data, null, 2)}</pre>
            <pre>{JSON.stringify(selection, null, 2)}</pre>
          </div>
        </div>
      )}

      <Notification
        message={notificationMessage}
        show={showNotification}
        setShow={setShowNotification}
      />
    </>
  );
}

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <div className="max-w-7xl mx-auto p-8 bg-white">
        <Content />
      </div>
    </ApolloProvider>
  );
}

export default App;

/*
{data && (
        <div>
          <InputSection insertNotes={insertNotes} />

          <div className="mt-2 flex gap-4">
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
              Save
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
          </div>

          <Table
            columns={columns}
            data={notes}
            updateNote={updateNote}
            skipPageReset={skipPageReset}
            setSelection={setSelection}
          />
        </div>
      )}
*/
