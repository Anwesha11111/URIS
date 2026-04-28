# Bugfix Requirements Document

## Introduction

Eight critical correctness bugs exist across the Node.js/Express/Prisma backend and React/TypeScript/Zustand frontend that prevent the application from functioning correctly with real data. The bugs span four categories: hardcoded/mocked data returned to clients, ID mapping errors (User ID used where Intern ID is required), a broken registration flow that leaves the frontend without a token, and enum/type mismatches that cause validation to reject valid inputs. Together they make the admin overview unreliable, intern dashboards and alert queries return wrong or empty results, registration silently fails on the frontend, task status updates are rejected for valid statuses, and the logout action uses a non-standard module import pattern that can break in ESM environments.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Hardcoded intern data in getAdminOverview**

1.1 WHEN an admin requests the overview endpoint THEN the system returns `name` set to the intern's UUID instead of the user's name
1.2 WHEN an admin requests the overview endpoint THEN the system returns hardcoded `capacityScore: 75`, `tli: 5`, `rpi: 3.5`, `credibilityScore: 80`, `availability: 'Available'`, and `taskCount: 2` for every intern regardless of real DB values
1.3 WHEN an admin requests the overview endpoint THEN the system fabricates alert records from active Task rows instead of querying the Alert table

**Bug 2 — Intern ID vs User ID mapping in intern and alerts controllers**

1.4 WHEN an authenticated intern requests their dashboard THEN the system queries `prisma.intern.findUnique({ where: { id: req.user.id } })` using the User UUID, which does not match the Intern table's primary key, causing a not-found result or wrong record lookup
1.5 WHEN an authenticated intern requests their anomaly alerts THEN the system filters `prisma.alert.findMany({ where: { internId: req.user.id } })` using the User UUID instead of the Intern UUID, returning no alerts even when alerts exist

**Bug 3 — Register endpoint does not return a token**

1.6 WHEN a new user completes registration THEN the system returns only `{ id, email, role, createdAt }` with no `token` field
1.7 WHEN the frontend receives the registration response THEN the system crashes attempting to call `login(undefined, user)` because `token` is `undefined`, leaving the user unauthenticated despite a successful account creation

**Bug 4 — Task status enum mismatch**

1.8 WHEN an admin submits a task status update with a value such as `'active'`, `'completed'`, `'in_progress_early'`, `'in_progress_mid'`, `'under_review'`, or `'backlog'` THEN the system rejects the request with a validation error because `VALID_TASK_STATUSES` only contains `['ACTIVE', 'PAUSED', 'CANCELLED']`
1.9 WHEN an admin submits a status value from `VALID_TASK_STATUSES` (e.g. `'ACTIVE'`) THEN the system stores `'active'` via `.toLowerCase()` but the validation array uses uppercase, creating an inconsistency where the stored value never matches the validation set on a round-trip read

**Bug 5 — Tasks controller uses User ID as Intern ID filter**

1.10 WHEN a non-admin user requests their task list THEN the system sets `filter.internId = req.user.id` (the User UUID) and queries the Task table, which stores `internId` referencing the Intern table's UUID, returning zero tasks for any intern

**Bug 6 — Role system "lead" alias and case inconsistency**

1.11 WHEN a user registers or is assigned the role `"lead"` THEN the system maps it to `ROLES.ADMIN` via `normalizeRole`, introducing an undocumented alias that is not a real DB role and creates confusion about valid role values
1.12 WHEN the frontend `isAdmin()` helper evaluates a user's role THEN the system checks `role === 'admin'` (lowercase), which is consistent with the login service's `.toLowerCase()` output, but the `lead` alias in `normalizeRole` means a user stored as `ADMIN` who registered as `"lead"` would pass the check only after lowercasing — the alias itself is the source of confusion rather than a functional break, but it allows an invalid role string to reach the DB layer

**Bug 7 — CommonJS require() inside ESM/TypeScript logout action**

1.13 WHEN a user logs out THEN the system executes `require('../store/teamStore')` inside the `logout` action of a TypeScript/ESM file, which is a CommonJS pattern that may fail or behave unexpectedly depending on the bundler configuration and module resolution mode

**Bug 8 — openAlerts counts tasks instead of alerts**

1.14 WHEN an admin requests the overview endpoint THEN the system computes `openAlerts` as `prisma.task.count({ where: { status: { in: ['active', 'paused'] } } })`, returning a count of active/paused tasks rather than a count of unresolved Alert records

---

### Expected Behavior (Correct)

**Bug 1 — Hardcoded intern data in getAdminOverview**

2.1 WHEN an admin requests the overview endpoint THEN the system SHALL return each intern's real name by joining the User table via `intern.userId`
2.2 WHEN an admin requests the overview endpoint THEN the system SHALL return real `capacityScore`, `tli`, `credibilityScore`, and `taskCount` values sourced from the CapacityScore, CredibilityScore, and Task models for each intern
2.3 WHEN an admin requests the overview endpoint THEN the system SHALL return real Alert records from the Alert table instead of fabricated entries derived from tasks

