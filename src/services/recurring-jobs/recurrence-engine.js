const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const ORDINAL_MAP = {
  first: 0,
  second: 1,
  third: 2,
  fourth: 3,
  fifth: 4,
  last: -1,
};

const MONTH_MAP = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

/**
 * Generate occurrence dates for a recurring series.
 *
 * @param {object} rule - The recurrence rule from RecurringSeries
 * @param {Date} anchorDate - The start date of the first occurrence (local date)
 * @param {number} maxCount - Maximum number of dates to generate
 * @param {Date} horizonDate - Do not generate dates past this point
 * @param {number} startIndex - Start generating from this occurrence index (0-based)
 * @returns {Date[]} Array of occurrence local dates
 */
export function generateOccurrenceDates(rule, anchorDate, maxCount, horizonDate, startIndex = 0) {
  const dates = [];
  // Normalize anchor to midnight local for date-only comparison
  const normalizedAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
  const {
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceEndMode,
    recurrenceOccurrenceCount,
    recurrenceEndDate,
  } = rule;

  const effectiveMaxOccurrences = recurrenceEndMode === 'after_n_occurrences'
    ? recurrenceOccurrenceCount
    : Infinity;

  const effectiveEndDate = recurrenceEndMode === 'on_date' && recurrenceEndDate
    ? new Date(recurrenceEndDate + 'T23:59:59')
    : null;

  let occurrenceCount = 0;
  let iterationLimit = 5000;

  const generator = getGenerator(recurrenceFrequency);

  for (const candidateDate of generator(rule, normalizedAnchor, recurrenceInterval)) {
    if (--iterationLimit <= 0) break;

    if (candidateDate > horizonDate) break;
    if (effectiveEndDate && candidateDate > effectiveEndDate) break;
    if (occurrenceCount >= effectiveMaxOccurrences) break;

    if (occurrenceCount >= startIndex) {
      dates.push(candidateDate);
    }

    occurrenceCount++;

    if (dates.length >= maxCount) break;
  }

  return dates;
}

function getGenerator(frequency) {
  switch (frequency) {
    case 'daily': return generateDaily;
    case 'weekly': return generateWeekly;
    case 'monthly': return generateMonthly;
    case 'yearly': return generateYearly;
    default: throw new Error(`Unsupported recurrence frequency: ${frequency}`);
  }
}

function* generateDaily(_rule, anchor, interval) {
  let current = new Date(anchor);
  while (true) {
    yield new Date(current);
    current.setDate(current.getDate() + interval);
  }
}

function* generateWeekly(rule, anchor, interval) {
  const targetDays = rule.recurrenceDayOfWeek && rule.recurrenceDayOfWeek.length > 0
    ? rule.recurrenceDayOfWeek.map((d) => DAY_NAMES.indexOf(d)).filter((i) => i >= 0).sort((a, b) => a - b)
    : [anchor.getDay()];

  let current = new Date(anchor);
  const anchorDayOfWeek = anchor.getDay();

  // Find the start of the anchor's week (Sunday)
  let weekStart = new Date(anchor);
  weekStart.setDate(weekStart.getDate() - anchorDayOfWeek);

  let isFirstWeek = true;

  while (true) {
    for (const dayIndex of targetDays) {
      const candidate = new Date(weekStart);
      candidate.setDate(candidate.getDate() + dayIndex);

      // Skip dates before the anchor
      if (candidate < anchor) continue;

      yield candidate;
    }

    weekStart.setDate(weekStart.getDate() + 7 * interval);
    isFirstWeek = false;
  }
}

function* generateMonthly(rule, anchor, interval) {
  const { recurrenceDayOfMonth, recurrenceOrdinal, recurrenceDayOfWeek } = rule;

  if (recurrenceOrdinal && recurrenceDayOfWeek && recurrenceDayOfWeek.length > 0) {
    // Ordinal weekday mode: e.g., "2nd Friday of every month"
    yield* generateMonthlyOrdinal(rule, anchor, interval);
  } else {
    // Day-of-month mode: e.g., "15th of every month"
    yield* generateMonthlyByDay(rule, anchor, interval);
  }
}

function* generateMonthlyByDay(rule, anchor, interval) {
  const targetDay = rule.recurrenceDayOfMonth || anchor.getDate();
  let year = anchor.getFullYear();
  let month = anchor.getMonth();

  while (true) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (targetDay <= daysInMonth) {
      const candidate = new Date(year, month, targetDay);
      if (candidate >= anchor) {
        yield candidate;
      }
    }
    // If targetDay > daysInMonth, skip this month (per business rule)

    month += interval;
    if (month >= 12) {
      year += Math.floor(month / 12);
      month = month % 12;
    }
  }
}

