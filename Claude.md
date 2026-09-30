# Doctor CRM — Master Development Specification

## 1. Project Overview

Build a modern, premium, highly user-friendly Doctor CRM focused on:

* Capturing potential customers from an external WhatsApp CRM Capture Tool
* Managing customer information
* Tracking interested treatments
* Tracking customer stages
* Booking consultations
* Managing consultation calendar
* Completing consultations
* Recording consultation charges and payments
* Optionally scheduling the next treatment
* Identifying potential customers through CRM stages
* Providing an attractive, animated dashboard
* Providing an administration panel for users, treatments, stages, custom fields, and capture-tool configuration

This is NOT a full medical records system.

Do not build unnecessary medical functionality.

The application should feel like a premium SaaS CRM.

---

# 2. Technology Stack

## Frontend

Use:

* Next.js
* TypeScript
* App Router
* Tailwind CSS
* shadcn/ui where appropriate
* Framer Motion for UI animation
* Lucide React icons
* FullCalendar or an equivalent professional calendar component
* React Hook Form
* Zod
* TanStack Query for API/server state where appropriate

## Backend

Use:

* ASP.NET Core Web API
* C#
* Entity Framework Core
* PostgreSQL
* JWT or secure HTTP-only cookie authentication
* FluentValidation where useful

## Database

PostgreSQL.

Do NOT use MySQL.

---

# 3. Architecture

Use a clean separation:

```text
doctor-crm/
│
├── frontend/
│   └── Next.js application
│
├── backend/
│   └── ASP.NET Core Web API
│
├── database/
│   └── PostgreSQL migrations / documentation
│
└── CLAUDE.md
```

Frontend and backend must communicate through REST APIs.

The frontend must NEVER directly access PostgreSQL.

The external WhatsApp Capture Tool must also NEVER directly access PostgreSQL.

Everything must go through the backend API.

Architecture:

```text
WhatsApp Capture Tool
        |
        | HTTPS REST API
        v
ASP.NET Core API
        |
        v
PostgreSQL


Next.js
   |
   | HTTPS REST API
   v
ASP.NET Core API
   |
   v
PostgreSQL
```

---

# 4. Core Product Philosophy

The application must be:

* Simple
* Fast
* Attractive
* Modern
* Minimal
* Easy for non-technical users
* Optimized for daily repetitive usage
* Mobile responsive
* Desktop friendly
* Animation-rich but not distracting

Do NOT make the application look like an old hospital management system.

Do NOT create huge forms.

Do NOT overload screens with information.

Use progressive disclosure.

Show important information first and secondary information only when required.

---

# 5. Visual Design Direction

The CRM should look like a premium modern SaaS product.

Design inspiration:

* Linear
* Stripe Dashboard
* Vercel
* Notion
* Modern healthcare SaaS
* Premium fintech dashboards

Do NOT copy any one product.

Use the principles:

* Clean spacing
* Rounded cards
* Subtle shadows
* Glass effects where appropriate
* Elegant typography
* Strong hierarchy
* Soft gradients
* Smooth transitions
* Excellent empty states
* Beautiful loading states
* Premium hover interactions

Avoid:

* Excessive gradients
* Excessive glassmorphism
* Huge cards
* Too many colors
* Excessive animations
* Cluttered dashboards
* Tiny text
* Old-fashioned Bootstrap-like UI

---

# 6. Animation Philosophy

Animation is a major requirement.

The application should feel alive.

Use Framer Motion.

Animations should communicate:

* Navigation
* State changes
* Success
* Loading
* Context
* Focus
* Interaction

Animations must NOT make normal CRM operations slow.

Use:

* 150–250ms micro-interactions
* 250–400ms page transitions
* Smooth spring animations for important elements
* Staggered entrance animations
* Subtle hover movement
* Scale 0.98–1.02 interactions
* Fade + slide transitions
* Animated counters
* Skeleton loaders
* Animated status changes
* Toast animations

Respect:

```text
prefers-reduced-motion
```

