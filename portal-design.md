# ERP Employee Portal --- UI/UX Guidelines & Architecture

## 1. Product Principle

The ERP should be designed around one core principle:

> **Each employee should immediately see what they need to do next,
> without having to understand the entire ERP.**

The four employee portals should share the same visual language and
components, while their dashboard hierarchy and available actions differ
according to role.

### Roles

1.  Sales
2.  Technician / Cleaner / Plumber / Other Executors
3.  Sales Supervisor
4.  Customer Support

------------------------------------------------------------------------

# 2. Global Application Shell

Use one consistent application shell across all roles.

``` text
┌─────────────────────────────────────────────────────────────────┐
│ LOGO       Search...                     🔔   ?   👤 John Doe ▾ │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  Dashboard   │              PAGE CONTENT                        │
│              │                                                  │
│  Customers   │                                                  │
│  Jobs        │                                                  │
│  Reports     │                                                  │
│              │                                                  │
│  ──────────  │                                                  │
│  Settings    │                                                  │
│  Help        │                                                  │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### Sidebar

Recommended width: **220--250px**.

Use:

-   Icon
-   Label
-   Active state
-   Notification/task badges

Keep the primary navigation to approximately **6--8 items**.

Example:

``` text
▣ Dashboard

👥 Customers
📋 Leads
💰 Quotations
📅 Schedule
📊 Performance

──────────────

🔔 Notifications
⚙ Settings
```

------------------------------------------------------------------------

# 3. Dashboard UX Principle

Every dashboard should answer three questions:

1.  **What is happening?**
2.  **What needs my attention?**
3.  **What should I do next?**

Recommended dashboard structure:

``` text
PAGE HEADER
Greeting + date + primary action

        ↓

KEY METRICS

        ↓

ATTENTION / ACTIONS

        ↓

MAIN WORK AREA

        ↓

SECONDARY INFORMATION
```

Do not design dashboards as collections of statistics. The primary
purpose is to help employees act.

------------------------------------------------------------------------

# 4. Sales Portal

The Sales portal should function as a combination of:

-   CRM
-   Lead management
-   Quotation management
-   Customer management
-   Follow-up/task management
-   Sales performance center

## Sales Navigation

``` text
Dashboard
Leads
Customers
Quotations
Follow-ups
Calendar
Performance
Notifications
```

## Sales Dashboard

Header:

``` text
Good morning, John 👋

Here's your sales performance for October.

                         + New Lead
                         + New Quotation
```

Primary actions should be visible without requiring navigation through
multiple menus.

## Sales KPI Cards

Use approximately 4--5 cards.

``` text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Revenue      │ │ Deals Won    │ │ Conversion   │ │ Commission   │
│ $24,800      │ │ 27           │ │ 32.4%        │ │ $2,480       │
│ ↑ 12%        │ │ ↑ 4          │ │ ↑ 3.2%       │ │ ↑ 8%         │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

Avoid overcrowding the dashboard with too many KPI cards.

## Sales Performance + Team Ranking

The Sales team specifically needs performance comparison.

Place **My Performance** beside **Team Leaderboard**.

``` text
┌─────────────────────────────────┬─────────────────────────────────┐
│ MY PERFORMANCE                  │ TEAM LEADERBOARD               │
│                                 │                                 │
│ Revenue                         │ 🥇 Sarah       $28,400         │
│ ███████████████░░░  82%         │ 🥈 Michael     $24,800         │
│                                 │ 🥉 David       $21,200         │
│ Target: $30,000                 │                                 │
│                                 │ You are #4                     │
│ $24,800 / $30,000               │ ↑ 2 positions this month       │
└─────────────────────────────────┴─────────────────────────────────┘
```

Recommended ranking filters:

-   Revenue
-   Deals won
-   New customers
-   Conversion rate
-   Commission
-   Target achievement

Time filters:

-   Today
-   This week
-   This month
-   This quarter
-   This year

### Motivational UX

Show actionable ranking information:

> You're #4 this month.

> \$3,200 to overtake Michael.

This makes the leaderboard useful rather than purely informational.

## Sales Pipeline

Use a visual pipeline:

``` text
LEADS
124
 ↓
QUALIFIED
78
 ↓
QUOTATIONS
52
 ↓
NEGOTIATION
24
 ↓
WON
17
```

A Kanban view can also be used.

## Sales Attention Area

Include a prominent action area:

