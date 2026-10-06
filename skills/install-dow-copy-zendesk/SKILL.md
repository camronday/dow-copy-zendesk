---
name: install-dow-copy-zendesk
description: >-
  Install or update the Copy note for Zendesk Obsidian plugin into the user's
  vault. Use when they ask to install the Zendesk DOW copy plugin, copy notes
  from Obsidian into Zendesk with images, or set up dow-copy-zendesk.
---

# Install Copy note for Zendesk

Local Obsidian plugin. Not the community store. Not BRAT.

Source of truth: GitHub repo `camronday/dow-copy-zendesk` (private). Files to install: `manifest.json`, `main.js`, `styles.css` only. Never copy `last-copy.html`.

## Steps

1. Confirm GitHub access (`gh auth status`). The repo is private.
2. Find the Obsidian vault:
   - Prefer `~/Documents/Obsidian Vault`
   - If missing, look for a folder containing `.obsidian/app.json` under `~/Documents` or `~/Library/Mobile Documents`
   - If still missing, ask the user for the vault path
3. Create `<vault>/.obsidian/plugins/dow-copy-zendesk/` if needed.
4. Fetch the three files from GitHub (not from a random gist):

```bash
REPO=camronday/dow-copy-zendesk
DEST="<vault>/.obsidian/plugins/dow-copy-zendesk"
mkdir -p "$DEST"
for f in manifest.json main.js styles.css; do
  gh api "repos/$REPO/contents/$f" --jq .content | base64 --decode > "$DEST/$f"
done
```

If this workspace is already a clone of that repo, copy those three files from the clone instead of `gh api`.

5. Enable the plugin without dropping other ids. Read `<vault>/.obsidian/community-plugins.json`. If the file is missing, write `["dow-copy-zendesk"]`. If it exists, add `"dow-copy-zendesk"` to the array if absent. Do not remove other plugins.
6. Tell the user, verbatim next-step:
   - Settings → Community plugins: Restricted mode must be off.
   - Command palette → **Reload app without saving**.
   - Open a DOW → **Copy note for Zendesk** (`Cmd+Shift+C`). Do not select-all. Paste into a Zendesk internal comment.

## Do not

- Do not install BRAT or any other community plugin to do this.
- Do not publish to the Obsidian community list.
- Do not copy `last-copy.html`, `prove.js`, or vault DOW notes.
- Do not write into `dapulse`.
