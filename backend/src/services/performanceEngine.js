const qualityWeight = parseFloat(process.env.PERFORMANCE_WEIGHT_QUALITY) || 0.5;
const timelinessWeight = parseFloat(process.env.PERFORMANCE_WEIGHT_TIMELINESS) || 0.3;
const initiativeWeight = parseFloat(process.env.PERFORMANCE_WEIGHT_INITIATIVE) || 0.2;

// Warn if weights don't sum to 1
const totalWeight = qualityWeight + timelinessWeight + initiativeWeight;
if (Math.abs(totalWeight - 1) > 0.001) {
  console.warn(`[WARN] Performance weights sum to ${totalWeight.toFixed(3)}, expected 1.0`);
}

console.log('[INFO] Using performance weights from env:', { qualityWeight, timelinessWeight, initiativeWeight });

/**
 * Compute a single review's performance score.
 * Performance = qualityWeight * quality + timelinessWeight * timeliness + initiativeWeight * initiative
 */
function computePerformance({ quality, timeliness, initiative }) {
  return qualityWeight * quality + timelinessWeight * timeliness + initiativeWeight * initiative;
}

/**
 * Compute the complexity-weighted performance index across all reviews.
 * PerformanceIndex = sum(performance * complexity) / sum(complexity)
 *
 * @param {Array<{quality: number, timeliness: number, initiative: number, complexity: number}>} reviews
 * @returns {{ performanceIndex: number, totalReviews: number }}
 */
function computePerformanceIndex(reviews) {
  if (!reviews || reviews.length === 0) {
    return { performanceIndex: 0, totalReviews: 0 };
  }

  let weightedSum = 0;
  let totalComplexity = 0;

  for (const review of reviews) {
    const performance = computePerformance(review);
    weightedSum += performance * review.complexity;
    totalComplexity += review.complexity;
  }

  return {
    performanceIndex: weightedSum / totalComplexity,
    totalReviews: reviews.length,
  };
}

module.exports = { computePerformance, computePerformanceIndex };
