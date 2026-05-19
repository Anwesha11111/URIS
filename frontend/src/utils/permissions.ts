export type Permissions = {
  canSeeAllTasks: 'YES' | 'LIMITED' | 'OWN_TEAM' | 'OBSERVED' | 'COLLAB' | 'OPERATIONAL' | 'NO';
  canSeeDetailedTask: 'YES' | 'LIMITED' | 'OWN_TASKS';
  canSeeNotes: boolean;
  canAssign: 'YES' | 'LIMITED' | 'NO';
  canReview: 'YES' | 'LIMITED' | 'NO';
  modules: string[];
}

export const ROLE_PERMISSIONS: Record<string, Permissions> = {
  'core_admin': {
    canSeeAllTasks: 'YES',
    canSeeDetailedTask: 'YES',
    canSeeNotes: true,
    canAssign: 'YES',
    canReview: 'YES',
    modules: ['/dashboard', '/tasks', '/review', '/team', '/alerts', '/admin', '/audit-logs', '/support-admin', '/user-lifecycle']
  },
  'operations_lead': {
    canSeeAllTasks: 'LIMITED',
    canSeeDetailedTask: 'LIMITED',
    canSeeNotes: false,
    canAssign: 'YES',
    canReview: 'NO',
    modules: ['/dashboard', '/tasks', '/team', '/alerts', '/support-admin']
  },
  'technical_lead': {
    canSeeAllTasks: 'OWN_TEAM',
    canSeeDetailedTask: 'YES',
    canSeeNotes: true,
    canAssign: 'YES',
    canReview: 'YES',
    modules: ['/dashboard', '/tasks', '/review', '/team', '/alerts', '/support-admin']
  },
  'research_lead': {
    canSeeAllTasks: 'OWN_TEAM',
    canSeeDetailedTask: 'YES',
    canSeeNotes: true,
    canAssign: 'YES',
    canReview: 'YES',
    modules: ['/dashboard', '/tasks', '/review', '/team', '/alerts', '/support-admin']
  },
  'operations_program_manager': {
    canSeeAllTasks: 'OPERATIONAL',
    canSeeDetailedTask: 'LIMITED',
    canSeeNotes: false,
    canAssign: 'YES',
    canReview: 'LIMITED',
    modules: ['/dashboard', '/tasks', '/review', '/team', '/alerts', '/support-admin']
  },
  'technical_intern': {
    canSeeAllTasks: 'NO',
    canSeeDetailedTask: 'OWN_TASKS',
    canSeeNotes: false,
    canAssign: 'NO',
    canReview: 'NO',
    modules: ['/availability', '/tasks', '/notifications', '/portfolio-edit', '/support']
  },
  'operations_intern': {
    canSeeAllTasks: 'NO',
    canSeeDetailedTask: 'OWN_TASKS',
    canSeeNotes: false,
    canAssign: 'NO',
    canReview: 'NO',
    modules: ['/availability', '/tasks', '/notifications', '/portfolio-edit', '/support']
  },
  'research_intern': {
    canSeeAllTasks: 'NO',
    canSeeDetailedTask: 'OWN_TASKS',
    canSeeNotes: false,
    canAssign: 'NO',
    canReview: 'NO',
    modules: ['/availability', '/tasks', '/notifications', '/portfolio-edit', '/support']
  },
  'orenda_member': {
    canSeeAllTasks: 'NO',
    canSeeDetailedTask: 'OWN_TASKS',
    canSeeNotes: false,
    canAssign: 'NO',
    canReview: 'NO',
    modules: ['/availability', '/tasks', '/notifications', '/portfolio-edit', '/support']
  },
  'observer_team_lead': {
    canSeeAllTasks: 'OBSERVED',
    canSeeDetailedTask: 'YES',
    canSeeNotes: true,
    canAssign: 'NO',
    canReview: 'NO',
    modules: ['/dashboard', '/tasks', '/team', '/alerts']
  },
  'collaborator_lead': {
    canSeeAllTasks: 'COLLAB',
    canSeeDetailedTask: 'YES',
    canSeeNotes: true,
    canAssign: 'LIMITED',
    canReview: 'YES',
    modules: ['/dashboard', '/tasks', '/review', '/team', '/alerts']
  }
};

export function getPermissions(role: string): Permissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['technical_intern'];
}
