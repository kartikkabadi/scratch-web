# Security And Privacy

Scratch Web is private by default, but Tailnet access is not treated as fully
trusted.

## Network

- Server binds to `127.0.0.1` by default.
- Tailscale Serve provides the HTTPS Tailnet URL.
- Tailscale Funnel is disabled by default and must never be enabled silently.

## Browser/API Protection

- Same-origin CORS only.
- Origin checks are required.
- Mutating requests require CSRF protection.
- WebSocket/SSE must enforce the same policy as HTTP.
- Request body size limits and rate limits are required.

## Filesystem

- Operations are restricted to the configured notes root.
- Note IDs cannot be absolute, contain backslashes, or traverse parents.
- Writes/deletes/moves reject direct symlink targets and symlinked parent
  directories in v1.
- `.scratch/settings.json` is only modified through settings APIs.

## Content

Note content is untrusted. Markdown, pasted HTML, Mermaid, KaTeX, links, and
images must be handled safely before rendering.

For reopened M3 parity:

- Rendered markdown and pasted HTML must be sanitized before insertion into the
  DOM.
- `javascript:` and `data:text/html` links must be rejected or neutralized.
- Mermaid must run with strict security settings.
- KaTeX must not allow trusted HTML.
- Local images/assets must be served only through safe authenticated routes
  scoped to the configured notes root.
- Asset/import UI must not ship until extension, MIME, size, path-boundary,
  symlink, and backup tests exist.
- The service worker must not cache `/api/*`, rendered private note pages, or
  private asset responses.
- Git UI must not silently run write/network operations.

## Backups And Logs

Backups and logs are sensitive data. Directories should use `0700` permissions
and files should use `0600` where practical.

Logs must not include note bodies, passcodes, auth headers, or Tailscale auth
URLs.
