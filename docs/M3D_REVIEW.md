# M3D Review

Status: implemented and self-reviewed.

## Scope Completed

- Added a command palette opened by `Cmd/Ctrl+K` and a touch-accessible editor
  toolbar button.
- Added command and note search in the same palette with categories, keyboard
  navigation, touch rows, and close behavior.
- Added commands for new note, duplicate current note, delete current note,
  pin/unpin current note, reload note, copy Markdown/plain/HTML, export
  Markdown, print/PDF, source mode, focus mode, find, settings, theme modes,
  New Folder, and Git actions.
- Added TipTap slash commands for headings, lists, task list, blockquote, code
  block, table, horizontal rule, block math, and wikilink placeholder.
- Added wikilink autocomplete after `[[` using existing note titles/ids.
- Added a find-in-note toolbar opened by `Cmd/Ctrl+F` or the palette, with
  current/total count, next/previous navigation, and visible browser selection.
- Added a touch exit button for focus mode.
- Added focused tests for command palette, slash command filtering, and
  wikilink filtering.

## Verification

- `pnpm --filter @scratch-web/web check`
- `pnpm --filter @scratch-web/web test`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- Mobile Playwright smoke against the built app on a temporary notes folder:
  opened a note, opened the palette, confirmed find command visibility, opened
  find, selected the first of two matches, toggled source mode, confirmed
  wikilink Markdown preservation, and triggered the slash command menu.

## Review Findings

- TipTap slash and wikilink suggestions use distinct ProseMirror plugin keys to
  avoid duplicate keyed plugin crashes.
- Find-in-note uses browser selection instead of mutating the ProseMirror
  document DOM. This is safer for editor state than injected highlight spans.
- HTML copy falls back to escaped `<pre>` content when the editor DOM is not
  available.
- Git commit/init still use native prompt/confirm for this wave, consistent
  with existing folder/sidebar flows. M3E should replace these with the final
  settings/Git UI.
- Post-review fixes removed the 20-note command-palette cap and routed all
  source-mode entry points through the same editor-aware toggle.
- The editor bundle remains large and still triggers Vite's chunk-size warning.
  M5 beta hardening should split heavy editor/rendering code.

## Remaining Parity Work

- M3E owns full settings parity, richer Git UI, safe asset/image flows, and
  remaining folder/mobile action polish.
- M3F owns final screenshot comparison plus real Android Chrome and iPhone
  Safari Tailnet smoke after M3E is complete.
