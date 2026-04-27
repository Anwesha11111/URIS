const TOTAL_POSSIBLE_BLOCKS = 21; // 7 days x 3 slots
const HOURS_PER_BLOCK = 2; // each slot represents ~2 hours

function computeFragmentationIndex(busyBlocks, maxFreeBlockHours) {
  const busyCount  = busyBlocks.length;
  const freeBlocks = Math.max(TOTAL_POSSIBLE_BLOCKS - busyCount, 0);
  const raw        = freeBlocks / TOTAL_POSSIBLE_BLOCKS;

  const multiplier = maxFreeBlockHours === 3 ? 0.8
                   : maxFreeBlockHours === 1 ? 1.2
                   : 1.0;

  return Math.min(raw * multiplier, 1);
}

/**
 * Fragmentation score: 0 (no fragmentation) → 100 (fully fragmented).
 * More busy blocks = higher fragmentation.
 */
function computeFragmentationScore(busyBlocks) {
  const busyCount = Math.min(busyBlocks.length, TOTAL_POSSIBLE_BLOCKS);
  return Math.round((busyCount / TOTAL_POSSIBLE_BLOCKS) * 100);
}

/**
 * Total free hours based on free block count and maxFreeBlockHours cap.
 */
function computeTotalFreeHours(busyBlocks, maxFreeBlockHours) {
  const freeBlocks = Math.max(TOTAL_POSSIBLE_BLOCKS - busyBlocks.length, 0);
  return freeBlocks * Math.min(maxFreeBlockHours, HOURS_PER_BLOCK);
}

/**
 * Max continuous free block: longest run of consecutive free slots across the week.
 * busyBlocks are expected to have a `day` field (0–6). Each day has 3 slots.
 * We model 21 slots (day*3 + slot) and find the longest free run.
 */
function computeMaxContinuousBlock(busyBlocks, maxFreeBlockHours) {
  const busySet = new Set(busyBlocks.map((_, i) => i)); // treat each busy block as occupying a slot index
  // Build a simple 21-slot occupancy array based on busy count (positional)
  const occupied = new Array(TOTAL_POSSIBLE_BLOCKS).fill(false);
  for (let i = 0; i < Math.min(busyBlocks.length, TOTAL_POSSIBLE_BLOCKS); i++) {
    occupied[i] = true;
  }

  let maxRun = 0;
  let currentRun = 0;
  for (const isBusy of occupied) {
    if (!isBusy) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return maxRun * Math.min(maxFreeBlockHours, HOURS_PER_BLOCK);
}

function computeAvailabilityStatus(busyBlocks, fragmentationIndex, weekStatusToggle) {
  if (weekStatusToggle === 'heavy_week' || weekStatusToggle === 'busy') return 'unavailable';

  const busyCount = busyBlocks.length;

  if (busyCount >= 14)                             return 'unavailable';
  if (busyCount >= 7 || fragmentationIndex > 0.6)  return 'partial';
  return 'available';
}

function computeAvailabilityScore(availabilityStatus, fragmentationIndex, maxFreeBlockHours) {
  if (availabilityStatus === 'unavailable') {
    return Math.round(10 * (1 - fragmentationIndex));
  }
  if (availabilityStatus === 'partial') {
    return Math.round(25 - (10 * fragmentationIndex));
  }
  const hoursBonus = (maxFreeBlockHours - 1) * 6;
  return Math.min(28 + hoursBonus, 40);
}

/**
 * @param {Array}  busyBlocks
 * @param {number} maxFreeBlockHours
 * @param {string} weekStatusToggle
 * @returns {{ fragmentationIndex, availabilityStatus, availabilityScore, totalFreeHours, fragmentationScore, maxContinuousBlock }}
 */
function computeAvailabilityIntelligence(busyBlocks, maxFreeBlockHours, weekStatusToggle) {
  const safeBlocks = busyBlocks || [];

  const fragmentationIndex   = computeFragmentationIndex(safeBlocks, maxFreeBlockHours);
  const availabilityStatus   = computeAvailabilityStatus(safeBlocks, fragmentationIndex, weekStatusToggle);
  const availabilityScore    = computeAvailabilityScore(availabilityStatus, fragmentationIndex, maxFreeBlockHours);
  const totalFreeHours       = computeTotalFreeHours(safeBlocks, maxFreeBlockHours);
  const fragmentationScore   = computeFragmentationScore(safeBlocks);
  const maxContinuousBlock   = computeMaxContinuousBlock(safeBlocks, maxFreeBlockHours);

  return { fragmentationIndex, availabilityStatus, availabilityScore, totalFreeHours, fragmentationScore, maxContinuousBlock };
}

module.exports = { computeAvailabilityIntelligence };
