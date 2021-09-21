/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: SelectedTrackDetailClip
// ====================================================

export interface SelectedTrackDetailClip_live_set_view_selected_track {
  __typename: "Track";
  id: number;
  name: string;
}

export interface SelectedTrackDetailClip_live_set_view_detail_clip_notes {
  __typename: "Note";
  start_time: number;
  pitch: number;
  velocity: number;
  duration: number;
  probability: number;
  velocity_deviation: number;
  release_velocity: number;
  mute: number;
  note_id: number;
}

export interface SelectedTrackDetailClip_live_set_view_detail_clip {
  __typename: "Clip";
  id: number;
  name: string;
  start_time: number;
  end_time: number;
  length: number;
  signature_numerator: number;
  signature_denominator: number;
  is_midi_clip: number;
  is_arrangement_clip: number;
  notes: SelectedTrackDetailClip_live_set_view_detail_clip_notes[] | null;
}

export interface SelectedTrackDetailClip_live_set_view {
  __typename: "SongView";
  selected_track: SelectedTrackDetailClip_live_set_view_selected_track | null;
  detail_clip: SelectedTrackDetailClip_live_set_view_detail_clip | null;
}

export interface SelectedTrackDetailClip_live_set {
  __typename: "Song";
  id: number;
  view: SelectedTrackDetailClip_live_set_view;
}

export interface SelectedTrackDetailClip {
  live_set: SelectedTrackDetailClip_live_set;
}
