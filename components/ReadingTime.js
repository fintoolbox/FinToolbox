// components/ReadingTime.js
export default function ReadingTime({ minutes, words }) {
  if (!minutes) return null;
  const label = minutes === 1 ? "min read" : "mins read";
  return (
    <div className="inline-flex items-center gap-2 text-sm text-gray-600">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span>{minutes} {label}</span>
      {typeof words === "number" && (
        <span className="text-gray-400">• {words.toLocaleString()} words</span>
      )}
    </div>
  );
}
