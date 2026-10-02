import type { PrayerRequest } from '@/features/prayers/types/prayer';

const LONG_STANDING_MONTHS = 3;

export function getLongStandingRequests(
  requests: readonly PrayerRequest[],
  now = new Date(),
) {
  const cutoff = addCalendarMonths(now, -LONG_STANDING_MONTHS).getTime();

  if (!Number.isFinite(cutoff)) return [];

  return requests
    .filter((request) => {
      const createdAt = Date.parse(request.createdAt);
      return request.status === 'active' && Number.isFinite(createdAt) && createdAt < cutoff;
    })
    .sort((left, right) => {
      const createdAtDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
      return createdAtDifference || left.id.localeCompare(right.id);
    });
}

export function formatPrayerAge(createdAt: string, now = new Date()) {
  const createdDate = new Date(createdAt);

  if (!Number.isFinite(createdDate.getTime()) || !Number.isFinite(now.getTime())) {
    return 'Age unavailable';
  }

  const months = getElapsedCalendarMonths(createdDate, now);

  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const yearLabel = `${years} ${years === 1 ? 'year' : 'years'}`;

  if (remainingMonths === 0) return yearLabel;

  return `${yearLabel} ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
}

function getElapsedCalendarMonths(start: Date, end: Date) {
  if (start.getTime() >= end.getTime()) return 0;

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();

  if (addCalendarMonths(start, months).getTime() > end.getTime()) months -= 1;

  return Math.max(0, months);
}

function addCalendarMonths(value: Date, months: number) {
  const result = new Date(value.getTime());
  const day = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));

  return result;
}
