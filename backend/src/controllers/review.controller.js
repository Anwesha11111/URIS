const prisma = require('../utils/prisma');

const inRange = (val, min, max) => typeof val === 'number' && val >= min && val <= max;

async function submitReview(req, res, next) {
  try {
    const { internId, quality, timeliness, initiative, complexity } = req.body;

    if (!internId) {
      return res.status(400).json({ success: false, message: 'internId is required', data: null });
    }
    if (!inRange(quality, 1, 5) || !inRange(timeliness, 1, 5) || !inRange(initiative, 1, 5)) {
      return res.status(400).json({ success: false, message: 'quality, timeliness, and initiative must be between 1 and 5', data: null });
    }
    if (!inRange(complexity, 1, 3)) {
      return res.status(400).json({ success: false, message: 'complexity must be between 1 and 3', data: null });
    }

    // Ensure intern exists before creating the review
    await prisma.intern.upsert({
      where:  { id: internId },
      update: {},
      create: { id: internId },
    });

    const review = await prisma.review.create({
      data: { internId, quality, timeliness, initiative, complexity },
    });

    return res.status(201).json({ success: true, message: 'Review submitted', data: review });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitReview };
