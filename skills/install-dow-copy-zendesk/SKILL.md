---
name: install-dow-copy-zendesk
description: >-
  Install or update the Copy note for Zendesk Obsidian plugin into the user's
  vault. Use when they ask to install the Zendesk DOW copy plugin, copy notes
  from Obsidian into Zendesk with images, or set up dow-copy-zendesk.
---

# Install Copy note for Zendesk

Local Obsidian plugin. Not the community store. Not BRAT.

Source of truth: GitHub repo `camronday/dow-copy-zendesk`. Files to install: `manifest.json`, `main.js`, and `styles.css` only. Never copy `last-copy.html`.

## Steps

1. Find the Obsidian vault:
   - Prefer `~/Documents/Obsidian Vault`
   - If missing, look for a folder containing `.obsidian/app.json` under `~/Documents` or `~/Library/Mobile Documents`
   - If still missing, ask the user for the vault path
2. Create `<vault>/.obsidian/plugins/dow-copy-zendesk/` if needed.
3. Fetch the three files from GitHub:

```bash
REPO=camronday/dow-copy-zendesk
DEST="<vault>/.obsidian/plugins/dow-copy-zendesk"
mkdir -p "$DEST"
for f in manifest.json main.js styles.css; do
  curl -fsSL "https://raw.githubusercontent.com/$REPO/main/$f" -o "$DEST/$f"
done
```

If this workspace is already a clone of that repo, copy those three files from the clone instead.

4. Enable the plugin without dropping other ids. Read `<vault>/.obsidian/community-plugins.json`. If the file is missing, write `["dow-copy-zendesk"]`. If it exists, add `"dow-copy-zendesk"` to the array if absent. Do not remove other plugins.
5. Tell the user:
   - Settings → Community plugins: Restricted mode must be off.
   - Command palette → **Reload app without saving**.
   - Open a note → **Copy note for Zendesk** (`Cmd+Shift+C`). Do not select-all. Paste into Zendesk.

## Do not

- Do not install BRAT or any other community plugin to do this.
- Do not publish to the Obsidian community list.
- Do not copy `last-copy.html` or `prove.js`.
