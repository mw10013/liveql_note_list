/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { NotesDictionaryInput } from "./../../__generated__/globalTypes";

// ====================================================
// GraphQL mutation operation: ReplaceAllNotes
// ====================================================

export interface ReplaceAllNotes_clip_remove_notes_extended {
  __typename: "Clip";
  id: number;
}

export interface ReplaceAllNotes_clip_add_new_notes_notes {
  __typename: "Note";
  start_time: number;
  pitch: number;
  velocity: number;
  duration: number;
  probability: number;
  velocity_deviation: number;
  note_id: number;
}

export interface ReplaceAllNotes_clip_add_new_notes {
  __typename: "Clip";
  id: number;
  name: string;
  notes: ReplaceAllNotes_clip_add_new_notes_notes[] | null;
}

export interface ReplaceAllNotes {
  clip_remove_notes_extended: ReplaceAllNotes_clip_remove_notes_extended | null;
  clip_add_new_notes: ReplaceAllNotes_clip_add_new_notes | null;
}

export interface ReplaceAllNotesVariables {
  id: number;
  notesDictionary: NotesDictionaryInput;
}
