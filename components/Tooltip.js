import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";

export default function Tooltip({ text }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <span
      className="relative inline-flex items-center align-middle"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        aria-label="More info"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        className="group inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.65)] transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:scale-[0.97]"
        onFocus={show}
        onBlur={hide}
        onClick={toggle}
      >
        <Info
          strokeWidth={2.2}
          className="h-[14px] w-[14px] transition-colors group-hover:text-blue-700"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={tooltipId}
            key="tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-1/2 top-full z-20 mt-3 w-72 max-w-[19rem] -translate-x-1/2 rounded-xl border border-slate-200/80 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.72)] ring-1 ring-white/80 backdrop-blur"
          >
            <span
              aria-hidden="true"
              className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-sm border border-slate-200/80 border-b-0 border-r-0 bg-white/95 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.7)] ring-1 ring-white/80"
            />
            <div className="relative z-10 leading-relaxed text-slate-700">
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
