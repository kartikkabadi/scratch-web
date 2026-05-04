# Setup

Scratch Web is installed on the Mac that already has access to the Scratch notes
folder. Phones connect to that Mac through private Tailscale Serve.

## Recommended Agent Prompt

Paste this into your coding agent from the Scratch Web repo folder:

```text
Set up Scratch Web for me. Read llms.txt and docs/AGENT_SETUP.md first. Explain
each step in plain language, check macOS/git/node/pnpm/Tailscale/launchd, ask me
before configuring Tailscale Serve or installing a LaunchAgent, help me choose my
Scratch notes folder, then run the Scratch Web CLI setup commands.
```

## Install Location

Runtime files live under:

```text
~/.scratch-web/
  app/
  config/
  logs/
  run/
  backups/
  bin/
  launchd/
```

The active LaunchAgent plist lives at:

```text
~/Library/LaunchAgents/io.github.scratch-web.plist
```

A copy is also kept at:

```text
~/.scratch-web/launchd/io.github.scratch-web.plist
```

## Manual Developer Flow

```bash
pnpm install
pnpm build
pnpm scratch-web setup --notes-folder "/path/to/Scratch notes"
pnpm scratch-web doctor
pnpm scratch-web start
```

The local app runs on `http://127.0.0.1:47832` by default.

## Bootstrapper

Public install docs should prefer a tagged release tarball with a SHA-256
checksum:

```bash
SCRATCH_WEB_TARBALL_URL="https://github.com/<owner>/<repo>/releases/download/<tag>/scratch-web.tar.gz" \
SCRATCH_WEB_SHA256="<published sha256>" \
bash installer/install.sh
```

Source installs are also supported for development:

```bash
SCRATCH_WEB_REPO_URL="https://github.com/<owner>/<repo>.git" \
SCRATCH_WEB_REF="main" \
bash installer/install.sh
```

The bootstrapper prepares `~/.scratch-web`, builds the app, and links the CLI.
It does not configure Tailscale Serve or install a LaunchAgent.

## LaunchAgent

Install the login service only after the user confirms:

```bash
scratch-web launchagent install --yes
```

If your Scratch folder is in iCloud Drive, LaunchAgent startup is currently
disabled by default. Use `scratch-web start` for the current login session
instead. See `docs/TROUBLESHOOTING.md` for the iCloud Drive LaunchAgent issue.

Remove it:

```bash
scratch-web launchagent uninstall --yes
```

Print the plist without installing:

```bash
scratch-web launchagent print
```

## Tailscale Serve

Scratch Web should be exposed through private Tailscale Serve, not Funnel.

After the user confirms:

```bash
scratch-web tailscale serve --yes
```

Check status:

```bash
scratch-web tailscale status
scratch-web status
scratch-web doctor
scratch-web device-smoke
```

## Confirmations Required

Setup must ask before:

- installing dependencies
- using `sudo`
- launching or logging into Tailscale
- configuring Tailscale Serve
- creating or modifying a LaunchAgent
- selecting a notes folder
- enabling optional passcode/auth
- running Git init/commit/push/pull

The CLI enforces `--yes` for LaunchAgent installation/removal and Tailscale Serve
configuration so an agent cannot perform those actions silently.

## Backups

Scratch Web writes backup manifest entries before overwrites and deletes. List
them locally:

```bash
scratch-web backups list
```

Restore one entry only after choosing an exact timestamp from the list:

```bash
scratch-web backups restore --timestamp "2026-05-03T12:00:00.000Z" --yes
```

Restore is local-only. It refuses manifest entries outside the configured notes
folder and saves a safety copy of the current file before replacing it.
