// Debug: verify injection
window.__nsfwBlockerLoaded = true;
console.log('[GoodbyeNSFW] Content script injected ✓');

const STORAGE_KEY = 'nsfwBlockerEnabled';
let totalHidden = 0;

function debugPostStructure() {
  // Log what Reddit's DOM actually looks like so we can verify selectors
  const shredditPosts = document.querySelectorAll('shreddit-post');
  if (shredditPosts.length > 0) {
    const first = shredditPosts[0];
    const attrs = Array.from(first.attributes).map(a => `${a.name}="${a.value}"`).join(', ');
    console.log(`[GoodbyeNSFW] Found ${shredditPosts.length} shreddit-post elements`);
    console.log(`[GoodbyeNSFW] First post attributes: ${attrs}`);

    // Count how many have NSFW-related attributes
    const nsfwVariants = {
      '[nsfw]': document.querySelectorAll('shreddit-post[nsfw]').length,
      '[nsfw=""]': document.querySelectorAll('shreddit-post[nsfw=""]').length,
      '[nsfw="true"]': document.querySelectorAll('shreddit-post[nsfw="true"]').length,
      '[over-18]': document.querySelectorAll('shreddit-post[over-18]').length,
      '[is-nsfw]': document.querySelectorAll('shreddit-post[is-nsfw]').length,
    };
    console.log('[GoodbyeNSFW] NSFW attribute scan:', nsfwVariants);
  }

  // Old Reddit
  const oldRedditNsfw = document.querySelectorAll('.link.over18');
  if (oldRedditNsfw.length > 0) {
    console.log(`[GoodbyeNSFW] Found ${oldRedditNsfw.length} old Reddit NSFW posts (.link.over18)`);
  }

  // Check for any element containing "NSFW" text badge
  const nsfwBadges = document.querySelectorAll('[data-testid="nsfw-badge"], faceplate-badge[label="NSFW"], span.nsfw-stamp');
  if (nsfwBadges.length > 0) {
    console.log(`[GoodbyeNSFW] Found ${nsfwBadges.length} NSFW badge elements`);
  }
}

function hideNSFWPosts() {
  let hiddenCount = 0;

  // New Reddit: shreddit-post with nsfw attribute (boolean — no value, or any value)
  document.querySelectorAll('shreddit-post[nsfw]:not([data-nsfw-hidden="true"])').forEach(el => {
    el.setAttribute('data-nsfw-hidden', 'true');
    el.style.display = 'none';
    hiddenCount++;
  });

  // New Reddit: shreddit-post with over-18 attribute (alternative)
  document.querySelectorAll('shreddit-post[over-18]:not([data-nsfw-hidden="true"])').forEach(el => {
    el.setAttribute('data-nsfw-hidden', 'true');
    el.style.display = 'none';
    hiddenCount++;
  });

  // New Reddit: shreddit-post with is-nsfw attribute (alternative)
  document.querySelectorAll('shreddit-post[is-nsfw]:not([data-nsfw-hidden="true"])').forEach(el => {
    el.setAttribute('data-nsfw-hidden', 'true');
    el.style.display = 'none';
    hiddenCount++;
  });

  // New Reddit: posts with NSFW badge via data-testid
  document.querySelectorAll('[data-testid="post-container"]').forEach(el => {
    if (el.querySelector('[data-testid="nsfw-badge"]') && el.getAttribute('data-nsfw-hidden') !== 'true') {
      const wrapper = el.closest('li, article, div[data-fullname]') || el;
      wrapper.setAttribute('data-nsfw-hidden', 'true');
      wrapper.style.display = 'none';
      hiddenCount++;
    }
  });

  // New Reddit: posts containing a faceplate NSFW badge
  document.querySelectorAll('faceplate-badge[label="NSFW"]').forEach(badge => {
    const post = badge.closest('shreddit-post, article, [data-fullname]');
    if (post && post.getAttribute('data-nsfw-hidden') !== 'true') {
      post.setAttribute('data-nsfw-hidden', 'true');
      post.style.display = 'none';
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
    totalHidden += hiddenCount;
    console.log(`[GoodbyeNSFW] Hidden ${hiddenCount} new NSFW post(s). Total hidden: ${totalHidden}`);
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
  totalHidden = 0;
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
  // Popup pings to check if content script is injected
  if (msg.type === 'NSFW_PING') {
    sendResponse({ loaded: true });
    return true;
  }

  // Popup requests the current hidden count
  if (msg.type === 'NSFW_GET_COUNT') {
    sendResponse({ count: totalHidden });
    return true;
  }

  if (msg.type === 'NSFW_BLOCKER_TOGGLE') {
    console.log(`[GoodbyeNSFW] Toggle message received: ${msg.enabled ? 'ON' : 'OFF'}`);
    if (msg.enabled) {
      debugPostStructure();
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
    debugPostStructure();
    hideNSFWPosts();
    startObserver();
  }
});
