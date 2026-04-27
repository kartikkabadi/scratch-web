# Scratch Parity Inventory

Status: M3A inventory, updated after M3B-M3F implementation review.

This document maps upstream Scratch behavior to Scratch Web work. It is the
handoff artifact for the OpenCode frontend pass and the Codex backend/API
gap pass. Scratch Web must remain an independent, unofficial companion that
credits Scratch and erictli.

## Evidence Sources

- Seed: `SEED.md`
- Upstream clone: `reference/scratch`
- Upstream README: `reference/scratch/README.md`
- Upstream package manifest: `reference/scratch/package.json`
- Upstream type/schema reference: `reference/scratch/src/types/note.ts`
- Upstream command boundary: `reference/scratch/src/services/*.ts`
- Upstream editor: `reference/scratch/src/components/editor/*`
- Upstream settings: `reference/scratch/src/components/settings/*`
- Current web implementation: `packages/web/src`, `packages/server/src`, `packages/shared/src`

## Screenshot References

Captured local references live under `docs/m3a-screenshots/`.

| State | Screenshot | Notes |
| --- | --- | --- |
| Empty state, sidebar, folder tree | `scratch-01-empty-dark.png` | Dark mode, low private-content exposure. |
| WYSIWYG editor and format bar | `scratch-02-editor-formatbar-dark.png` | Uses a temporary reference note created for this inventory. |
| Command palette | `scratch-03-command-palette-dark.png` | Shows command list and AI commands; note list is blurred visually by app overlay. |
| Settings: Folder | `scratch-04-settings-folder-dark.png` | Shows folder path, folders, Git, default note name, ignored folders. |
| Settings: Appearance | `scratch-05-settings-appearance-dark.png` | Shows theme, custom colors, typography, width, zoom. |
| Settings: Shortcuts | `scratch-06-settings-shortcuts-dark.png` | Shows keyboard reference structure. |
| Rendered Mermaid and KaTeX | `scratch-07-rendered-mermaid-katex-dark.png` | Shows code block rendering controls and math rendering. |
| Markdown source mode | `scratch-08-markdown-source-dark.png` | Shows raw markdown source editor. |
| Sidebar search | `scratch-09-sidebar-search-dark.png` | Shows note search field in sidebar. |

Light-mode screenshots still need a safe capture/restore pass. I did not change
system appearance or Scratch theme in this pass to avoid leaving the user's app
settings changed without an explicit capture/restore step.

## Upstream Architecture Summary

Scratch is a Tauri + React + TipTap app. The frontend calls Tauri commands via
small service wrappers. Scratch Web should mirror the behavior through HTTP/SSE
or WebSocket APIs while keeping the Mac filesystem as the authority.

Key upstream dependencies:

- React 19
- Tailwind CSS 4
- TipTap 3: core, React, starter-kit, markdown, suggestion
- TipTap extensions: link, image, mathematics, placeholder, task list/item,
  table, code-block-lowlight
- `highlight.js`, `lowlight`
- `beautiful-mermaid`
- `katex`
- Radix alert/context/dropdown/tooltip primitives
- `@dnd-kit/*` for drag-and-drop folders/notes
- Tauri plugins for dialog, clipboard, opener, updater

Scratch Web has a React/Vite web frontend, an HTTP Node server, shared
TypeScript types, and a TipTap-based editor with source-mode round-tripping.
The backend covers notes, folders, settings, search, backups, conflict tokens,
Git APIs, asset routes, realtime events, path safety, and static app serving.
The remaining M3 gate is real-device Tailnet smoke on Android Chrome and iPhone
Safari. Automated viewport QA, settings/Git UI, safe image insertion, final web
screenshots, and safe M4 CLI re-smoke are documented in `docs/M3F_REVIEW.md`.

## Feature Matrix

Legend:

- Required: must be implemented for reopened M3 unless the user explicitly
  approves a named deferral.
- Native-specific: desktop/Tauri behavior that needs a safe web adaptation.
- Excluded: intentionally not part of Scratch Web v1.