and reduce animations when the user has requested reduced motion.

---

# 7. LOGIN EXPERIENCE

The login screen must be one of the strongest visual experiences in the application.

The goal is:

> Users should enjoy opening the application every day.

Do NOT make a generic:

```text
Email
Password
Login
```

screen.

Create a premium animated login experience.

## Login layout

Desktop:

```text
------------------------------------------------------
|                                                    |
|       Animated Brand / Visual      | Login        |
|                                     |              |
|       Doctor CRM                    | Welcome back |
|       Premium CRM experience        |              |
|                                     | Email        |
|       Animated abstract medical     | Password     |
|       / healthcare visual           |              |
|                                     | [ Sign In ]  |
|                                     |              |
------------------------------------------------------
```

On mobile, use a beautiful full-screen layout.

## Login animation

On page load:

1. Logo appears with subtle scale/fade
2. Background gradient slowly moves
3. Decorative particles/orbs move subtly
4. Login card enters smoothly
5. Form fields appear sequentially
6. Button has subtle hover animation

When user enters email:

* Field gets elegant focus animation

When password is entered:

* Password visibility icon animates

When submitting:

```text
Sign In
   ↓
button transforms
   ↓
loading animation
   ↓
successful authentication
   ↓
dashboard transition
```

Do NOT use annoying spinning loaders everywhere.

Use elegant progress animations.

## Login branding

Create a configurable:

```text
CRM Logo
CRM Name
Tagline
```

Admin should eventually be able to configure branding.

---

# 8. AUTHENTICATION

Implement:

* Login
* Logout
* Current user
* Session handling
* Protected routes
* Role-based permissions
* Unauthorized page
* Session expiry handling

Roles:

```text
Admin
Doctor
Receptionist
Staff
```

Do not hard-code permissions throughout the frontend.

Create a centralized permission system.

---

# 9. MAIN NAVIGATION

Use a modern sidebar.

Desktop:

```text
┌────────────────────────────┐
│ LOGO                       │
│ Doctor CRM                 │
├────────────────────────────┤
│                            │
│ ◉ Dashboard                │
│ ◉ Customers                │
│ ◉ Calendar                 │
│ ◉ Bookings                 │
│ ◉ Payments                 │
│                            │
│ MANAGEMENT                 │
│ ◉ Administration           │
│                            │
├────────────────────────────┤
│ User                       │
│ Doctor Name                │
│ Role                       │
└────────────────────────────┘
```

Sidebar should:

* Animate open/close
* Support collapsed mode
* Remember state
* Have tooltips when collapsed

Mobile:

Use a mobile bottom navigation or animated drawer.

---

# 10. DASHBOARD

The dashboard should immediately answer:

> What needs my attention today?

Top cards:

```text
Today's Consultations
Upcoming
Follow-ups
Potential Customers
```

Use animated numbers.

Example:

```text
Today's Consultations
8
+2 from yesterday
```

Do not invent fake analytics.

Only show real backend data.

---

# 11. DASHBOARD SECTIONS

## Today's Appointments

Display:

* Time
* Customer
* Treatments
* Status

Example:

```text
09:30
Sarah Fernando

Botox + Filler

Booked
```

Click opens booking details.

## Potential Customers

Show stage summary:

```text
Interested       42
Follow-up        18
Booked            9
Completed         7
```

These should be clickable.

Clicking "Interested" opens:

```text
Customers?stage=interested
```

## Follow-ups

Show customers requiring follow-up.

## Recent Activity

Example:

```text
Sarah was added
2 minutes ago

John's consultation completed
15 minutes ago

Maria's appointment rescheduled
1 hour ago
```

Use subtle timeline animation.

---

# 12. CUSTOMER MANAGEMENT

Customer list must be extremely easy to use.

Header:

```text
Customers

[ Search customers... ]

[Stage]
[Treatment]
[Date]
[Source]

[ + Add Customer ]
```

Table:

```text
Name
WhatsApp
Instagram
Interested Treatments
Stage
Next Booking
Created
```

