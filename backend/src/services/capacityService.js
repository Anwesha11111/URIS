const axios  = require('axios');
const prisma  = require('../utils/prisma');
const { getTLIForIntern, getTLIBand } = require('./taskService');
const { computeCredibilityScore }      = require('./credibilityService');

const PERSON_A_API_URL = process.env.PERSON_A_API_URL;
const MAX_TLI          = 9;

async function getBaseCapacityFromPersonA(internId) {
  try {
    const response = await axios.get(
      `${PERSON_A_API_URL}/performance/get`,
      { params: { internId }, timeout: 5000 }
    );
    return response.data?.data?.baseCapacity ?? 0.5;
  } catch (err) {
    console.error('[capacityService] Could not reach Person A API — using neutral 0.5:', err.message);
    return 0.5;
  }
}

function getCapacityLabel(finalCapacity) {
  if (finalCapacity >= 0.7) return 'High availability and low workload';
  if (finalCapacity >= 0.4) return 'Moderate availability';
  return 'High workload or low availability';
}

async function computeFinalCapacity(internId) {
  try {
    const baseCapacity  = await getBaseCapacityFromPersonA(internId);
    const tli           = await getTLIForIntern(internId);
    const credResult    = await computeCredibilityScore(internId, baseCapacity);
    const credibility   = credResult.score;

    const tliNormalised = Math.min(tli / MAX_TLI, 1.0);
    const tliPenalty    = tliNormalised * 0.2;

    const finalCapacity = Math.max(0, Math.min(1,
      (baseCapacity * 0.5) + (credibility * 0.3) - tliPenalty
    ));

    const rounded       = parseFloat(finalCapacity.toFixed(3));
    const capacityLabel = getCapacityLabel(rounded);

    await prisma.capacityScore.upsert({
      where:  { internId },
      update: { baseCapacity, tli, credibility, finalCapacity: rounded, capacityLabel, updatedAt: new Date() },
      create: { internId, baseCapacity, tli, credibility, finalCapacity: rounded, capacityLabel }
    });

    return {
      intern_id:           internId,
      base_capacity:       baseCapacity,
      task_load_index:     parseFloat(tli.toFixed(3)),
      tli_band:            getTLIBand(tli),
      credibility_score:   credibility,
      credibility_flag:    credResult.flag,
      final_capacity:      rounded,
      final_capacity_100:  Math.round(rounded * 100),
      capacity_label:      capacityLabel
    };
  } catch (err) {
    console.error('[capacityService] computeFinalCapacity error:', err.message);
    throw err;
  }
}

module.exports = { computeFinalCapacity };
