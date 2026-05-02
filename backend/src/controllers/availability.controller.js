const prisma = require('../utils/prisma');
const { findAvailability } = require('../services/availability.service');
const { processInternCapacity } = require('../services/processInternCapacity');
const { computeCredibilityScore } = require('../services/credibilityService');
const { uploadToNextcloud } = require('../services/storage.service');
const { saveScoreHistory } = require('../services/scoreHistory.service');
const { validateAvailabilitySubmission } = require('../services/businessRules');
const { ok, validationError, businessError, notFound, forbidden, authError } = require('../utils/respond');

const VALID_WEEK_STATUSES = ['normal', 'busy', 'exam', 'free'];

const WEEK_STATUS_SYNONYMS = {
  generally_free: 'free',
  light_week: 'free',
  heavy_week: 'busy',
  exam_week: 'exam',
  regular: 'normal',
};

function normalizeWeekStatus(value) {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  return WEEK_STATUS_SYNONYMS[lower] ?? (VALID_WEEK_STATUSES.includes(lower) ? lower : null);
}

async function submitAvailability(req, res, next) {
  try {
    const { busyBlocks, maxFreeBlockHours, weekStatusToggle, weekStart, weekEnd, isExamWeek } = req.body;

    if (!req.user || !req.user.id) {
      return authError(res, 'Unauthorized - user missing');
    }

    const biz = validateAvailabilitySubmission({ maxFreeBlockHours, weekStart, weekEnd, busyBlocks });
    if (!biz.ok) {
      return businessError(res, biz.status, biz.message);
    }

    const normalizedStatus = normalizeWeekStatus(weekStatusToggle);
    if (!normalizedStatus) {
      return validationError(res, `weekStatusToggle must be one of: ${VALID_WEEK_STATUSES.join(', ')} (or a recognized synonym)`);
    }

    // isExamWeek is an explicit boolean flag from the client (design §12.2).
    // When true it overrides the weekStatusToggle to 'exam' so the full −30
    // exam penalty is always applied regardless of what toggle value was sent.
    // This is the server-side derivation path — the client does not need to
    // know the internal 'exam' toggle value; they just set isExamWeek: true.
    const resolvedWeekStatus = isExamWeek ? 'exam' : normalizedStatus;

    const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
    if (!intern) {
      return notFound(res, 'Intern not found');
    }
    const internId = intern.id;

    // Fetch live credibility score — scoreOut100 is the 0–100 integer the capacity
    // engine expects. Fall back to neutral 50 if the service fails so availability
    // submission is never blocked by a credibility computation error.
    let credibilityScore = 50; // neutral default
    try {
      const credResult = await computeCredibilityScore(internId);
      credibilityScore = credResult.scoreOut100; // 0–100 integer
    } catch (credErr) {
      console.warn('[availability] Credibility fetch failed — using neutral default 50:', credErr.message);
    }

    const { availability, TLI, capacityScore, capacityLabel } = await processInternCapacity({
      busyBlocks,
      maxFreeBlockHours,
      weekStatusToggle: resolvedWeekStatus,
      tasks: [],
      internId,
      credibilityScore,
    });

    try {
      await uploadToNextcloud(`availability_${Date.now()}.json`, {
        availability,
        TLI,
        capacityScore,
        timestamp: new Date(),
      });
      console.log('Nextcloud sync success: availability');
    } catch (uploadErr) {
      console.error('Nextcloud sync failed:', uploadErr.message);
    }

    await saveScoreHistory(internId, capacityScore, 'capacity');

    return ok(res, { availability, TLI, capacityScore, capacityLabel }, 'Availability processed');
  } catch (err) {
    next(err);
  }
}

async function getAvailability(req, res, next) {
  try {
    const { internId, weekStart } = req.params;
    
    // Authorization check: Interns can only access their own data
    if (req.user.role === 'INTERN') {
      const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });

      if (!intern) {
        return notFound(res, 'Intern record not found');
      }

      if (intern.id !== parseInt(internId, 10)) {
        return forbidden(res, 'Access denied. You can only view your own availability.');
      }
    }

    const result = await findAvailability(internId, weekStart);
    if (!result) {
      return ok(res, { internId, weekStart, availability: 'UNKNOWN', maxFreeBlockHours: null, busyBlocks: [] }, 'No availability record found for this week.');
    }
    return ok(res, result, 'Availability retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = { submitAvailability, getAvailability };