| Upstream Feature | Evidence | Current Scratch Web | Classification | Required Work | API / Backend Needs | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| Offline-first local markdown files | README, `notes.ts` | Direct local Mac bridge exists; no phone offline editing | Required | Keep Mac filesystem authority; preserve `.md` source of truth | Existing note APIs, conflict tokens, backups | API tests, real Tailnet smoke |
| Notes CRUD | `notes.ts`, `NotesContext.tsx` | Implemented | Required | Polish UI parity and mobile actions | Existing APIs | Web tests for create/read/save/delete |
| Duplicate note | README shortcuts, `duplicateNote` | Implemented basic | Required | Match command palette and context actions | Existing duplicate API | Unit/UI tests |
| Delete note | README shortcuts, note list context | Implemented with backup | Required | Upstream-like confirmation/touch path | Existing delete API | Delete/backup tests |
| Pinned notes | Settings `pinnedNoteIds`, note list | Implemented basic | Required | Match upstream pin/unpin icon behavior and sorting | Existing settings API | Settings + list ordering tests |
| Folders opt-in | Settings `foldersEnabled` | Implemented basic | Required | Match flat/folder toggle behavior | Existing settings/folder APIs | Settings + folder display tests |
| Collapsible folder tree | `FolderTreeView.tsx`, screenshot | Implemented basic | Required | Match disclosure, indentation, pinned/root handling | Existing listFolders/listNotes | UI tests |
| Folder create/rename/delete | `FolderNameDialog.tsx`, services | Implemented, currently uses simpler prompts in web | Required | Replace browser prompts with Scratch-like dialogs/actions | Existing APIs | UI + API tests |
| Move notes/folders | `@dnd-kit`, services | Backend APIs exist; UI incomplete | Required | Desktop/tablet drag-and-drop and mobile touch move action | Existing APIs likely enough | Move tests, mobile path test |
| Sidebar search | README, screenshot | Implemented basic | Required | Match upstream search open/close, preview, results | Existing search API | Search tests |
| Search notes command shortcut | README, `Cmd+Shift+F` | Incomplete shortcuts | Required | Add keyboard and mobile action path | Existing search API | Shortcut/touch tests |
| WYSIWYG markdown editor | README, `Editor.tsx` TipTap | Implemented | Required | Replace final editor with TipTap-class rich editor | Shared markdown schema, save API version tokens | Round-trip tests |
| Markdown source mode | README, `sourceMode` | Implemented | Required | Add toggle, source textarea, cursor/scroll preservation where practical | Existing save API | Source/WYSIWYG round-trip tests |
| Markdown round-trip | TipTap Markdown manager | Implemented for supported blocks | Required | Parse/serialize `.md` without losing supported markdown | Existing editor utilities | Fixture tests |
| Toolbar formatting | `FormatBar` | Implemented for core controls including safe image insertion | Required | Add headings H1-H4, strike, lists, quote, inline code, code block, math, HR, link, wikilink, image, table | Asset policy for image | UI tests |
| Slash commands | `SlashCommand.tsx` | Implemented | Required | Implement `/` menu for text, headings, lists, quote, code, Mermaid, math, HR, image, table, wikilink | Asset route for image if enabled | Slash command tests |
| Wikilinks | `Wikilink.ts`, `WikilinkSuggestion.tsx` | Implemented | Required | Add `[[` autocomplete, render/edit as first-class note links | Existing note list API | Round-trip + autocomplete tests |
| Links | `LinkEditor.tsx` | Implemented basic UI and safe scheme handling | Required | Add inline add/edit/unlink UI and safe scheme handling | None beyond editor | URL scheme security tests |
| Images/assets | TipTap image, `copy_image_to_assets` | Implemented safe web insertion path | Required when inventory confirms upstream image behavior | Add safe local assets route and insert UI | Existing safe asset import/read API | Path/MIME/size tests, UI tests |
| Task lists | TipTap task extensions | Implemented | Required | Render real checkbox tasks and serialize markdown | Editor only | Round-trip tests |
| Tables | TipTap table kit | Implemented basic insertion; advanced table context actions remain thinner than upstream | Required | Keep basic table support; decide whether advanced table menus are beta blocker or M5 polish | Editor only | Round-trip + UI tests |
| Code blocks | `CodeBlockView.tsx`, lowlight | Implemented basic highlighted blocks | Required | Language selector, copy, source/preview toggle, highlighting | Editor only | Rendering/round-trip tests |
| Syntax highlighting | README says 20 languages | Implemented basic lowlight path | Required | Use lowlight/highlight.js language set matching upstream or named approved subset | None | Visual + fixture tests |
| Mermaid diagrams | README, `MermaidRenderer.tsx` | Implemented with sanitization and readable inline SVG theme colors | Required | Render fenced Mermaid blocks with strict security; source/edit controls | Existing client renderer | XSS/Mermaid tests |
| KaTeX math | README, `MathExtensions.ts`, `BlockMathEditor.tsx` | Implemented | Required | Block math insertion/edit/render, no trusted HTML | Editor only | XSS/math rendering tests |
| Frontmatter | `Frontmatter.ts` | Missing | Required if upstream editor behavior depends on it | Preserve and edit/render as upstream does | Round-trip | Fixture tests |
| Find in note | README, `SearchToolbar.tsx` | Implemented | Required | Add toolbar, match count, next/prev, active highlight | Frontend only | UI tests |
| Copy/export menu | README, editor + command palette | Implemented basic command-palette flows | Required | Copy markdown/plain/html, print PDF where web-practical, export markdown | Clipboard/download APIs in browser; PDF may be browser print | UI tests |
| Focus mode | README, App/Editor props | Implemented | Required | Hide sidebar/toolbar with reversible mobile-safe control | Frontend state | Visual test |
| Command palette | README, `CommandPalette.tsx` | Implemented | Required | Search notes and commands; keyboard and touch open path | Existing APIs plus Git later | UI tests |
| Keyboard shortcuts | README, `shortcuts.ts` | Very partial | Required | Implement desktop shortcuts and visible mobile alternatives | Frontend | Shortcut tests |
| Mobile touch equivalents | Seed requirement | Partial | Required | Every shortcut-only feature gets button/menu/action sheet | Frontend | Mobile viewport tests |
| Note list previews/dates | `NoteList.tsx` | Implemented basic | Required | Match upstream title/preview/date/pin/folder display | Existing list API | UI tests |
| Context menus | `NoteList.tsx`, folder tree | Missing or partial | Required | Add note/folder context actions or mobile action sheets | Existing APIs | UI tests |
| Empty state | screenshot | Implemented but visually simpler | Required | Match upstream note illustration/message/CTA closely | None | Screenshot comparison |
| External file detection | README, file watcher | Backend watcher exists; UI basic conflict modal | Required | Surface external changes without overwriting unsaved edits | Realtime/SSE or polling gap | Watcher/conflict tests |
| Conflict handling | Seed | Implemented basic modal | Required | Match safe choices: reload, compare if possible, save copy | Existing version tokens; compare may need endpoint/client diff | Conflict UI tests |
| Autosave | Upstream editor | Implemented debounce | Required | Keep default autosave, add manual-save option if configured | Settings schema update | Save tests |
| Manual save option | User requirement | Implemented | Required | Setting + explicit save button/shortcut when auto-save off | Settings schema, save command | Settings + save tests |
| Theme light/dark/system | Settings | Implemented | Required | Keep segmented settings and system behavior | Settings schema already has theme | Visual tests |
| Custom colors | `ThemeContext`, `EditorSettingsSection` | Implemented basic key editor | Required | Light/dark color overrides by key; richer picker can be M5 polish | Settings schema supports keys | Settings tests |
| Typography settings | Settings | Implemented | Required | Font family, size, bold weight, line height | Settings schema/API | Settings tests |
| Page width/custom width | Settings | Implemented | Required | Narrow/normal/wide/full/custom | Settings schema/API | UI tests |
| Interface zoom | Settings/shortcuts | Implemented setting; shortcut parity can be polished | Required | Zoom controls; shortcut coverage can move to M5 polish if approved | Settings schema/API | UI tests |
| Text direction RTL | Settings | Implemented | Required | Auto/LTR/RTL editor direction | Settings schema/API | UI tests |
| Default note name templates | General settings | Implemented | Required | Template input and preview | Existing server has template expansion; verify API | Unit/UI tests |
| Ignored folders | General settings | Implemented | Required | Editor for ignored folder names, applied to list/search | Existing settings/path logic | API/UI tests |
| Git enable/status/init | General settings, GitContext | Implemented in settings | Required | Off-by-default UI, status, init with confirmation | Existing Git APIs + safe argv execution | Git tests |
| Git commit/push/fetch/pull/sync | `git.ts`, CommandPalette | Implemented in settings and command palette | Required | Commit message, sync controls, ahead/behind/remote errors | Existing Git APIs | Mocked Git tests |
| Remote add/push upstream | General settings | Implemented in settings | Required | Add remote, push and track branch | Existing Git APIs | Mocked Git tests |
| AI provider edit hooks | README, Tools settings, CommandPalette | Missing | Excluded for app features in v1 | Inventory only. Do not implement in-app AI note editing. Setup/maintenance agent prompts remain allowed. | None | Confirm no hidden AI calls |
| CLI tool install | Tools settings | Different app has Scratch Web CLI | Native-specific | Do not port native `scratch` CLI installer directly into web UI; Scratch Web CLI is separate setup surface | Existing CLI | Docs only |
| Preview/open arbitrary file | README, `PreviewApp`, `files.ts` | Documented as native-specific for web v1 | Native-specific unless approved | Analyze; default to safe upload/import or defer with user approval | No arbitrary host-file API by design | Policy tests |
| Import file to folder | `files.ts` | Missing | Native-specific / possible safe web adaptation | Needs explicit asset/import policy and user approval before UI | Import API | Path/MIME tests |
| App update check | About settings | Missing | Native-specific for native Scratch; Scratch Web has update CLI | Adapt to Scratch Web update docs/CLI, not native updater | CLI update exists | Docs/UI test |
| About/attribution | About settings | Implemented in settings/docs | Required | Credit Scratch, erictli, unofficial status, Scratch Web version | Package/version API optional | Visual/docs test |
| PWA installability | Seed | Implemented basic; M3F verified `/api/*` NetworkOnly service-worker behavior | Required | Manifest/icons/offline shell/no private caching | Web manifest/SW review | PWA tests |
| Offline/unreachable state | Seed | Implemented | Required | Keep clear Mac/Tailscale unavailable state | Health polling | Browser tests |
| App auth/passcode | Seed optional/off default | Setup/CLI mostly, UI explanatory only | Required as optional setting/setup info | CLI/config; not parity upstream | Security tests |

