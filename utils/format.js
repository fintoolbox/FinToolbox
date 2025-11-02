// utils/format.js
export const aud0 = (n) =>
  (isFinite(n) ? n : 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export const aud2 = (n) =>
  (isFinite(n) ? n : 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const number0 = (n) =>
  (isFinite(n) ? n : 0).toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export const percent1 = (n) =>
  `${(isFinite(n) ? n : 0).toFixed(1)}%`;
