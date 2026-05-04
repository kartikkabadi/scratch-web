# Scratch Web Seed

Status: approved project seed; Milestones 1-4 have initial implementations.
Milestone 3 is reopened for full practical upstream Scratch parity and must be
finished before beta hardening. Milestone 4 must be smoke-tested again after
the reopened M3 work because frontend/API changes can affect the installed
service.

This seed is the source of truth for Scratch Web until superseded by a later
roadmap or implementation plan.

```yaml
name: Scratch Web
status: experimental_beta
type: open_source_private_web_companion

milestone_ledger:
  M1:
    state: initial_implementation_complete
    note: Foundation exists but remains subject to final attribution/license review.
  M2:
    state: initial_implementation_complete
    note: Local bridge exists; reopened M3 may require API/schema additions.
  M3:
    state: reopened
    note: Existing UI is only an MVP shell and must be expanded to full practical Scratch parity.
  M4:
    state: initial_implementation_complete_with_icloud_launchagent_caveat
    note: >
      Installer/Tailscale flow works for the direct background service path.
      LaunchAgent login startup is blocked by default for iCloud Drive Scratch
      folders because launchd-started Node processes can hang while reading
      ~/Library/Mobile Documents notes. M4/M5 must resolve or formally document
      that limitation before beta.
  M5:
    state: pending
    note: Beta hardening starts only after reopened M3 and M4 re-smoke pass.

upstream:
  name: Scratch
  repo: https://github.com/erictli/scratch
  author: erictli
  relationship: >
    Scratch Web is an independent web companion/wrapper around the Scratch
    notes experience. It exists because Scratch already exists. The project
    should clearly state that it would not be possible without Scratch.
  positioning: >
    Independent and unofficial unless/until upstream accepts or endorses it.
    Designed respectfully so future upstream discussion or PR work is easy.
  license_observation: >
    The inspected upstream README states MIT, but no standalone LICENSE file was
    present in the clone. Scratch Web must preserve clear attribution, link to
    Scratch prominently, and track/request a formal upstream LICENSE file before
    heavy copied-code reuse is treated as legally tidy.
  license_release_blocker: >
    Before copying substantial upstream source or publishing a public beta,
    verify the latest upstream repository/release license evidence, record the
    exact commit/date/source in docs/ATTRIBUTION.md, and preserve all required
    notices. If a standalone upstream LICENSE file is still absent, document the
    risk and prefer behavioral reimplementation over large copied source until
    the license evidence is clarified.
  attribution_requirements:
    - Link to https://github.com/erictli/scratch in README, docs, and About page.
    - Credit Scratch and erictli prominently.
    - State that Scratch Web is not possible without Scratch.
    - State that Scratch Web is independent/unofficial unless that changes.
    - Include docs/ATTRIBUTION.md.
    - Include upstream commit hash used for reference.
    - Preserve source comments/notices when porting code.
    - Review license/notice requirements before copying substantial source.

license_strategy:
  scratch_web_license: MIT
  requirements:
    - Include Scratch Web's own LICENSE file.
    - Distinguish Scratch Web's license from upstream Scratch license observation.
    - Preserve upstream attribution and notices for copied or ported code.
    - Document that upstream Scratch README states MIT, while a standalone upstream LICENSE file was not present when inspected.

vision: >
  Scratch Web gives Scratch users a mobile-first web interface for their
  existing Scratch notes. It runs privately on the user's Mac, reads and writes
  the same local Scratch notes folder as the native Scratch app, and exposes a
  Scratch-like web UI to phones and other devices over Tailscale.

primary_user: >
  Non-technical Scratch users who can paste one setup prompt into a coding agent
  but may not be comfortable with terminal commands, LaunchAgents, ports,
  dependency installation, or Tailscale configuration.

secondary_user: >
  Technical users who can run the installer, inspect the code, self-host the
  local bridge, or contribute patches.

core_problem: >
  Scratch is a beautiful, minimal, offline-first markdown notes app, but users
  cannot comfortably use the same Scratch experience from iPhone or Android.
  Editing raw markdown through iCloud Drive or another mobile editor is not the
  same experience: it loses Scratch's UI, WYSIWYG editor, settings, search,
  keyboard-driven behavior, folder model, and overall feel.

solution: >
  A Mac-hosted private bridge. The Mac remains the filesystem authority.
  Phones and other devices connect to the Mac over Tailscale and use a
  mobile-first web UI that closely matches Scratch behavior and visuals.

hard_constraints:
  - No cloud-hosted sync service in v1.
  - No public internet exposure by default.
  - No Tailscale Funnel by default.
  - No phone-side offline editing/sync in v1.
  - No reliance on browser access to arbitrary iCloud folders on iOS/Android.
  - No in-app AI note-editing features.
  - Agent/AI support is for setup and maintenance instructions only.
  - Codex must not design or implement actual frontend/UI/UX directly.
  - Frontend/UI/UX implementation must be delegated to OpenCode.
  - Keep the project simple and understandable.
  - Treat Tailnet access as private but not fully trusted.

feature_classification:
  core_parity:
    - notes CRUD
    - folders CRUD/move/rename
    - pinned notes
    - Scratch-compatible .scratch/settings.json
    - ignored patterns
    - WYSIWYG markdown editing behavior
    - markdown source mode
    - markdown round-trip fidelity
    - slash commands
    - wikilinks/autocomplete
    - command palette
    - keyboard shortcuts and mobile touch equivalents
    - find in note
    - focus mode
    - copy/export menu
    - syntax highlighting
    - Mermaid diagrams
    - KaTeX math
    - tables and task lists
    - settings parity for theme, typography, page width, zoom, direction, folders, Git, ignored folders, and default note naming
    - search
    - file watching/live refresh
    - simple Git integration
    - assets/images with explicit safe local asset policy
    - PWA installability
  deferred_or_native_specific:
    - advanced indexed search
    - packaged native menu-bar helper
    - full offline mobile sync
    - native iOS document-provider access
    - arbitrary host file preview/open-with behavior unless a safe web equivalent is approved
  excluded:
    - in-app AI agent note editing
    - public Funnel sharing by default
    - cloud account/sync service

data_model:
  mode: direct
  notes_source: local Scratch notes folder on the Mac
  iCloud_note: >
    If the user's Scratch folder lives in iCloud Drive, Scratch Web still reads
    the local Mac filesystem path. iCloud is only underlying storage/sync, not
    the web app access mechanism.
  note_files: plain .md files
  note_id_format: relative path from notes root without .md extension, using / separators
  settings_file: .scratch/settings.json inside notes folder
  scratch_web_host_config: ~/.scratch-web/config
  backups: ~/.scratch-web/backups

security_and_network:
  access_model: Tailscale/Tailnet only
  trust_model: >
    Tailscale provides private network access, but Scratch Web must still
    validate every request, protect browser endpoints, and avoid trusting any
    client-provided path, version, or command input.
  local_bind_address: 127.0.0.1
  local_public_bind_forbidden_by_default: true
  tailscale_serve:
    required: true
    mode: private_serve
    require_https: true
    minimum_supported_cli_behavior: Tailscale 1.52+
    funnel_default: disabled
    funnel_must_never_be_enabled_without_explicit_user_confirmation: true
  expected_url: https://<device-or-service-name>.<tailnet>.ts.net
  doctor_must_verify:
    - server bound to localhost/private-safe address
    - Tailscale installed
    - Tailscale version compatible
    - Tailscale logged in
    - Serve configured
    - Serve target points to Scratch Web local port
    - Funnel is not enabled for the Scratch Web port
    - Tailnet URL reachable
  auth:
    default: off
    rationale: Tailscale already provides private-network access
    requirement: easy to enable through setup/config
    warning_when_off: >
      Explain that anyone with access to the user's Tailnet/device URL may be
      able to open Scratch Web unless passcode/auth is enabled.
    setup_guidance:
      - Recommend passcode if the Tailnet has multiple users.
      - Recommend passcode if the Mac or phone is shared.
      - Recommend passcode if the user uses device sharing.
    session_cookie:
      httpOnly: true
      secure: true
      sameSite: lax
    passcode_storage:
      allowed_hashes:
        - argon2id
        - bcrypt
      plaintext_forbidden: true
  http_protection:
    cors: same_origin_only
    origin_checks: required
    csrf_for_mutating_requests: required
    no_permissive_cors: true
    secure_headers: required
    local_api_should_not_accept_random_web_origins: true
    security_headers:
      Content-Security-Policy: restrictive_self_only_starting_point
      X-Frame-Options: DENY
      X-Content-Type-Options: nosniff
      Referrer-Policy: strict-origin-when-cross-origin
      Permissions-Policy: "camera=(), microphone=(), geolocation=()"
  realtime_security:
    websocket_origin_check_required: true
    sse_origin_check_required: true
    realtime_requires_same_auth_policy_as_http: true
    close_connections_on_config_auth_change: true
  abuse_prevention:
    request_body_size_limits: required
    per_ip_rate_limits: required
    expensive_endpoint_limits:
      - search
      - file_import
      - backup_restore
      - git_operations
    debounce_autosave_server_side: true
    reject_request_floods_even_from_tailnet: true

installation_model:
  recommended_flow: agent_guided
  quick_path: curl_pipe_bash
  recommended_user_experience: >
    User copies a single friendly prompt from the README into Codex, Claude
    Code, OpenCode, Hermes, or another coding agent. The agent reads the repo's
    instruction file, explains what will happen in plain language, checks
    dependencies, asks before sensitive actions, and guides setup.
  installer_security:
    curl_bash_must_use_release_url: true
    avoid_main_branch_installer_for_public_docs: true
    publish_sha256_checksums: true
    verify_download_checksum_before_execution: true
    prefer_signed_git_tags_or_signed_releases: true
    installer_prints_actions_before_running: true
    installer_never_silently_uses_sudo: true
  architecture:
    bootstrapper: >
      Small shell script. Checks macOS, prepares minimum runtime, verifies
      downloads when possible, downloads or clones Scratch Web, then launches
      the TypeScript setup CLI. It should stay tiny and boring.
    real_installer: >
      TypeScript CLI. Owns prompts, validation, config writing, LaunchAgent
      setup, Tailscale checks, service management, diagnostics, update, and
      uninstall.
    icloud_launchagent_policy: >
      If the confirmed Scratch notes folder is inside ~/Library/Mobile
      Documents, the CLI must not install the LaunchAgent by default. Use
      scratch-web start for the current login session until a reliable
      iCloud-compatible login startup strategy exists. A testing-only override
      may exist but must not be recommended to non-technical users.
  install_layout:
    root: ~/.scratch-web
    folders:
      - ~/.scratch-web/app
      - ~/.scratch-web/config
      - ~/.scratch-web/logs
      - ~/.scratch-web/run
      - ~/.scratch-web/backups
      - ~/.scratch-web/bin
      - ~/.scratch-web/launchd
    directory_permissions:
      sensitive_dirs: "0700"
      sensitive_files: "0600"
    external_required_file: ~/Library/LaunchAgents/io.github.scratch-web.plist
    note: >
      The active LaunchAgent plist may need to live in ~/Library/LaunchAgents,
      but a generated copy/template should also be kept in ~/.scratch-web/launchd.

command_execution_security:
  never_shell_interpolate_user_input: true
  use_spawn_execFile_with_argv_arrays: true
  validate_all_paths_before_commands: true
  allowlist_executables:
    - git
    - node
    - pnpm
    - tailscale
    - launchctl
  log_commands_without_leaking_secrets: true
  no_arbitrary_shell_command_feature: true

cli_commands:
  required:
    - scratch-web setup
    - scratch-web status
    - scratch-web doctor
    - scratch-web start
    - scratch-web stop
    - scratch-web restart
    - scratch-web logs
    - scratch-web config
    - scratch-web update
    - scratch-web uninstall
    - scratch-web backups list
    - scratch-web backups restore
  status_should_report:
    - service installed
    - service running
    - configured notes folder
    - notes folder writable
    - local URL
    - Tailnet URL
    - auth enabled/disabled
    - Tailscale installed
    - Tailscale version
    - Tailscale logged in
    - Tailscale Serve configured
    - Funnel disabled
    - recent errors

setup_requirements:
  dependency_checks:
    - macOS version
    - git
    - node
    - pnpm
    - tailscale
    - launchd availability
  user_confirmation_required_for:
    - installing dependencies
    - using sudo
    - launching or logging into Tailscale
    - configuring Tailscale Serve
    - enabling Tailscale Funnel, if ever supported
    - creating or modifying LaunchAgent
    - selecting notes folder
    - enabling optional passcode/auth
    - running Git init/commit/push/pull
  notes_folder_detection:
    behavior: auto_detect_then_confirm
    candidates:
      - existing Scratch app config if discoverable
      - common local Scratch folders
      - likely iCloud Drive Scratch folders
      - user-provided custom path
    rule: never silently choose a folder
  mobile_onboarding:
    - Explain how to install Tailscale on iPhone.
    - Explain how to install Tailscale on Android.
    - Explain that phone and Mac must be in the same Tailnet.
    - Explain how to open the Tailnet URL.
    - Explain how to add Scratch Web to the home screen.

backend_architecture:
  language: TypeScript
  package_manager: pnpm
  runtime: Node.js
  role: replace Tauri commands with HTTP/WebSocket/SSE APIs
  api_contract_required_before_frontend: true
  required_api_artifacts:
    - docs/API.md
    - shared TypeScript request/response types
  api_validation:
    runtime_schema_validation_required: true
    recommended_library: zod
    reject_unknown_fields: true
    no_request_body_spread_into_operations: true
    validate_params_query_and_body: true
  upstream_api_boundary_to_mirror:
    - getNotesFolder
    - setNotesFolder
    - listNotes
    - readNote
    - saveNote
    - deleteNote
    - createNote
    - listFolders
    - createFolder
    - deleteFolder
    - renameFolder
    - moveNote
    - moveFolder
    - duplicateNote
    - getSettings
    - updateSettings
    - searchNotes
    - startFileWatcher
  realtime:
    mechanism: WebSocket or SSE
    events:
      - note created
      - note changed
      - note deleted
      - folder changed
      - settings changed
      - conflict detected
      - service status changed
  search:
    v1: recursive substring search
    later: MiniSearch, FlexSearch, SQLite FTS, Tantivy bridge, or another simple index if needed
  git:
    scope: simple upstream-like operations only
    operations:
      - detect git repo
      - init
      - status
      - current branch
      - remote URL
      - ahead/behind when available
      - commit all
      - push
      - pull
    requirements:
      - Git write/network operations require explicit user confirmation.
      - Never silently initialize or push a repo.
      - Git command args must not be shell-interpolated.
    non_goal: complex branch management

filesystem_security:
  canonicalize_notes_root_on_setup: true
  canonicalize_target_parent_before_write: true
  reject_writes_if_resolved_path_escapes_root: true
  symlink_policy_v1: reject_for_writes_deletes_and_moves
  use_lstat_before_write_delete: true
  hardlink_sensitive_operations_require_caution: true
  path_security:
    - reject path traversal
    - reject absolute note IDs
    - reject backslash note IDs
    - restrict operations to configured notes root
    - ignore reserved/internal directories
    - prevent writes into .git, .trash, and app-internal directories
    - allow .scratch/settings.json only through settings APIs
    - define explicit assets rules before enabling asset writes

write_safety:
  atomic_writes: required
  atomic_write_algorithm:
    - write temp file in same directory
    - flush/fsync where practical
    - rename temp file over target
    - verify final file metadata/hash
  backups_before_overwrite: required
  backups_before_delete: required
  backup_manifest: required
  backup_manifest_fields:
    - timestamp
    - action
    - note_id
    - original_path
    - backup_path
    - previous_hash
    - new_hash_if_applicable
  backup_security:
    backups_are_sensitive_data: true
    permissions: "0700 directories, 0600 files"
    exclude_backups_from_git_and_public_serving: true
    never_serve_backups_over_http: true
    uninstall_prompts_before_deleting_or_preserving: true
  backup_retention:
    default: keep
    requirements:
      - report backup size
      - provide retention config later
      - uninstall must ask whether to keep or delete backups
  conflict_detection:
    required: true
    version_token: mtimeMs_plus_size_plus_sha256
    behavior: reject save if file changed externally since client load
  conflict_ui_requirement: >
    Frontend must offer safe choices such as reload, compare, or save copy.
  iCloud_handling:
    required: true
    behavior: >
      Detect and explain unavailable cloud placeholders, sync delays, locked
      files, or permission errors in friendly language.

content_rendering_security:
  treat_note_content_as_untrusted: true
  sanitize_rendered_markdown_html: true
  pasted_html_must_be_sanitized: true
  disallow_scriptable_url_schemes:
    - javascript:
    - data:text/html
  mermaid_security_level: strict
  katex_rendering_must_not_allow_trusted_html: true
  csp_disallows_inline_scripts: true
  image_loading_policy:
    local_assets_via_safe_route_only: true
    remote_images_policy_must_be_defined_before_enabled: true
  asset_import_policy:
    required_before_ui_feature: true
    requirements:
      - define allowed asset directories under the configured notes root
      - reject asset paths outside notes root
      - reject symlinks for asset writes/deletes/moves
      - validate file extension and sniffed MIME type
      - enforce upload/import size limits
      - create backups before replacing or deleting assets
      - serve local assets only through safe authenticated routes
      - never expose backups, .git, .scratch internals, logs, or config over asset routes

logging_security:
  never_log_note_content: true
  redact_tokens_and_auth_headers: true
  redact_passcodes: true
  redact_tailscale_auth_urls_if_present: true
  production_debug_logs_off_by_default: true
  logs_directory_permissions: "0700"
  error_responses_do_not_leak_stack_traces_in_production: true

build_security:
  production_source_maps_disabled_by_default: true
  no_secrets_in_vite_env_vars: true
  env_files_gitignored_before_first_commit: true
  env_examples_use_placeholders_only: true
  gitleaks_precommit_or_ci_check: true
  dependency_audit_in_ci: true

frontend_policy:
  owner: OpenCode
  model: Kimi K2.6 via Canopy Wave
  codex_role:
    - create frontend brief
    - capture screenshots and visual references
    - define API contract
    - invoke relevant taste/design skills in prompt
    - review implementation for correctness
    - fix integration/code mistakes when needed
  codex_must_not:
    - design UI directly
    - implement actual frontend/UI/UX directly
  targets:
    equal_primary:
      - iPhone Safari
      - Android Chrome
    secondary:
      - desktop web
  design_priority: mobile_first
  desktop_policy: functional but not optimized at the expense of mobile
  app_start: notes app directly, no marketing page
  fidelity:
    visual: close Scratch clone
    behavior: close Scratch clone
    mobile_adaptation: allowed only when necessary and documented
  references:
    - installed Scratch app screenshots
    - upstream repo screenshots/assets
    - captured light mode states
    - captured dark mode states
  screenshot_states_to_capture:
    - main note list and editor
    - folder tree
    - settings
    - command palette
    - search
    - focus mode
    - markdown source mode
    - light theme
    - dark theme
    - empty state
    - conflict/error states if reproducible
  taste_skills:
    requirement: >
      Frontend prompt must explicitly invoke relevant available taste/design
      skills, while instructing OpenCode not to redesign away from Scratch.
  no_note_data_in_prompts:
    requirement: >
      Avoid copying real note text into frontend prompts where possible. Screenshots
      may be used as local visual references, but prompts should focus on UI
      structure, behavior, and visual patterns rather than exposing private content.
  mobile_editor_qa_required:
    - iOS keyboard behavior
    - Android keyboard behavior
    - text selection handles
    - paste behavior
    - scroll behavior while editing
    - toolbar positioning
    - viewport resize when keyboard opens
    - source mode editing
    - no overlapping controls

scratch_parity_expansion:
  decision: M3_must_be_full_scratch_parity_not_basic_shell
  rationale: >
    The current web app shell proves the bridge and mobile route, but it does
    not yet feel like Scratch. M3 must be expanded into a parity milestone that
    ports the upstream Scratch product surface as completely as web/mobile
    constraints allow. Missing upstream functionality should be treated as a
    bug or explicitly documented adaptation, not as acceptable simplification.
  product_metric: >
    A daily Scratch user can switch from the native Scratch app to Scratch Web
    on iPhone Safari or Android Chrome and still recognize the same editor,
    command model, settings, note organization, rendering behavior, and safety
    expectations.
  source_of_truth:
    - Upstream Scratch repository at https://github.com/erictli/scratch.
    - Local reference clone at reference/scratch.
    - Installed Scratch app screenshots captured in light and dark mode.
    - docs/FRONTEND_OPENCODE_BRIEF.md, updated before OpenCode runs.
  parity_principles:
    - Prefer upstream Scratch behavior, language, shortcuts, and defaults.
    - Reuse upstream concepts and compatible dependencies where practical.
    - Adapt only where native desktop behavior is impossible or harmful on mobile web.
    - Every adaptation must preserve the underlying user intent and be documented.
    - Deferrals require explicit user approval per feature; generic "web-specific deferral" language is not enough.
    - Mobile is primary, but desktop web must remain functional and recognizable.
    - Do not turn Scratch Web into Obsidian, Notion, or a feature-expanded fork.
  execution_subphases:
    M3A_inventory_and_references:
      owner: Codex
      output:
        - docs/SCRATCH_PARITY_INVENTORY.md
        - captured Scratch screenshots for required states
        - updated docs/FRONTEND_OPENCODE_BRIEF.md
      exit_criteria:
        - Every upstream README feature is classified as required, native-specific, excluded, or explicitly user-approved deferred.
        - Every upstream shortcut and settings section is mapped to a web/mobile behavior.
        - Any screenshot that cannot be captured has a written reason and replacement reference.
        - OpenCode has a complete, screenshot-backed brief before frontend implementation starts.
    M3B_api_and_schema_gaps:
      owner: Codex
      output:
        - docs/API.md updated
        - shared TypeScript types updated
        - settings schema updated from upstream Settings types
        - asset/import policy implemented before any asset UI
      exit_criteria:
        - Frontend parity work does not need fake API state.
        - Unknown Scratch settings are preserved safely during read/write.
        - Schema migration behavior is documented and tested.
    M3C_editor_engine:
      owner: OpenCode_for_UI_with_Codex_review
      output:
        - WYSIWYG editor parity
        - markdown source mode
        - markdown round-trip tests
        - rendering security tests
      exit_criteria:
        - Plain textarea is no longer the final editor.
        - Core markdown, tables, tasks, code, Mermaid, KaTeX, links, and wikilinks round-trip correctly.
    M3D_commands_navigation_and_notes:
      owner: OpenCode_for_UI_with_Codex_review
      output:
        - command palette
        - slash commands
        - wikilink autocomplete
        - note/folder actions
        - mobile touch equivalents
      exit_criteria:
        - No upstream shortcut-only action lacks a visible mobile path.
        - Note/folder flows are tested on mobile-sized viewports.
    M3E_settings_git_assets_and_integrations:
      owner: OpenCode_for_UI_with_Codex_review
      output:
        - settings parity
        - Git UI
        - safe asset/image handling when upstream image behavior is present in the inventory
        - preview/import decision record
      exit_criteria:
        - Settings keys/defaults match upstream or have explicit approved adaptations.
        - Git write/network actions require confirmation.
        - Asset/image behavior is implemented when required by the inventory, and any asset/import UI exists only after backend policy and tests are complete.
    M3F_mobile_qa_and_parity_review:
      owner: Codex
      output:
        - screenshots of implemented states
        - Playwright desktop and mobile viewport reports
        - Android Chrome real-device Tailnet smoke
        - iPhone Safari real-device Tailnet smoke
        - final Scratch parity gap list
      exit_criteria:
        - Both Android Chrome and iPhone Safari have been tested before beta readiness is claimed.
        - Any remaining gap has explicit user approval and release-note wording.
        - M4 installer/Tailscale smoke is re-run after M3 changes.
  frontend_delegation:
    owner: OpenCode
    codex_role:
      - prepare exact frontend implementation prompts
      - include upstream file/component map
      - include screenshots and visual references
      - require OpenCode to invoke relevant taste skills
      - review OpenCode output for correctness, simplicity, security, and parity
      - fix non-visual integration mistakes when needed
    required_open_code_skills:
      - <local-skills>/design-taste-frontend/SKILL.md
      - <local-skills>/redesign-existing-projects/SKILL.md
      - <local-skills>/image-to-code/SKILL.md
      - <local-skills>/minimalist-ui/SKILL.md
    prompt_guardrails:
      - Do not redesign Scratch into a new product.
      - Do not add marketing UI.
      - Do not expose real note content in prompts unless explicitly approved.
      - Prefer boring, maintainable React/TypeScript over clever animation/state systems.
      - Avoid unnecessary useEffect-based derived state; prefer event handlers, loaders, stores, and explicit data flow.
      - Preserve mobile usability over desktop ornamentation.
      - Do not mark any upstream feature deferred without naming the exact feature and waiting for explicit user approval.
  discovery_required_before_more_frontend_code:
    upstream_code_inventory:
      - reference/scratch/src/App.tsx
      - reference/scratch/src/App.css
      - reference/scratch/src/components/editor/*
      - reference/scratch/src/components/command-palette/*
      - reference/scratch/src/components/notes/*
      - reference/scratch/src/components/layout/*
      - reference/scratch/src/components/settings/*
      - reference/scratch/src/components/shortcuts/*
      - reference/scratch/src/context/*
      - reference/scratch/src/services/*
      - reference/scratch/src/lib/shortcuts.ts
      - reference/scratch/src/types/note.ts
      - reference/scratch/src-tauri where filesystem, git, preview, CLI, or settings behavior is defined
    screenshots_to_capture:
      - main editor with sidebar in light mode
      - main editor with sidebar in dark mode
      - empty/new note state
      - note list search
      - folder tree enabled
      - folder create/rename/delete flows
      - note context menu
      - editor toolbar and inline menus
      - slash command menu
      - wikilink autocomplete
      - command palette
      - keyboard shortcuts modal/settings
      - settings general section
      - settings appearance/editor section
      - settings tools/Git section
      - markdown source mode
      - focus mode
      - find-in-note toolbar
      - copy/export menu
      - link editor
      - code block language selector
      - Mermaid rendering
      - KaTeX rendering
      - conflict/external-change state if reproducible
      - Git status/commit/push/pull UI if configured
    inventory_output_required:
      - docs/SCRATCH_PARITY_INVENTORY.md
      - docs/FRONTEND_OPENCODE_BRIEF.md updated with parity tasks
      - a checkbox matrix of upstream feature, current Scratch Web support, needed work, and verification method
  required_feature_parity:
    editor_engine:
      - WYSIWYG markdown editor comparable to upstream Scratch, not a plain textarea as the final M3 state.
      - Markdown source mode with equivalent toggle behavior.
      - Stable markdown round-trip between saved .md files and rich editor document state.
      - Headings, paragraphs, bold, italic, strike, inline code, blockquote, horizontal rule.
      - Ordered lists, unordered lists, task lists, nested lists, indentation, lift/sink behavior.
      - Code blocks with language selector and GitHub-inspired syntax highlighting.
      - Tables with add/remove rows and columns where upstream supports them.
      - Links with add/edit UI and safe URL validation.
      - Images/assets only through safe local asset routes once asset policy is implemented.
      - Frontmatter handling if upstream behavior depends on it.
      - Autosave by default, with manual-save option preserved.
      - Conflict-aware saving with reload/compare/save-copy choices.
    markdown_rendering:
      - Sanitized rendered markdown.
      - Pasted HTML sanitization.
      - Mermaid fenced block rendering with strict security settings.
      - KaTeX block math rendering with trusted HTML disabled.
      - Syntax highlighting for the upstream-supported language set or a documented subset with parity follow-up.
      - Wikilinks rendered and editable as first-class links between notes.
      - Safe external link opening behavior.
    commands_and_navigation:
      - Command palette equivalent to upstream Scratch.
      - Slash commands for headings, lists, tasks, code blocks, diagrams, tables, math, and common blocks.
      - Wikilink autocomplete after typing [[.
      - Find-in-note with match count, next/previous, and clear.
      - Copy/export menu matching upstream options practical for web.
      - Focus mode with distraction-free writing and reversible sidebar/toolbar hiding.
      - Toggle sidebar.
      - Reload current note.
      - New note, duplicate note, delete note.
      - Keyboard shortcut reference UI.
      - Desktop keyboard shortcuts adapted to Cmd on macOS/iOS hardware keyboards and Ctrl on Android/Windows/Linux.
      - Mobile touch equivalents for every shortcut-only action.
    notes_and_folders:
      - Note list with title, preview, selection, pinning, deletion, duplication, and context actions.
      - Full-note search and quick switching behavior.
      - Folder tree opt-in setting.
      - Collapsible folders.
      - Create, rename, delete, and move folders.
      - Move notes between folders.
      - Drag-and-drop where viable on desktop/tablet.
      - Touch-friendly move actions where drag-and-drop is unreliable on phones.
      - Ignored folders/patterns respected in list and search.
      - File watcher updates surfaced without losing unsaved edits.
    settings:
      - Notes folder location display/change/open flow adapted for web host constraints.
      - Default new-note naming/template behavior.
      - Auto-save/manual-save setting.
      - Folder enable/disable setting.
      - Git/version-control enablement and status settings.
      - Ignored folders/patterns management.
      - Search/index rebuild action if indexing is added.
      - Theme setting with light/dark/system behavior where possible.
      - Typography settings: font family, font size, bold weight, line height.
      - Page/editor width settings including custom width where upstream supports it.
      - Interface zoom controls.
      - Text direction / RTL setting.
      - Custom color/theme settings where upstream supports them.
      - About/attribution section crediting Scratch and erictli.
      - Shortcuts/reference section.
      - Exact upstream settings keys/defaults must be derived from reference/scratch/src/types/note.ts and settings components.
      - Unknown existing settings must be preserved unless intentionally migrated with tests.
      - Settings migrations must be backward-compatible with the native Scratch app's .scratch/settings.json where possible.
    git_surface:
      - Git availability/status display.
      - Initialize repository only after explicit confirmation.
      - Commit all changes with user-provided message.
      - Push, fetch, pull, and push-with-upstream where configured.
      - Remote URL display/add flow if included.
      - Friendly errors for auth, no remote, merge conflicts, dirty state, and network failures.
      - No silent Git writes or network operations.
    preview_and_import:
      - Upstream desktop preview mode should be analyzed.
      - Web equivalent may be limited because phones cannot open arbitrary Mac files directly.
      - Import/open-file behavior must be implemented through a safe upload/import route or explicitly approved as native-specific/deferred by the user.
      - Any import route must validate extension, size, destination, path boundaries, and backup behavior.
    ai_agent_hooks:
      - Upstream AI edit hooks should be inventoried for parity awareness.
      - Upstream AI edit hooks are intentionally not parity-required for Scratch Web v1.
      - Scratch Web must not add in-app AI note-editing features in v1.
      - If included later, AI support is limited to local setup/maintenance instructions or explicit local-agent launch hooks.
      - No cloud LLM credentials, no automatic note upload to AI services, and no hidden AI calls.
    pwa_mobile:
      - Installable PWA with app icon and manifest.
      - iPhone Safari and Android Chrome treated as equal primary targets.
      - Mobile editor controls reachable without keyboard shortcuts.
      - Safe viewport behavior when the virtual keyboard opens.
      - Touch selection, paste, scroll, toolbar, dialogs, and menus must be tested on both mobile targets.
      - Offline shell only; no offline note editing or sync in v1.
      - Clear unreachable state when Mac/Tailscale/server is unavailable.
  backend_api_gap_requirements:
    - Add or update APIs needed by full parity before asking OpenCode to fake UI state.
    - Settings schema must represent upstream-compatible editor/theme/folder/git/default-note preferences.
    - Git APIs must follow command_execution_security.
    - Asset/import APIs must not be added until filesystem rules and tests exist.
    - Asset/import UI must not be added until asset/import APIs, filesystem rules, and tests exist.
    - Realtime events must cover external edits, deletes, moves, settings changes, conflicts, and Git status changes.
    - API docs and shared types must be updated before frontend implementation waves.
  parity_testing_requirements:
    markdown_roundtrip:
      - headings
      - nested lists
      - task lists
      - tables
      - links
      - wikilinks
      - code blocks with languages
      - Mermaid fences
      - KaTeX blocks
      - images/assets when required by the inventory
      - frontmatter if supported
    security:
      - XSS payloads in markdown preview and pasted HTML.
      - javascript: and data:text/html links rejected or neutralized.
      - Mermaid configured with strict security.
      - KaTeX trusted HTML disabled.
      - Service worker does not cache private notes or rendered note pages.
      - Git/CLI inputs are argv-array only and cannot inject commands.
    browser_and_mobile:
      - Playwright desktop smoke for every main feature.
      - Playwright mobile viewport smoke for iPhone Safari-sized and Android Chrome-sized screens.
      - Real-device Tailnet smoke on Android Chrome and iPhone Safari before beta.
      - Screenshots saved for major states after each OpenCode UI wave.
    parity_review:
      - Compare Scratch Web screenshots against upstream Scratch screenshots.
      - Review every upstream README feature and shortcut.
      - Review upstream Settings sections and service APIs.
      - File issues or todo entries for any intentionally deferred native-specific behavior.

pwa_requirements:
  installable: true
  https_required: true
  app_icon: true
  manifest: true
  mobile_viewport: true
  offline_shell: true
  offline_editing: false
  service_worker_scope: app_shell_only
  service_worker_must_not_cache_private_note_api_responses: true
  service_worker_must_not_cache_rendered_note_pages_with_private_content: true
  unreachable_state: >
    If the Mac host or Tailscale connection is unavailable, show a clear
    friendly reconnect/offline message. Do not imply notes can be edited
    offline in v1.

testing_requirements:
  foundation:
    - Validate docs and seed links.
    - Confirm reference Scratch commit hash is recorded.
  backend:
    - Unit tests for path and filesystem boundary helpers.
    - Unit tests for note ID normalization and validation.
    - API integration tests for notes, folders, settings, and search.
    - Conflict-save tests using mtimeMs + size + sha256.
    - Backup/restore tests.
    - Symlink escape tests.
    - Request validation tests for params, query, and body.
  cli_installer:
    - Installer dry-run tests where possible.
    - Command execution tests verify argv-array execution, not shell interpolation.
    - LaunchAgent generation tests.
    - Tailscale detection parser tests.
  frontend:
    - Playwright coverage once UI exists.
    - Mobile viewport tests for iPhone Safari-sized and Android Chrome-sized screens.
    - PWA manifest/service worker tests.
    - Accessibility smoke tests.
    - No note API response caching checks.
    - Scratch parity inventory must be reviewed against the implemented UI.
    - Rich editor markdown round-trip tests must cover all enabled markdown features.
    - Command palette, slash command, wikilink, focus mode, find-in-note, settings, and Git UI tests must exist before beta.
    - Screenshots of implemented states must be compared with captured Scratch references.
  security:
    - gitleaks detect before first public release.
    - dependency audit before first public release.
    - CSP/header checks.
    - Markdown sanitization tests.

documentation_requirements:
  tone: friendly, non-technical first
  readme_order:
    - what Scratch Web is
    - clear credit/link to Scratch
    - independent/unofficial status
    - experimental/beta warning
    - recommended agent-guided setup
    - one prompt to paste into coding agent
    - what the agent will do
    - privacy and Tailscale explanation
    - phone setup steps for iPhone and Android
    - curl|bash quick path with release/checksum explanation
    - manual/developer path
    - security model and limitations
    - troubleshooting
    - backup/restore
    - uninstall
    - attribution and license notes
  required_docs:
    - README.md
    - docs/ARCHITECTURE.md
    - docs/API.md
    - docs/SETUP.md
    - docs/AGENT_SETUP.md
    - llms.txt
    - docs/FRONTEND_OPENCODE_BRIEF.md
    - docs/SECURITY_AND_PRIVACY.md
    - docs/ROADMAP.md
    - docs/ATTRIBUTION.md
    - docs/TROUBLESHOOTING.md

reference_repo_policy:
  decision: gitignored_clone_for_local_reference_initially
  rationale: >
    The upstream clone is reference material, not vendored product source.
    Keeping it gitignored avoids nested-repo friction while still letting agents
    inspect upstream behavior locally.
  requirements:
    - Clone upstream into reference/scratch.
    - Add reference/scratch to .gitignore.
    - Store upstream commit hash in docs/ATTRIBUTION.md or docs/REFERENCE.md.
    - Keep reference code separate from Scratch Web source.
    - Do not accidentally ship nested repo contents as our own source.
    - Preserve links back to upstream.

milestones:
  - id: M1
    name: Foundation
    goal: Reset the repo and create the project skeleton without frontend implementation.
    acceptance:
      - Existing folder contents removed except git metadata as appropriate.
      - Project initialized as Scratch Web.
      - Upstream Scratch cloned into reference/scratch and gitignored.
      - Upstream commit hash recorded.
      - Attribution docs created.
      - Scratch Web LICENSE file created.
      - pnpm TypeScript workspace scaffolded.
      - Backend/server package skeleton exists.
      - CLI package skeleton exists.
      - Installer bootstrapper skeleton exists.
      - Shared types package exists if useful.
      - docs/API.md exists as initial contract.
      - Security/network requirements documented.
      - .gitignore excludes env files, logs, backups, local reference clone internals, and build output.
      - OpenCode frontend brief exists.
      - No actual frontend UI implementation is done by Codex.

  - id: M2
    name: Local Bridge MVP
    goal: Prove safe local read/write bridge against a Scratch notes folder.
    acceptance:
      - Configurable notes folder works.
      - Server binds to 127.0.0.1 by default.
      - Runtime API validation exists for params/query/body.
      - Core note APIs work.
      - Core folder APIs work.
      - Settings read/write works with .scratch/settings.json.
      - Simple search works.
      - File watcher emits changes.
      - Atomic writes implemented.
      - Backups before overwrite/delete implemented.
      - Backup manifest implemented.
      - Conflict-safe save uses mtimeMs + size + sha256.
      - Symlink/path traversal protections tested.
      - Markdown/content rendering security plan documented before UI work.
      - API tests cover main flows.
      - CLI can run setup/status/start/stop/logs locally.

  - id: M3
    name: Full Scratch Parity Frontend via OpenCode
    goal: >
      Build a mobile-first web/PWA interface that reaches full practical
      upstream Scratch feature parity through OpenCode, with Codex owning
      reference research, prompt quality, integration review, and verification.
    acceptance:
      - M3A through M3F subphase exit criteria in scratch_parity_expansion all pass in order.
      - Codex completes docs/SCRATCH_PARITY_INVENTORY.md before implementation waves.
      - Inventory covers upstream README features, shortcut table, settings sections, editor components, note/folder components, services, and source files listed in scratch_parity_expansion.
      - Inventory classifies every upstream feature as required, native-specific, excluded, or explicitly user-approved deferred.
      - Codex captures installed Scratch screenshots in light and dark mode for all required states, or records an explicit reason and replacement reference for any missing state.
      - docs/FRONTEND_OPENCODE_BRIEF.md is rewritten from the inventory and screenshots before OpenCode starts parity implementation.
      - OpenCode receives the frontend brief, API contract, upstream feature map, taste skill instructions, and screenshots.
      - OpenCode prompt explicitly invokes the required OpenCode skills and instructs it to clone Scratch rather than redesign it.
      - Codex does not design or implement actual frontend/UI/UX directly.
      - Backend APIs, shared types, and docs/API.md are extended for all parity UI needs before OpenCode is asked to fake state.
      - Settings schema is derived from upstream settings/types, preserves unknown settings, and documents migration behavior.
      - Asset/import UI is not shipped unless safe backend policy, APIs, and tests are complete.
      - Mobile-first UI works on iPhone Safari and Android Chrome as equal primary targets.
      - Desktop web remains functional and recognizably Scratch-like.
      - WYSIWYG markdown editor replaces the plain textarea as the final M3 editor experience.
      - Markdown source mode is available and round-trips safely with WYSIWYG mode.
      - Autosave is default, manual save is available as a setting, and conflicts show reload/compare/save-copy style safe choices.
      - Markdown round-trip tests cover headings, nested lists, task lists, tables, links, wikilinks, code blocks, Mermaid, KaTeX, and images/assets when required by the inventory.
      - Syntax highlighting, Mermaid rendering, KaTeX rendering, wikilinks, slash commands, link editing, tables, task lists, and code block language selection work unless a named feature receives explicit user-approved deferral.
      - Command palette, keyboard shortcut reference, find-in-note, copy/export menu, focus mode, sidebar toggle, note reload, note duplication, and note deletion flows exist.
      - Every shortcut-only upstream action has a touch-accessible mobile equivalent.
      - Note list/editor/search/settings/folder flows match upstream behavior as closely as web/mobile constraints allow.
      - Folders support collapsible trees, create/rename/delete, note moves, folder moves where safe, drag-and-drop where viable, and touch-friendly alternatives on phones.
      - Settings cover notes folder display/change constraints, default note naming, autosave/manual save, folders, Git, ignored folders, theme, typography, page width, zoom, text direction, custom colors/theme controls from upstream, shortcuts, and About/attribution.
      - Git UI exposes status/init/commit/push/fetch/pull/remote flows with explicit confirmations and friendly errors.
      - Preview/import behavior from upstream Scratch is analyzed and either implemented safely or explicitly user-approved as native-specific/deferred.
      - Upstream AI edit hooks are inventoried, but Scratch Web does not add in-app AI note editing in v1.
      - Rendered markdown and pasted HTML are sanitized.
      - XSS/link-scheme/Mermaid/KaTeX security tests pass.
      - PWA basics are implemented over HTTPS.
      - Service worker does not cache private note API responses.
      - Service worker does not cache rendered note pages with private content.
      - Unreachable/offline state implemented.
      - Mobile editor QA checklist passes on iPhone Safari-sized and Android Chrome-sized viewports.
      - Real-device Tailnet smoke testing is completed on Android Chrome and iPhone Safari before beta readiness is claimed.
      - Codex reviews and fixes code correctness, security, state wiring, API integration, and maintainability issues after every OpenCode wave.
      - Screenshots are saved after implementation for every major state and compared against Scratch references.
      - M4 installer/Tailscale smoke is re-run after M3 changes and before M5 starts.
      - No marketing/landing screen blocks app usage.

  - id: M4
    name: Installer And Tailscale
    goal: Make setup friendly and reliable for non-technical users.
    acceptance:
      - curl|bash bootstrapper works from release URL.
      - Download checksums or signatures are verified where practical.
      - TypeScript setup CLI guides user in plain language.
      - LaunchAgent installs and starts service at login for non-iCloud Scratch folders.
      - iCloud Drive Scratch folders use a safe direct background start path until reliable login startup is solved.
      - Service logs to ~/.scratch-web/logs with safe permissions.
      - Tailscale installed/detected or user guided.
      - Tailscale version compatibility checked.
      - Tailscale login detected.
      - Tailscale Serve HTTPS configured automatically when user agrees.
      - Funnel disabled/absent verified.
      - status/doctor/logs/update/uninstall are useful.
      - setup prints final mobile HTTPS URL.
      - phone onboarding docs exist for iPhone and Android.

  - id: M5
    name: Beta Hardening After Parity
    goal: Harden the full-parity beta for safer release and recovery.
    acceptance:
      - Backup list/restore works.
      - Backup size/retention controls exist.
      - iCloud-backed folder errors are friendly.
      - Assets/image handling is hardened when required by the M3 inventory.
      - Folder move/rename edge cases are tested.
      - Conflict handling is polished.
      - Mobile testing over Tailscale is documented.
      - gitleaks/dependency audit checks pass.
      - Docs clearly explain risks, limitations, and recovery.

risks:
  - Direct writes could conflict with the native Scratch app.
  - Tailscale setup and CLI syntax can vary by version.
  - Tailscale Tailnet access is private but not the same as per-app auth.
  - PWA behavior depends on HTTPS and mobile browser constraints.
  - Upstream Scratch may change file/settings behavior.
  - Upstream license lacks a standalone LICENSE file in inspected clone.
  - Mobile browser editor behavior can differ between Safari and Chrome.
  - iCloud-backed folders can have placeholder/sync/permission edge cases.
  - OpenCode may produce strong UI but make integration/code mistakes.
  - curl|bash trust concerns require transparent docs and release integrity checks.
  - Markdown rendering can create XSS if note content is trusted.
  - Shelling out to git/tailscale/launchctl can create command injection if implemented carelessly.
  - Symlinks can escape the notes root if path handling is naive.
  - Backups/logs can duplicate or expose sensitive note data.

risk_mitigations:
  - bind server to localhost by default
  - use private Tailscale Serve, not Funnel
  - require HTTPS Tailnet URL for PWA
  - origin/CSRF protections
  - runtime API validation with strict schemas
  - command execution with argv arrays only
  - canonical filesystem boundary checks
  - reject symlink writes/deletes/moves in v1
  - sanitize rendered markdown and pasted HTML
  - rate limits and body size limits
  - atomic writes
  - backups before destructive writes
  - sensitive permissions on backups/logs/config
  - conflict detection by mtimeMs + size + sha256
  - beta positioning
  - simple setup diagnostics
  - agent-readable setup instructions
  - upstream reference kept separate
  - formal API contract before frontend implementation
  - explicit attribution everywhere
  - mobile editor QA checklist
  - gitleaks and dependency audits
  - Playwright/mobile browser testing where possible
```
