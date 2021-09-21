/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: StartSong
// ====================================================

export interface StartSong_song_start_playing {
  __typename: "Song";
  id: number;
}

export interface StartSong {
  song_start_playing: StartSong_song_start_playing | null;
}

export interface StartSongVariables {
  id: number;
}
