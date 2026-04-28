const prisma = require('../utils/prisma');

async function getScoreHistory(req, res, next) {
  try {
    const { internId } = req.params;

    // Interns can only view their own history — resolve their intern ID from userId
    if (req.user.role !== 'ADMIN') {
      const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
      if (!intern) {
        return res.status(404).json({ success: false, message: 'Intern not found' });
      }
      if (intern.id !== internId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
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
