// Open dashboard on icon click (only fires when no default_popup is set)
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "index.html" });
});

// Handle badge updates from content scripts
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'NSFW_UPDATE_BADGE') {
    const tabId = sender.tab?.id;
    if (tabId) {
      if (msg.count > 0) {
        chrome.action.setBadgeText({ text: String(msg.count), tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#FF4500', tabId });
      } else {
        chrome.action.setBadgeText({ text: '', tabId });
      }
    }
  }
});