Rows should have:

* Hover animation
* Clickable row
* Status badge
* Treatment badges
* Smooth transitions

Use server-side pagination.

Do not load thousands of customers into the browser.

---

# 13. CUSTOMER PROFILE

Customer profile is a major screen.

Layout:

```text
--------------------------------------------------
Sarah Fernando

WhatsApp
+971 XXXXXXXX

Instagram
@sarah

Stage
Interested

[Book Consultation]
[Edit]
--------------------------------------------------

Interested Treatments

[ Botox ] [ Filler ] [ Hair Treatment ]


Upcoming Booking

02 Oct 2026
04:00 PM

Botox + Filler
Booked


Booking History

30 Sep
Rescheduled

02 Oct
Booked


Activity

Customer created
Treatment added
Booking created
Booking rescheduled
```

Use tabs only if they improve usability.

Avoid excessive tabs.

---

# 14. CUSTOMER DATA

Customer master fields:

```text
ID
Created Date
Name
WhatsApp Number
Secondary Contact Number
Instagram Name
Stage
Assigned User
Lead Source
Notes
Last Contact Date
Next Follow-up Date
```

Treatments must NOT be stored as a single text field.

Use a many-to-many relationship.

---

# 15. CUSTOMER TREATMENTS

A customer can have multiple interested treatments.

Example:

```text
Customer
Sarah

Interested Treatments:

Botox
Filler
Skin Treatment
```

Database:

```text
customers
customer_treatments
treatments
```

Do not duplicate treatment names in customer records.

---

# 16. TREATMENT MASTER

Admin can manage treatments.

Fields:

```text
ID
Name
Description
Active
Display Order
Created Date
Updated Date
```

Examples:

```text
Botox
Dermal Filler
Hair Treatment
Skin Treatment
Laser
```

Inactive treatments should not appear in new forms but must remain visible in historical records.

---

# 17. CUSTOMER STAGES

Admin-configurable stages.

Default:

```text
Interested
Follow-up
Booked
Consultation Completed
Treatment Started
Completed
Lost
```

Stages must be configurable from Administration.

Fields:

```text
ID
Name
Color
Display Order
Active
```

Use stage colors consistently throughout the UI.

Do not hard-code stage colors in individual components.

---

# 18. STAGE AUTOMATION

The CRM owns stage automation.

When a customer is captured:

```text
New customer
    ↓
Interested
```

When a consultation is booked:

```text
Interested / Follow-up
    ↓
Booked
```

When consultation is completed:

```text
Booked
    ↓
Consultation Completed
```

Do not make the external Capture Tool responsible for this business logic.

---

# 19. CONSULTATION BOOKING

Booking consists of:

```text
Customer
Date
Start Time
End Time
Multiple Treatments
Status
Notes
```

A booking can contain multiple treatments.

Example:

```text
Sarah Fernando

02 October
4:00 PM

Treatments:
✓ Botox
✓ Dermal Filler
✓ Skin Treatment
```

Do NOT create separate bookings for each treatment.

---

# 20. BOOKING FORM

Use a beautiful modal/drawer.

```text
Book Consultation

Customer
[ Sarah Fernando ]

Date
[ 02 Oct 2026 ]

Time
[ 04:00 PM ]

Treatments
[ Botox ] [ Filler ] [ + Add ]

Notes
[...........................]

[ Cancel ] [ Book Consultation ]
```

Use autocomplete for customer search.

Prevent accidental duplicate bookings.

Show existing bookings when selecting a time.

---

# 21. CALENDAR

Use a professional calendar.

Support:

* Day
* Week
* Month
* Agenda

Default should be:

```text
Week
```

Calendar event should display:

```text
4:00 PM
Sarah
Botox + Filler
```

Use status-based visual styling.

Clicking an event opens booking details.

---

# 22. BOOKING DETAILS

Display:

```text
Sarah Fernando

02 October 2026
4:00 PM

Treatments
Botox
Filler

Status
Booked

[Complete]
[Reschedule]
[Cancel]
```

