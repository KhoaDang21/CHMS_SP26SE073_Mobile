import type { SeasonalPricing } from "@/types";

const parseDateOnly = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value.slice(0, 10));
  if (!match) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isWithinRange = (date: Date, start: Date, end: Date) => {
  return date >= start && date <= end;
};

const sortByStartDate = (items: SeasonalPricing[]) => {
  return [...items].sort((left, right) => {
    const leftStart = parseDateOnly(left.startDate)?.getTime() ?? 0;
    const rightStart = parseDateOnly(right.startDate)?.getTime() ?? 0;
    return leftStart - rightStart;
  });
};

/**
 * Lấy seasonal pricing đang active cho ngày hiện tại (hoặc ngày chỉ định)
 * Đồng bộ 100% với FE web
 */
export const getActiveSeasonalPricing = (
  seasonalPricings?: SeasonalPricing[] | null,
  date: string | Date = new Date(),
): SeasonalPricing | null => {
  if (!seasonalPricings?.length) return null;

  const targetDate = typeof date === "string" ? parseDateOnly(date) : new Date(date);
  if (!targetDate || Number.isNaN(targetDate.getTime())) return null;
  targetDate.setHours(0, 0, 0, 0);

  for (const pricing of sortByStartDate(seasonalPricings)) {
    const startDate = parseDateOnly(pricing.startDate);
    const endDate = parseDateOnly(pricing.endDate);
    if (!startDate || !endDate) continue;

    if (isWithinRange(targetDate, startDate, endDate)) {
      return pricing;
    }
  }

  return null;
};
