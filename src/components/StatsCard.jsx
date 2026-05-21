import { motion } from "framer-motion";

const colorMap = {
  indigo: {
    bg: "from-indigo-500/15 to-indigo-600/5",
    text: "text-indigo-400",
    ring: "ring-indigo-500/20",
  },
  emerald: {
    bg: "from-emerald-500/15 to-emerald-600/5",
    text: "text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  rose: {
    bg: "from-rose-500/15 to-rose-600/5",
    text: "text-rose-400",
    ring: "ring-rose-500/20",
  },
  violet: {
    bg: "from-violet-500/15 to-violet-600/5",
    text: "text-violet-400",
    ring: "ring-violet-500/20",
  },
};

export default function StatsCard({
  icon,
  label,
  value,
  total,
  color = "indigo",
}) {
  const c = colorMap[color];

  return (
    <motion.div whileHover={{ scale: 1.02 }} className="glass-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center ${c.text} ring-1 ${c.ring}`}
        >
          {icon}
        </div>
        <span className="text-sm text-slate-400 font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">
          {value.toLocaleString()}
        </span>
        {total !== undefined && (
          <span className="text-sm text-slate-500">/ {total}</span>
        )}
      </div>
    </motion.div>
  );
}
