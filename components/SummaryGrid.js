// components/SummaryGrid.js
export default function SummaryGrid({ children, className = "" }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${className}`}>
      {children}
    </div>
  );
}
