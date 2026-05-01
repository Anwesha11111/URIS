const prisma = require('../utils/prisma');
const { findAvailability } = require('../services/availability.service');
const { processInternCapacity } = require('../services/processInternCapacity');
const { uploadToNextcloud } = require('../services/storage.service');
const { saveScoreHistory } = require('../services/scoreHistory.service');

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
    const { busyBlocks, maxFreeBlockHours, weekStatusToggle } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized - user missing', data: null });
    }

    if (!busyBlocks || !Array.isArray(busyBlocks)) {
      return res.status(400).json({ success: false, message: 'busyBlocks must be an array', data: null });
    }
    if (typeof maxFreeBlockHours !== 'number' || maxFreeBlockHours < 1 || maxFreeBlockHours > 6) {
      return res.status(400).json({ success: false, message: 'maxFreeBlockHours must be a number between 1 and 6', data: null });
    }

    const normalizedStatus = normalizeWeekStatus(weekStatusToggle);
    if (!normalizedStatus) {
      return res.status(400).json({ success: false, message: `weekStatusToggle must be one of: ${VALID_WEEK_STATUSES.join(', ')} (or a recognized synonym)`, data: null });
    }

    const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
    if (!intern) {
      return res.status(404).json({ success: false, message: 'Intern not found' });
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

    return res.status(200).json({
      success: true,
      message: 'Availability processed',
      data: { availability, TLI, capacityScore, capacityLabel },
    });
  } catch (err) {
    next(err);
  }
}

async function getAvailability(req, res, next) {
  try {
    const { internId, weekStart } = req.params;
    
    // Authorization check: Interns can only access their own data
    if (req.user.role === 'INTERN') {
      const intern = await prisma.intern.findUnique({ 
        where: { userId: req.user.id } 
      });
      
      if (!intern) {
        return res.status(404).json({
          success: false,
          message: 'Intern record not found',
          data: null,
        });
      }
      
      // Verify the intern is requesting their own data
      if (intern.id !== parseInt(internId, 10)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own availability.',
          data: null,
        });
      }
    }
    // Admins can access any intern's availability (no additional check needed)
    
    const result = await findAvailability(internId, weekStart);
    if (!result) {
      return res.status(200).json({
        success: true,
        message: 'No availability record found for this week.',
        data: {
          internId,
          weekStart,
          availability: 'UNKNOWN',
          maxFreeBlockHours: null,
          busyBlocks: [],
        },
      });
    }
    return res.status(200).json({ success: true, message: 'Availability retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitAvailability, getAvailability };
