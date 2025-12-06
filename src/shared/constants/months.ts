export const MONTH_PAGES = [
  '01-January',
  '02-February',
  '03-March',
  '04-April',
  '05-May',
  '06-June',
  '07-July',
  '08-August',
  '09-September',
  '10-October',
  '11-November',
  '12-December',
] as const;

export type MonthPage = (typeof MONTH_PAGES)[number];

export function getMonthPageForDate(date: Date): MonthPage {
  const monthIndex = date.getMonth();
  return MONTH_PAGES[monthIndex];
}

export function getMonthIndexFromPage(page: MonthPage): number {
  return MONTH_PAGES.indexOf(page);
}
