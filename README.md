# Chalkboard Studio

Infinite black-canvas teaching whiteboard for macOS with stylus input, curve-snapped handwriting, layers, animation timeline, snapshots, and floating video recording.

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
