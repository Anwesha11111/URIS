const prisma = require('../utils/prisma');
const { validateAvailability } = require('../utils/validate');

async function processAvailability(data) {
  const errors = validateAvailability(data);
  if (errors.length) {
    const err = new Error('Validation failed');
    err.status = 400;
    err.errors = errors;
    throw err;
  }

  const { internId, weekStart, weekEnd, busyBlocks, maxFreeBlockHours } = data;

  // Ensure intern exists, create if not
  await prisma.intern.upsert({
    where: { id: internId },
    update: {},
    create: { id: internId },
  });

  const slot = await prisma.availabilitySlot.upsert({
    where: { internId_weekStart: { internId, weekStart: new Date(weekStart) } },
    update: { weekEnd: new Date(weekEnd), busyBlocks, maxFreeBlockHours },
    create: {
      internId,
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
      busyBlocks,
      maxFreeBlockHours,
    },
  });

  return {
    submissionId: slot.id,
    internId: slot.internId,
    weekStart: slot.weekStart,
    weekEnd: slot.weekEnd,
    maxFreeBlockHours: slot.maxFreeBlockHours,
    busyBlocks: slot.busyBlocks,
    submittedAt: slot.updatedAt,
  };
}

async function findAvailability(internId, weekStart) {
  return prisma.availabilitySlot.findUnique({
    where: { internId_weekStart: { internId, weekStart: new Date(weekStart) } },
  });
}

module.exports = { processAvailability, findAvailability };
