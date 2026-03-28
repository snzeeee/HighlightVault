# HighlightVault

**Persistent web highlighter — 100% local, zero accounts, zero cloud.**

HighlightVault is a Chrome extension that lets you highlight text on any web page with multiple colors. Your highlights persist across visits and are stored entirely on your device using `chrome.storage.local`.

## Features

- **Multi-color highlighting** — Select text and pick from 4 colors (yellow, purple, green, blue)
- **Persistent highlights** — Highlights reappear automatically when you revisit a page
- **Organized popup** — Browse all your highlights grouped by website with search
- **One-click navigation** — Click any highlight in the popup to jump back to the page
- **Markdown export** — Export all highlights as formatted Markdown to your clipboard
- **Delete highlights** — Click any existing highlight to remove it
- **Badge counter** — See how many highlights are on the current page at a glance
- **Enable/Disable toggle** — Turn highlighting on or off from the popup
- **Zero dependencies** — No accounts, no cloud, no tracking. Everything stays on your device.

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the `HighlightVault` folder
5. Pin the extension from the puzzle icon in the toolbar

## Usage

1. **Highlight text** — Select any text on a web page. A tooltip with 4 color dots appears above the selection.
2. **Pick a color** — Click a color dot to apply the highlight.
3. **Remove a highlight** — Click on an existing highlight, then click the × button.
4. **Browse highlights** — Click the HighlightVault icon in the toolbar to see all highlights organized by site.
5. **Search** — Use the search bar in the popup to filter highlights by text or domain.
6. **Export** — Click "Export as Markdown" to copy all highlights to your clipboard.

## Tech Stack

- **Manifest V3** Chrome Extension
- Vanilla JavaScript (no frameworks, no build step)
- `chrome.storage.local` for persistence
- CSS animations for smooth UI

## Project Structure

```
HighlightVault/
├── manifest.json       Manifest V3 configuration
├── content.js          Content script — selection detection, highlighting, restoration
├── content.css         Tooltip and highlight styles
├── popup.html          Extension popup markup
├── popup.js            Popup logic — listing, search, export
├── popup.css           Popup styles
├── background.js       Service worker — badge updates, message routing
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## License

MIT