``` text
⚠ NEEDS YOUR ATTENTION

3 quotations need follow-up
5 leads haven't been contacted
2 customer meetings today

                         View all →
```

The system should surface tasks instead of forcing users to discover
them.

------------------------------------------------------------------------

# 5. Technician Portal

The Technician portal should be much simpler than the Sales portal.

Technicians need to answer:

> **What jobs do I have today, and what do I need to do?**

They should not see unnecessary CRM or sales information.

## Technician Navigation

``` text
Dashboard
My Jobs
Schedule
Job History
Materials
Performance
Notifications
```

## Technician Dashboard

``` text
Good morning, James 👋

You have 4 jobs today.

                         [ View Schedule ]
```

Then show the day's jobs as large, action-oriented cards.

``` text
┌──────────────────────────────────────────────────────────┐
│ 08:00 AM                                  ● ASSIGNED     │
│                                                          │
│ ABC Office                                              │
│ Office Cleaning                                          │
│ 📍 Kampala Road                                          │
│                                                          │
│ 2 hr estimated                                           │
│                                                          │
│ [ View Job ]                         [ Navigate ]        │
└──────────────────────────────────────────────────────────┘
```

## Technician Job Detail

``` text
ABC OFFICE
Office Cleaning

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Location
Kampala Road

👤 Customer
ABC Ltd
+256 XXX XXX XXX

⏱ Estimated
2 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JOB CHECKLIST

☐ Vacuum offices
☐ Clean windows
☐ Clean bathrooms
☐ Mop floors
☐ Empty bins

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ START JOB ]
```

## Job In Progress

``` text
JOB IN PROGRESS

Started 08:12 AM

████████████░░░░░░  60%

☑ Vacuum offices
☑ Clean windows
☑ Clean bathrooms
☐ Mop floors
☐ Empty bins

[ Add Photo ]

[ Report Issue ]

[ COMPLETE JOB ]
```

## Technician Completion Workflow

Technicians should be able to:

-   Start job
-   Pause job
-   Complete job
-   Complete checklist
-   Upload before photos
-   Upload after photos
-   Report an issue
-   Record materials used
-   Request materials
-   Capture customer signature
-   Add completion notes

Recommended completion record:

-   Customer
-   Technician
-   Job
-   Timestamp
-   Location/GPS where appropriate
-   Checklist
-   Before photos
-   After photos
-   Customer signature
-   Completion notes

## Mobile UX

The Technician portal should be highly responsive and optimized for
phones.

Keep the primary action accessible with a bottom action bar:

``` text
┌──────────────────────────────┐
│                              │
│      Job information         │
│                              │
│      Checklist               │
│                              │
│      Photos                  │
│                              │
├──────────────────────────────┤
│  [Start Job]                 │
└──────────────────────────────┘
```

------------------------------------------------------------------------

# 6. Sales Supervisor Portal

The Sales Supervisor dashboard should be management-first.

## Supervisor Navigation

``` text
Dashboard
Team
Leads
Pipeline
Quotations
Targets
Performance
Approvals
Reports
```

## Supervisor Dashboard

Top-level metrics:

``` text
Sales Overview                         October 2026

Revenue          Target          Deals          Conversion
$124,800         $150,000        142            31.4%
83%              ↑ 8%            ↑ 14           ↑ 2.3%
```

## Team Performance Table

``` text
TEAM PERFORMANCE

Salesperson     Revenue      Target       Deals     Conv.

Sarah           $28,400      95%          32        38%
Michael         $24,800      83%          27        34%
David           $21,200      81%          24        31%
John            $18,900      76%          21        29%
```

Provide filters:

``` text
[ This Month ▾ ] [ All Teams ▾ ] [ All Services ▾ ]
```

## Performance Visualization

Use charts sparingly but effectively.

Useful charts:

-   Revenue vs target
-   Revenue over time
-   Deals over time
-   Conversion rate
-   Team ranking
-   Target achievement

The supervisor should understand team performance within approximately
five seconds.

## Supervisor Attention Area

``` text
⚠ ATTENTION

3 salespeople below 70% of target

12 quotations awaiting follow-up

8 leads haven't been contacted in 48h

2 discount approvals pending
```

## Supervisor Approvals

Potential approval workflows:

-   Discount approval
-   Large quotation approval
-   Refund approval
-   Customer credit approval
-   Commission adjustments

------------------------------------------------------------------------

