const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM    = /^\d{2}:\d{2}$/;

// RFC-5322 simplified — catches the vast majority of invalid emails without
// being so strict it rejects valid ones.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN_LENGTH = 6;

/**
 * Validates auth input fields (register + login).
 *
 * @param {{ email?: unknown, password?: unknown }} fields
 * @returns {string[]} Array of human-readable error messages (empty = valid)
 */
function validateAuth({ email, password } = {}) {
  const errors = [];

  // ── Email ──────────────────────────────────────────────────────────────────
  if (!email || typeof email !== 'string' || email.trim() === '') {
    errors.push('Email is required.');
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.push('Email must be a valid email address.');
  }

  // ── Password ───────────────────────────────────────────────────────────────
  if (!password || typeof password !== 'string' || password.trim() === '') {
    errors.push('Password is required.');
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  return errors;
}

function validateAvailability(data) {
  const errors = [];
  const { internId, weekStart, weekEnd, busyBlocks, maxFreeBlockHours } = data || {};

  // Required fields
  if (!internId)              errors.push('internId is required');
  if (!weekStart)             errors.push('weekStart is required');
  if (!weekEnd)               errors.push('weekEnd is required');
  if (busyBlocks == null)     errors.push('busyBlocks is required');
  if (maxFreeBlockHours == null) errors.push('maxFreeBlockHours is required');

  // Date format
  if (weekStart && !ISO_DATE.test(weekStart)) errors.push('weekStart must be a valid date (YYYY-MM-DD)');
  if (weekEnd   && !ISO_DATE.test(weekEnd))   errors.push('weekEnd must be a valid date (YYYY-MM-DD)');

  // Date range — exactly 7 days
  if (weekStart && weekEnd && ISO_DATE.test(weekStart) && ISO_DATE.test(weekEnd)) {
    const diff = (new Date(weekEnd) - new Date(weekStart)) / (1000 * 60 * 60 * 24);
    if (diff !== 7) errors.push('weekEnd must be exactly 7 days after weekStart');
  }

  // maxFreeBlockHours
  if (maxFreeBlockHours != null && (maxFreeBlockHours < 1 || maxFreeBlockHours > 3))
    errors.push('maxFreeBlockHours must be between 1 and 3');

  // busyBlocks structure
  if (busyBlocks != null) {
    if (!Array.isArray(busyBlocks)) {
      errors.push('busyBlocks must be an array');
    } else {
      const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

      busyBlocks.forEach((block, i) => {
        const prefix = `busyBlocks[${i}]`;

        if (!block.day)   errors.push(`${prefix}.day is required`);
        else if (!DAYS.includes(block.day)) errors.push(`${prefix}.day must be one of ${DAYS.join(', ')}`);

        if (!block.start) errors.push(`${prefix}.start is required`);
        else if (!HH_MM.test(block.start)) errors.push(`${prefix}.start must be in HH:MM format`);

        if (!block.end)   errors.push(`${prefix}.end is required`);
        else if (!HH_MM.test(block.end)) errors.push(`${prefix}.end must be in HH:MM format`);

        if (block.start && block.end && HH_MM.test(block.start) && HH_MM.test(block.end)) {
          if (block.start >= block.end)
            errors.push(`${prefix}: start must be before end`);
        }
      });

      // Overlap check per day
      const byDay = {};
      busyBlocks.forEach(b => {
        if (b.day) (byDay[b.day] = byDay[b.day] || []).push(b);
      });
      for (const [day, blocks] of Object.entries(byDay)) {
        const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].start < sorted[i - 1].end)
            errors.push(`busyBlocks on ${day} have overlapping time ranges`);
        }
      }
    }
  }

  return errors;
}

module.exports = { validateAvailability, validateAuth };
