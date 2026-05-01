const prisma = require('../utils/prisma');
const { findAvailability } = require('../services/availability.service');
const { processInternCapacity } = require('../services/processInternCapacity');
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
    const { busyBlocks, maxFreeBlockHours, weekStatusToggle, weekStart, weekEnd } = req.body;

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

    const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
    if (!intern) {
      return notFound(res, 'Intern not found');
    }
    const internId = intern.id;

    const { availability, TLI, capacityScore, capacityLabel } = await processInternCapacity({
      busyBlocks,
      maxFreeBlockHours,
      weekStatusToggle: normalizedStatus,
      tasks: [],
      examFlag: false,
      internId,
      credibilityScore: 75,
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
