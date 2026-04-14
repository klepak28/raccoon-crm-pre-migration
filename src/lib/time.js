export function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isIsoDateTime(value) {
  return !Number.isNaN(Date.parse(value));
}

// V1 day interpretation: use local midnight boundaries so that schedule input,
// day filtering, and display all agree on the same local day.
// The UI converts datetime-local values to UTC via new Date(...).toISOString(),
// and the day picker sends a local YYYY-MM-DD string.  By computing dayStart/dayEnd
// from local-time Date constructors we correctly identify the local day regardless
// of the browser's UTC offset, and near-midnight jobs never shift to the wrong day.
export function intersectsDay(startAt, endAt, day) {
  const [year, month, date] = day.split('-').map(Number);
  const dayStart = new Date(year, month - 1, date, 0, 0, 0, 0).getTime();
  const dayEnd = new Date(year, month - 1, date, 23, 59, 59, 999).getTime();
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  return start <= dayEnd && end >= dayStart;
}

export function intersectsDateRange(startAt, endAt, startDay, endDay) {
  const [startYear, startMonth, startDate] = startDay.split('-').map(Number);
  const [endYear, endMonth, endDate] = endDay.split('-').map(Number);
  const rangeStart = new Date(startYear, startMonth - 1, startDate, 0, 0, 0, 0).getTime();
  const rangeEnd = new Date(endYear, endMonth - 1, endDate, 23, 59, 59, 999).getTime();
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  return start <= rangeEnd && end >= rangeStart;
}

export function compareDateTimes(left, right) {
  return new Date(left).getTime() - new Date(right).getTime();
}
