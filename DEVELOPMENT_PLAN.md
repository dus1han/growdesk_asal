# Doctor CRM — Development Plan

_As of 2026-09-30 · Source of truth: [Claude.md](Claude.md) (section numbers below are "§" references to it)_

The CRM is built in **8 milestones**. Each one ends with both apps building, migrations applied, and the app running locally before the next one starts (§60, §67).

---

## 1. Starting point

The folder contains only `Claude.md`. The machine already has everything needed:

| Tool | Version | Note |
| --- | --- | --- |
| .NET SDK | 10.0.301 | Backend |
| Node.js | 24.17 | Frontend |
| PostgreSQL | 18 | Installed locally (`C:\Program Files\PostgreSQL\18`), not on PATH |
| Docker | 29.5 | Optional, for a throwaway dev database |

---

## 2. Decisions to confirm before coding

The spec leaves these open or contradicts itself. Change any you disagree with before Milestone 1.

| # | Question | Recommendation | Why |
| --- | --- | --- | --- |
| 1 | How do users stay logged in? | JWT in a secure HTTP-only cookie | Scripts in the page can't read it; Next.js middleware can protect routes with it |
| 2 | Where does payment data live? (§28 vs §40) | `payments` table is the single source of truth; `bookings` keeps only `consultation_charge` | Avoids two copies of payment status disagreeing |
| 3 | How does automation find stages admins can rename? | Each stage gets a fixed `system_key` (`interested`, `booked`, `consultation_completed`, …) | Labels can be renamed without breaking automation (§18) |
| 4 | Currency and timezone | System settings; dates stored in UTC, shown in the clinic's timezone | AED in the spec shouldn't be hard-coded |
| 5 | One doctor or several? | Several: calendar filters by doctor, overlap check is per doctor | `bookings.doctor_id` already implies it |
| 6 | How does the capture tool log in? | Client ID + secret exchanged for a short-lived token; rate limited and audit-logged | Meets §36 without a long-lived key on every request |

---

## 3. Architecture

```text
WhatsApp Capture Tool ──HTTPS──┐
                               ▼
Next.js frontend ──HTTPS──► ASP.NET Core Web API ──► PostgreSQL
```

Neither the frontend nor the capture tool ever touches the database directly.

### Folder structure

```text
BasicCRM/
├── Claude.md
├── DEVELOPMENT_PLAN.md
├── docker-compose.yml          (optional dev Postgres)
├── frontend/                   Next.js App Router, TypeScript
│   ├── app/(auth)/login
│   ├── app/(dashboard)/{dashboard,customers,calendar,bookings,payments,administration}
│   ├── components/{ui,layout,dashboard,customers,bookings,calendar,forms}
│   ├── lib/{api,auth,permissions,utils}
│   ├── hooks/
│   └── types/
├── backend/
│   ├── DoctorCrm.Api/          Controllers, Services, DTOs, Entities, Data,
│   │                           Validators, Middleware, Authentication, Authorization
│   └── DoctorCrm.Tests/        xUnit + Testcontainers
└── database/                   migration notes, seed docs, ERD
```

### Libraries

| Layer | Packages |
| --- | --- |
| Frontend | Next.js, Tailwind, shadcn/ui, Framer Motion, Lucide, TanStack Query, React Hook Form, Zod, FullCalendar, dnd-kit (drag-to-reorder), sonner (toasts) |
| Backend | EF Core + Npgsql, FluentValidation, BCrypt.Net, libphonenumber-csharp, Serilog, Swashbuckle / OpenAPI |
| Tests | xUnit, Testcontainers.PostgreSql, Playwright |

### Backend conventions
- Controllers stay thin; business rules live in services (§55). No repository layer (§57 allows it).
- DTOs only; entities are never returned.
- Every response uses `{ success, data, message, errors }` (§37).
- One error middleware logs technical detail and returns friendly messages (§47).

---

## 4. Milestones

### Milestone 1 — Foundation and login (§60 Phase 1, §68)
**Goal:** Login → animated transition → dashboard shell → authenticated API → PostgreSQL.

