'use strict';

const prisma = require('./prisma');

/**
 * Returns all Intern IDs.
 * Used by scheduler recomputation hooks.
 */
async function getAllInternIds() {
  const interns = await prisma.intern.findMany({
    select: { id: true },
  });

  return interns.map(i => i.id);
}

module.exports = { getAllInternIds };

