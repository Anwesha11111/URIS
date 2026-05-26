'use strict';

const prisma = require('../utils/prisma');
const {
  calculateInternTLI,
  calculateEffectiveTLI,
  determineLoadBand,
} = require('./tliEngine');

/**
 * recomputeInternTLI(internId)
 *
 * Foundational recomputation:
 *  - Fetch active tasks
 *  - Compute raw workload TLI (sum of task TLI)
 *  - Fetch latest capacity + credibility
 *  - Compute effectiveTli
 *  - Update User row: tli, effectiveTli, loadBand
 */
async function recomputeInternTLI(internId) {
  if (!internId) return;

  // Ensure we always write to the correct User (the User model holds TLI fields)
  const intern = await prisma.intern.findUnique({
    where: { id: internId },
    select: { userId: true },
  });

  if (!intern?.userId) return;

  const [activeTasks, latestCapacity, credibility] = await Promise.all([
    prisma.task.findMany({
      where: { internId, status: 'active' },
      select: { complexity: true, progressPct: true },
    }),
    prisma.capacityScore.findUnique({
      where: { internId },
      select: { tli: true, finalCapacity: true },
    }).catch(() => null),
    prisma.credibilityScore.findUnique({
      where: { internId },
      select: { score: true },
    }).catch(() => null),
  ]);

  const rawTli = calculateInternTLI(activeTasks);

  // Prefer capacityScore.finalCapacity if available; fall back to capacityScore.tli.
  const capacityScore = latestCapacity?.finalCapacity ?? latestCapacity?.tli ?? 0;

  const credibilityScore = credibility?.score ?? 0;

  const effectiveTli = calculateEffectiveTLI(rawTli, capacityScore, credibilityScore);
  const loadBand = determineLoadBand(effectiveTli);

  await prisma.user.update({
    where: { id: intern.userId },
    data: {
      tli: rawTli,
      effectiveTli,
      loadBand,
    },
  });
}

module.exports = { recomputeInternTLI };