Backend
- [ ] Create solution and `DoctorCrm.Api` project; add EF Core + Npgsql
- [ ] `ApiResponse<T>`, error middleware, Swagger, CORS, health check, Serilog
- [ ] Entities: `users`, `roles`, `permissions`, `user_roles`, `stages` (with `system_key`), `treatments`, `system_settings`
- [ ] First migration + seed (roles, admin user, default stages, sample treatments)
- [ ] Auth: BCrypt hashing, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- [ ] HTTP-only cookie JWT, session expiry, inactive users blocked
- [ ] Role/permission policies

Frontend
- [ ] Create Next.js app; Tailwind + shadcn/ui; theme tokens (light/dark)
- [ ] Central API client (sends cookie, handles 401 → login)
- [ ] Auth context + route-protection middleware; `lib/permissions` map
- [ ] **Premium login (§7, §65):** moving gradient, floating orbs/particles, logo scale-in, card and fields staggered in, button → progress animation → dashboard transition, reduced-motion support
- [ ] Layout: collapsible sidebar (remembers state, tooltips when collapsed), mobile drawer/bottom nav, page transitions
- [ ] Dashboard and admin shells; unauthorized page

**Done when:** both apps build with no TS or C# errors and the full login → dashboard flow runs locally.

### Milestone 2 — Administration (§43, §44)
- [ ] Shared admin table component: search, add/edit drawer, activate/deactivate, drag-to-reorder
- [ ] Users: create, edit, assign role, reset password, last login
- [ ] Treatments, Stages (with colour), Lead Sources, Cancellation Reasons, Payment Methods
- [ ] Custom fields: 9 types (§32), options for dropdown/multi-select, required, enabled, order
- [ ] Capture tool configuration: built-in + custom fields, enabled/required/order, drag-and-drop (§31)
- [ ] System settings: branding (logo, name, tagline), currency, timezone
- [ ] Stage colours served by the API, never hard-coded in components

**Done when:** every admin list saves, reorders and deactivates; inactive items are hidden from new forms.

### Milestone 3 — Customers (§12–§15, §50–§52)
- [ ] Tables: `customers`, `customer_treatments`, `customer_custom_field_values`
- [ ] Indexes: `whatsapp_number` (**unique**), `stage_id`, `created_at`, `next_followup_date`
- [ ] Single WhatsApp normaliser (E.164, libphonenumber)
- [ ] `GET /api/customers`: server-side pagination, debounced search (name / WhatsApp / Instagram), combinable filters
- [ ] Customer list: filters in the URL (`/customers?stage=interested&treatment=botox`), cards on mobile
- [ ] Add/edit customer drawer with treatments and custom fields
- [ ] Customer profile: header, treatment badges, upcoming booking, booking history, activity timeline
- [ ] Audit log service called from every mutating service method (§42)

**Done when:** duplicate WhatsApp numbers are rejected in any format, and filters combine correctly.

### Milestone 4 — Bookings and calendar (§19–§27) — most business-critical
- [ ] Tables: `bookings`, `booking_treatments` (unique `booking_id + treatment_id`), `original_booking_id`
- [ ] One booking state machine: `Booked → Completed | Rescheduled | Cancelled | NoShow`; all other transitions rejected
- [ ] Booking drawer: customer autocomplete, date/time, multiple treatments, that day's existing bookings, overlap check
- [ ] Calendar (FullCalendar): day / **week (default)** / month / agenda; status colours; click opens details
- [ ] Booking details with Complete / Reschedule / Cancel / No-show actions
- [ ] Complete consultation: charge, payment status/method, optional next treatment, notes
- [ ] **Next-treatment rule:** date and treatment both empty or both filled — Zod (frontend) **and** FluentValidation (backend)
- [ ] Reschedule: original → `Rescheduled`, charge 0; new `Booked` booking copies customer, treatments, doctor; linked via `original_booking_id`
- [ ] Cancel with admin-configured reason; No-show; nothing is ever deleted
- [ ] Stage automation: booking → Booked; completion → Consultation Completed

