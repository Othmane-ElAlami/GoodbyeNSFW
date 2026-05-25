const STORAGE_KEY = 'nsfwBlockerEnabled';

function hideNSFWPosts() {
  // New Reddit (shreddit web components)
  document.querySelectorAll('shreddit-post[nsfw="true"]:not([data-nsfw-hidden="true"])').forEach(el => {
    el.setAttribute('data-nsfw-hidden', 'true');
    el.style.display = 'none';
  });

  // New Reddit (feed items with NSFW badge)
  document.querySelectorAll('[data-testid="post-container"]').forEach(el => {
    if (el.querySelector('[data-testid="nsfw-badge"]') && el.getAttribute('data-nsfw-hidden') !== 'true') {
      const wrapper = el.closest('li, article, div[data-fullname]') || el;
      wrapper.setAttribute('data-nsfw-hidden', 'true');
      wrapper.style.display = 'none';
    }
  });

  // Old Reddit
  document.querySelectorAll('.link.over18:not([data-nsfw-hidden="true"])').forEach(el => {
    el.setAttribute('data-nsfw-hidden', 'true');
    el.style.display = 'none';
  });

  // Apply CSS class for the fallback stylesheet
  document.body.classList.add('nsfw-blocker-active');
}

function restoreNSFWPosts() {
  document.querySelectorAll('[data-nsfw-hidden="true"]').forEach(el => {
    el.style.display = '';
    el.removeAttribute('data-nsfw-hidden');
  });
  document.body.classList.remove('nsfw-blocker-active');
}

// MutationObserver to catch dynamically loaded posts (infinite scroll)
let observer = null;

function startObserver() {
  if (observer) return; // prevent duplicates
  observer = new MutationObserver(() => hideNSFWPosts());
  observer.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// Listen for toggle messages from the popup/dashboard
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'NSFW_BLOCKER_TOGGLE') {
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
  if (result[STORAGE_KEY]) {
    hideNSFWPosts();
    startObserver();
  }
});