Doctor should be able to perform actions quickly.

---

# 23. COMPLETE CONSULTATION

When completing:

```text
Complete Consultation

Customer
Sarah Fernando

Treatments
Botox
Filler

Consultation Charge
[ AED 250 ]

Payment Status
[ Paid / Pending / Waived ]

Payment Method
[ Cash / Card / Bank Transfer / Other ]

Next Treatment Date
[ Optional ]

Next Treatment
[ Optional ]

Doctor Notes
[ Optional ]

[ Complete Consultation ]
```

---

# 24. NEXT TREATMENT VALIDATION

Business rule:

Both fields can be empty.

If one is provided, the other is required.

Valid:

```text
Date = empty
Treatment = empty
```

Valid:

```text
Date = 2026-10-15
Treatment = Botox
```

Invalid:

```text
Date = 2026-10-15
Treatment = empty
```

Invalid:

```text
Date = empty
Treatment = Botox
```

Implement validation in BOTH:

* Frontend
* Backend

Never rely only on frontend validation.

---

# 25. RESCHEDULE

When rescheduling:

Original booking:

```text
Status = Rescheduled
```

Create new booking:

```text
Status = Booked
```

The new booking retains:

* Customer
* Treatments
* Doctor

Rescheduled booking must have:

```text
Consultation Charge = 0
```

Do not charge for the rescheduled appointment.

Keep a relationship:

```text
original_booking_id
```

so the booking history remains traceable.

---

# 26. CANCEL

Cancellation:

```text
Status = Cancelled
```

Capture cancellation reason.

Cancellation reasons can be admin-configured.

Do not delete the booking.

Historical bookings must remain in the database.

---

# 27. NO SHOW

Support:

```text
No Show
```

Do not delete no-show records.

---

# 28. PAYMENTS

Keep payment information attached to the consultation/booking.

Minimum fields:

```text
Booking ID
Customer ID
Amount
Payment Status
Payment Method
Payment Date
Created By
```

Payment statuses:

```text
Paid
Pending
Waived
```

Do not store only a total customer balance.

Historical transactions must remain traceable.

---

# 29. FOLLOW-UP

Follow-up is intentionally lightweight.

Customer can have:

```text
Next Follow-up Date
```

Show follow-ups on dashboard.

Example:

```text
Follow-ups Today

Sarah Fernando
Botox
10:00 AM

John
Filler
11:30 AM
```

Do not build a complicated task management system unless required later.

---

# 30. EXTERNAL WHATSAPP CAPTURE TOOL

The WhatsApp capture tool is a separate application.

The CRM must expose APIs specifically for it.

The capture tool must NOT access the database.

---

# 31. CAPTURE CONFIGURATION

Admin must be able to configure which fields appear in the external capture tool.

Example:

```text
Capture Tool Fields

☑ Name                 Required
☑ WhatsApp Number      Required
☑ Secondary Number     Optional
☑ Instagram            Optional
☑ Interested Treatment Optional
☑ Stage                Required
☐ Lead Source          Optional
☐ Notes                Optional
☐ Email                Optional
```

Admin should also be able to configure:

* Enabled/disabled
* Required/optional
* Display order

Prefer drag-and-drop ordering.

---

# 32. CUSTOM FIELDS

Support custom fields.

Types:

```text
Text
Textarea
Number
Phone
Email
Date
Dropdown
Multi-select
Boolean
```

Admin can create:

```text
Field Name
Field Type
Required
Enabled
Display Order
Options
```

The external capture tool receives these dynamically.

---

# 33. CAPTURE CONFIG API

Create:

```http
GET /api/capture/config
```

Return:

```json
{
  "fields": [
    {
      "key": "name",
      "label": "Name",
      "type": "text",
      "enabled": true,
      "required": true,
      "order": 1
    }
  ]
}
```

Also:

```http
GET /api/capture/treatments
GET /api/capture/stages
GET /api/capture/sources
GET /api/capture/custom-fields
```

