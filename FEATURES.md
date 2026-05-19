# URIS (User Resource Intelligence System) — Feature Catalogue

Welcome to the URIS Feature and Operations Catalogue. This document provides an exhaustive index of all frontend pages, backend routes, scoring systems, and background automation engines built into the URIS platform.

---

## 🔑 1. Security & Role-Based Access Control (RBAC)

URIS implements a robust hierarchical access control model across 11 distinct roles:

* **Core Admin:** Complete oversight. Manages user approvals, score overrides, system configuration, deadlines, and views audit logs.
* **Leads (Technical, Operations, Research, Collaborator):** Task management. Assign, pause, block, resume, review, and delete tasks. View team capacity heatmaps.
* **Operations Program Manager (OPM):** Management monitoring. View dashboards, analyze workloads, read digests, and inspect submitted reports.
* **Interns (Technical, Operations, Research):** Individual contributors. Submit weekly availability, view scores, update task progress, and submit work updates.
* **Observer Team Lead:** Specialized view. View-only access to specific dashboards.
* **Orenda Member:** General organization visibility.

### Security Features:
* **JWT Authentication:** Stateful token-based authentication with auto-expiration (`1d` default) and invalidation.
* **Registration Approvals:** Newly registered accounts remain locked (`approved: false`) until a Core Admin reviews and approves them from the panel.
* **Route Guards & Session Checks:** Frontend routes use a `SessionGuard` and role-checked `ProtectedRoute` wraps.
* **Audit Logs:** Key admin actions (approvals, manual score adjustments, role changes) are securely logged in the database (`AuditLog` table) for transparency and compliance.

---

## 📊 2. Scoring & Metrics Engine

The core intelligence of URIS lies in three rolling scoring metrics calculated on-the-fly for every intern:

### A. Credibility Score (0 – 100)
A dynamic measure of an intern's dependability.
* **Increase:** Successfully completing tasks on time boosts credibility.
* **Penalty:** Having tasks flagged as stale (no progress update in 2+ days) or missing soft deadlines applies penalties.
* **Manual Override:** Admins can adjust this score from the admin panel, which records the adjustment and reason in the audit logs.

### B. Capacity Score (0 – 100)
Represents available bandwidth for new tasks.
* **Calculation:** Calculated from weekly declared availability (out of a max workload window).
* **Active Tasks Deduction:** Every active task assigned to an intern triggers a **Soft Reservation** penalty (typically `-20` capacity) to prevent overload.
* **Exam Week Toggle:** Toggling "Exam Week" on the availability form automatically applies a `-30` penalty.
* **Workload Warning:** If capacity falls below `40`, the system marks the intern as overloaded.

### C. Rolling Performance Index (RPI) (0.00 – 5.00)
An index indicating quality of output based on historical reviews within a rolling window (default: 30 days).
* **Weights:**
  * **Quality of Work:** 50%
  * **Timeliness:** 30%
  * **Initiative:** 20%
* **Calculation:** Weighted sum of all tasks reviewed within the rolling window.

---

## 💻 3. Frontend Pages & Modules

### 📍 Landing Page (`/`)
* Glassmorphic welcome screen detailing the STEMONEF Intelligence system.
* Direct action buttons to login or register.

### 📍 Authenticated Command Dashboard (`/dashboard`)
* **Admin/Lead View:** 
  * Summary metrics cards (Active Interns, Tasks in Progress, Open Alerts, Completed Tasks in 30 days).
  * **Team Heat Capacity Heatmap:** A visual timeline showing the daily capacity of active teams (aggregated from individual intern members).
  * **Best Performing Team Highlight:** Automatically flags the team with the highest average RPI using a crown emoji (`👑`), green highlighting, and custom tooltips.
  * **Pending Approvals Panel:** Approve or reject new users instantly.
* **Intern View:**
  * Displays personal Credibility, Capacity, and RPI metric cards with description tooltips.
  * Progress list of currently assigned active tasks.

### 📍 Availability Declaration (`/availability`)
* Accessible by Interns to declare their weekly availability.
* **Features:**
  * Countdown timer indicating deadline cutoff.
  * Week status selector (Generally Free vs. Heavy Week).
  * Exam week toggle (applies `-30` capacity score penalty).
  * Continuous free block slider (1 to 6 hours).
  * Busy Blocks scheduler (declare specific days, reasons like exams/revision, and severity).
  * Optional character-limited context notes.

