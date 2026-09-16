# Phase 1 - System Architecture

## Goal

Build a mobile-first running record web application for about 70 members. Members can register, log in, record running distance, view history, and see leaderboards. Admins can manage members, approve or reject running records, manage challenges, and view the overall dashboard.

The app must be deployable on static hosting such as GitHub Pages, Cloudflare Pages, or Netlify.

## Technology Architecture

```text
Browser
  |
  | HTML / CSS / Vanilla JS
  | @supabase/supabase-js
  | Chart.js
  v
Supabase
  |
  | Auth
  | PostgreSQL
  | RLS Policies
  v
Static Hosting
  |
  | GitHub Pages / Cloudflare Pages / Netlify
```

## Application Layers

### 1. Presentation Layer

Files:

```text
index.html
login.html
register.html
dashboard.html
add-run.html
history.html
leaderboard.html
challenge.html
profile.html
admin.html
css/style.css
```

Responsibilities:

- Render mobile-first screens.
- Provide bottom navigation on mobile.
- Provide sidebar or top navigation on desktop.
- Validate basic form input before calling Supabase.
- Show loading, empty, success, and error states.

### 2. Client Logic Layer

Files:

```text
js/supabase.js
js/auth.js
js/dashboard.js
js/running.js
js/leaderboard.js
js/challenge.js
js/profile.js
js/admin.js
```

Responsibilities:

- Initialize Supabase client using anon/publishable key.
- Manage auth session and route protection.
- Call Supabase queries, views, and RPC functions.
- Render charts using Chart.js.
- Format pace, dates, distances, and ranking data.

### 3. Backend-as-a-Service Layer

Supabase provides:

- Authentication: email/password, session persistence, password reset.
- PostgreSQL database: profiles, running records, challenges, challenge members.
- RLS: all authorization rules.
- Views/RPC: aggregation for dashboard and leaderboard.

## User Roles

### Member

Allowed actions:

- Register, log in, log out.
- View and edit own profile.
- Add own running records.
- View own history.
- View own total distance and current ranking.
- View public leaderboard.
- Join active challenges.

### Admin

Allowed actions:

- View all members.
- Edit member status.
- View all running records.
- Approve or reject running records.
- Delete abnormal records when policy permits.
- Manage challenges.
- View admin dashboard.

## Main Flows

### Registration Flow

```text
Register form
  -> Supabase Auth signUp
  -> create row in profiles
  -> default role = member
  -> default status = active
  -> redirect to dashboard
```

Password must never be stored in `profiles`.

### Login Flow

```text
Login form
  -> Supabase Auth signInWithPassword
  -> load profile
  -> check profile.status = active
  -> redirect by role
```

### Add Running Record Flow

```text
Add run form
  -> validate date, distance, duration
  -> insert running_records status = pending
  -> show pending status
```

Pace is calculated as:

```text
pace = duration_minutes / distance_km
```

Display format:

```text
6:15 min/km
```

### Approval Flow

```text
Admin review
  -> approve or reject record
  -> approved records become visible in leaderboard totals
```

### Leaderboard Flow

```text
Select range: today / week / month / all time
  -> call SQL view or RPC
  -> aggregate only approved running_records
  -> render ranking
  -> highlight current user
```

The browser should not download all running records to calculate rankings.

## Page Map

| Page | Purpose | Access |
|---|---|---|
| `index.html` | Landing or redirect page | Public |
| `login.html` | Member login | Public |
| `register.html` | Member registration | Public |
| `dashboard.html` | Member summary and charts | Authenticated |
| `add-run.html` | Add running result | Authenticated |
| `history.html` | Own running history | Authenticated |
| `leaderboard.html` | Ranking table | Authenticated |
| `challenge.html` | Challenge list and progress | Authenticated |
| `profile.html` | Profile view/edit | Authenticated |
| `admin.html` | Admin management dashboard | Admin only |

## Navigation

Mobile bottom navigation:

```text
Dashboard
บันทึกการวิ่ง
Leaderboard
Challenge
ประวัติ
Profile
```

Desktop navigation:

```text
Sidebar or top navigation with the same sections.
```

## Security Boundaries

The frontend may validate input for user experience, but security decisions must be enforced by Supabase RLS.

Do not trust these values when sent from the browser:

- `user_id`
- `role`
- `status`
- running record status

RLS and database constraints must enforce ownership and admin privileges.

## Storage Architecture

No Supabase Storage bucket is required in this version. Image upload was removed to avoid Storage cost.

## Performance Strategy

Expected group size is about 70 members, but design should still avoid inefficient queries.

Use indexes on:

- `profiles.role`
- `profiles.status`
- `running_records.user_id`
- `running_records.run_date`
- `running_records.status`
- `challenge_members.challenge_id`
- `challenge_members.user_id`

Use SQL views or RPC for:

- Dashboard totals.
- 7-day chart.
- Monthly chart.
- Leaderboard by date range.
- Challenge progress.

## Phase 1 Deliverables

- Static frontend + Supabase architecture.
- Page map.
- Role boundaries.
- Main user/admin flows.
- Security and performance strategy.

## Test Checklist

- Confirm the architecture can deploy as static files only.
- Confirm no Node.js backend, PHP, React, Vue, or Angular is required.
- Confirm all sensitive authorization is delegated to Supabase RLS.
- Confirm leaderboard and dashboard aggregation will be handled by SQL view/RPC.