# 7. Customer Support Portal

Customer Support should feel like a help desk/ticketing system.

Primary question:

> **Which customer needs help right now?**

## Support Navigation

``` text
Dashboard
Tickets
Customers
Jobs
Complaints
Follow-ups
Knowledge Base
Reports
```

## Support Dashboard

``` text
Good morning, Sarah

24 open tickets                     + New Ticket
```

KPI cards:

``` text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Open         │ │ Urgent       │ │ Resolved     │
│ 24           │ │ 3            │ │ 18 Today     │
└──────────────┘ └──────────────┘ └──────────────┘
```

The ticket queue should be the dominant area.

``` text
CUSTOMER ISSUES

┌───────────────────────────────────────────────────────────┐
│ 🔴 HIGH                                                   │
│ ABC Ltd                                                   │
│ Cleaner didn't arrive                                    │
│ Opened 12 min ago                         [ View ]        │
├───────────────────────────────────────────────────────────┤
│ 🟠 MEDIUM                                                 │
│ John Doe                                                  │
│ Request for additional cleaning                           │
│ Opened 34 min ago                         [ View ]        │
└───────────────────────────────────────────────────────────┘
```

## Ticket Statuses

``` text
New
  ↓
Assigned
  ↓
In Progress
  ↓
Waiting
  ↓
Resolved
  ↓
Closed
```

Priority levels:

-   Critical
-   High
-   Normal
-   Low

## Customer 360 View

When support opens a customer:

``` text
ABC LTD

Office Cleaning Customer
● Active

────────────────────────────────────────

Overview | Jobs | Tickets | Quotations | Payments
```

Show:

-   Customer information
-   Current services/contracts
-   Job history
-   Quotations
-   Invoices/payments
-   Tickets
-   Complaints
-   Assigned salesperson
-   Assigned technicians
-   Activity history
-   Notes

This allows support to understand the customer before responding.

------------------------------------------------------------------------

# 8. Shared Employee Features

## Notifications

Top-right notification center:

``` text
🔔 7
```

Example:

``` text
NOTIFICATIONS

🔴 New urgent customer complaint
   5 minutes ago

🟠 Quotation requires approval
   24 minutes ago

🔵 New job assigned to you
   1 hour ago

                    View all →
```

## Employee Profile

Common profile information:

-   Name
-   Profile photo
-   Phone
-   Email
-   Department
-   Role
-   Supervisor
-   Employee ID
-   Work schedule

## Calendar

The same calendar component can be adapted by role.

Sales: - Meetings - Follow-ups - Customer appointments

Technician: - Assigned jobs

Supervisor: - Team schedule

Support: - Follow-ups - Customer appointments

## Global Search

Header search:

``` text
🔍 Search customers, jobs, quotations...
```

Example search for `ABC`:

``` text
CUSTOMERS
ABC Cleaning Ltd

JOBS
#1042 — ABC Office Cleaning

QUOTATIONS
#Q-382 — ABC Ltd

TICKETS
#T-821 — ABC complaint
```

------------------------------------------------------------------------

# 9. Shared Performance Center

Performance should be a first-class ERP feature.

Each employee should have a **My Performance** section with
role-specific metrics.

## Sales

-   Revenue
-   Deals won
-   Conversion
-   New customers
-   Follow-ups
-   Target achievement
-   Commission

## Technicians

-   Jobs completed
-   Jobs on time
-   Customer ratings
-   Rework rate
-   Attendance
-   Average job duration

## Customer Support

-   Tickets resolved
-   Response time
-   Resolution time
-   Customer satisfaction
-   Escalation rate

## Supervisors

-   Team revenue
-   Team target achievement
-   Team conversion
-   Team productivity
-   Outstanding issues

------------------------------------------------------------------------

# 10. Role-Based Navigation and Permissions

Do not build the application by simply hiding pages based on role.

Use a permission-based architecture.

``` text
User
 ├── Role
 ├── Permissions
 └── Department
```

Example permissions:

``` text
customers.view
customers.edit

leads.view
leads.create
leads.assign

quotes.view
quotes.create
quotes.approve

jobs.view
jobs.create
jobs.assign
jobs.complete

tickets.view
tickets.create
tickets.assign

sales_performance.view_self
sales_performance.view_team

discounts.approve
```

## Sales

``` text
leads.*
quotes.create
customers.view
sales_performance.view_self
```