### 📍 Task Monitor (`/tasks`)
* **Task List:** Interactive timeline cards grouped by status (Backlog, Not Started, In Progress, Under Review, Completed).
* **Filters:** Filter tasks by "All", "Stale" (no update in 2 days), or "Blocked" (blocked by external/internal blockers).
* **Task Details:** Clicking a card displays task description, assigned skills, and task control histories.
* **Admin controls:** Pause task, resume task, mark task as blocked, or delete task.
* **Task Deletion (Score Integrity):** Soft-deletes the task without impacting the historical capacity or RPI scores.
* **Assignment Warning Banner:** When creating a task, choosing an overloaded intern (Capacity `< 40` or TLI `> 5`) displays a real-time warning banner. Leads can bypass with override authority.

### 📍 Task Reviews (`/review`)
* Accessible by Admins and Leads to review completed tasks.
* **Review Rubric:** Score the intern's task out of 5 stars for Quality, Timeliness, and Initiative. The backend automatically re-calculates the intern's RPI.

### 📍 Team Manager (`/team`)
* Create new organizational teams.
* Map users to teams with joined/left histories.
* View average team performance and aggregated workload indicators.

### 📍 Personal Branding & Public Portfolio (`/portfolio-edit` and `/portfolio/:slug`)
* **Editor (`/portfolio-edit`):** Interns customize their public page (bio, skills list, profile pic, LinkedIn URL, contact details). Generates a downloadable **QR Code**.
* **Public Page (`/portfolio/:slug`):** Publicly shareable profile verified by STEMONEF. Displays the intern's verified skills, biography, contact methods, and an **automatic showcase of completed tasks** with complexity ratings.

---

## ⚙️ 4. Backend Architecture & Integrations

### 🔄 Bi-Directional Plane.so Integration
* **Webhook Receiver (`POST /webhooks/plane`):** Listens for Plane `issue.created` and `issue.updated` events to sync task updates to URIS instantly.
* **Periodic Sync Scheduler:** Periodically pulls all tasks from the Plane project to ensure absolute data consistency.

### ☁️ Nextcloud WebDAV Attachment Storage
* Secure upload of task deliverables and PDF report templates.
* Integrates directly with your corporate Nextcloud server, storing files in structured directories under the intern's username.

### 🤖 Background Automation (Cron Scheduler)
* **Tri-Daily Google Form Reminders:** Every 3 days, the system generates customized mock Google Forms containing personalized links for interns to submit task updates, weekly availability, and report attachments.
* **Stale Task Detector:** Automatically flags tasks without progress updates for more than 48 hours as "Stale" and posts alerts.
* **Weekly Snapshot Digests:** Generates weekly digests compiling capacity snapshots and alerts for OPM and Admin review.

---

## 🛠️ 5. Complete Routing Table (Backend API)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| **POST** | `/api/auth/register` | Register a new user | No |
| **POST** | `/api/auth/login` | Authenticate and get JWT token | No |
| **GET** | `/api/auth/me` | Get current user session | Yes |
| **GET** | `/api/admin/overview` | Fetch admin dashboard details & heatmap | Yes (Admin/Lead) |
| **POST** | `/api/admin/approve/:id` | Approve pending user registration | Yes (Admin) |
| **POST** | `/api/admin/reject/:id` | Reject pending user registration | Yes (Admin) |
| **POST** | `/api/admin/score-override`| Manually adjust intern metrics | Yes (Admin) |
| **GET** | `/api/tasks` | Get all tasks | Yes |
| **POST** | `/api/tasks` | Create a new task | Yes (Admin/Lead) |
| **PATCH** | `/api/tasks/:id/progress` | Update task progress (Intern) | Yes |
| **POST** | `/api/tasks/:id/control` | Pause, resume, or block task | Yes (Admin/Lead) |
| **DELETE** | `/api/tasks/:id` | Soft delete a task (Score Integrity) | Yes (Admin/Lead) |
| **POST** | `/api/reviews` | Review and rate a completed task | Yes (Admin/Lead) |
| **POST** | `/api/availability` | Submit weekly availability | Yes (Intern) |
| **GET** | `/api/portfolio/me` | Fetch personal portfolio details | Yes (Intern) |
| **PATCH** | `/api/portfolio/me` | Update portfolio details | Yes (Intern) |
| **GET** | `/api/portfolio/:slug` | Public profile retrieval | No |
| **POST** | `/api/webhooks/plane` | Plane.so webhook receiver | No (Shared Secret verification) |
| **GET** | `/health` | Diagnostic check (DB + Nextcloud + Plane) | No |
| **GET** | `/health/live` | Process liveness check | No |
| **GET** | `/health/ready` | Database readiness check | No |

---

## 🎨 6. STEMONEF Intelligent Design System Aesthetics
* **Theme:** Glassmorphism dashboard over a dark futuristic palette (Navy `#07080f`, Gold `#c9a84c` accents).
* **Starfield Canvas:** Floating ambient particles reacting with hover physics (repulsion) and vertical scroll depth (3D parallax scrolling).
