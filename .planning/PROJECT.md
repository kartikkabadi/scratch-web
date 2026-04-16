# scratch-web-app

## What This Is

A web-based markdown note-taking application — a 1:1 port of the macOS Scratch app (https://github.com/erictli/scratch) to the browser. Users select their own notes folder (just like the desktop app), and access the app locally via their browser. Designed for use over Tailscale or similar VPN for remote access without internet exposure.

## Core Value

Bring the Scratch note-taking experience to the web — same features, same simplicity, same local-first philosophy — so users can access their notes from any device on their local network.

## Target Users

- Scratch desktop app users who want cross-device access
- Users who access their Mac via Tailscale from iPhone/iPad/other computers
- Anyone wanting a simple, local-first markdown editor in the browser

## Key Features (from Scratch macOS app)

### Must Have (v1)

- [ ] **Folder Selection** — Users can select any local folder as their notes root (like desktop app)
- [ ] **Note List** — Display all `.md` files in selected folder
- [ ] **Markdown Editor** — WYSIWYG editor with TipTap (same as desktop)
- [ ] **Create/Edit/Delete Notes** — Full CRUD on .md files
- [ ] **Auto-save** — Save changes automatically (300ms debounce like desktop)
- [ ] **Theme Support** — Light/dark/system modes with stone color palette
- [ ] **Keyboard Shortcuts** — Essential shortcuts (Cmd+S to save, etc.)

### Should Have (v2)

- [ ] **Wikilinks** — `[[note name]]` linking between notes
- [ ] **Slash Commands** — Type `/` for headings, lists, code blocks, etc.
- [ ] **Syntax Highlighting** — Code blocks with language highlighting
- [ ] **Search** — Full-text search across notes
- [ ] **Focus Mode** — Hide sidebar for distraction-free writing

### Could Have (future)

- [ ] **Mermaid Diagrams** — Render flowcharts in code blocks
- [ ] **KaTeX Math** — Math equation rendering
- [ ] **Git Sync** — Version control integration
- [ ] **AI Editing** — AI-assisted editing (lower priority for web)

## Out of Scope

- Cloud sync (local-first, no accounts)
- Mobile-native apps (just mobile-friendly web)
- Real-time collaboration
- Desktop app features not in v1 list above

## Technical Approach

### Stack

- **Framework**: Tauri v2 (Rust backend + web frontend)
- **Frontend**: React 19 + TypeScript + Vite
- **Editor**: TipTap v3 (same as desktop app)
- **Styling**: Tailwind CSS v4
- **Search**: MiniSearch or Fuse.js (JS full-text search)
- **Storage**: File System Access API (browser) → read/write .md files

### Data Flow

```
User selects folder → Browser reads .md files via File System Access API
                     → Display in sidebar → Edit in TipTap → Save to disk
```

### Access Model

- Run locally: `cargo tauri dev` or `npm run tauri dev`
- Access via: `http://[localhost]:1420` or `http://[tailscale-ip]:1420`
- No internet exposure — only accessible on local network via Tailscale/VPN

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Next.js | Same as desktop app, native feel, smaller bundle | — Pending |
| File System Access API | Direct .md file read/write in browser | — Pending |
| Local-only (no cloud) | Match Scratch's offline-first philosophy | — Pending |
| Mobile-friendly | Responsive layout for phone/tablet use | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2025-04-17 after initialization*