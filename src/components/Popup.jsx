import { useState, useEffect } from 'react';

export default function Popup() {
  const [blockerEnabled, setBlockerEnabled] = useState(false);
  const [injected, setInjected] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isRedditTab, setIsRedditTab] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['nsfwBlockerEnabled', 'nsfwTotalBlocked'], (result) => {
      setBlockerEnabled(!!result.nsfwBlockerEnabled);
      setTotalCount(result.nsfwTotalBlocked || 0);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url?.includes('reddit.com')) {
        setIsRedditTab(true);

        chrome.tabs.sendMessage(tab.id, { type: 'NSFW_PING' }, (res) => {
          if (chrome.runtime.lastError) {
            setInjected(false);
          } else {
            setInjected(res?.loaded === true);
          }
        });

        chrome.tabs.sendMessage(tab.id, { type: 'NSFW_GET_STATS' }, (res) => {
          if (!chrome.runtime.lastError && res) {
            setSessionCount(res.session || 0);
            setTotalCount(res.total || 0);
          }
        });
      } else {
        setIsRedditTab(false);
        setInjected(null);
      }
    });
  }, []);

  const handleToggle = () => {
    const next = !blockerEnabled;
    setBlockerEnabled(next);
    chrome.storage.local.set({ nsfwBlockerEnabled: next });

    if (!next) {
      setSessionCount(0);
    }

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

  const formatCount = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  };

  const statusText = blockerEnabled
    ? (sessionCount > 0
        ? `● Active — ${sessionCount} post${sessionCount !== 1 ? 's' : ''} hidden this page`
        : '● Active — hiding NSFW posts')
    : '○ Off';

  const statusColor = blockerEnabled ? '#46d160' : '#818384';

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
        <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#d7dadc' }}>🛡 NSFW Feed Blocker</div>
          <div style={{ fontSize: 12, marginTop: 3, color: statusColor }}>
            {statusText}
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

      {/* Stats Row */}
      {blockerEnabled && (
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 10,
        }}>
          <div style={{
            flex: 1,
            background: '#272729',
            borderRadius: 8,
            padding: '8px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FF4500' }}>
              {formatCount(sessionCount)}
            </div>
            <div style={{ fontSize: 10, color: '#818384', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              This page
            </div>
          </div>
          <div style={{
            flex: 1,
            background: '#272729',
            borderRadius: 8,
            padding: '8px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#d7dadc' }}>
              {formatCount(totalCount)}
            </div>
            <div style={{ fontSize: 10, color: '#818384', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              All time
            </div>
          </div>
        </div>
      )}

      {/* Content script status — only shown on Reddit tabs */}
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