function* generateMonthlyOrdinal(rule, anchor, interval) {
  const ordinal = ORDINAL_MAP[rule.recurrenceOrdinal];
  const targetDayName = rule.recurrenceDayOfWeek[0];
  const targetDayIndex = DAY_NAMES.indexOf(targetDayName);

  let year = anchor.getFullYear();
  let month = anchor.getMonth();

  while (true) {
    const candidate = findOrdinalWeekday(year, month, ordinal, targetDayIndex);

    if (candidate && candidate >= anchor) {
      yield candidate;
    }

    month += interval;
    if (month >= 12) {
      year += Math.floor(month / 12);
      month = month % 12;
    }
  }
}

function findOrdinalWeekday(year, month, ordinal, targetDayIndex) {
  if (ordinal === -1) {
    // "last" - find last occurrence of this weekday in the month
    const lastDay = new Date(year, month + 1, 0);
    let current = new Date(lastDay);
    while (current.getDay() !== targetDayIndex) {
      current.setDate(current.getDate() - 1);
    }
    return current;
  }

  // Find the first occurrence of the target weekday
  const firstOfMonth = new Date(year, month, 1);
  let firstOccurrence = new Date(firstOfMonth);
  while (firstOccurrence.getDay() !== targetDayIndex) {
    firstOccurrence.setDate(firstOccurrence.getDate() + 1);
  }

  // Jump to the Nth occurrence
  const candidate = new Date(firstOccurrence);
  candidate.setDate(candidate.getDate() + ordinal * 7);

  // Validate it's still in the same month
  if (candidate.getMonth() !== month) {
    return null; // Skip - 5th weekday doesn't exist
  }

  return candidate;
}

function* generateYearly(rule, anchor, interval) {
  const { recurrenceOrdinal, recurrenceDayOfWeek, recurrenceMonthOfYear } = rule;

  if (recurrenceOrdinal && recurrenceDayOfWeek && recurrenceDayOfWeek.length > 0 && recurrenceMonthOfYear) {
    // Ordinal weekday + month: e.g., "3rd Wednesday of May"
    yield* generateYearlyOrdinal(rule, anchor, interval);
  } else {
    // Specific date: e.g., "April 10 every year"
    yield* generateYearlyByDate(rule, anchor, interval);
  }
}

function* generateYearlyByDate(rule, anchor, interval) {
  const targetMonth = rule.recurrenceMonthOfYear
    ? MONTH_MAP[rule.recurrenceMonthOfYear]
    : anchor.getMonth();
  const targetDay = rule.recurrenceDayOfMonth || anchor.getDate();

  let year = anchor.getFullYear();

  while (true) {
    const daysInMonth = new Date(year, targetMonth + 1, 0).getDate();

    if (targetDay <= daysInMonth) {
      const candidate = new Date(year, targetMonth, targetDay);
      if (candidate >= anchor) {
        yield candidate;
      }
    }

    year += interval;
  }
}

function* generateYearlyOrdinal(rule, anchor, interval) {
  const ordinal = ORDINAL_MAP[rule.recurrenceOrdinal];
  const targetDayName = rule.recurrenceDayOfWeek[0];
  const targetDayIndex = DAY_NAMES.indexOf(targetDayName);
  const targetMonth = MONTH_MAP[rule.recurrenceMonthOfYear];

  let year = anchor.getFullYear();

  while (true) {
    const candidate = findOrdinalWeekday(year, targetMonth, ordinal, targetDayIndex);

    if (candidate && candidate >= anchor) {
      yield candidate;
    }

    year += interval;
  }
}

/**
 * Compute the materialization horizon date from now.
 */
export function computeHorizonDate(frequency) {
  const now = new Date();
  if (frequency === 'yearly') {
    return new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());
  }
  // daily, weekly, monthly: 1 year
  return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
}

/**
 * Format a rule into a human-readable summary.
 */
export function describeRecurrenceRule(rule) {
  const { recurrenceFrequency, recurrenceInterval } = rule;
  const interval = recurrenceInterval;

  switch (recurrenceFrequency) {
    case 'daily':
      return interval === 1 ? 'Daily' : `Every ${interval} days`;
    case 'weekly': {
      const days = (rule.recurrenceDayOfWeek || []).join(', ');
      const base = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      return days ? `${base} on ${days}` : base;
    }
    case 'monthly': {
      const base = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      if (rule.recurrenceOrdinal && rule.recurrenceDayOfWeek?.length) {
        return `${base} on the ${rule.recurrenceOrdinal} ${rule.recurrenceDayOfWeek[0]}`;
      }
      if (rule.recurrenceDayOfMonth) {
        return `${base} on day ${rule.recurrenceDayOfMonth}`;
      }
      return base;
    }
    case 'yearly': {
      const base = interval === 1 ? 'Yearly' : `Every ${interval} years`;
      return base;
    }
    default:
      return 'Custom';
  }
}
