const dateFormatter = (timezone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

function zonedParts(date: Date, timezone: string) {
  const parts = dateFormatter(timezone).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function validateTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new Error(`Invalid IANA timezone: ${timezone}`);
  }
}

export function getLocalDate(date: Date, timezone: string): string {
  const p = zonedParts(date, timezone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function localDateTimeToUtc(
  date: string,
  time: string,
  timezone: string,
): Date {
  validateTimezone(timezone);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Invalid local date or time');
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const target = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    throw new Error('Invalid calendar date');
  }

  let candidate = target;

  for (let i = 0; i < 4; i++) {
    const p = zonedParts(new Date(candidate), timezone);
    const represented = Date.UTC(
      p.year, p.month - 1, p.day, p.hour, p.minute, p.second,
    );
    const difference = target - represented;

    if (difference === 0) break;
    candidate += difference;
  }

  const result = new Date(candidate);
  const actual = zonedParts(result, timezone);

  if (
    actual.year !== year ||
    actual.month !== month ||
    actual.day !== day ||
    actual.hour !== hour ||
    actual.minute !== minute
  ) {
    throw new Error(`Local time ${date} ${time} does not exist in ${timezone}`);
  }

  return result;
}

export function getLocalTime(date: Date, timezone: string): string {
  const p = zonedParts(date, timezone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function nextCalendarDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));

  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-');
}
