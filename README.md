# Chalkboard Studio

Infinite black-canvas teaching whiteboard for macOS with stylus input, curve-snapped handwriting, layers, animation timeline, snapshots, and floating video recording.

## Download (End Users)

If you just want to install and use the app, download a DMG from the GitHub release:

- Latest release page: https://github.com/SasiPreethamR/chalkboard-studio/releases/latest
- Current release page: https://github.com/SasiPreethamR/chalkboard-studio/releases/tag/v0.1.0

Direct downloads:

- Apple Silicon (arm64): https://github.com/SasiPreethamR/chalkboard-studio/releases/download/v0.1.0/Chalkboard.Studio-0.1.0-arm64.dmg
- Universal (Intel + Apple Silicon): https://github.com/SasiPreethamR/chalkboard-studio/releases/download/v0.1.0/Chalkboard.Studio-0.1.0-universal.dmg

### Install Steps (macOS)

1. Download the DMG.
2. Open the DMG and drag Chalkboard Studio to Applications.
3. Launch from Applications.
4. If macOS warns about an unidentified developer, open via right-click -> Open the first time.

## Features

- Infinite canvas with pan/zoom and pen/highlighter tools
- Curve snap modes for cleaner handwriting (`raw`, `soft`, `clean`)
- Layers panel with lock/visibility controls
- Animation timeline studio (clip-based)
- Snapshot save/open (`.board.json`)
- Floating webcam recorder (WebM export)
- Weylus integration for phone/tablet input (`--no-gui`)
- macOS DMG packaging (arm64 + universal)

## Tech Stack

- Electron + electron-vite
- React + TypeScript
- Zustand (scene state)
- perfect-freehand (stroke rendering)

## Prerequisites

- Node.js 20+
- npm 10+
- macOS (for DMG packaging)

Optional for tablet input:

- Weylus v0.11.4 installed at `~/Applications/Weylus.app` or `/Applications/Weylus.app`

## Installation

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

## Typecheck and Build

```bash
npm run typecheck
npm run build
```

## Packaging (DMG)

Build icon once (or after icon edits):

```bash
npm run icon:mac
```

Signed/notarized DMG (requires Apple credentials env vars):

```bash
npm run dist:mac
npm run dist:mac:universal
```

Unsigned DMG (works without Apple signing credentials):

```bash
npm run dist:mac:unsigned
npm run dist:mac:universal:unsigned
```

Output artifacts are generated in `release/`.

## Project Structure

```text
editor/
	electron/
		main.ts                    # Electron main process + IPC + Weylus startup
		preload.ts                 # Safe API bridge for renderer
	src/renderer/
		src/
			canvas/                  # Infinite canvas logic, render, hit testing, strokes
			components/              # Toolbar, options, layers, timeline, recorder, etc.
			state/sceneStore.ts      # Central Zustand store
			animation/               # Animation engine/easing/recorder
			App.tsx                  # Root app composition + keyboard shortcuts
			index.css                # App styles
			types.ts                 # Shared renderer types
	build/
		icon.icns                  # macOS app icon
		entitlements.*.plist       # macOS signing entitlements
	scripts/
		make-mac-icon.sh           # Generates icon.icns from SVG
		notarize.cjs               # post-sign notarization hook
	release/                     # Built DMGs and packaging output
	package.json                 # Scripts + electron-builder config
```

## Notarization Setup

Use `.env.notarize.example` as reference and export:

- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

Optional:

- `CSC_NAME` (explicit Developer ID identity)

When these are missing, notarization is skipped automatically.

## Weylus Support

On startup the app attempts to launch Weylus in headless mode (`--no-gui`).

Default ports:

- Web UI: `1701`
- Websocket input: `9001`

If phone stylus mapping behaves incorrectly on multi-monitor macOS setups, make sure display arrangement does not produce problematic negative-coordinate layouts.

## Support and Troubleshooting

- App does not open on macOS:
	- Try right-click -> Open once from Applications.
	- If needed, check System Settings -> Privacy & Security.
- Stylus input not working:
	- Confirm Weylus is installed and running.
	- Confirm your phone is on the same network.
	- Verify ports 1701 and 9001 are available.
- Webcam recorder errors:
	- Grant camera/microphone permissions in macOS Privacy settings.
- Build/release issues:
	- Run `npm run typecheck` and `npm run build` first.
	- For local DMG output without signing: `npm run dist:mac:universal:unsigned`

For bugs and feature requests, open an issue:

- https://github.com/SasiPreethamR/chalkboard-studio/issues

## Keyboard Shortcuts

- Tools: `V` select, `P` pen, `H` highlighter, `E` eraser, `S` shape, `T` text, `I` image
- View: `F` fit, `0` reset
- Animation: `A` toggle
- Help: `?`
- Pen color quick switch in pen mode: `1..8` (palette order)

## Project Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run build`
- `npm run icon:mac`
- `npm run dist:mac`
- `npm run dist:mac:unsigned`
- `npm run dist:mac:universal`
- `npm run dist:mac:universal:unsigned`

## License

MIT
