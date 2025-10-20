import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Tooltip({ text }) {
  const [visible, setVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState(null);

  // Auto-hide after 1.5s on tap (mobile)
  useEffect(() => {
    if (visible && hideTimer) {
      clearTimeout(hideTimer);
    }
    if (visible) {
      const timer = setTimeout(() => setVisible(false), 1500);
      setHideTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <span className="relative inline-block select-none">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={() => setVisible(true)} // tap handler
        className="ml-1 text-blue-500 hover:text-blue-700 cursor-help"
      >
        ⓘ
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-10 w-56 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg -top-2 left-6 pointer-events-none"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}