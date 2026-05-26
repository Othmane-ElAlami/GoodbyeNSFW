import { useState, useEffect } from 'react';

export default function Popup() {
  const [blockerEnabled, setBlockerEnabled] = useState(false);
  const [injected, setInjected] = useState(null); // null = not on Reddit, true/false = detection result

  useEffect(() => {
    chrome.storage.local.get('nsfwBlockerEnabled', ({ nsfwBlockerEnabled }) => {
      setBlockerEnabled(!!nsfwBlockerEnabled);
    });

    // Check if content script is injected in the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url?.includes('reddit.com')) {
        chrome.tabs.sendMessage(tab.id, { type: 'NSFW_PING' }, (res) => {
          setInjected(chrome.runtime.lastError ? false : res?.loaded === true);
        });
      } else {
        setInjected(null); // not on Reddit
      }
    });
  }, []);

  const handleToggle = () => {
    const next = !blockerEnabled;
    setBlockerEnabled(next);
    chrome.storage.local.set({ nsfwBlockerEnabled: next });
    chrome.tabs.query(
      { url: ['*://www.reddit.com/*', '*://old.reddit.com/*'] },
      (tabs) => tabs.forEach(tab =>
        chrome.tabs.sendMessage(tab.id, { type: 'NSFW_BLOCKER_TOGGLE', enabled: next })
      )
    );
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  };

  return (
    <div style={{
      width: 300,
      padding: 16,
      background: '#1a1a1b',
      color: '#d7dadc',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
      }}>
        <img src="favicon.svg" width={24} height={24} alt="GoodbyeNSFW" />
        <span style={{ fontWeight: 700, fontSize: 15, color: '#d7dadc' }}>GoodbyeNSFW</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: '#818384',
          background: '#272729',
          padding: '2px 8px',
          borderRadius: 999,
        }}>v2.0.0</span>
      </div>

      {/* NSFW Blocker Toggle Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#272729',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 10,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#d7dadc' }}>🛡 NSFW Feed Blocker</div>
          <div style={{ fontSize: 12, color: '#818384', marginTop: 3 }}>
            {blockerEnabled
              ? <span style={{ color: '#46d160' }}>● Active — hiding NSFW posts</span>
              : <span style={{ color: '#818384' }}>○ Off</span>
            }
          </div>
        </div>
        <div
          onClick={handleToggle}
          role="switch"
          aria-checked={blockerEnabled}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
          style={{
            width: 44,
            height: 24,
            borderRadius: 999,
            cursor: 'pointer',
            background: blockerEnabled ? '#FF4500' : '#343536',
            position: 'relative',
            transition: 'background 0.2s ease',
            flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute',
            top: 3,
            left: blockerEnabled ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s ease',
          }} />
        </div>
      </div>

      {/* Debug status — only shown on Reddit tabs */}
      {injected !== null && (
        <div style={{
          fontSize: 11,
          color: injected ? '#46d160' : '#ff585b',
          background: '#272729',
          borderRadius: 8,
          padding: '6px 10px',
          marginBottom: 10,
        }}>
          {injected
            ? '✓ Content script injected on this tab'
            : '✗ Content script not detected — try reloading the Reddit tab'
          }
        </div>
      )}

      {/* Open Dashboard link */}
      <div
        onClick={openDashboard}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && openDashboard()}
        style={{
          fontSize: 12,
          color: '#FF4500',
          textAlign: 'center',
          cursor: 'pointer',
          paddingTop: 6,
        }}
      >
        Open Subscription Cleaner →
      </div>

    </div>
  );
}