---

# 34. CAPTURE CUSTOMER API

Create:

```http
POST /api/capture/customers
```

Example:

```json
{
  "name": "Sarah Fernando",
  "whatsapp": "+971501234567",
  "secondaryPhone": "",
  "instagram": "@sarah",
  "stageId": 1,
  "treatmentIds": [1, 2],
  "customFields": {
    "lead_source": "Instagram"
  },
  "notes": "Interested in pricing"
}
```

The backend must:

1. Validate fields against capture configuration
2. Normalize WhatsApp number
3. Search existing customer
4. Create or update customer
5. Add treatment interests
6. Apply stage
7. Save custom fields
8. Create audit entry
9. Return customer ID

---

# 35. DUPLICATE CUSTOMER HANDLING

WhatsApp number should be the primary duplicate detection mechanism.

Do not create duplicates when the same WhatsApp number is captured.

Response:

```json
{
  "success": true,
  "customerId": 1052,
  "action": "updated"
}
```

or:

```json
{
  "success": true,
  "customerId": 1053,
  "action": "created"
}
```

The capture tool should receive enough information to tell the user whether the customer was created or updated.

---

# 36. CAPTURE API SECURITY

Do not expose an unauthenticated customer creation API.

Use:

* HTTPS
* Application authentication
* API credentials / OAuth-style client authentication
* Rate limiting
* Request validation
* Audit logging

Never expose PostgreSQL directly.

Never put database credentials in the frontend.

Never put backend secrets in Next.js public environment variables.

---

# 37. API STRUCTURE

Organize backend endpoints approximately:

```text
/api/auth
/api/users
/api/customers
/api/treatments
/api/stages
/api/bookings
/api/payments
/api/followups
/api/dashboard
/api/reports
/api/admin
/api/capture
```

Use REST conventions.

Return consistent API responses.

Example:

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

Error:

```json
{
  "success": false,
  "data": null,
  "message": "Customer not found",
  "errors": []
}
```

---

# 38. DATABASE

Use PostgreSQL.

Recommended core tables:

```text
users
roles
permissions
user_roles

customers
customer_treatments

treatments
stages
lead_sources

bookings
booking_treatments

payments

custom_fields
custom_field_options
customer_custom_field_values

capture_field_configurations

followups

cancellation_reasons

audit_logs
```

---

# 39. CUSTOMER TABLE

Recommended fields:

```text
id
created_at
updated_at

name
whatsapp_number
secondary_phone
instagram_name

stage_id
assigned_user_id
lead_source_id

last_contact_date
next_followup_date

notes

is_active
```

Use proper PostgreSQL indexes.

Especially index:

```text
whatsapp_number
stage_id
created_at
next_followup_date
```

---

# 40. BOOKING TABLE

Fields:

```text
id
customer_id
doctor_id

booking_date
start_time
end_time

status

consultation_charge
payment_status
payment_method

notes

original_booking_id

completed_at
cancelled_at
rescheduled_at

created_at
updated_at
```

---

# 41. BOOKING TREATMENTS

```text
id
booking_id
treatment_id
```

Composite unique constraint:

```text
booking_id + treatment_id
```

Prevent duplicate treatment selection within the same booking.

---

# 42. AUDIT LOG

Important actions should be recorded.

Examples:

```text
Customer Created
Customer Updated
Treatment Added
Booking Created
Booking Rescheduled
Booking Cancelled
Consultation Completed
Payment Recorded
Stage Changed
```

Fields:

```text
id
user_id
action
entity_type
entity_id
metadata
created_at
```

---

# 43. ADMIN PANEL

Administration:

```text
Users
Treatments
Stages
Lead Sources
Custom Fields
Capture Tool Configuration
Cancellation Reasons
Payment Methods
System Settings
```

Keep administration simple.

Use tables with:

* Search
* Add
* Edit
* Activate/deactivate
* Reorder where required

Use modals/drawers instead of navigating to many tiny pages.

---

