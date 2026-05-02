const prisma = require('../utils/prisma');
const { validateReviewSubmission } = require('../services/businessRules');
const { created, businessError } = require('../utils/respond');

async function submitReview(req, res, next) {
  try {
    const { taskId, internId, qualityScore, timelinessScore, independenceScore, reviewNotes } = req.body;

    // Business-level rules: integer scores, task exists, task completed, intern matches, no duplicate
    const biz = await validateReviewSubmission({ taskId, internId, qualityScore, timelinessScore, independenceScore });
    if (!biz.ok) {
      return businessError(res, biz.status, biz.message);
    }

    // Design §9.2 — PPS = (Quality×0.40) + (Timeliness×0.35) + (Independence×0.25)
    const perTaskPps = parseFloat(
      (qualityScore * 0.40 + timelinessScore * 0.35 + independenceScore * 0.25).toFixed(2)
    );

    const review = await prisma.review.create({
      data: {
        internId,
        quality:    qualityScore,
        timeliness: timelinessScore,
        initiative: independenceScore,   // DB column kept as 'initiative' for backward compat
        complexity: 1,                   // task complexity is set at task creation, not review time
        // taskId and reviewNotes omitted until Prisma client is regenerated
        // TODO: after running `npx prisma generate`, restore:
        // taskId,
        // ...(reviewNotes ? { reviewNotes } : {}),
      },
    });

    return created(res, { ...review, perTaskPps }, 'Review submitted');
  } catch (err) {
    next(err);
  }
}

module.exports = { submitReview };
