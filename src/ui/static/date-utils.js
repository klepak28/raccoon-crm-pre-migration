const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dayFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const longDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function parseDayKey(dayKey) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function formatDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localToday() {
  return formatDayKey(new Date());
}

export function addDays(dayKey, amount) {
  const date = parseDayKey(dayKey);
  date.setDate(date.getDate() + amount);
  return formatDayKey(date);
}

export function startOfWeek(dayKey) {
  const date = parseDayKey(dayKey);
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + delta);
  return formatDayKey(date);
}

export function endOfWeek(dayKey) {
  return addDays(startOfWeek(dayKey), 6);
}

export function startOfMonth(dayKey) {
  const date = parseDayKey(dayKey);
  return formatDayKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(dayKey) {
  const date = parseDayKey(dayKey);
  return formatDayKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function monthGridStart(dayKey) {
  return startOfWeek(startOfMonth(dayKey));
}

export function monthGridEnd(dayKey) {
  return endOfWeek(endOfMonth(dayKey));
}

export function formatRangeLabel(view, anchorDay) {
  if (view === 'day') {
    return longDayFormatter.format(parseDayKey(anchorDay));
  }
  if (view === 'week') {
    const start = parseDayKey(startOfWeek(anchorDay));
    const end = parseDayKey(endOfWeek(anchorDay));
    return `${dayFormatter.format(start)} to ${dayFormatter.format(end)}`;
  }
  const start = parseDayKey(startOfMonth(anchorDay));
  return start.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

export function viewRange(view, anchorDay) {
  if (view === 'day') {
    return { startDate: anchorDay, endDate: anchorDay };
  }
  if (view === 'week') {
    return { startDate: startOfWeek(anchorDay), endDate: endOfWeek(anchorDay) };
  }
  return { startDate: monthGridStart(anchorDay), endDate: monthGridEnd(anchorDay) };
}

export function stepAnchorDay(view, anchorDay, direction) {
  if (view === 'day') return addDays(anchorDay, direction);
  if (view === 'week') return addDays(anchorDay, direction * 7);
  const date = parseDayKey(anchorDay);
  return formatDayKey(new Date(date.getFullYear(), date.getMonth() + direction, date.getDate()));
}

export function listDays(startDay, endDay) {
  const result = [];
  let current = startDay;
  while (current <= endDay) {
    result.push(current);
    current = addDays(current, 1);
  }
  return result;
}

export function jobDayKeys(job, rangeStart, rangeEnd) {
  const start = stripTime(new Date(job.scheduledStartAt));
  const end = stripTime(new Date(job.scheduledEndAt));
  const keys = [];
  let cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const key = formatDayKey(cursor);
    if (key >= rangeStart && key <= rangeEnd) {
      keys.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function weekdayLabel(dayKey) {
  return weekdayFormatter.format(parseDayKey(dayKey));
}

export function shortDayLabel(dayKey) {
  return dayFormatter.format(parseDayKey(dayKey));
}

export function formatTime(iso) {
  return timeFormatter.format(new Date(iso));
}

export function formatDateTime(iso) {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatDateRange(startAt, endAt) {
  return `${formatDateTime(startAt)} to ${formatDateTime(endAt)}`;
}

export function toDateTimeLocal(iso) {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toIso(localDateTime) {
  return new Date(localDateTime).toISOString();
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}
