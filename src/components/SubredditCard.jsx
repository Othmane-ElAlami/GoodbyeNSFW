import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import 'overlayscrollbars/overlayscrollbars.css';

function formatCount(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

function getSubColor(name) {
  const colors = [
    "#ff4500",
    "#0079d3",
    "#46d160",
    "#ea0027",
    "#ffd635",
    "#0dd3bb",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Module-level queue for serializing Reddit user details fetching to prevent 429 Rate Limits
let requestQueue = [];
let isProcessingQueue = false;

async function processNextInQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const item = requestQueue[0]; // peek
    if (item.cancelled) {
      requestQueue.shift();
      continue;
    }
    
    try {
      const result = await item.fetchFn();
      if (!item.cancelled) {
        item.resolve(result);
      }
    } catch (err) {
      if (!item.cancelled) {
        item.reject(err);
      }
    }
    requestQueue.shift();
    
    // 500ms throttle to comply with Reddit rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  isProcessingQueue = false;
}

function enqueueRequest(fetchFn) {
  let item;
  let rejectPromise;
  
  const promise = new Promise((resolve, reject) => {
    rejectPromise = reject;
    item = {
      fetchFn,
      resolve,
      reject,
      cancelled: false,
    };
  });
  
  requestQueue.push(item);
  processNextInQueue();
  
  return {
    promise,
    cancel: () => {
      item.cancelled = true;
      rejectPromise(new Error("Cancelled"));
    }
  };
}

export default function SubredditCard({ subreddit, isKept, onToggle }) {
  const { name, description, icon, subscribers } = subreddit;
  const topColor = getSubColor(name);

  const isUser = name.startsWith("u_") || name.startsWith("u/");
  const url = isUser
    ? `https://www.reddit.com/user/${name.replace(/^u[_/]/, "")}/`
    : `https://www.reddit.com/r/${name}/`;

  const displayName = isUser ? `u/${name.replace(/^u[_/]/, "")}` : `r/${name}`;

  const [karma, setKarma] = useState(null);
  const [loadingKarma, setLoadingKarma] = useState(false);
  
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { margin: "200px" });

  useEffect(() => {
    if (!isUser || !isInView || karma !== null) return;
    
    let active = true;
    let queueItem = null;
    
    const fetchKarma = async () => {
      const username = name.replace(/^u[_/]/, "");
      const res = await fetch(`https://www.reddit.com/user/${username}/about.json`);
      if (res.status === 429) {
        throw new Error("Rate limited");
      }
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const json = await res.json();
      if (!json || !json.data) throw new Error("No data");
      return (json.data.link_karma || 0) + (json.data.comment_karma || 0);
    };

    const startFetching = async () => {
      setLoadingKarma(true);
      try {
        queueItem = enqueueRequest(fetchKarma);
        const totalKarma = await queueItem.promise;
        if (active) {
          setKarma(totalKarma);
        }
      } catch (e) {
        if (active && e.message !== "Cancelled") {
          console.error('Error fetching karma for', name, e);
        }
      } finally {
        setLoadingKarma(false);
      }
    };
    
    // Add a tiny random delay to avoid identical timestamp bursting
    const delay = Math.random() * 150;
    const timer = setTimeout(() => {
      if (active) startFetching();
    }, delay);
    
    return () => { 
      active = false; 
      clearTimeout(timer);
      if (queueItem) {
        queueItem.cancel();
      }
    };
  }, [name, isUser, isInView, karma]);

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="card cursor-pointer bg-[#1a1a1b] rounded-lg"
      style={{
        border: "1px solid #343536",
        borderTop: `3px solid ${topColor}`,
      }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
      id={`sub-card-${name}`}
    >
      {/* TOP ZONE */}
      <div className="card-top flex items-start gap-3 mb-2">
        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[#FF4500] flex items-center justify-center overflow-hidden mt-0.5">
          {icon ? (
            <img
              src={icon}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.innerHTML = `<span class="text-xs font-bold text-white">${name.charAt(0).toUpperCase()}</span>`;
              }}
            />
          ) : (
            <span className="text-xs font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="text-base font-bold text-[#d7dadc] break-words leading-tight"
            style={{ overflow: "visible" }}
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-title-link"
              onClick={(e) => e.stopPropagation()}
            >
              {displayName}
            </a>
          </h3>
          {isUser ? (
            <div className="text-xs text-[#818384] mt-1">
              {loadingKarma ? (
                <span className="opacity-50 animate-pulse">Loading karma...</span>
              ) : karma !== null ? (
                <span>{formatCount(karma)} karma</span>
              ) : (
                <span>User Profile</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#818384] mt-1">
              {formatCount(subscribers)} members
            </div>
          )}
        </div>
      </div>

      {/* MID ZONE */}
      <OverlayScrollbarsComponent
        className="card-middle"
        options={{
          scrollbars: {
            theme: 'os-theme-custom',
            autoHide: 'leave',        /* hidden until hover */
            autoHideDelay: 200,
            visibility: 'auto',
            dragScroll: true,
          },
          overflow: {
            x: 'hidden',
            y: 'scroll',
          }
        }}
        defer
      >
        <p className="card-description">
          {description || "No description available."}
        </p>
      </OverlayScrollbarsComponent>

      {/* BOT ZONE */}
      <div className="card-bottom">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`remove-btn font-bold transition-colors ${
            !isKept
              ? "bg-[#ea0027] text-white border border-[#ea0027]"
              : "bg-transparent text-[#ea0027] border border-[#ea0027] hover:bg-[#ea0027]/10"
          }`}
        >
          {!isKept ? "Removing" : "Remove"}
        </button>
      </div>
    </motion.div>
  );
}
