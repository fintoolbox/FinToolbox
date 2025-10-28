import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Tooltip({ text }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-block select-none"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="ml-1 text-blue-500 hover:text-blue-700 cursor-help">
        ⓘ
      </span>

      <AnimatePresence>
        {visible && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-10 w-56 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg -top-2 left-6"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
