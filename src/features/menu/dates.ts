/** Pomocné funkce pro kalendář jídelníčku (lokální datum, bez UTC posunu). */

const WEEKDAYS = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'] as const;

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Pondělí týdne, ve kterém datum leží (týden po–ne). */
export function startOfWeekMonday(iso: string = todayIsoDate()): string {
  const date = parseIsoDate(iso);
  const weekday = date.getDay(); // 0 = ne … 6 = so
  const delta = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
}

/** dayIndex: 1 = startDate. */
export function dateForCycleDay(startDate: string, dayIndex: number): Date {
  const date = parseIsoDate(startDate);
  date.setDate(date.getDate() + (dayIndex - 1));
  return date;
}

export function shiftIsoDate(iso: string, deltaDays: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + deltaDays);
  return toIsoDate(date);
}

export function formatDayHeader(
  startDate: string,
  dayIndex: number
): { weekday: string; date: string } {
  const date = dateForCycleDay(startDate, dayIndex);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return {
    weekday: WEEKDAYS[date.getDay()],
    date: `${dd}.${mm}`,
  };
}

export function isCycleDayToday(startDate: string, dayIndex: number): boolean {
  return toIsoDate(dateForCycleDay(startDate, dayIndex)) === todayIsoDate();
}

export function formatDateRange(startDate: string, cycleDays: number): string {
  const start = dateForCycleDay(startDate, 1);
  const end = dateForCycleDay(startDate, cycleDays);
  return `${formatShort(start)} – ${formatShort(end)}`;
}

export function formatSlotTitle(startDate: string, dayIndex: number, mealLabel: string): string {
  const { weekday, date } = formatDayHeader(startDate, dayIndex);
  return `${weekday} ${date} · ${mealLabel}`;
}

function formatShort(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
