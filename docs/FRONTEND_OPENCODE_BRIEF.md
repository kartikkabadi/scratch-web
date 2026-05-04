# OpenCode Frontend Brief

Status: rewritten for reopened M3 full Scratch parity. M3B API/schema support
is implemented; OpenCode may start assigned frontend parity waves after Codex's
final M3B review.

Codex owns this brief, API readiness, integration review, and final
verification. OpenCode owns frontend/UI/UX implementation. Do not run frontend
implementation unless the assigned wave has real backend support. M3B now
provides settings preservation, Git APIs, safe image asset import/read routes,
and SSE realtime events.

## Mission

Turn Scratch Web from a useful MVP shell into a mobile-first web/PWA companion
that feels like Scratch. The goal is full practical upstream Scratch parity on
iPhone Safari and Android Chrome, while keeping desktop web functional and
recognizably Scratch-like.

This is not a redesign. Clone Scratch's product behavior, visual language,
command model, and settings surface as closely as web/mobile constraints allow.
Any missing upstream feature needs explicit user approval as a named deferral.

## Model And Invocation

Use OpenCode with the user's default model/settings. The expected default is
Kimi K2.6 via Canopy Wave. Do not pass a model flag unless Kartik asks.

The OpenCode prompt must explicitly ask the agent to read:

- `AGENTS.md` instructions provided in the Codex thread and the local workspace `AGENTS.md`, if present
- `SEED.md`
- `docs/SCRATCH_PARITY_INVENTORY.md`
- `docs/API.md`
- `packages/shared/src`
- `packages/web/src`
- relevant upstream references in `reference/scratch/src`

The OpenCode prompt must explicitly invoke and apply these skills:

- `<local-skills>/design-taste-frontend/SKILL.md`
- `<local-skills>/redesign-existing-projects/SKILL.md`
- `<local-skills>/image-to-code/SKILL.md`
- `<local-skills>/minimalist-ui/SKILL.md`

Skill-use interpretation:

- Use them for quality control, state coverage, mobile fit, and de-slopifying.
- Do not use them to redesign Scratch into a different product.
- Do not generate new concept art or marketing visuals.
- Use captured Scratch screenshots and upstream code as the visual source of truth.
- Keep visual density appropriate for a notes/editor app: quiet, minimal, useful.

## Hard Constraints

- Codex must not directly design or implement actual frontend/UI/UX.
- OpenCode must not add a marketing/landing page.
- OpenCode must not invent fake APIs or fake persistent state.
- OpenCode must not upload, expose, or paste private note contents into prompts.
- Scratch Web must not add in-app AI note editing in v1.
- Upstream AI edit hooks are intentionally not parity-required for Scratch Web v1.
- Tailscale/private Mac-hosted model remains the deployment target.
- Service worker must not cache private note API responses or rendered note pages.
- Rendered markdown and pasted HTML must be sanitized.
- Scriptable URL schemes such as `javascript:` and `data:text/html` must be blocked.
- Mermaid must use strict security settings.
- KaTeX must not allow trusted HTML.

## Visual References

Use the local screenshots in `docs/m3a-screenshots/`:

- `scratch-01-empty-dark.png`
- `scratch-02-editor-formatbar-dark.png`
- `scratch-03-command-palette-dark.png`
- `scratch-04-settings-folder-dark.png`
- `scratch-05-settings-appearance-dark.png`
- `scratch-06-settings-shortcuts-dark.png`
- `scratch-07-rendered-mermaid-katex-dark.png`
- `scratch-08-markdown-source-dark.png`
- `scratch-09-sidebar-search-dark.png`

Light-mode screenshots are still pending a safe capture/restore pass. Until
they exist, use upstream theme code and dark-mode screenshots for structure, and
do not guess a new light visual identity.

## Upstream References

Start with these upstream files:

