const argentinaDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
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

export function getArgentinaBusinessDate(now = new Date()) {
  return getArgentinaDateTime(now).date;
}