# 44. USER MANAGEMENT

Admin can:

* Create user
* Edit user
* Activate/deactivate
* Assign role
* Reset password
* View last login

Roles:

```text
Admin
Doctor
Receptionist
Staff
```

Do not allow inactive users to authenticate.

---

# 45. RESPONSIVE DESIGN

Must work beautifully on:

* Desktop
* Laptop
* Tablet
* Mobile

Desktop should prioritize productivity.

Mobile should prioritize:

```text
Dashboard
Customers
Calendar
Booking
```

Tables should become cards on small screens.

Do not simply shrink desktop tables until they become unusable.

---

# 46. LOADING STATES

Every API-driven screen must have a proper loading state.

Use skeletons instead of blank screens.

Examples:

```text
Customer list skeleton
Dashboard card skeleton
Calendar loading state
Customer profile skeleton
```

Avoid showing:

```text
Loading...
```

everywhere.

---

# 47. ERROR HANDLING

Errors must be user-friendly.

Never expose:

```text
NullReferenceException
SQL exception
Stack trace
500 Internal Server Error
```

to normal users.

Show:

```text
Something went wrong.
Please try again.
```

Log technical details on the backend.

---

# 48. TOAST NOTIFICATIONS

Use elegant animated toast notifications.

Examples:

```text
✓ Customer created

✓ Consultation booked

✓ Appointment rescheduled

✓ Consultation completed

⚠ Please select a treatment

✕ Unable to save changes
```

Use appropriate duration.

Do not overuse toasts.

---

# 49. EMPTY STATES

Every empty page should have a meaningful empty state.

Example:

```text
No consultations today

Your calendar is clear.

[ Book Consultation ]
```

Customer:

```text
No customers found

Try changing your filters or add a new customer.

[ Add Customer ]
```

---

# 50. SEARCH

Search should feel instant.

Customer search should support:

* Name
* WhatsApp
* Instagram

Use debouncing.

Example:

```text
Search customers...
```

Do not make users click Search after every query.

---

# 51. FILTERING

Customer filters:

```text
Stage
Treatment
Lead Source
Assigned User
Created Date
Follow-up Date
```

Filters should be combinable.

Example:

```text
Stage = Interested
Treatment = Botox
```

This should show potential Botox customers.

---

# 52. URL-BASED FILTER STATE

Use URL query parameters for important filters.

Example:

```text
/customers?stage=interested&treatment=botox
```

This makes filtered screens shareable and bookmarkable.

---

# 53. PERFORMANCE

The application must feel fast.

Requirements:

* Server-side pagination
* API pagination
* Database indexes
* Debounced search
* Lazy loading where useful
* Optimistic UI only when safe
* TanStack Query caching
* Avoid unnecessary API calls
* Avoid huge client-side datasets

Do not sacrifice usability for animation.

---

# 54. ACCESSIBILITY

Support:

* Keyboard navigation
* Focus states
* ARIA labels
* Accessible dialogs
* Accessible forms
* Sufficient contrast
* Reduced motion

---

# 55. CODE QUALITY

Frontend:

* Reusable components
* Feature-based organization
* Strong TypeScript types
* No `any` unless absolutely necessary
* Central API client
* Central auth handling
* Central permissions

Backend:

* Controllers should remain thin
* Business logic belongs in services
* Use DTOs
* Entity models must not be returned directly
* Validation
* Proper exception handling
* Dependency injection
* EF Core migrations

---

# 56. FRONTEND STRUCTURE

Suggested:

```text
frontend/
  app/
    (auth)/
      login/
    (dashboard)/
      dashboard/
      customers/
      calendar/
      bookings/
      payments/
      administration/

  components/
    ui/
    layout/
    dashboard/
    customers/
    bookings/
    calendar/
    forms/

  lib/
    api/
    auth/
    permissions/
    utils/

  hooks/

  types/
```

Use route groups appropriately.

---

# 57. BACKEND STRUCTURE

Suggested:

