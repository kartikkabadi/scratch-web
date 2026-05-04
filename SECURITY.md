# Security Policy

Scratch Web is private-by-default software that reads and writes a local Scratch
notes folder. Please do not publish private note content, Tailnet hostnames,
device serial numbers, local filesystem paths, tokens, or logs in public issues.

## Reporting A Vulnerability

Use GitHub private vulnerability reporting or contact the maintainer privately
through the repository owner profile. Please include:

- A short impact summary.
- A minimal reproduction using disposable notes.
- Affected version or commit.
- Any logs with secrets and note content removed.

Do not open a public issue for exploitable vulnerabilities.

## Supported Versions

Scratch Web is currently experimental beta software. Security fixes target the
default branch until tagged releases exist.

## Security Expectations

- The server binds to `127.0.0.1` by default.
- Tailscale Serve is the intended remote access path.
- Tailscale Funnel must not be enabled silently.
- Mutating API requests require origin checks.
- Notes, backups, logs, and screenshots are sensitive.
- The service worker must never cache `/api/*` note responses.

More detail lives in [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).