- `reference/scratch/README.md`
- `reference/scratch/package.json`
- `reference/scratch/src/types/note.ts`
- `reference/scratch/src/lib/shortcuts.ts`
- `reference/scratch/src/App.tsx`
- `reference/scratch/src/App.css`
- `reference/scratch/src/components/editor/Editor.tsx`
- `reference/scratch/src/components/editor/SlashCommand.tsx`
- `reference/scratch/src/components/editor/Wikilink.ts`
- `reference/scratch/src/components/editor/WikilinkSuggestion.tsx`
- `reference/scratch/src/components/editor/CodeBlockView.tsx`
- `reference/scratch/src/components/editor/MermaidRenderer.tsx`
- `reference/scratch/src/components/editor/MathExtensions.ts`
- `reference/scratch/src/components/editor/SearchToolbar.tsx`
- `reference/scratch/src/components/editor/LinkEditor.tsx`
- `reference/scratch/src/components/command-palette/CommandPalette.tsx`
- `reference/scratch/src/components/notes/NoteList.tsx`
- `reference/scratch/src/components/notes/FolderTreeView.tsx`
- `reference/scratch/src/components/settings/*`
- `reference/scratch/src/context/*`
- `reference/scratch/src/services/*`

Do not vendor the upstream repo wholesale. Reuse concepts and compatible
patterns; preserve notices if substantial code is ported.

## Current Scratch Web Baseline

Current strengths:

- Safe-ish local bridge over HTTP.
- Notes/folders/settings/search basics.
- Backups and conflict tokens.
- Simple mobile sidebar/editor shell.
- Sanitized markdown preview.
- PWA/offline shell basics.

Original reopened-M3 baseline gaps:

- Final editor is still a textarea, not rich WYSIWYG.
- No TipTap markdown round-trip.
- No command palette.
- No slash commands.
- No wikilinks.
- No find-in-note.
- No copy/export menu parity.
- No focus mode.
- No rich code block language selector/highlighting.
- No Mermaid/KaTeX parity in editor.
- No table/task/link/image parity.
- Settings are a simplified subset.
- Git UI/API missing.
- Asset/import policy/API missing.
- Realtime watcher is not fully surfaced to the UI contract.

Current implementation status: M3B, M3C, and M3D have closed the backend
API/schema gaps, TipTap editor/source-mode work, command palette, slash
commands, wikilinks, find-in-note, copy/export basics, focus mode, safe links,
Mermaid/KaTeX rendering, tables/tasks, Git command entries, and asset APIs.
Use `docs/SCRATCH_PARITY_INVENTORY.md` and the latest M3 review docs for the
live gap list before prompting OpenCode for M3E/M3F.

## Required M3 Implementation Waves

OpenCode should implement frontend waves only after Codex confirms the matching
API/schema readiness.

### Wave 1: Editor Engine Parity

Replace the final editor experience with a TipTap-class WYSIWYG markdown editor
that saves plain `.md` files.

Required:

- WYSIWYG editor with markdown source mode.
- Markdown parse/serialize round-trip.
- Headings H1-H4, paragraph, bold, italic, strike, inline code.
- Blockquote, horizontal rule.
- Ordered lists, bullet lists, nested lists, task lists.
- Code blocks with language selector and copy/source-preview behavior.
- Links with add/edit/unlink popup and safe URL validation.
- Tables with insert and context actions.
- Block math and KaTeX rendering.
- Mermaid fenced blocks with strict rendering.
- Wikilink nodes and rendering.
- Autosave by default.
- Manual save mode when the setting is added.
- Conflict behavior that does not destroy unsaved edits.

### Wave 2: Commands And Navigation

Add Scratch's command model.

Required:

- Command palette equivalent to upstream Scratch.
- Search commands and notes in the same palette.
- New note, new folder, duplicate, delete, pin/unpin.
- Copy markdown/plain/html.
- Export markdown.
- Print/PDF via browser-practical path.
- Toggle source mode.
- Toggle focus mode.
- Open settings.
- Theme commands.
- Git commands once Git APIs exist.
- Slash command menu for common block insertion.
- Wikilink autocomplete after typing `[[`.
- Find-in-note toolbar with current/total count and next/previous.
- Desktop keyboard shortcuts from upstream.
- Mobile touch equivalents for every shortcut-only action.

### Wave 3: Notes, Folders, And Mobile Actions

Bring the note/folder shell closer to upstream.

Required:

- Note list with title, preview, modified display, pinned behavior, folder path.
- Collapsible folder tree.
- Folder create/rename/delete dialog flow.
- Note move and folder move.
- Drag-and-drop where viable on desktop/tablet.
- Touch-friendly move/action-sheet alternative on phones.
- Context menu equivalents without relying only on right-click.
- Empty state that matches Scratch's tone and structure.
- External-change indicator and reload path.

