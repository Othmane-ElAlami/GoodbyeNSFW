// Debug: verify injection (Step 2)
window.__nsfwBlockerLoaded = true;
console.log('[GoodbyeNSFW] Content script injected ✓');

const STORAGE_KEY = 'nsfwBlockerEnabled';

function hideNSFWPosts() {
  let hiddenCount = 0;

  // New Reddit (shreddit web components)
  document.querySelectorAll('shreddit-post[nsfw="true"]:not([data-nsfw-hidden="true"])').forEach(el => {
    el.setAttribute('data-nsfw-hidden', 'true');
    el.style.display = 'none';
    hiddenCount++;
  });

  // New Reddit (feed items with NSFW badge)
  document.querySelectorAll('[data-testid="post-container"]').forEach(el => {
    if (el.querySelector('[data-testid="nsfw-badge"]') && el.getAttribute('data-nsfw-hidden') !== 'true') {
      const wrapper = el.closest('li, article, div[data-fullname]') || el;
      wrapper.setAttribute('data-nsfw-hidden', 'true');
      wrapper.style.display = 'none';
      hiddenCount++;
    }
  });

  // Old Reddit
  document.querySelectorAll('.link.over18:not([data-nsfw-hidden="true"])').forEach(el => {
    el.setAttribute('data-nsfw-hidden', 'true');
    el.style.display = 'none';
    hiddenCount++;
  });

  // Apply CSS class for the fallback stylesheet
  document.body.classList.add('nsfw-blocker-active');

  if (hiddenCount > 0) {
    console.log(`[GoodbyeNSFW] Hidden ${hiddenCount} NSFW post(s)`);
  }
}

function restoreNSFWPosts() {
  const restored = document.querySelectorAll('[data-nsfw-hidden="true"]');
  restored.forEach(el => {
    el.style.display = '';
    el.removeAttribute('data-nsfw-hidden');
  });
  document.body.classList.remove('nsfw-blocker-active');
  console.log(`[GoodbyeNSFW] Restored ${restored.length} NSFW post(s)`);
}

// MutationObserver to catch dynamically loaded posts (infinite scroll)
let observer = null;

function startObserver() {
  if (observer) return; // prevent duplicates
  observer = new MutationObserver(() => hideNSFWPosts());
  observer.observe(document.body, { childList: true, subtree: true });
  // Debug: verify observer is active (Step 6)
  window.__nsfwObserverActive = true;
  console.log('[GoodbyeNSFW] MutationObserver started ✓');
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
    window.__nsfwObserverActive = false;
    console.log('[GoodbyeNSFW] MutationObserver stopped');
  }
}

// Listen for messages from the popup/dashboard
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Popup pings to check if content script is injected
  if (msg.type === 'NSFW_PING') {
    sendResponse({ loaded: true });
    return true;
  }

  if (msg.type === 'NSFW_BLOCKER_TOGGLE') {
    console.log(`[GoodbyeNSFW] Toggle message received: ${msg.enabled ? 'ON' : 'OFF'}`);
    if (msg.enabled) {
      hideNSFWPosts();
      startObserver();
    } else {
      stopObserver();
      restoreNSFWPosts();
    }
  }
});

// On page load, check stored preference and apply immediately
chrome.storage.local.get(STORAGE_KEY, (result) => {
  console.log(`[GoodbyeNSFW] Stored preference: ${result[STORAGE_KEY] ? 'ON' : 'OFF'}`);
  if (result[STORAGE_KEY]) {
    hideNSFWPosts();
    startObserver();
  }
});
