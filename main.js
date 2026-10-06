"use strict";

const {
  Component,
  MarkdownRenderer,
  Notice,
  Plugin,
  TFile,
} = require("obsidian");

const SIZE_ALIAS = /\|(\d+)(x\d+)?$/i;
const WIKI_IMAGE_SIZE = /!\[\[([^\]|#]+)((?:#[^\]|]*)?)\|(\d+)(x\d+)?\]\]/g;
const MAX_EMBED_BYTES = 5 * 1024 * 1024;
const MIME_BY_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  avif: "image/avif",
};

function stripEmbedSizeAlias(src) {
  if (!src) return src;
  return src.replace(SIZE_ALIAS, "").trim();
}

function rewriteWikiImageSizes(markdown) {
  return markdown.replace(WIKI_IMAGE_SIZE, "![[$1$2]]");
}

function filenameFromPath(path) {
  const base = (path || "").split("/").pop() || "image";
  return base.replace(/\.[^.]+$/, "") || base;
}

function mimeForExt(ext) {
  return MIME_BY_EXT[(ext || "").toLowerCase()] || "application/octet-stream";
}

function isNumericAlt(alt) {
  return /^\d+$/.test((alt || "").trim());
}

function wrapHtmlFragment(inner) {
  return (
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body><!--StartFragment-->" +
    '<div style="font-family:Arial,sans-serif;font-size:11pt;line-height:1.45;color:#202124">' +
    inner +
    "</div><!--EndFragment--></body></html>"
  );
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunk = 32768;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function flattenHeadings(root) {
  const doc = root.ownerDocument;
  root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    const p = doc.createElement("p");
    const strong = doc.createElement("strong");
    while (heading.firstChild) strong.appendChild(heading.firstChild);
    p.appendChild(strong);
    heading.replaceWith(p);
  });
}

function keepSectionGaps(root) {
  root.querySelectorAll("p").forEach((p) => {
    if (p.querySelector("img")) return;
    if (p.textContent.replace(/\u00a0/g, "").trim()) return;
    p.innerHTML = "&nbsp;";
  });
}

function isSpacerParagraph(el) {
  if (!el || el.tagName !== "P") return false;
  if (el.querySelector("img")) return false;
  return !el.textContent.replace(/\u00a0/g, "").trim();
}

function isHeadingParagraph(el) {
  if (!el || el.tagName !== "P") return false;
  const strong = el.querySelector(":scope > strong");
  if (!strong) return false;
  return el.textContent.trim() === strong.textContent.trim();
}

function stripSpacersAfterHeadings(root) {
  Array.from(root.querySelectorAll("p")).forEach((p) => {
    if (!isHeadingParagraph(p)) return;
    let next = p.nextElementSibling;
    while (next && isSpacerParagraph(next)) {
      const gone = next;
      next = next.nextElementSibling;
      gone.remove();
    }
  });
}

function makeSpacerParagraph(doc) {
  const p = doc.createElement("p");
  p.innerHTML = "&nbsp;";
  return p;
}

function unwrapPreviewChrome(root) {
  root.querySelectorAll(".markdown-preview-section").forEach((section) => {
    const parent = section.parentElement;
    if (!parent) return;
    while (section.firstChild) parent.insertBefore(section.firstChild, section);
    section.remove();
  });
  const sizer = root.querySelector(".markdown-preview-sizer");
  if (sizer) {
    while (sizer.firstChild) root.appendChild(sizer.firstChild);
    sizer.remove();
  }
}

function insertBlockSpacers(root) {
  const doc = root.ownerDocument;
  const blocks = Array.from(root.querySelectorAll("p, ul, ol, img, pre, blockquote, table"));
  for (let i = 0; i < blocks.length; i++) {
    const el = blocks[i];
    if (el.closest("li, td, th, pre")) continue;
    if (isSpacerParagraph(el)) continue;
    const next = el.nextElementSibling;
    if (!next) continue;
    if (isSpacerParagraph(next)) continue;
    if (!/^(P|UL|OL|IMG|PRE|BLOCKQUOTE|TABLE)$/.test(next.tagName)) continue;
    if (isHeadingParagraph(el) && !isHeadingParagraph(next)) continue;
    el.after(makeSpacerParagraph(doc));
  }
}

function stripObsidianChrome(root) {
  root
    .querySelectorAll(
      ".copy-code-button, .frontmatter, .frontmatter-container, .edit-block-button, .collapse-indicator, .internal-embed-filename"
    )
    .forEach((el) => el.remove());
}

function docText(root, text) {
  const p = root.ownerDocument.createElement("p");
  p.textContent = text;
  return p;
}

function unwrapInternalEmbeds(root) {
  root.querySelectorAll(".internal-embed").forEach((embed) => {
    const img = embed.querySelector("img");
    if (img) {
      embed.replaceWith(img);
      return;
    }
    const inner = embed.querySelector("p");
    if (inner) {
      embed.replaceWith(inner);
      return;
    }
    const src = stripEmbedSizeAlias((embed.getAttribute("src") || "").trim());
    embed.replaceWith(docText(root, `[image: ${filenameFromPath(src)}]`));
  });
}

function styleZendeskBlocks(root) {
  root.querySelectorAll("p").forEach((p) => {
    p.setAttribute("style", "margin:0 0 10px; line-height:1.45");
  });
  root.querySelectorAll("ul, ol").forEach((list) => {
    list.setAttribute("style", "margin:4px 0 12px; padding-left:28px");
  });
  root.querySelectorAll("li").forEach((li) => {
    li.setAttribute("style", "margin:2px 0");
  });
  root.querySelectorAll("a").forEach((a) => {
    a.setAttribute("style", "color:#1d4fcc");
  });
  root.querySelectorAll("img").forEach((img) => {
    img.removeAttribute("srcset");
    img.removeAttribute("loading");
    img.removeAttribute("decoding");
    img.setAttribute("style", "display:block; max-width:100%; height:auto; margin:8px 0; border:0");
  });
  root.querySelectorAll("code").forEach((code) => {
    if (code.closest("pre")) return;
    code.setAttribute(
      "style",
      "font-family:Menlo,Consolas,monospace; font-size:0.9em; background:#f6f8fa; padding:1px 4px"
    );
  });
}

function sleep(root, ms) {
  const w = (root && root.win) || window;
  return new Promise((resolve) => w.setTimeout(resolve, ms));
}

function writeHtmlClipboard(html, plain) {
  try {
    const electron = require("electron");
    electron.clipboard.write({ text: plain, html: html });
    return true;
  } catch (err) {
    console.error("electron clipboard write failed", err);
    return false;
  }
}

class DowCopyZendeskPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "copy-note-for-zendesk",
      name: "Copy note for Zendesk",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "C" }],
      callback: () => this.copyActiveNote(),
    });
    this.addRibbonIcon("clipboard-copy", "Copy note for Zendesk", () => this.copyActiveNote());
    new Notice("Copy note for Zendesk loaded. Cmd+Shift+C, no select-all.");
  }

  async copyActiveNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Copy note for Zendesk: no active note");
      return;
    }
    try {
      const markdown = await this.app.vault.read(file);
      const { html, plain, embedded, skipped } = await this.buildClipboard(markdown, file.path);
      await this.writeLastCopy(html);
      if (!writeHtmlClipboard(html, plain)) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      }
      const skipBit = skipped.length ? `; skipped ${skipped.length}` : "";
      new Notice(`Copied for Zendesk (${embedded} image${embedded === 1 ? "" : "s"}${skipBit})`);
    } catch (err) {
      console.error(err);
      new Notice("Copy note for Zendesk failed. See console.");
    }
  }

  async buildClipboard(markdown, sourcePath) {
    const source = rewriteWikiImageSizes(markdown);
    const doc = activeDocument;
    const mount = doc.createElement("div");
    mount.classList.add("markdown-preview-view", "markdown-rendered", "dow-copy-zendesk-buffer");
    doc.body.appendChild(mount);
    const component = new Component();
    component.load();
    try {
      await MarkdownRenderer.render(this.app, source, mount, sourcePath, component);
      await this.waitForEmbeds(mount);
      stripObsidianChrome(mount);
      await this.embedImages(mount, sourcePath);
      flattenHeadings(mount);
      unwrapInternalEmbeds(mount);
      unwrapPreviewChrome(mount);
      keepSectionGaps(mount);
      stripSpacersAfterHeadings(mount);
      insertBlockSpacers(mount);
      styleZendeskBlocks(mount);
      const embedded = mount.querySelectorAll('img[src^="data:"]').length;
      const skipped = Array.from(mount.querySelectorAll("p"))
        .map((p) => p.textContent || "")
        .filter((t) => t.startsWith("[image: ") && t.includes("not embedded"));
      const html = wrapHtmlFragment(mount.innerHTML);
      const plain = this.plainFromHtml(mount);
      return { html, plain, embedded, skipped };
    } finally {
      component.unload();
      mount.remove();
    }
  }

  async waitForEmbeds(root) {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const pending = root.querySelectorAll(".internal-embed:not(.is-loaded)");
      const imgs = Array.from(root.querySelectorAll("img"));
      const imgsReady = imgs.length === 0 || imgs.every((img) => img.complete);
      if (pending.length === 0 && imgsReady) return;
      await sleep(root, 80);
    }
  }

  async embedImages(root, sourcePath) {
    const imgs = Array.from(root.querySelectorAll("img"));
    for (const img of imgs) {
      const linkpath = this.imageLinkpath(img);
      const fallbackName = filenameFromPath(linkpath || img.getAttribute("alt") || "image");
      if (isNumericAlt(img.getAttribute("alt")) || !img.getAttribute("alt")) {
        img.setAttribute("alt", fallbackName);
      }
      const dataUrl = await this.resolveDataUrl(linkpath, sourcePath, img.getAttribute("src"));
      if (dataUrl) {
        img.setAttribute("src", dataUrl);
        img.removeAttribute("srcset");
        continue;
      }
      const label = root.ownerDocument.createElement("p");
      label.textContent = `[image: ${fallbackName} (not embedded)]`;
      img.replaceWith(label);
    }
  }

  imageLinkpath(img) {
    const embed = img.closest(".internal-embed[src]");
    const fromEmbed = stripEmbedSizeAlias((embed && embed.getAttribute("src")) || "");
    if (fromEmbed) return fromEmbed;
    const alt = (img.getAttribute("alt") || "").trim();
    if (alt && !isNumericAlt(alt) && this.app.metadataCache.getFirstLinkpathDest(alt, "")) {
      return alt;
    }
    const src = img.getAttribute("src") || "";
    if (/^(app|file):\/\//i.test(src)) {
      const fromUrl = this.vaultPathFromUrl(src);
      if (fromUrl) return fromUrl;
    }
    return stripEmbedSizeAlias(src);
  }

  vaultPathFromUrl(url) {
    try {
      const adapter = this.app.vault.adapter;
      if (typeof adapter.getBasePath !== "function") return null;
      const pathname = decodeURIComponent(new URL(url).pathname);
      const base = adapter.getBasePath();
      if (!pathname.includes(base)) return null;
      let rel = pathname.substring(pathname.indexOf(base) + base.length);
      if (rel.startsWith("/")) rel = rel.substring(1);
      return stripEmbedSizeAlias(rel);
    } catch (err) {
      return null;
    }
  }

  async resolveDataUrl(linkpath, sourcePath, rawSrc) {
    if (rawSrc && rawSrc.startsWith("data:")) return rawSrc;
    if (rawSrc && /^https?:\/\//i.test(rawSrc)) return rawSrc;
    const path = stripEmbedSizeAlias(linkpath || "");
    if (!path) return null;
    const dest = this.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
    if (!dest || !(dest instanceof TFile)) return null;
    try {
      const data = await this.app.vault.adapter.readBinary(dest.path);
      if (data.byteLength > MAX_EMBED_BYTES) {
        new Notice(`Skipped embedding (too large): ${dest.name}`);
        return null;
      }
      const mime = mimeForExt(dest.extension);
      return `data:${mime};base64,${arrayBufferToBase64(data)}`;
    } catch (err) {
      console.error("Failed to embed", dest.path, err);
      return null;
    }
  }

  plainFromHtml(root) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll("img").forEach((img) => {
      const alt = img.getAttribute("alt") || "image";
      const p = clone.ownerDocument.createElement("p");
      p.textContent = `[image: ${alt}]`;
      img.replaceWith(p);
    });
    return (clone.innerText || clone.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  async writeLastCopy(html) {
    try {
      await this.app.vault.adapter.write(".obsidian/plugins/dow-copy-zendesk/last-copy.html", html);
    } catch (err) {
      console.error("Could not write last-copy.html", err);
    }
  }
}

module.exports = DowCopyZendeskPlugin;