### Wave 4: Settings, Git, Assets

Do not start asset/image UI until Codex confirms asset/import backend policy and
tests are complete.

Required settings:

- Folder location display and host-constraint explanation.
- Folder enable/disable.
- Version control/Git enablement and status.
- Default note name template and preview tags.
- Ignored folders/patterns editor.
- Theme light/dark/system.
- Custom light/dark colors matching upstream keys.
- Typography: font family, size, bold weight, line height.
- Text direction: auto, LTR, RTL.
- Page width: narrow, normal, wide, full, custom.
- Interface zoom.
- Shortcuts reference.
- About/attribution crediting Scratch and erictli.

Required Git surface once APIs exist:

- Git availability.
- Repository status.
- Initialize only after explicit confirmation.
- Commit with message.
- Push/fetch/pull/sync.
- Add remote.
- Push with upstream.
- Friendly auth/no-remote/conflict/network errors.

Required asset behavior once APIs exist:

- Insert local images safely.
- Serve local assets through authenticated safe route.
- Reject unsafe paths/symlinks/MIME/size.
- Preserve markdown image syntax.

## Mobile Requirements

iPhone Safari and Android Chrome are equal primary targets.

Required mobile behavior:

- No horizontal overflow.
- Stable `100dvh` behavior with mobile browser chrome.
- Toolbar remains usable when virtual keyboard opens.
- Text selection handles are not blocked by overlays.
- Touch targets are comfortable.
- Menus/dialogs fit mobile width.
- Sidebar closes after note selection on phones.
- Every keyboard shortcut action has a visible touch path.
- Source mode editing is usable on mobile.
- Find/search/command palette do not overlap the keyboard incoherently.
- App remains functional on desktop but does not optimize desktop at mobile's expense.

## Testing Expectations For OpenCode Output

OpenCode should add or update tests appropriate to the wave:

- Markdown fixture round-trip tests.
- Editor interaction tests for core formatting.
- Slash command tests.
- Wikilink autocomplete tests.
- Command palette tests.
- Settings persistence tests.
- Mobile viewport Playwright tests.
- PWA no-private-cache checks.
- XSS/link-scheme/Mermaid/KaTeX sanitization tests.

Codex will run the full project checks after each wave:

```bash
pnpm check
pnpm test
pnpm build
```

## OpenCode Prompt Template

Use this as the starting prompt for the first implementation wave:

```text
You are working in <repo-root>.

Read the local workspace AGENTS.md, if present, SEED.md, docs/SCRATCH_PARITY_INVENTORY.md,
docs/API.md, packages/shared/src, packages/web/src, and the upstream Scratch
reference files under reference/scratch/src listed in docs/FRONTEND_OPENCODE_BRIEF.md.

Invoke and follow these local skills:
- <local-skills>/design-taste-frontend/SKILL.md
- <local-skills>/redesign-existing-projects/SKILL.md
- <local-skills>/image-to-code/SKILL.md
- <local-skills>/minimalist-ui/SKILL.md

Important interpretation of the skills: use them for quality, mobile behavior,
state coverage, and de-slopifying. Do NOT redesign Scratch into a new product.
Do NOT create a marketing page. The visual target is upstream Scratch, using
the screenshots in docs/m3a-screenshots and reference/scratch source as the
source of truth.

Implement only the assigned M3 wave. Do not fake missing backend APIs. If a
required API is missing, stop and report the exact API gap instead of inventing
client-only state.

Keep iPhone Safari and Android Chrome equal primary targets. Desktop web must
remain functional. Do not expose or paste private note content. Do not add
in-app AI note editing.

After changes, run the relevant checks and report changed files, tests run, and
any remaining gaps.
```

## Known M3A Reference Gaps

- Light-mode screenshots still need capture/restore.
- Slash-command popup screenshot still needs capture.
- Wikilink autocomplete screenshot still needs capture.
- Link editor screenshot still needs capture.
- Table context menu screenshot still needs capture.
- Git-enabled settings screenshot should use a safe test folder, not the user's
  real notes folder.
- Security-sensitive path/write behavior has regression tests for direct
  symlinks, symlinked parent directories, asset writes, and unsafe link schemes.
