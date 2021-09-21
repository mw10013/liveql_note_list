/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: StopSong
// ====================================================

export interface StopSong_song_stop_playing {
  __typename: "Song";
  id: number;
}

export interface StopSong {
  song_stop_playing: StopSong_song_stop_playing | null;
}

export interface StopSongVariables {
  id: number;
}