**Bug 2 — Intern ID vs User ID mapping**

2.4 WHEN an authenticated intern requests their dashboard THEN the system SHALL first resolve the Intern record via `prisma.intern.findUnique({ where: { userId: req.user.id } })` and then use `intern.id` for all subsequent intern-scoped queries
2.5 WHEN an authenticated intern requests their anomaly alerts THEN the system SHALL resolve the Intern record via `userId` first and then filter alerts by the correct `intern.id`

**Bug 3 — Register endpoint does not return a token**

2.6 WHEN a new user completes registration THEN the system SHALL generate a JWT token (using the same signing logic as login) and return `{ token, user: { id, name, email, role } }` so the frontend can immediately authenticate the session
2.7 WHEN the frontend receives the registration response THEN the system SHALL provide a valid `token` string so `login(token, user)` succeeds and the user is redirected to their dashboard without error

**Bug 4 — Task status enum mismatch**

2.8 WHEN an admin submits a task status update with any value from the full set of valid DB statuses (`active`, `paused`, `cancelled`, `completed`, `stale`, `backlog`, `in_progress_early`, `in_progress_mid`, `under_review`) THEN the system SHALL accept the request and persist the value as-is without transformation
2.9 WHEN `VALID_TASK_STATUSES` is evaluated THEN the system SHALL contain only lowercase values that exactly match the strings stored in the database, and the `.toLowerCase()` call on save SHALL be removed

**Bug 5 — Tasks controller uses User ID as Intern ID filter**

2.10 WHEN a non-admin user requests their task list THEN the system SHALL resolve the Intern record via `prisma.intern.findUnique({ where: { userId: req.user.id } })` and use `intern.id` as the `internId` filter so only that intern's tasks are returned

**Bug 6 — Role system "lead" alias**

2.11 WHEN `normalizeRole` is called THEN the system SHALL only accept `"intern"` and `"admin"` as valid inputs, mapping them to `ROLES.INTERN` and `ROLES.ADMIN` respectively, and SHALL return `null` for any other value including `"lead"`
2.12 WHEN the Register page renders role options THEN the system SHALL send `role: 'admin'` (not `'lead'`) for the admin selection, which is already the case — the fix is confined to removing the `lead` alias from `normalizeRole`

**Bug 7 — CommonJS require() inside ESM/TypeScript logout action**

2.13 WHEN a user logs out THEN the system SHALL use a dynamic `import()` call or restructure the dependency to avoid the CommonJS `require()` pattern inside the TypeScript/ESM `logout` action

**Bug 8 — openAlerts counts tasks instead of alerts**

2.14 WHEN an admin requests the overview endpoint THEN the system SHALL compute `openAlerts` as `prisma.alert.count({ where: { resolved: false } })`, returning the true count of unresolved Alert records

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an admin submits a valid score override with a numeric value between 0 and 100 THEN the system SHALL CONTINUE TO update the intern's `overrideScore` and log the audit action
3.2 WHEN a user logs in with valid credentials THEN the system SHALL CONTINUE TO return `{ token, user: { id, name, email, role } }` with the role lowercased
3.3 WHEN a user logs in with invalid credentials THEN the system SHALL CONTINUE TO return a 401 error
3.4 WHEN an admin queries all active alerts via `GET /alerts` THEN the system SHALL CONTINUE TO return all unresolved alerts from the Alert table
3.5 WHEN an admin resolves an alert via `PATCH /alerts/:id/resolve` THEN the system SHALL CONTINUE TO mark the alert as resolved
3.6 WHEN an admin creates a task with valid `title`, `internId`, and `planeTaskId` THEN the system SHALL CONTINUE TO create the task and return the created record
3.7 WHEN an admin requests the overview THEN the system SHALL CONTINUE TO return `totalInterns`, `activeTasks`, and `completedLast30` counts from real DB queries (these are already correct)
3.8 WHEN a user registers with an email that already exists THEN the system SHALL CONTINUE TO return a 409 conflict error
3.9 WHEN a user registers with an invalid role string (other than `intern` or `admin`) THEN the system SHALL CONTINUE TO return a 400 validation error
3.10 WHEN an authenticated intern accesses their dashboard and their Intern record does not exist THEN the system SHALL CONTINUE TO return a 404 not found response
3.11 WHEN a non-admin user is authenticated THEN the system SHALL CONTINUE TO be restricted from admin-only endpoints by the existing role middleware
3.12 WHEN the auth store is rehydrated from localStorage THEN the system SHALL CONTINUE TO restore `token`, `user`, and `isAuthenticated` correctly
