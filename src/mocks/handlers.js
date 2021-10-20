import { graphql } from "msw";

export const selectedTrackDetailClipData = {
  live_set: {
    __typename: "Song",
    id: 1,
    view: {
      __typename: "SongView",
      detail_clip: {
        __typename: "Clip",
        end_time: 4,
        id: 17,
        is_arrangement_clip: 0,
        is_midi_clip: 1,
        length: 4,
        name: "Clippy",
        notes: [
          {
            __typename: "Note",
            duration: 0.25,
            mute: 0,
            note_id: 99,
            pitch: 60,
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
        signature_denominator: 4,
        signature_numerator: 4,
        start_time: 0,
      },
      selected_track: {
        __typename: "Track",
        id: 3,
        name: "Track Name3",
      },
    },
  },
};

export const handlers = [
  graphql.query("SelectedTrackDetailClip", (req, res, ctx) => {
    return res(ctx.data(selectedTrackDetailClipData));
  }),
];
