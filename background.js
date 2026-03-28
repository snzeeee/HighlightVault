/* HighlightVault — Service Worker */

// Initialize default settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("hv_settings", (result) => {
    if (!result.hv_settings) {
      chrome.storage.local.set({
        hv_settings: { enabled: true },
      });
    }
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "updateBadge") {
    const text = msg.count > 0 ? String(msg.count) : "";
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.action.setBadgeText({ text, tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#7C3AED", tabId });
    }
  }
});

// Update badge when tab is activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab.url) return;
    const key = tab.url.replace(/#.*$/, "");
    const result = await chrome.storage.local.get(key);
    const highlights = result[key] || [];
    const text = highlights.length > 0 ? String(highlights.length) : "";
    chrome.action.setBadgeText({ text, tabId: activeInfo.tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#7C3AED", tabId: activeInfo.tabId });
  } catch {
    // Tab may not exist
  }
});

// Update badge when tab URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) return;
      const key = tab.url.replace(/#.*$/, "");
      const result = await chrome.storage.local.get(key);
      const highlights = result[key] || [];
      const text = highlights.length > 0 ? String(highlights.length) : "";
      chrome.action.setBadgeText({ text, tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#7C3AED", tabId });
    } catch {
      // Tab may not exist
    }
  }
});
