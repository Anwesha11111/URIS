# Requirements Document

## Introduction

The Availability Engine allows interns to submit and retrieve their weekly availability. An intern declares busy time blocks and a maximum free-block hour cap for a given week. The engine validates the submission, persists it, and exposes it for retrieval. This document covers Day 1 scope only: submission, validation, and retrieval.

## Glossary

- **Availability_API**: The HTTP service that exposes the POST and GET endpoints.
- **Validator**: The component that enforces business rules on incoming payloads before persistence.
- **Availability_Store**: The persistence layer that owns reads and writes for availability submissions.
- **Submission**: One `availability_submission` record keyed by `(internId, weekStart)`.
- **BusyBlock**: A single unavailable time range within a day, containing `day`, `start`, and `end` fields.
- **weekStart**: The ISO 8601 date of the Monday that begins the target week.
- **weekEnd**: The ISO 8601 date of the Sunday that ends the target week (exactly 7 days after `weekStart`).
- **maxFreeBlockHours**: A positive decimal representing the maximum hours the intern is willing to work in a free block.

---

## Requirements

### Requirement 1: Submit Weekly Availability

**User Story:** As an intern, I want to submit my weekly availability, so that the system has an authoritative record of when I am busy and how many hours I can work.

#### Acceptance Criteria

1. WHEN a POST /availability request is received with valid `internId`, `weekStart`, `weekEnd`, `busyBlocks`, and `maxFreeBlockHours`, THE Availability_API SHALL upsert the submission and return 201 with `submissionId`, `internId`, `weekStart`, and `weekEnd`.
2. WHEN a submission already exists for the same `(internId, weekStart)` pair, THE Availability_Store SHALL overwrite it with the new payload so the latest data always wins.
3. WHEN a valid submission is persisted, THE Availability_Store SHALL record `submittedAt` as the current timestamp.

---

### Requirement 2: Validate Submission Payload

**User Story:** As an intern, I want clear errors when my submission is invalid, so that I can correct and resubmit without guessing what went wrong.

#### Acceptance Criteria

1. WHEN any required field (`internId`, `weekStart`, `weekEnd`, `busyBlocks`, `maxFreeBlockHours`) is absent or null, THE Validator SHALL return a 400 response containing an `errors` array that names each missing field.
2. WHEN `weekEnd` is not exactly 7 days after `weekStart`, THE Validator SHALL return a 400 response with a descriptive error message.
3. WHEN a BusyBlock has a `start` time that is not before its `end` time, THE Validator SHALL return a 400 response with a descriptive error message.
4. WHEN two BusyBlocks on the same day have overlapping time ranges, THE Validator SHALL return a 400 response with a descriptive error message.
5. WHEN `maxFreeBlockHours` is zero or negative, THE Validator SHALL return a 400 response with a descriptive error message.

---

### Requirement 3: Retrieve Weekly Availability

**User Story:** As a consumer of availability data, I want to retrieve an intern's submission for a specific week, so that I can use it for scheduling decisions.

#### Acceptance Criteria

1. WHEN GET /availability/:internId/:weekStart is called and a matching submission exists, THE Availability_API SHALL return 200 with `submissionId`, `internId`, `weekStart`, `weekEnd`, `maxFreeBlockHours`, `submittedAt`, and the full `busyBlocks` array.
2. WHEN GET /availability/:internId/:weekStart is called and no matching submission exists, THE Availability_API SHALL return 404.

---

### Requirement 4: Handle Persistence Failures

**User Story:** As a client, I want a clear signal when the server cannot persist my submission, so that I know to retry rather than assume success.

#### Acceptance Criteria

1. IF a database write fails during a POST /availability request, THEN THE Availability_API SHALL return 500 with a generic error message and SHALL NOT return a 201 response.
