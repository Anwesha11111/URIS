'use strict';

const WORK_CATEGORIES = Object.freeze({
  RESEARCH: [
    'AI Research',
    'Machine Learning Research',
    'LLM Evaluation',
    'Prompt Engineering',
    'AI Safety',
    'Explainable AI',
    'Dataset Analysis',
    'Literature Review',
    'Research Validation',
    'Human-AI Interaction',
    'Educational Research',
    'Research Documentation',
  ],
  TECHNICAL: [
    'Frontend Development',
    'Backend Development',
    'Full Stack Development',
    'API Development',
    'Database Engineering',
    'DevOps',
    'Cloud Infrastructure',
    'Automation',
    'QA Testing',
    'Cybersecurity',
    'UI/UX',
  ],
  OPERATIONS: [
    'Program Management',
    'Operations',
    'Community Management',
    'Documentation',
    'Outreach',
    'Event Coordination',
  ],
});

const ALL_WORK_CATEGORIES = Object.freeze([
  ...WORK_CATEGORIES.RESEARCH,
  ...WORK_CATEGORIES.TECHNICAL,
  ...WORK_CATEGORIES.OPERATIONS,
]);

const PERFORMANCE_RATINGS = Object.freeze([
  'OUTSTANDING',
  'EXCELLENT',
  'VERY_GOOD',
  'GOOD',
  'SATISFACTORY',
]);

const RECOMMENDATION_STATUSES = Object.freeze([
  'HIGHLY_RECOMMENDED',
  'RECOMMENDED',
  'RECOMMENDED_WITH_RESERVATIONS',
  'NOT_EVALUATED',
]);

const VERIFICATION_STATUSES = Object.freeze([
  'ACTIVE',
  'REVOKED',
  'EXPIRED',
]);

const ARCHIVE_STATUSES = Object.freeze(['ACTIVE', 'COMPLETED']);

const INTERN_ROLES = Object.freeze([
  'TECHNICAL_INTERN',
  'OPERATIONS_INTERN',
  'RESEARCH_INTERN',
]);

const ROLE_TO_DEPARTMENT = Object.freeze({
  TECHNICAL_INTERN:  'Technical',
  OPERATIONS_INTERN: 'Operations',
  RESEARCH_INTERN:   'Research',
});

module.exports = {
  WORK_CATEGORIES,
  ALL_WORK_CATEGORIES,
  PERFORMANCE_RATINGS,
  RECOMMENDATION_STATUSES,
  VERIFICATION_STATUSES,
  ARCHIVE_STATUSES,
  INTERN_ROLES,
  ROLE_TO_DEPARTMENT,
};