## Sales Supervisor

``` text
leads.*
quotes.*
customers.*
sales_performance.view_self
sales_performance.view_team
discounts.approve
```

## Technician

``` text
jobs.view_assigned
jobs.update_assigned
jobs.complete
materials.request
customers.view_limited
```

## Customer Support

``` text
customers.view
tickets.*
jobs.view
```

This architecture allows future roles such as:

-   Operations Manager
-   Finance
-   HR
-   Procurement
-   Fleet Manager
-   General Manager
-   Administrator

without redesigning the entire application.

------------------------------------------------------------------------

# 11. Core ERP Workflow

Do not build the four portals as disconnected systems.

The underlying ERP should connect the full business lifecycle:

``` text
Lead
  ↓
Quotation
  ↓
Sale / Contract
  ↓
Job Scheduled
  ↓
Technician Assigned
  ↓
Job Executed
  ↓
Before/After Evidence
  ↓
Customer Confirmation
  ↓
Invoice
  ↓
Payment
  ↓
Customer Feedback
  ↓
Renewal / Repeat Service
```

The employee portal is a personalized window into this shared system.

------------------------------------------------------------------------

# 12. Customer-Centric Data Model

A customer should be the central object connecting the different
departments.

``` text
                    Customer
                       │
       ┌───────────────┼────────────────┐
       │               │                │
     Sales            Jobs           Support
       │               │                │
  Quotations      Technicians       Tickets
       │               │                │
       └───────────────┼────────────────┘
                       │
                   Payments
```

This allows employees to see the relevant history without duplicating
data across separate portals.

------------------------------------------------------------------------

# 13. UI Patterns

## Tabs

Use tabs for complex records.

Customer:

``` text
Overview | Jobs | Quotations | Invoices | Tickets | Activity
```

Job:

``` text
Overview | Checklist | Photos | Materials | Customer | Activity
```

Employee:

``` text
Overview | Performance | Schedule | Jobs | Activity
```

## Drawers

Use right-side drawers for quick previews.

Examples:

-   Customer preview
-   Lead preview
-   Job preview
-   Ticket preview
-   Employee preview

This prevents unnecessary navigation away from the current page.

## Tables

Use tables for data-heavy management views:

-   Sales performance
-   Customers
-   Leads
-   Quotations
-   Jobs
-   Tickets

Keep columns focused and allow filters/sorting.

## Row Actions

Avoid filling every row with buttons.

Prefer:

``` text
ABC Ltd
Office Cleaning
$4,800

                              ⋮
```

The `⋮` menu can contain:

-   Edit
-   Assign
-   Duplicate
-   Archive
-   Delete

Keep one primary action visually dominant.

------------------------------------------------------------------------

# 14. Visual Hierarchy

Recommended hierarchy:

### Page title

28--32px

Example:

**Sales Performance**

### Section title

18--20px

Example:

**Team Performance**

### Important data

24--30px

Example:

**\$24,800**

### Supporting information

12--14px

Example:

`↑ 12% from last month`

Do not make every element bold.

------------------------------------------------------------------------

# 15. Status Color System

Use a consistent semantic color system throughout the ERP.

  Meaning                                 Color
  --------------------------------------- --------
  Success / Completed / Paid / Active     Green
  Information / Assigned / In Progress    Blue
  Pending / Warning / Awaiting Action     Orange
  Urgent / Failed / Cancelled / Overdue   Red
  Inactive / Archived / Draft             Gray

Example:

``` text
● Completed       Green
● In Progress     Blue
● Pending         Orange
● Overdue         Red
● Draft           Gray
```

Never change the meaning of a color between screens.

------------------------------------------------------------------------

# 16. "My Work" Concept

Each role should have a personalized work area.

## Sales

-   My Leads
-   My Follow-ups
-   My Quotations
-   My Customers

## Technician

-   My Jobs
-   My Schedule
-   My Tasks

## Supervisor

-   My Team
-   My Approvals
-   My Targets

## Support

-   My Tickets
-   My Customers
-   My Follow-ups

This creates a feeling that the system is built around the employee
rather than being a giant database.

------------------------------------------------------------------------

# 17. Recommended Information Architecture

