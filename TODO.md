# TODO — Soft Reservation Enterprise System (URIS)

## Step 0 — Repo understanding (done)
- Verified existing soft reservation concept via `Intern.reservedUntil`.
- Verified scheduler architecture and alert architecture.

## Step 1 — Prisma schema
- Add enum `ReservationStatus`.
- Add model `soft_reservations` with required fields.
- Ensure only this new persistence layer is introduced.

## Step 2 — Migration
- Create Prisma migration for `soft_reservations`.

## Step 3 — Reservation intelligence service
- Create `backend/src/services/reservationEngine.js` implementing:
  - createReservation()
  - acceptReservation()
  - rejectReservation()
  - expireReservations() (hourly job calls into this)
  - generateNextCandidate()
  - computeReservationSuitability()
- Integrate suitability scoring using:
  - CapacityScore / EffectiveTLI from capacityEngine
  - credibility analytics from credibilityEngine
  - reassignment intelligence from reassignmentEngine
- Add explainability payloads:
  - reservationSuitability
  - workloadReasoning
  - overloadReasoning
  - credibilityReasoning
  - reassignmentReasoning

## Step 4 — Backend controllers / routes (reservation only)
- Add endpoints to:
  - reserve candidate for a task (Admin/Lead)
  - accept/reject reservation (Intern)
- Ensure reservations do NOT auto-assign tasks yet.

## Step 5 — Scheduler hourly job
- Edit `backend/src/services/scheduler.js` to add:
  - every 1 hour: expire pending reservations, create expiry alerts, generate replacement suggestions
- Preserve existing scheduler structure and not rewrite it.

## Step 6 — Alerts
- Reuse existing alert architecture (`prisma.alert`).
- Types:
  - `reservation_pending`
  - `reservation_expired`
  - `reservation_reassignment_suggestion`

## Step 7 — Frontend enhancements (no redesign)
- Update `frontend/src/pages/Tasks.tsx` and `frontend/src/components/TaskWorkflowPanel.tsx`:
  - reservation badge + countdown timer
  - accept/reject actions (intern)
  - replacement candidate suggestion section
  - reservation history/timeline entries
- Do not introduce frontend-only fake scoring.

## Step 8 — Testing / verification
- Run backend tests / typecheck
- Validate scheduler job does not run in test env
- Validate alerts created correctly on expire/reject

## Progress
- [ ] Step 1: Prisma schema
- [ ] Step 2: Migration
- [ ] Step 3: reservationEngine.js
- [ ] Step 4: reservation endpoints
- [ ] Step 5: scheduler job
- [ ] Step 6: alerts
- [ ] Step 7: frontend enhancements
- [ ] Step 8: testing

