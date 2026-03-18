# Liveql Note List Research Notes

Date: 2026-03-17

## What This Codebase Does
This repo is a Create React App UI for viewing and editing Ableton Live MIDI clip notes through a GraphQL API. It expects a local GraphQL server at `http://localhost:4000/` that exposes a subset of the Live Object Model (LOM). The UI fetches the currently selected clip, renders notes in an editable table, and can write changes back to Live.

Primary usage flow:

1) Load the Max for Live device that hosts the GraphQL server (see `../liveql`).
2) Open the web app and click Fetch.
3) Edit notes in the table, insert new notes, and Save to write back.
4) Optional transport controls: Fire clip, Start song, Stop song.

Key UI intent is in `src/App.tsx`.

## Integration With Max for Live (`../liveql`)
The sibling project at `../liveql` provides a Max for Live device and two JS scripts that bridge LiveAPI to a GraphQL server. The device runs a Node script that exposes the GraphQL API and a Max JS script that talks to the Live Object Model.

High-level data flow:

```
Liveql Note List (React) -> GraphQL (http://localhost:4000)
  -> Node for Max (liveql-n4m.js) -> Max JS (liveql-m4l.js) -> LiveAPI -> Ableton Live LOM
```

References:
- `../liveql/liveql-n4m.js`
- `../liveql/liveql-m4l.js`
- `../liveql/liveql.amxd`
- `../liveql/docs/m4l-liveql-notes.md`

## App Behavior (Web UI)
The app uses Apollo Client to talk to `http://localhost:4000/` and assumes a single MIDI clip is selected in Live.

Core behaviors:
- Fetch selected clip details and notes from Live.
- Display notes in a paginated, editable table.
- Insert new notes with step/insert helpers.
- Delete selected notes in the UI.
- Save changes by replacing notes in Live.
- Fire selected clip; start/stop the song.

References:
- `src/App.tsx`
- `src/mocks/handlers.js`

## GraphQL Operations Used
The UI issues one query and several mutations.

Query:
- `SelectedTrackDetailClip`: fetches `live_set`, `view.selected_track`, `view.detail_clip` (including `notes`).

Mutations:
- `ReplaceAllNotes`: calls `clip_remove_notes_extended` then `clip_add_new_notes`.
- `FireClip`: calls `clip_fire`.
- `StartSong`: calls `song_start_playing`.
- `StopSong`: calls `song_stop_playing`.

References:
- `src/App.tsx`
- `src/schema.json`

## Note Data Shape
Each note includes fields like `start_time`, `pitch`, `velocity`, `duration`, `probability`, `velocity_deviation`, `release_velocity`, `mute`, and `note_id`. The UI sorts notes by `start_time` then `pitch` and constrains fields with min/max rules in `cellConfig`.

References:
- `src/App.tsx`
- `src/schema.json`

## Build/Dev Tooling Notes
This is a CRA + CRACO project with Tailwind (postcss7 compat), Apollo Client, and React Table. It includes MSW test mocks, plus schema download/codegen helpers for GraphQL.

References:
- `package.json`
- `craco.config.js`
- `src/mocks/handlers.js`
- `src/__generated__/`

## Quick Cross-Repo Checklist (if running locally)
1) In `../liveql`, install dependencies so Node for Max can load them.
2) Load `../liveql/liveql.amxd` in Ableton Live, confirm the Node script logs in the Max Console.
3) Ensure the GraphQL server is reachable at `http://localhost:4000/`.
4) In this repo, run the web app and click Fetch with a single MIDI clip selected.

References:
- `../liveql/docs/m4l-liveql-notes.md`
- `src/App.tsx`
