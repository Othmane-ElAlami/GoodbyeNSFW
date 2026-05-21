import { motion } from "framer-motion";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

export default function ConfirmModal({
  count,
  subreddits,
  toRemove,
  onConfirm,
  onCancel,
  onDownloadBackup
}) {
  const items = subreddits || toRemove || [];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="flat-card p-6 max-w-md w-full mx-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#818384] hover:text-[#d7dadc] transition-colors"
          id="close-confirm-modal"
        >
          <FaTimes />
        </button>

        <h2 className="text-xl font-bold text-[#d7dadc] mb-2 flex items-center gap-2">
          <FaExclamationTriangle className="text-[#ea0027]" /> Confirm
          Unsubscribe
        </h2>
        <p className="text-[#818384] text-sm mb-6">
          You are about to unsubscribe from{" "}
          <span className="text-[#ea0027] font-semibold">{items.length}</span>{" "}
          NSFW subreddit{items.length !== 1 ? "s" : ""}. Download a backup first in case you change your mind.
        </p>

        <div className="bg-[#030303] rounded-md p-3 mb-6 max-h-48 overflow-y-auto border border-[#343536]">
          <p className="text-xs text-[#818384] uppercase font-semibold tracking-wider mb-2">
            Subreddits to remove
          </p>
          <div className="space-y-1.5">
            {items.map((sub) => (
              <div
                key={sub.name}
                className="flex items-center gap-2 text-sm text-[#d7dadc]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ea0027] flex-shrink-0" />
                <span className="truncate">r/{sub.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onDownloadBackup}
            className="btn-outlined w-full sm:w-auto whitespace-nowrap"
            id="download-backup-btn"
          >
            ⬇ Download Backup
          </button>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onCancel}
              className="btn-outlined w-full sm:w-auto"
              id="cancel-unsub-btn"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="btn-orange w-full sm:w-auto"
              id="confirm-unsub-btn"
            >
              Confirm & Unsubscribe
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
