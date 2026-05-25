import { motion } from "framer-motion";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaRedditAlien,
} from "react-icons/fa";

export default function ResultsPanel({ results, onBack }) {
  const { total, succeeded, failed, results: items } = results;
  const allSuccess = failed === 0;

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-8 max-w-xl w-full"
      >
        {/* Header Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            allSuccess ? "bg-emerald-500/10" : "bg-amber-500/10"
          }`}
        >
          {allSuccess ? (
            <FaCheckCircle className="text-4xl text-emerald-400" />
          ) : (
            <FaTimesCircle className="text-4xl text-amber-400" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {allSuccess ? "All Done!" : "Partially Completed"}
        </h2>
        <p className="text-center text-slate-400 mb-8">
          {allSuccess
            ? `Successfully unsubscribed from ${total} NSFW subreddit${total !== 1 ? "s" : ""}.`
            : `${succeeded} of ${total} unsubscriptions succeeded. ${failed} failed.`}
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-xs text-slate-500 mt-1">Total</div>
          </div>
          <div className="bg-emerald-500/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {succeeded}
            </div>
            <div className="text-xs text-emerald-400/60 mt-1">Succeeded</div>
          </div>
          <div className="bg-rose-500/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-rose-400">{failed}</div>
            <div className="text-xs text-rose-400/60 mt-1">Failed</div>
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white/[0.03] rounded-xl p-4 max-h-64 overflow-y-auto mb-6">
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-3">
            Detailed Results
          </p>
          <div className="space-y-2">
            {items.map((item) => {
              const isUser = item.name.startsWith("u_") || item.name.startsWith("u/");
              const displayName = isUser ? `u/${item.name.replace(/^u[_/]/, "")}` : `r/${item.name}`;
              return (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  {item.success ? (
                    <FaCheckCircle className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <FaTimesCircle className="text-rose-400 flex-shrink-0" />
                  )}
                  <span className="text-slate-300 truncate">{displayName}</span>
                  {item.error && (
                    <span className="text-xs text-rose-400/60 truncate ml-auto">
                      {item.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="btn-primary flex-1"
            id="back-home-btn"
          >
            <FaArrowLeft /> Back to Home
          </button>
          <a
            href="https://www.reddit.com/subreddits/"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost flex-1 justify-center"
          >
            <FaRedditAlien /> View on Reddit
          </a>
        </div>
      </motion.div>
    </div>
  );
}