## API Support Delivered In M3B

These gaps were closed before asking OpenCode to build UI that depends on them.
OpenCode should consume these real contracts instead of faking client state.

1. Git API endpoints and shared types:
   - availability/status
   - init
   - commit
   - push/fetch/pull/sync
   - add remote
   - push with upstream
   - explicit confirmation plumbing for write/network operations

2. Settings schema parity:
   - preserve upstream keys: `theme`, `editorFont`, `gitEnabled`,
     `foldersEnabled`, `pinnedNoteIds`, `textDirection`, `editorWidth`,
     `customEditorWidthPx`, `defaultNoteName`, `interfaceZoom`,
     `ollamaModel`, `ignoredPatterns`, `customColorsLight`,
     `customColorsDark`
   - add Scratch Web `saveMode` manual save setting without breaking native
     Scratch compatibility
   - preserve unknown settings fields during update
   - document migration/default behavior

3. Realtime:
   - `GET /api/events` exposes SSE events
   - UI parity can consume `note.created`, `note.changed`, `note.deleted`,
     and ready/status events now; broader event types are represented in shared
     types for future backend emitters

4. Asset/image handling:
   - safe authenticated local asset route
   - import/copy image policy under notes root
   - extension and MIME validation
   - size limits
   - path traversal and symlink tests
   - replacement/deletion APIs are intentionally not exposed yet, so backup
     behavior for asset replacement/deletion remains out of scope until those
     operations exist

