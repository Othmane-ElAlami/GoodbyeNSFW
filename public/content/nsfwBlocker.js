// Debug: verify injection
window.__nsfwBlockerLoaded = true;
console.log('[GoodbyeNSFW] Content script injected ✓');

const STORAGE_KEY = 'nsfwBlockerEnabled';
const TOTAL_KEY = 'nsfwTotalBlocked';
let sessionHidden = 0;

function hideNSFWPosts() {
  let hiddenCount = 0;

  // New Reddit: shreddit-content-tags[nsfw] is inside article > shreddit-post
  // The nsfw="" attribute lives on <shreddit-content-tags>, not <shreddit-post>
  document.querySelectorAll('shreddit-content-tags[nsfw]').forEach(tag => {
    const article = tag.closest('article');
    if (article && article.getAttribute('data-nsfw-hidden') !== 'true') {
      article.setAttribute('data-nsfw-hidden', 'true');
      article.style.display = 'none';
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
    sessionHidden += hiddenCount;
    console.log(`[GoodbyeNSFW] Hidden ${hiddenCount} NSFW post(s). Session total: ${sessionHidden}`);
    updateBadge();
    incrementTotal(hiddenCount);
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
  sessionHidden = 0;
  updateBadge();
}

function updateBadge() {
  try {
    chrome.runtime.sendMessage({
      type: 'NSFW_UPDATE_BADGE',
      count: sessionHidden,
    });
  } catch (e) {
    // Extension context may be invalidated
  }
}

function incrementTotal(count) {
  chrome.storage.local.get(TOTAL_KEY, (result) => {
    const current = result[TOTAL_KEY] || 0;
    chrome.storage.local.set({ [TOTAL_KEY]: current + count });
  });
}

// MutationObserver to catch dynamically loaded posts (infinite scroll)
let observer = null;

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(() => hideNSFWPosts());
  observer.observe(document.body, { childList: true, subtree: true });
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
  if (msg.type === 'NSFW_PING') {
    sendResponse({ loaded: true });
    return true;
  }

  if (msg.type === 'NSFW_GET_STATS') {
    chrome.storage.local.get(TOTAL_KEY, (result) => {
      sendResponse({
        session: sessionHidden,
        total: result[TOTAL_KEY] || 0,
      });
    });
    return true; // async sendResponse
  }

  if (msg.type === 'NSFW_BLOCKER_TOGGLE') {
    console.log(`[GoodbyeNSFW] Toggle: ${msg.enabled ? 'ON' : 'OFF'}`);
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
