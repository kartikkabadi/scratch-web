# API Contract

This contract mirrors Scratch's Tauri command boundary where practical. The
frontend must not invent or change endpoints without Codex review.

All request params, query strings, and bodies must be validated at runtime.
Unknown fields are rejected for command-style request bodies unless preserving
them is required for Scratch compatibility, such as settings.

## M3 Parity Status

M2 implements the core bridge. Reopened M3 requires additional API/schema work
before OpenCode can build full Scratch parity without faking state. See
`docs/SCRATCH_PARITY_INVENTORY.md` for the feature matrix.

Current contract status:

- Implemented: notes, folders, settings, simple search, static app serving.
- Implemented in M3B: SSE realtime endpoint, Git HTTP APIs, safe image asset
  import/read routes, settings unknown-key preservation, and shared client
  contracts.
- Still not implemented: arbitrary host file preview/open behavior. It remains
  native-specific unless a safe browser upload/import route is explicitly added.

## Notes

- `GET /api/notes-folder` -> `{ path: string | null }`
- Notes folder changes are setup-only and must go through the local CLI/setup
  flow, not the browser API.
- `GET /api/notes` -> `NoteMetadata[]`
- `GET /api/notes/:id` -> `Note`
- `POST /api/notes` with `{ targetFolder?: string }` -> `Note`
- `PUT /api/notes/:id` with `{ content, expectedVersion }` -> `Note`
- `DELETE /api/notes/:id` -> `{ ok: true }` after backup
- `POST /api/notes/:id/duplicate` -> `Note`
- `PATCH /api/notes/:id/move` with `{ targetFolder }` -> `{ id }`

Existing-note saves require `expectedVersion`. A missing or stale version must
return `409` so the UI can show reload/compare/save-copy choices.

## Folders

- `GET /api/folders`
- `POST /api/folders`
- `DELETE /api/folders/:path`
- `PATCH /api/folders/:path/rename`
- `PATCH /api/notes/:id/move`
- `PATCH /api/folders/:path/move`

## Settings

- `GET /api/settings`
- `PUT /api/settings`

Scratch-compatible settings live at `.scratch/settings.json` inside the notes
folder. Scratch Web host/service settings live under `~/.scratch-web/config`.

Settings parity is explicit as of M3B. The shared schema preserves upstream keys
and unknown future keys where possible:

- `theme`
- `editorFont`
- `gitEnabled`
- `foldersEnabled`
- `pinnedNoteIds`
- `textDirection`
- `editorWidth`
- `customEditorWidthPx`
- `defaultNoteName`
- `interfaceZoom`
- `ollamaModel`
- `ignoredPatterns`
- `customColorsLight`
- `customColorsDark`
- `saveMode` (`auto` or `manual`) for Scratch Web's autosave/manual-save
  behavior

Scratch Web-specific settings, such as auto-save/manual-save mode, must be
stored without breaking native Scratch compatibility. Unknown existing settings
must not be dropped during updates.

## Search

- `GET /api/search?q=...`

Milestone 2 starts with recursive substring search. Indexed search can come
later.

Backup list/restore is a CLI/local setup feature until app-level auth and
restore UX exist. The browser API must not expose backup manifests in v1.

## Realtime

Realtime uses SSE.

- `GET /api/events` -> `text/event-stream`

It enforces the same origin policy as HTTP routes. The first event is a
`service.status.changed` ready event. File watcher events are mapped to note
events with `changedIds`, `path`, and `timestamp`.

Events:

- `note.created`
- `note.changed`
- `note.deleted`
- `folder.changed`
- `settings.changed`
- `conflict.detected`
- `service.status.changed`
- `git.status.changed`

OpenCode must use this endpoint or a documented polling fallback. It must not
fake external-change state.

## Git

Git is part of the HTTP contract as of M3B.

- `GET /api/git/available` -> `{ available, version }`
- `GET /api/git/status` -> `GitStatus`
- `POST /api/git/init` -> `GitOperationResult`
- `POST /api/git/commit` with `{ message }` -> `GitOperationResult`
- `POST /api/git/push` -> `GitOperationResult`
- `POST /api/git/fetch` -> `GitOperationResult`
- `POST /api/git/pull` -> `GitOperationResult`
- `POST /api/git/sync` -> `GitOperationResult`
- `POST /api/git/remote` with `{ url }` -> `GitOperationResult`
- `POST /api/git/push-upstream` -> `GitOperationResult`

Git write/network operations must require explicit user confirmation in the UI
or setup flow. Server command execution must use argv arrays, not shell
interpolation. Remote URLs are limited to HTTPS and SSH forms.

## Assets And Import

Asset/image support is available for safe image insertion:

- `POST /api/assets/import` with `{ filename, mimeType, dataBase64 }` ->
  `AssetMetadata`
- `GET /api/assets/:path` -> image bytes

Supported image types are PNG, JPEG, GIF, and WebP. SVG is intentionally
rejected. Imports are capped at 10MB, filename/path traversal is sanitized or
rejected, image signatures are sniffed against the declared MIME type, reads are
scoped to `<notesRoot>/assets`, symlinks are rejected, and asset responses use
`Cache-Control: no-store`.

Preview/open arbitrary host file behavior is native-specific unless a safe web
upload/import route is approved and implemented.

## Errors

Production errors must not leak stack traces, local secret values, note content,
or auth headers.

## Security Requirements

- Mutating routes require `application/json`.
- Mutating browser routes require a same-origin `Origin` header.
- Requests are subject to body size limits and local rate limits.
- Browser origins must match the served app origin.
- Realtime endpoints must use the same origin policy as HTTP routes. If
  app-level auth is added later, realtime endpoints must enforce it too.