``` text
                    ERP
                     │
        ┌────────────┴────────────┐
        │                         │
     OPERATIONS                COMMERCIAL
        │                         │
   ┌────┴────┐              ┌─────┴─────┐
   │         │              │           │
Technicians Jobs          Sales      Customers
   │         │              │
   └────┬────┘              │
        │               Quotations
        │                   │
        └──────────┬────────┘
                   │
              Customer
                   │
             ┌─────┴─────┐
             │           │
           Jobs        Support
             │           │
             └─────┬─────┘
                   │
              Performance
```

------------------------------------------------------------------------

# 18. Recommended Base Page Template

Use this page structure across the application:

``` text
┌────────────────────────────────────────────────────────────┐
│ GLOBAL HEADER                                               │
│ Search                         Notifications   Profile      │
├─────────────┬──────────────────────────────────────────────┤
│             │ PAGE HEADER                                  │
│ SIDEBAR     │ Title                     Primary Action     │
│             │                                              │
│             ├──────────────────────────────────────────────┤
│             │ KPI / SUMMARY                                │
│             │                                              │
│             ├──────────────────────────────────────────────┤
│             │ MAIN WORK                                    │
│             │                                              │
│             │                                              │
│             ├──────────────────────────────────────────────┤
│             │ SECONDARY INFORMATION                        │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

The structure stays consistent while the main work area changes
according to role.

------------------------------------------------------------------------

# 19. Recommended Design System Components

Build reusable components before building every individual portal page.

### Layout

-   AppShell
-   Sidebar
-   Header
-   PageHeader
-   ContentContainer
-   Section

### Navigation

-   SidebarItem
-   Breadcrumbs
-   Tabs
-   Pagination

### Data

-   DataTable
-   KPI Card
-   Stat Card
-   Chart Card
-   Empty State
-   Activity Timeline

### Actions

-   Primary Button
-   Secondary Button
-   Icon Button
-   Dropdown Menu
-   Command/Search
-   Quick Action

### Feedback

-   Notification
-   Toast
-   Alert
-   Confirmation Dialog
-   Status Badge

### Records

-   Customer Card
-   Job Card
-   Lead Card
-   Ticket Card
-   Employee Card
-   Activity Item

### Overlays

-   Modal
-   Drawer
-   Popover
-   Tooltip

------------------------------------------------------------------------

# 20. Recommended Build Order

Build the UI in this order:

## Phase 1 --- Global foundation

1.  Application shell
2.  Sidebar
3.  Header
4.  Search
5.  Notifications
6.  User profile
7.  Responsive layout

## Phase 2 --- Design system

Build reusable:

-   Cards
-   Tables
-   Buttons
-   Badges
-   Forms
-   Modals
-   Drawers
-   Tabs
-   Filters
-   Empty states

## Phase 3 --- Sales

Build:

1.  Sales dashboard
2.  Leads
3.  Customers
4.  Quotations
5.  Follow-ups
6.  Performance
7.  Pipeline

## Phase 4 --- Technician

Build:

1.  Technician dashboard
2.  My Jobs
3.  Job detail
4.  Checklist
5.  Start/stop workflow
6.  Before/after photos
7.  Materials
8.  Customer signature
9.  Job completion

## Phase 5 --- Sales Supervisor

Build:

1.  Supervisor dashboard
2.  Team performance
3.  Sales pipeline
4.  Targets
5.  Approvals
6.  Reports

## Phase 6 --- Customer Support

Build:

1.  Support dashboard
2.  Ticket queue
3.  Ticket detail
4.  Customer 360
5.  Job status
6.  Complaints
7.  Follow-ups

## Phase 7 --- Shared functionality

Build:

1.  Performance center
2.  Notifications
3.  Global search
4.  Calendar
5.  Activity timeline
6.  Role-based permissions

------------------------------------------------------------------------

# 21. Final UX Principle

The ERP should feel like four specialized tools built on one shared
platform:

``` text
                    ONE ERP
                       │
       ┌───────────────┼────────────────┐
       │               │                │
     SALES          OPERATIONS        SUPPORT
       │               │                │
    Revenue           Jobs            Tickets
    Leads             Tasks           Customers
    Quotes            Photos          Complaints
    Customers         Materials       Follow-ups
       │               │                │
       └───────────────┼────────────────┘
                       │
                 SHARED DATA
                       │
              Customers / Jobs /
          Employees / Payments /
             Performance
```

The goal is not to show employees everything the ERP can do.

The goal is to show each employee **exactly what they need to do their
job efficiently**, while allowing the entire company to operate on the
same underlying data.
