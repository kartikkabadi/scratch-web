# M3C Review

Status: implemented and self-reviewed.

## Scope Completed

- Replaced the final textarea editor with a TipTap-based Markdown editor.
- Added source mode with Markdown parse/serialize round-trip.
- Added toolbar actions for core Scratch-style Markdown blocks: headings,
  paragraph, bold, italic, strike, inline code, blockquote, horizontal rule,
  ordered lists, bullet lists, task lists, code blocks, tables, links, block
  math, and wikilinks.
- Added Markdown safety helpers for URL scheme validation and sanitization.
- Added KaTeX block math support.
- Added Mermaid fenced-block rendering with DOMPurify sanitization before SVG
  injection.
- Added lowlight-backed code block rendering.
- Preserved autosave by default and manual-save behavior when
  `settings.saveMode` is `manual`.
- Updated frontend tests for the TipTap editor path.
- Captured a mobile browser smoke screenshot at `docs/m3c-editor-mobile.png`.

## Verification

- `pnpm --filter @scratch-web/web check`
- `pnpm --filter @scratch-web/web test`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- Mobile Playwright smoke against the built app on a temporary notes folder:
  opened a note, mounted the editor, toggled source mode, and confirmed source
  retained the heading, Mermaid fence, and wikilink content.

## Review Findings

- The remaining `dangerouslySetInnerHTML` usage is intentional for Mermaid SVG
  output and is guarded with DOMPurify SVG sanitization.
- Link sanitization rejects dangerous schemes including `javascript:` and
  `data:text/html`; tests cover those cases.
- The editor bundle is now large enough to trigger Vite's chunk-size warning
  and required a PWA precache limit increase. This is acceptable for M3C, but
  M5 beta hardening should consider code-splitting heavy editor/rendering
  libraries.
- jsdom was not reliable for proving the source-mode toggle interaction, so the
  unit test covers the control and the browser smoke verifies the actual toggle.

## Remaining Parity Work

- M3D owns command palette, slash commands, wikilink autocomplete, find-in-note,
  shortcuts, and note/folder action parity.
- M3E owns settings parity, Git UI, and safe asset/image workflows.
- M3F owns final screenshot comparison and real iPhone Safari plus Android
  Chrome Tailnet smoke after M3D/M3E are complete.
