export function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isIsoDateTime(value) {
  return !Number.isNaN(Date.parse(value));
}

export function intersectsDay(startAt, endAt, day) {
  const dayStart = new Date(`${day}T00:00:00.000Z`).getTime();
  const dayEnd = new Date(`${day}T23:59:59.999Z`).getTime();
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  return start <= dayEnd && end >= dayStart;
}

export function compareDateTimes(left, right) {
  return new Date(left).getTime() - new Date(right).getTime();
}
