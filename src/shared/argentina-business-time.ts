export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

const argentinaDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ARGENTINA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type ArgentinaDateTime = {
  date: string;
  minuteOfDay: number;
};

export function getArgentinaDateTime(now: Date): ArgentinaDateTime {
  const parts = argentinaDateTimeFormatter.formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minuteOfDay: hour * 60 + minute,
  };
}

export function getArgentinaBusinessDate(now: Date) {
  return getArgentinaDateTime(now).date;
}

export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