```text
backend/
  Controllers/
  Services/
  DTOs/
  Entities/
  Data/
  Repositories/
  Validators/
  Middleware/
  Authentication/
  Authorization/
```

If the project remains small, do not over-engineer repositories unnecessarily.

EF Core services are acceptable.

---

# 58. ENVIRONMENT VARIABLES

Frontend:

```text
NEXT_PUBLIC_API_URL=
```

Only expose values that are genuinely public.

Backend:

```text
ConnectionStrings__DefaultConnection=
Jwt__Key=
Jwt__Issuer=
Jwt__Audience=
CaptureApi__ClientId=
CaptureApi__ClientSecret=
```

Never commit secrets.

Provide:

```text
.env.example
```

---

# 59. API DOCUMENTATION

Enable Swagger/OpenAPI in development.

Document all endpoints.

The external capture-tool API must be clearly documented.

The capture API should have example request/response payloads.

---

# 60. DEVELOPMENT PROCESS

Build incrementally.

Do NOT try to generate the entire application in one giant untested implementation.

Recommended order:

## Phase 1

Project setup:

* Next.js
* ASP.NET Core
* PostgreSQL
* EF Core
* Authentication
* Base layout
* Theme
* Login

## Phase 2

Admin:

* Users
* Treatments
* Stages
* Lead sources
* Custom fields
* Capture configuration

## Phase 3

Customers:

* Customer CRUD
* Customer treatments
* Search
* Filtering
* Customer profile

## Phase 4

Bookings:

* Booking CRUD
* Multiple treatments
* Calendar
* Complete
* Reschedule
* Cancel
* No-show

## Phase 5

Payments:

* Consultation charge
* Payment status
* Payment method
* Payment history

## Phase 6

Dashboard:

* Today's appointments
* Potential customers
* Follow-ups
* Activity

## Phase 7

Capture API:

* Configuration API
* Customer capture
* Duplicate detection
* Treatment/stage APIs
* Authentication
* Audit logs

## Phase 8

Polish:

* Animations
* Loading states
* Empty states
* Error states
* Responsive design
* Accessibility
* Performance

---

# 61. IMPORTANT BUSINESS RULES

Implement these exactly.

### Customer

A WhatsApp number should normally identify an existing customer.

Do not create duplicates.

### Treatments

Customers can have multiple interested treatments.

### Booking

A booking can contain multiple treatments.

### Booking completion

Consultation charge is entered when completing the consultation.

### Next treatment

Both fields can be empty.

If either is entered, both must be entered.

```text
Date empty + Treatment empty = VALID

Date filled + Treatment filled = VALID

Date filled + Treatment empty = INVALID

Date empty + Treatment filled = INVALID
```

### Reschedule

Rescheduled booking has no charge.

### Cancellation

Never delete the booking.

### No Show

Never delete the booking.

### Stage

Booking and consultation actions can automatically update customer stage.

### Capture Tool

The external capture tool does not own business logic.

CRM backend owns business rules.

---

# 62. DO NOT BUILD

Do not add these unless specifically requested later:

* Medical diagnosis
* Medical records
* Prescription management
* Insurance management
* Pharmacy management
* Complex treatment plans
* Inventory
* Laboratory management
* Hospital management
* Complicated patient charting
* Complex accounting
* Payroll
* Marketing automation
* AI chatbot

Keep the product focused.

---

# 63. UX PRIORITY

Every screen should answer:

> What is the user trying to do?

For common actions, minimize clicks.

Examples:

### Add customer

Target:

```text
Capture → Save
```

### Book

Target:

```text
Customer → Book → Date → Time → Treatments → Save
```

### Complete

Target:

```text
Booking → Complete → Charge → Payment → Complete
```

### Reschedule

Target:

```text
Booking → Reschedule → New Date/Time → Save
```

---

# 64. MICRO-INTERACTIONS

Add polished interactions:

