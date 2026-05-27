'use strict';

const prisma = require('../utils/prisma');
const { ok, notFound, forbidden } = require('../utils/respond');
const { ROLES } = require('../constants/roles');

/**
 * GET /score/history/:internId
 * Returns score history for an intern.
 * Admins can view any intern; interns can only view their own.
 */
async function getScoreHistory(req, res, next) {
  try {
    const internId = req.params.internId;

    if (!internId) {
      return forbidden(res, 'Invalid internId');
    }

    const isAdmin = req.user.role === ROLES.CORE_ADMIN
      || req.user.role === ROLES.OPERATIONS_LEAD
      || req.user.role === ROLES.TECHNICAL_LEAD
      || req.user.role === ROLES.RESEARCH_LEAD
      || req.user.role === ROLES.OPERATIONS_PROGRAM_MANAGER;

    if (!isAdmin) {
      const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
      if (!intern) {
        return notFound(res, 'Intern not found');
      }
      if (intern.id !== internId) {
        return forbidden(res, 'Access denied');
      }
    }

    const take = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.offset, 10) || 0;
    const type = req.query.type || undefined;

    const where = { internId };
    if (type) where.type = type;

    const history = await prisma.scoreHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return ok(res, history);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /score/history
 * Returns the calling intern's own score history.
 */
async function getMyScoreHistory(req, res, next) {
  try {
    const intern = await prisma.intern.findUnique({ where: { userId: req.user.id } });
    if (!intern) {
      return notFound(res, 'Intern record not found');
    }

    const take = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.offset, 10) || 0;
    const type = req.query.type || undefined;

    const where = { internId: intern.id };
    if (type) where.type = type;

    const history = await prisma.scoreHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return ok(res, history);
  } catch (err) {
    next(err);
  }
}

module.exports = { getScoreHistory, getMyScoreHistory };