5. Import/preview decision:
   - safe web upload/import endpoint if approved
   - otherwise record native-specific deferral with user approval

6. Copy/export/PDF:
   - browser clipboard/download flows may be frontend-only
   - print/PDF should use browser print where practical, not Tauri PDF commands

## OpenCode Work Boundaries

OpenCode should own visual/frontend implementation waves when new UI is needed.
Codex should not ask OpenCode to fake unavailable backend state.

OpenCode must use these skills in its prompt:

- `[LOCAL_PATH]`
- `[LOCAL_PATH]`
- `[LOCAL_PATH]`
- `[LOCAL_PATH]`

Skill interpretation for this project:

- Use the skills for discipline, fidelity, responsiveness, state coverage, and
  de-slopifying.
- Do not redesign away from Scratch.
- Do not create a marketing page.
- Do not generate new concept art for the app; use captured Scratch screenshots
  and upstream code as the visual source of truth.
- Keep the app mobile-first while preserving the Scratch desktop feel on larger
  screens.

## Privacy Notes

- Real note content should not be copied into prompts.
- Some captured screenshots include sidebar note titles/previews from the local
  Scratch folder. Use them as local visual references only; avoid uploading or
  pasting private note content into external prompts.
- The temporary note `Scratch Web M3A Reference` was created to capture editor
  states without relying on private notes.