**Done when:** every state transition and the next-treatment rule have passing backend tests.

### Milestone 5 — Payments (§28)
- [ ] `payments` table: booking, customer, amount, status (Paid / Pending / Waived), method, date, created by
- [ ] Payment recorded on consultation completion
- [ ] Payments page with filters; payment history on the customer profile

### Milestone 6 — Dashboard (§10, §11, §29)
- [ ] `GET /api/dashboard` — real data only
- [ ] Top cards: Today's Consultations, Upcoming, Follow-ups, Potential Customers (animated counters, change vs yesterday)
- [ ] Today's appointments (click → booking details)
- [ ] Stage summary (click → filtered customer list)
- [ ] Follow-ups due
- [ ] Recent activity from the audit log (timeline animation)
- [ ] Skeleton loaders for every section

### Milestone 7 — Capture API (§30–§36)
- [ ] Client-credential token endpoint; rate limiting; audit logging
- [ ] `GET /api/capture/config | treatments | stages | sources | custom-fields`
- [ ] `POST /api/capture/customers`:
    1. Validate fields against capture configuration
    2. Normalise WhatsApp number
    3. Find or create customer → return `action: "created" | "updated"`
    4. Merge treatment interests (don't replace)
    5. Apply stage; save custom fields
    6. Write audit entry; return `customerId`
- [ ] Swagger examples for every capture endpoint

### Milestone 8 — Polish (§46–§49, §54, §64)
- [ ] Every screen: loading, empty, error and success states
- [ ] Toasts used sparingly
- [ ] Responsive check at 375 / 768 / 1024 / 1440 px
- [ ] Accessibility: keyboard, focus, ARIA, contrast, reduced motion
- [ ] Performance: query caching, indexes, bundle size
- [ ] Production builds of both apps; confirm no secrets exposed

### Effort summary

| # | Milestone | Rough effort |
| --- | --- | --- |
| 1 | Foundation and login | Large |
| 2 | Administration | Medium |
| 3 | Customers | Medium |
| 4 | Bookings and calendar | Large |
| 5 | Payments | Small |
| 6 | Dashboard | Small–Medium |
| 7 | Capture API | Medium |
| 8 | Polish | Medium |

---

## 5. Testing strategy

**Backend (xUnit + Testcontainers PostgreSQL)** — must pass before a milestone closes:
- Every booking state transition, including: rescheduled bookings have charge 0; bookings are never deleted
- Duplicate WhatsApp detection across formats (`+971 50 123 4567`, `0501234567`, `971501234567`)
- Next-treatment validation — all 4 cases (§24)
- Capture-config validation (required / disabled fields)
- Permission checks per role; inactive user cannot log in

**Frontend**
- Unit tests for Zod schemas (next-treatment rule especially)
- Playwright smoke test after Milestone 4: login → book → complete → reschedule

---

## 6. Getting started

1. **Confirm the six decisions** in section 2.
2. **Add PostgreSQL to PATH** (or use Docker):
   ```powershell
   $env:Path += ";C:\Program Files\PostgreSQL\18\bin"
   psql -U postgres -c "CREATE DATABASE doctor_crm;"
   ```
   Docker alternative:
   ```powershell
   docker run -d --name doctor-crm-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=doctor_crm -p 5432:5432 postgres:18
   ```
3. **Initialise git** so every milestone is a commit: `git init`.
4. **Create environment files** (never commit real values):
   - `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:5000`
   - `backend/DoctorCrm.Api/appsettings.Development.json` (or user-secrets) →
     `ConnectionStrings__DefaultConnection`, `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience`, `CaptureApi__ClientId`, `CaptureApi__ClientSecret`
   - Commit only `.env.example` / `appsettings.Development.example.json`.
5. **Install the EF tool:** `dotnet tool install --global dotnet-ef`.
6. **Start Milestone 1** — ask Claude: _"Start Milestone 1 from DEVELOPMENT_PLAN.md."_

### Daily run commands (after Milestone 1)
```powershell
# backend
cd backend/DoctorCrm.Api; dotnet run
# frontend
cd frontend; npm run dev
```
