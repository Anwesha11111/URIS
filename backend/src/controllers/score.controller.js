const prisma = require('../utils/prisma');
const { ok, notFound, forbidden } = require('../utils/respond');

async function getScoreHistory(req, res, next) {
  try {
    const { internId } = req.params;

    if (req.user.role !== 'ADMIN') {
      const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
      if (!intern) {
        return notFound(res, 'Intern not found');
      }
      if (intern.id !== internId) {
        return forbidden(res, 'Access denied');
      }
    }

    const history = await prisma.scoreHistory.findMany({
      where:   { internId },
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, history);
  } catch (err) {
    next(err);
  }
}

module.exports = { getScoreHistory };
