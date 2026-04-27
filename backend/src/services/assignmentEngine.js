/**
 * Assignment Engine — Composite Scoring with Explainability
 */

function computeSkillMatchScore(internSkills, requiredSkills) {
  if (!requiredSkills.length) return 100;
  const matched = requiredSkills.filter((s) => internSkills.includes(s)).length;
  return (matched / requiredSkills.length) * 100;
}

function computeFinalScore(intern, skillMatchScore) {
  return (
    0.5 * intern.capacityScore +
    0.2 * skillMatchScore +
    0.2 * (100 - intern.TLI * 5) +
    0.1 * intern.credibilityScore
  );
}

function buildReason(capacityScore, skillMatchScore) {
  const highCapacity = capacityScore >= 70;
  const highSkill = skillMatchScore >= 70;

  if (highCapacity && highSkill) return 'Best fit';
  if (highCapacity && !highSkill) return 'Good availability but weak skill match';
  return 'Limited availability';
}

function filterInterns(interns) {
  return interns.filter(
    (i) => i.availabilityStatus !== 'unavailable' && i.capacityScore >= 30
  );
}

function rankInterns(interns, task) {
  const { requiredSkills = [] } = task;

  return filterInterns(interns)
    .map((intern) => {
      const skillMatchScore = computeSkillMatchScore(intern.skillTags, requiredSkills);
      const finalScore = computeFinalScore(intern, skillMatchScore);
      const reason = buildReason(intern.capacityScore, skillMatchScore);

      return {
        id: intern.id,
        finalScore: Math.round(finalScore * 100) / 100,
        capacityScore: intern.capacityScore,
        skillMatchScore: Math.round(skillMatchScore),
        TLI: intern.TLI,
        reason,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

/**
 * Returns a shortlist of top candidates for a task.
 *
 * @param {{ requiredSkills: string[], topN?: number }} task
 * @param {Array} interns
 * @returns {Array}
 */
function getAssignmentShortlist(task, interns) {
  const topN = task.topN ?? 5;
  return rankInterns(interns, task).slice(0, topN);
}

module.exports = { getAssignmentShortlist, rankInterns };
