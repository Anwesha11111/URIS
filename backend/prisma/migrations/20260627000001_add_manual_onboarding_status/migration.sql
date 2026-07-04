-- Phase 5C: Add MANUAL value to OnboardingEmailStatus enum
-- Used when EMAIL_DELIVERY_MODE=manual — credentials are generated and
-- returned to the UI for manual distribution; no email is dispatched.

ALTER TYPE "OnboardingEmailStatus" ADD VALUE IF NOT EXISTS 'MANUAL';
