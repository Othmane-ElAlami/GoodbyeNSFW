import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaReddit,
  FaShieldAlt,
  FaEyeSlash,
  FaBolt,
  FaSpinner,
} from "react-icons/fa";

const features = [
  {
    icon: <FaEyeSlash className="text-2xl" />,
    title: "Smart Detection",
    desc: "Automatically identifies all NSFW subreddits in your subscriptions using Reddit's internal data.",
  },
  {
    icon: <FaShieldAlt className="text-2xl" />,
    title: "Zero Servers, Zero Tracking",
    desc: "Runs entirely as a local Edge extension. No backend, no API keys, and your data never leaves your browser.",
  },
  {
    icon: <FaBolt className="text-2xl" />,
    title: "Batch Cleanup",
    desc: "Review and unsubscribe from unwanted NSFW content in one click. Keep what you want, remove the rest.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const res = await fetch("https://www.reddit.com/api/me.json");
      if (res.status === 429) {
        throw new Error("Rate limited by Reddit (Too many requests). Please wait a minute and try again.");
      }
      if (!res.ok) {
        throw new Error(
          "You must be logged into Reddit in this browser to use the tool. Please open a new tab, log in to Reddit, and try again.",
        );
      }
      navigate("/dashboard");
    } catch (err) {
      setIsScanning(false);
      setError(
        err.message || "Failed to connect to Reddit. Are you logged in?",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-reddit-dark)] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-[#343536]">
        <div className="flex items-center gap-2">
          <FaReddit className="text-3xl text-[var(--color-reddit-orange)]" />
          <span className="text-xl font-bold text-[#d7dadc] tracking-tight">
            SubredditCleaner
          </span>
        </div>
      </nav>

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ maxWidth: "680px", width: "90%", margin: "0 auto" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#343536] bg-[#1a1a1b] text-sm text-[#818384] mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--color-reddit-green)]" />
            Local Edge Extension
          </div>

          <h1
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
            className="font-extrabold leading-tight tracking-tight"
          >
            <span className="text-[#d7dadc]">Clean Up Your</span>
            <br />
            <span className="text-[var(--color-reddit-orange)]">
              Reddit Subscriptions
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-[#818384] leading-relaxed">
            Instantly scan your subscribed subreddits, identify NSFW content,
            and batch-unsubscribe from what you no longer want. No API keys
            required.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 justify-center">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="btn-orange text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {isScanning ? (
                <>
                  <FaSpinner className="animate-spin" /> Verifying Login...
                </>
              ) : (
                <>
                  <FaReddit className="text-xl" /> Scan My Subreddits
                </>
              )}
            </button>
            <p className="text-xs text-[#818384]">
              Must be logged into Reddit in this browser
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 inline-flex items-center gap-2 bg-[#ea0027]/10 border border-[#ea0027]/20 text-[#ea0027] px-5 py-3 rounded-md text-sm max-w-md mx-auto text-left"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </motion.div>
      </main>

      <section className="px-6 md:px-12 pb-20 pt-8 border-t border-[#343536] w-full">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            width: "100%",
            gap: "1.5rem",
          }}
          className="max-w-5xl mx-auto mt-8"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
              className="flat-card p-6 flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#1a1a1b] border border-[#343536] flex items-center justify-center text-[var(--color-reddit-orange)] mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-[#d7dadc] mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-[#818384] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
