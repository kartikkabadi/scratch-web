# Release Screenshots

These screenshots are captured from an isolated demo notes folder. They should
not contain private notes, real Tailnet hostnames, device serial numbers, or
local user paths.

## Files

- `docs/release-screenshots/desktop-chrome.png`
- `docs/release-screenshots/mobile-browser.png`

## Capture Rules

- Use a disposable notes root with harmless sample Markdown.
- Do not use the user's live Scratch folder.
- Prefer localhost or `adb reverse` for Android capture.
- Do not label a screenshot as Redmi/physical-device evidence unless adb shows
  that exact non-RMX device and the capture came from it.
- If a screenshot shows Settings, verify the folder path is a temp/demo path.
- Re-check screenshots before publishing a release.
