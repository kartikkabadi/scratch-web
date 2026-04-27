# Troubleshooting

## iCloud Drive Folder Hangs Under LaunchAgent

Observed during M3F: a LaunchAgent-started Scratch Web process can respond to
`/health` and report the configured notes folder, but hang when reading
`/api/notes` or `/api/settings` if the Scratch folder is inside iCloud Drive
(`~/Library/Mobile Documents/...`).

Current workaround:

1. Remove the LaunchAgent:
   `scratch-web launchagent uninstall --yes`
2. Start Scratch Web as a direct background process:
   `scratch-web start`
3. Confirm:
   `scratch-web doctor`

Expected doctor output for this workaround:

- `Service running: yes`
- `LaunchAgent: disabled for iCloud Drive`
- `NO Login startup - iCloud Drive Scratch folders currently use scratch-web start instead of LaunchAgent login startup.`

This keeps the Tailnet URL working for the current login session, but it does
not restore automatic startup after reboot. A future M4/M5 hardening pass should
either provide a reliable iCloud-compatible login startup path or clearly guide
users through the macOS privacy/access requirement.

Installer behavior:

- `scratch-web launchagent install --yes` refuses iCloud Drive Scratch folders by
  default.
- `--allow-icloud` exists only for deliberate testing of this issue and should
  not be recommended for normal users yet.

Expected future topics:

- Tailscale not installed.
- Tailscale not logged in.
- Tailnet URL not reachable from phone.
- Tailscale Serve not configured.
- Scratch notes folder not found.
- iCloud Drive file is not downloaded locally.
- LaunchAgent not running.
- Logs and diagnostics.
- Backup restore.
- Uninstall.
