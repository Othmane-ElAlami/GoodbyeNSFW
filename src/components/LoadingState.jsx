import { motion } from "framer-motion";
import { FaSpinner } from "react-icons/fa";

export default function LoadingState() {
  return (
    <div className="min-h-screen bg-[var(--color-reddit-dark)] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center"
      >
        <FaSpinner className="text-5xl text-[#ff4500] animate-spin mb-4" />
        <h2 className="text-xl font-bold text-[#d7dadc]">
          Fetching your subreddits…
        </h2>
      </motion.div>
    </div>
  );
}
