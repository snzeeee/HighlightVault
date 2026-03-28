/* HighlightVault — Content Script */
(() => {
  "use strict";

  const COLORS = {
    yellow: "rgba(253, 224, 71, 0.4)",
    purple: "rgba(196, 181, 253, 0.4)",
    green:  "rgba(134, 239, 172, 0.4)",
    blue:   "rgba(147, 197, 253, 0.4)",
  };

  let enabled = true;
  let tooltip = null;
  let activeDeleteBtn = null;

  // --- Utility ---

  function generateId() {
    return "hv-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getPageKey() {
    return "highlights_" + location.href.replace(/#.*$/, "");
  }

  function getContext(range) {
    const text = range.toString();
    const parent = range.commonAncestorContainer;
    const full = parent.textContent || "";
    const idx = full.indexOf(text);
    const before = idx > 0 ? full.slice(Math.max(0, idx - 60), idx) : "";
    const after = full.slice(idx + text.length, idx + text.length + 60);
    return { before, text, after };
  }

  // --- Storage ---

  async function loadHighlights() {
    const key = getPageKey();
    const result = await chrome.storage.local.get(key);
    return result[key] || [];
  }

  async function saveHighlight(data) {
    const key = getPageKey();
    const highlights = await loadHighlights();
    highlights.push(data);
    await chrome.storage.local.set({ [key]: highlights });
    updateBadge(highlights.length);
  }

  async function removeHighlight(id) {
    const key = getPageKey();
    let highlights = await loadHighlights();
    highlights = highlights.filter(h => h.id !== id);
    await chrome.storage.local.set({ [key]: highlights });
    updateBadge(highlights.length);
  }

  function updateBadge(count) {
    try {
      chrome.runtime.sendMessage({ type: "updateBadge", count }).catch(() => {});
    } catch {
      // Service worker may not be active
    }
  }

  // --- Tooltip ---

  function showTooltip(x, y) {
    removeTooltip();
    tooltip = document.createElement("div");
    tooltip.className = "hv-tooltip";

    for (const [name, color] of Object.entries(COLORS)) {
      const dot = document.createElement("div");
      dot.className = "hv-color-dot";
      dot.style.background = color;
      dot.dataset.color = name;
      dot.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyHighlight(name, color);
      });
      tooltip.appendChild(dot);
    }

    // Position above the selection
    tooltip.style.left = `${x - 90}px`;
    tooltip.style.top = `${y - 50}px`;
    document.body.appendChild(tooltip);
  }

  function removeTooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  // --- Apply Highlight ---

  function applyHighlight(colorName, colorValue) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = range.toString().trim();
    if (!text) return;

    const context = getContext(range);
    const id = generateId();

    const mark = document.createElement("mark");
    mark.dataset.highlightId = id;
    mark.style.backgroundColor = colorValue;

    try {
      range.surroundContents(mark);
    } catch {
      // If surroundContents fails (crosses element boundaries), use extractContents
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }

    selection.removeAllRanges();
    removeTooltip();

    const data = {
      id,
      text,
      color: colorName,
      url: location.href,
      pageTitle: document.title,
      domain: location.hostname,
      date: new Date().toISOString(),
      anchor: context,
    };

    saveHighlight(data);
  }

  // --- Restore Highlights ---

  function findTextNode(anchor) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let bestMatch = null;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const content = node.textContent;
      const idx = content.indexOf(anchor.text);
      if (idx === -1) continue;

      // Walk up ancestors to find the best context match
      let el = node.parentNode;
      for (let depth = 0; el && depth < 5; depth++, el = el.parentNode) {
        const fullText = el.textContent || "";
        const fullIdx = fullText.indexOf(anchor.text);
        if (fullIdx === -1) continue;

        // If no before context was saved, accept the first text match
        if (!anchor.before) {
          return { node, offset: idx, length: anchor.text.length };
        }

        // Check if the before context matches at any ancestor level
        const slice = fullText.slice(Math.max(0, fullIdx - 80), fullIdx);
        if (slice.includes(anchor.before.slice(-30))) {
          return { node, offset: idx, length: anchor.text.length };
        }
      }

      // Keep as fallback if no context match is found
      if (!bestMatch) {
        bestMatch = { node, offset: idx, length: anchor.text.length };
      }
    }

    // Return fallback match (text found but context didn't match)
    return bestMatch;
  }

  async function restoreHighlights() {
    const highlights = await loadHighlights();
    if (!highlights.length) return 0;

    for (const h of highlights) {
      // Skip if already restored
      if (document.querySelector(`mark[data-highlight-id="${h.id}"]`)) continue;

      const found = findTextNode(h.anchor);
      if (!found) continue;

      const range = document.createRange();
      range.setStart(found.node, found.offset);
      range.setEnd(found.node, found.offset + found.length);

      const mark = document.createElement("mark");
      mark.dataset.highlightId = h.id;
      mark.style.backgroundColor = COLORS[h.color] || COLORS.yellow;

      try {
        range.surroundContents(mark);
      } catch {
        // skip if DOM structure makes it impossible
      }
    }

    updateBadge(highlights.length);
    return highlights.length;
  }

  // --- Delete Button ---

  function showDeleteBtn(markEl) {
    removeDeleteBtn();
    const btn = document.createElement("span");
    btn.className = "hv-delete-btn";
    btn.textContent = "\u00d7";
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const id = markEl.dataset.highlightId;
      // Unwrap the mark
      const parent = markEl.parentNode;
      while (markEl.firstChild) {
        parent.insertBefore(markEl.firstChild, markEl);
      }
      parent.removeChild(markEl);
      parent.normalize();
      removeDeleteBtn();
      await removeHighlight(id);
    });
    markEl.style.position = "relative";
    markEl.appendChild(btn);
    activeDeleteBtn = btn;
  }

  function removeDeleteBtn() {
    if (activeDeleteBtn) {
      activeDeleteBtn.remove();
      activeDeleteBtn = null;
    }
  }

  // --- Event Listeners ---

  document.addEventListener("mouseup", (e) => {
    if (!enabled) return;
    const target = e.target.nodeType === Node.ELEMENT_NODE ? e.target : e.target.parentElement;
    if (!target) return;
    if (tooltip && tooltip.contains(target)) return;
    if (target.closest(".hv-tooltip")) return;

    // Check if clicked on existing highlight
    const markEl = target.closest("mark[data-highlight-id]");
    if (markEl && window.getSelection().isCollapsed) {
      showDeleteBtn(markEl);
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        removeTooltip();
        return;
      }
      const text = selection.toString().trim();
      if (!text) {
        removeTooltip();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const x = rect.left + rect.width / 2 + window.scrollX;
      const y = rect.top + window.scrollY;
      showTooltip(x, y);
    }, 10);
  });

  document.addEventListener("mousedown", (e) => {
    const target = e.target.nodeType === Node.ELEMENT_NODE ? e.target : e.target.parentElement;
    if (tooltip && (!target || !tooltip.contains(target))) {
      removeTooltip();
    }
    if (activeDeleteBtn && (!target || (!activeDeleteBtn.contains(target) && !target.closest("mark[data-highlight-id]")))) {
      removeDeleteBtn();
    }
  });

  // --- Messages from popup/background ---

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "toggle") {
      enabled = msg.enabled;
      sendResponse({ ok: true });
    } else if (msg.type === "getStatus") {
      sendResponse({ enabled });
    }
  });

  // --- Init ---

  async function init() {
    const count = await restoreHighlights();
    // Retry once after load if some highlights were not found
    if (count > 0) {
      const marks = document.querySelectorAll("mark[data-highlight-id]").length;
      const highlights = await loadHighlights();
      if (marks < highlights.length) {
        window.addEventListener("load", () => restoreHighlights(), { once: true });
      }
    }
  }

  init();
})();