## Known Reference Gaps

- Light-mode screenshots need a safe capture/restore pass.
- A clean slash-command popup screenshot was not captured yet.
- A wikilink autocomplete popup screenshot was not captured yet.
- A link editor popup screenshot was not captured yet.
- A table context menu screenshot was not captured yet.
- A Git-enabled status screenshot depends on enabling/configuring Git and should
  not be forced without an explicit test folder or user approval.
- Real iPhone Safari and Android Chrome screenshots still require physical
  device confirmation against the Tailnet URL.

These are reference/comparison gaps, not hidden implementation claims. The
implemented web states are covered in `docs/M3F_REVIEW.md` and
`docs/m3f-screenshots/`.

## Post M3D Review Fixes

- Source-mode toggles now use the same editor-aware path from the toolbar,
  keyboard shortcut, and command palette, so command-palette source mode no
  longer opens stale or empty Markdown.
- Command-palette note targets now include the full note list instead of only
  the first 20 notes.
- The command palette includes a New Folder action wired to the real folder API.
- Markdown link input rules reject unsafe URL schemes before creating link
  marks.
- Server writes, moves, folder creation, settings writes, and asset imports now
  reject symlinked parent directories as well as final symlink targets.

## Post M3E Review Fixes

- Settings now expose folder, save mode, ignored patterns, Git, appearance,
  shortcuts, and attribution/about controls through the web UI.
- Appearance settings apply to root CSS variables for theme colors, typography,
  editor width, text direction, and interface zoom.
- Git settings use the existing safe Git HTTP APIs and require confirmation
  before write/network operations.
- Image insertion uses the safe asset import API with client-side type and size
  checks before upload.
- Native arbitrary file preview/open behavior is documented as out of scope for
  the web app unless a future safe import route is explicitly approved.

## Post M3F Review Fixes

- Automated desktop, Android-sized, and iPhone-sized Playwright smoke tests pass
  with screenshots saved in `docs/m3f-screenshots/`.
- Mermaid SVG colors are inlined before sanitization so generated diagrams are
  readable in Chromium and do not depend on unresolved CSS variables.
- Generated service worker output was checked: `/api/*` is `NetworkOnly` and
  note API responses are not precached.
- Safe isolated M4 CLI re-smoke passed for setup, status, start, stop, doctor,
  LaunchAgent plist generation, and Tailscale status detection.
- Real Android Chrome and iPhone Safari Tailnet smoke remain the only M3F exit
  criteria that require user/device confirmation.

## Recommended Execution Order

1. M3B: update shared settings types, API docs, backend Git/asset/realtime gaps.
2. M3C: migrate editor from textarea to TipTap-rich markdown parity.
3. M3D: command palette, slash commands, wikilinks, note/folder action parity.
4. M3E: settings, Git UI, safe asset/image handling, preview/import decision.
5. M3F: screenshots, mobile viewport tests, real-device Tailnet smoke, M4
   re-smoke.
