import { useMemo } from "react";

// Format a numeric string with thousand separators while preserving decimals.
const formatValue = (raw) => {
  if (raw === null || typeof raw === "undefined") return "";
  const str = String(raw);
  if (str.trim() === "") return "";

  const parts = str.split(".");
  const intPart = parts[0] || "0";
  const decimalPart = parts.slice(1).join("");

  const formattedInt = Number(intPart || "0").toLocaleString("en-AU");
  return decimalPart ? `${formattedInt}.${decimalPart}` : formattedInt;
};

// Remove everything except digits and a single decimal point.
const sanitise = (input) => {
  const cleaned = input.replace(/[^\d.]/g, "");
  const [first, ...rest] = cleaned.split(".");
  return rest.length ? `${first}.${rest.join("")}` : first;
};

/**
 * Currency-like input that shows thousand separators while emitting a raw numeric string.
 *
 * Props:
 * - value: string | number
 * - onChange: (rawString) => void  // raw string without separators
 * - className: optional tailwind classes to merge with defaults
 * - ...rest: any other input props
 */
export default function CurrencyInput({ value, onChange, className = "", ...rest }) {
  const displayValue = useMemo(() => formatValue(value), [value]);

  const handleChange = (e) => {
    const raw = sanitise(e.target.value);
    onChange?.(raw);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.]?[0-9]*"
      value={displayValue}
      onChange={handleChange}
      className={`border rounded px-2 py-1 ${className}`}
      {...rest}
    />
  );
}