* Button hover
* Card hover
* Sidebar transitions
* Modal entrance/exit
* Dropdown animations
* Status badge transitions
* Calendar event hover
* Customer row hover
* Success check animation
* Animated counters
* Smooth page transitions
* Skeleton shimmer
* Toast entrance/exit

Animations must remain subtle enough for professional daily use.

---

# 65. PREMIUM LOGIN REQUIREMENT

Spend additional design effort on the login screen.

It should feel like opening a premium application.

Possible visual direction:

```text
Dark / sophisticated background
+
Soft animated gradient
+
Abstract medical / wellness visual
+
Floating particles
+
Elegant logo animation
+
Glass or solid premium login card
+
Smooth form interaction
```

Do not use cheesy medical stock images.

Use an abstract premium visual.

Allow branding to be changed later.

---

# 66. FINAL QUALITY STANDARD

Before considering a feature complete, verify:

### Functionality

* API works
* Validation works
* Database persistence works
* Error handling works
* Permissions work

### UI

* Desktop works
* Mobile works
* Loading state exists
* Empty state exists
* Error state exists
* Success state exists
* Animations work

### Security

* Protected APIs
* Role permissions
* No secrets exposed
* No direct DB access
* Input validation

### UX

* Minimal clicks
* Clear labels
* No confusing forms
* No unnecessary fields
* Consistent terminology

---

# 67. CLAUDE CODE WORKING RULES

When implementing this project:

1. Inspect the existing project before modifying files.
2. Do not overwrite working code unnecessarily.
3. Keep changes modular.
4. Build and test after major changes.
5. Fix TypeScript errors before moving forward.
6. Fix C# compilation errors before moving forward.
7. Run EF migrations after database model changes.
8. Never invent API responses.
9. Never hard-code database data.
10. Never hard-code configurable treatments or stages.
11. Keep business rules in the backend.
12. Keep the frontend responsible for presentation and UX.
13. Reuse components.
14. Avoid duplicated API logic.
15. Do not create unnecessary abstractions.
16. Do not install unnecessary dependencies.
17. Keep the UI premium and simple.
18. Do not sacrifice usability for visual effects.
19. Test all booking state transitions.
20. Test duplicate customer detection.
21. Test capture-tool configuration.
22. Test next-treatment validation on both frontend and backend.

---

# 68. FIRST IMPLEMENTATION TASK

Start by creating the project foundation.

Create:

```text
Next.js frontend
ASP.NET Core Web API
PostgreSQL database
EF Core
Authentication
Base application layout
Animated login
Dashboard shell
Admin shell
API client
Global error handling
Theme
```

Then create the database entities and migrations.

Do NOT implement every module immediately.

After the foundation is compiling and running correctly, proceed module-by-module.

The first milestone must produce:

```text
Login
    ↓
Animated transition
    ↓
Dashboard
    ↓
Sidebar navigation
    ↓
Authenticated API
    ↓
PostgreSQL connection
```

The application must be runnable locally before continuing to the next milestone.

---

# 69. DEFINITION OF DONE

The Doctor CRM is complete only when:

* Login is polished and animated
* Authentication works
* Dashboard works
* Customer management works
* Multiple treatment interests work
* Customer search/filter works
* Calendar works
* Bookings support multiple treatments
* Consultation completion works
* Consultation charge works
* Payment recording works
* Next treatment validation works
* Rescheduling works
* Rescheduled bookings have no charge
* Cancellation works
* No-show works
* Customer stages work
* Admin can manage users
* Admin can manage treatments
* Admin can manage stages
* Admin can manage custom fields
* Admin can configure capture-tool fields
* External capture API works
* Duplicate WhatsApp customers are handled
* Audit logging works
* Responsive UI works
* Loading/empty/error states work
* Backend validation works
* Frontend validation works
* PostgreSQL migrations work
* Swagger documentation works
* Production build succeeds
* No TypeScript errors
* No C# compilation errors
* No exposed secrets
* No direct database access from frontend or capture tool

The final product should feel like a **premium SaaS CRM**, while remaining simple enough that a doctor or receptionist can learn it in minutes.
