/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

//==============================================================
// START Enums and Input Objects
//==============================================================

export interface NoteInput {
  note_id?: number | null;
  pitch?: number | null;
  start_time?: number | null;
  duration?: number | null;
  velocity?: number | null;
  mute?: number | null;
  probability?: number | null;
  velocity_deviation?: number | null;
  release_velocity?: number | null;
}

export interface NotesDictionaryInput {
  notes: NoteInput[];
}

//==============================================================
// END Enums and Input Objects
//==============================================================
