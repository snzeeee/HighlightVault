/* HighlightVault — Popup Script */

const SOLID_COLORS = {
  yellow: "#FDE047",
  purple: "#C4B5FD",
  green:  "#86EFAC",
  blue:   "#93C5FD",
};

const listEl = document.getElementById("highlightsList");
const emptyEl = document.getElementById("emptyState");
const counterEl = document.getElementById("counter");
const searchInput = document.getElementById("searchInput");
const toggleEl = document.getElementById("toggleEnabled");
const exportBtn = document.getElementById("exportBtn");

let allHighlights = [];

// --- Load all highlights ---

async function loadAll() {
  const data = await chrome.storage.local.get(null);
  const highlights = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === "hv_settings") continue;
    if (!Array.isArray(value)) continue;
    for (const h of value) {
      if (h.id && h.text && h.url) {
        highlights.push(h);
      }
    }
  }

  // Sort by date descending
  highlights.sort((a, b) => new Date(b.date) - new Date(a.date));
  allHighlights = highlights;
  render(highlights);
}

// --- Render ---

function render(highlights) {
  // Update counter
  const total = highlights.length;
  counterEl.textContent = `${total} highlight${total !== 1 ? "s" : ""}`;

  // Clear list (keep empty state element)
  listEl.innerHTML = "";

  if (total === 0) {
    listEl.appendChild(emptyEl);
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";

  // Group by domain
  const groups = {};
  for (const h of highlights) {
    const domain = h.domain || new URL(h.url).hostname;
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(h);
  }

  for (const [domain, items] of Object.entries(groups)) {
    const siteEl = document.createElement("div");
    siteEl.className = "hv-site";

    const headerEl = document.createElement("div");
    headerEl.className = "hv-site-header";
    headerEl.innerHTML = `
      <img class="hv-site-favicon" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="">
      <span class="hv-site-domain">${domain}</span>
      <span class="hv-site-count">${items.length}</span>
      <span class="hv-site-chevron">&#9654;</span>
    `;
    headerEl.addEventListener("click", () => {
      siteEl.classList.toggle("open");
    });
    siteEl.appendChild(headerEl);

    const itemsEl = document.createElement("div");
    itemsEl.className = "hv-site-items";

    for (const h of items) {
      const itemEl = document.createElement("div");
      itemEl.className = "hv-item";

      const colorDot = document.createElement("div");
      colorDot.className = "hv-item-color";
      colorDot.style.background = SOLID_COLORS[h.color] || SOLID_COLORS.yellow;

      const contentEl = document.createElement("div");
      contentEl.className = "hv-item-content";

      const textEl = document.createElement("div");
      textEl.className = "hv-item-text";
      textEl.textContent = h.text.length > 120 ? h.text.slice(0, 120) + "..." : h.text;

      const dateEl = document.createElement("div");
      dateEl.className = "hv-item-date";
      dateEl.textContent = formatDate(h.date);

      contentEl.appendChild(textEl);
      contentEl.appendChild(dateEl);
      itemEl.appendChild(colorDot);
      itemEl.appendChild(contentEl);

      itemEl.addEventListener("click", () => {
        chrome.tabs.create({ url: h.url });
      });

      itemsEl.appendChild(itemEl);
    }

    siteEl.appendChild(itemsEl);
    listEl.appendChild(siteEl);
  }

  // Auto-open first group if only one
  if (Object.keys(groups).length === 1) {
    listEl.querySelector(".hv-site")?.classList.add("open");
  }
}

function formatDate(iso) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// --- Search ---

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase().trim();
  if (!query) {
    render(allHighlights);
    return;
  }
  const filtered = allHighlights.filter(h =>
    h.text.toLowerCase().includes(query) ||
    (h.domain || "").toLowerCase().includes(query) ||
    (h.pageTitle || "").toLowerCase().includes(query)
  );
  render(filtered);
});

// --- Toggle ---

toggleEl.addEventListener("change", async () => {
  const enabled = toggleEl.checked;
  await chrome.storage.local.set({ hv_settings: { enabled } });

  // Send to active tab's content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "toggle", enabled });
    } catch {
      // Content script not available
    }
  }
});

// Load toggle state
chrome.storage.local.get("hv_settings", (result) => {
  const settings = result.hv_settings || { enabled: true };
  toggleEl.checked = settings.enabled;
});

// --- Export Markdown ---

exportBtn.addEventListener("click", async () => {
  if (!allHighlights.length) return;

  const groups = {};
  for (const h of allHighlights) {
    const domain = h.domain || new URL(h.url).hostname;
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(h);
  }

  let md = "";
  for (const [domain, items] of Object.entries(groups)) {
    md += `## ${domain}\n`;
    for (const h of items) {
      md += `- "${h.text}" (${formatDate(h.date)})\n`;
    }
    md += "\n";
  }

  await navigator.clipboard.writeText(md.trim());

  exportBtn.classList.add("copied");
  exportBtn.textContent = "Copied to clipboard!";
  setTimeout(() => {
    exportBtn.classList.remove("copied");
    exportBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Export as Markdown
    `;
  }, 1500);
});

// --- Init ---
loadAll();
