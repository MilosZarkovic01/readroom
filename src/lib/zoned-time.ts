export type RecurringPeriod = "DAILY" | "WEEKLY";

export type PeriodWindow = { key: string; start: Date; end: Date };

type LocalDate = { year: number; month: number; day: number };

const formatters = new Map<string, Intl.DateTimeFormat>();

export function safeTimeZone(value: unknown): string {
  if (typeof value !== "string" || !value) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

function formatter(timeZone: string) {
  let existing = formatters.get(timeZone);
  if (!existing) {
    existing = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, existing);
  }
  return existing;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = formatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function startOfLocalDate({ year, month, day }: LocalDate, timeZone: string) {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - offsetMs(new Date(guess), timeZone);
  const second = guess - offsetMs(new Date(first), timeZone);
  return new Date(second);
}

function shiftDays({ year, month, day }: LocalDate, days: number): LocalDate {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function dateKey({ year, month, day }: LocalDate) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function periodWindow(date: Date, period: RecurringPeriod, timeZone: string): PeriodWindow {
  const { year, month, day } = zonedParts(date, timeZone);
  let start: LocalDate = { year, month, day };
  if (period === "WEEKLY") {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    start = shiftDays(start, -((weekday + 6) % 7));
  }
  const end = shiftDays(start, period === "WEEKLY" ? 7 : 1);
  return {
    key: dateKey(start),
    start: startOfLocalDate(start, timeZone),
    end: startOfLocalDate(end, timeZone),
  };
}

export function previousWindow(window: PeriodWindow, period: RecurringPeriod, timeZone: string) {
  return periodWindow(new Date(window.start.getTime() - 1), period, timeZone);
}
