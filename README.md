# Copy note for Zendesk

Private Obsidian plugin for monday TSEs. Copies the open note as HTML that Zendesk internal comments keep: screenshots as real images, blank lines between body paragraphs, headings flush with the content under them.

Not an Obsidian community plugin. Do not install via BRAT.

## Use

Open a DOW. Run **Copy note for Zendesk** (`Cmd+Shift+C`, command palette, or ribbon clipboard icon). Do not select-all. Paste into a Zendesk internal comment.

## Install with Cursor

Ask Cursor: `install Copy note for Zendesk into my Obsidian vault`.

Point it at this repo. The skill in `skills/install-dow-copy-zendesk/SKILL.md` copies `manifest.json`, `main.js`, and `styles.css` into `.obsidian/plugins/dow-copy-zendesk/` and enables the plugin id. Then reload Obsidian: command palette → **Reload app without saving**.

Turn **Restricted mode** off once in Settings → Community plugins if it is still on.

## Install by hand

1. Copy `manifest.json`, `main.js`, and `styles.css` into `<vault>/.obsidian/plugins/dow-copy-zendesk/`.
2. Settings → Community plugins → Restricted mode off → enable **Copy note for Zendesk**.
3. Reload the app.

Do not copy `last-copy.html` if you see one locally. That dump can contain ticket screenshots.

## Update

Replace the three files with the latest from this repo, then reload Obsidian.
