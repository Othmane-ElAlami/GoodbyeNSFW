import { useState, useEffect } from "react";
import { FaShieldAlt } from "react-icons/fa";

const STORAGE_KEY = 'nsfwBlockerEnabled';

export default function NsfwBlockerToggle() {
  const [enabled, setEnabled] = useState(false);
  const [isExtension, setIsExtension] = useState(false);

  useEffect(() => {
    // Only enable if running inside a browser extension context
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      setIsExtension(true);
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        setEnabled(!!result[STORAGE_KEY]);
      });
    }
  }, []);

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    chrome.storage.local.set({ [STORAGE_KEY]: newState });

    // Send message to all active Reddit tabs
    chrome.tabs.query(
      { url: ['*://www.reddit.com/*', '*://old.reddit.com/*'] },
      (tabs) => {
        tabs.forEach((tab) =>
          chrome.tabs.sendMessage(tab.id, {
            type: 'NSFW_BLOCKER_TOGGLE',
            enabled: newState,
          })
        );
      }
    );
  };

  // Don't render if not running as an extension
  if (!isExtension) return null;

  return (
    <div
      className="flat-card px-4 py-3 flex items-center justify-between gap-4"
      id="nsfw-blocker-card"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: enabled
              ? 'rgba(255, 69, 0, 0.15)'
              : 'rgba(129, 131, 132, 0.15)',
          }}
        >
          <FaShieldAlt
            className="text-sm"
            style={{ color: enabled ? '#ff4500' : '#818384' }}
          />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#d7dadc] flex items-center gap-2">
            NSFW Feed Blocker
            <span
              className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(255, 69, 0, 0.15)',
                color: '#ff4500',
              }}
            >
              V2
            </span>
          </div>
          <div className="text-xs text-[#818384] mt-0.5 flex items-center gap-2">
            <span>Hides NSFW posts from your feed</span>
            <span>•</span>
            {enabled ? (
              <span style={{ color: '#46d160', fontWeight: 600 }}>Active ✓</span>
            ) : (
              <span style={{ color: '#818384' }}>Off</span>
            )}
          </div>
        </div>
      </div>
      <label className="toggle-switch" id="nsfw-blocker-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
        />
        <span
          className="toggle-slider"
          style={{
            backgroundColor: enabled ? '#ff4500' : '#343536',
          }}
        />
      </label>
    </div>
  );
}
