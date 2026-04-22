export const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}d`;

/**
 * Format a Date object to "YYYY-MM-DD" using LOCAL time (not UTC).
 * Using toISOString() causes timezone offset issues — e.g. UTC+7 midnight
 * becomes the previous day in UTC, sending wrong date to the API.
 */
export const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
