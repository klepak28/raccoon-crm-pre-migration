export function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isIsoDateTime(value) {
  return !Number.isNaN(Date.parse(value));
}

export function intersectsDay(startAt, endAt, day) {
  const [year, month, date] = day.split('-').map(Number);
  const dayStart = new Date(year, month - 1, date, 0, 0, 0, 0).getTime();
  const dayEnd = new Date(year, month - 1, date, 23, 59, 59, 999).getTime();
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  return start <= dayEnd && end >= dayStart;
}

export function compareDateTimes(left, right) {
  return new Date(left).getTime() - new Date(right).getTime();
}
