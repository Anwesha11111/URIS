const prisma = require('../utils/prisma');

async function getScoreHistory(req, res, next) {
  try {
    const { internId } = req.params;

    // Interns can only view their own history
    if (req.user.role !== 'ADMIN' && req.user.id !== internId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const history = await prisma.scoreHistory.findMany({
      where:   { internId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

module.exports = { getScoreHistory };
