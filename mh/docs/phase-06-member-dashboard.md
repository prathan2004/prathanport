# Phase 6 - Member Dashboard

## What This Phase Builds

Phase 6 expands the member dashboard after login.

Implemented in:

```text
dashboard.html
js/dashboard.js
css/style.css
```

## Dashboard Features

Summary cards:

- Today's approved distance.
- This week's approved distance.
- This month's approved distance.
- All-time approved distance.
- Total approved runs.
- Average pace.
- Current all-time rank.
- Pending run count.

Charts:

- Running distance for the last 7 days.
- Running distance for the last 6 months.

Lists:

- Recent running records with approval status.
- Monthly leaderboard Top 5.

## Data Sources

The dashboard uses:

```text
rpc: get_member_dashboard_summary()
rpc: get_leaderboard('month')
table: running_records
```

`running_records` is filtered by RLS, so members can only load their own records. Approved records are used for charts and official totals.

## UI Notes

Chart rendering uses Chart.js from CDN.

The dashboard is mobile-first:

- Summary cards wrap naturally.
- Charts stack on small screens.
- Recent runs and leaderboard are readable on mobile.

## Testing Steps

1. Configure `js/supabase.js`.
2. Register or log in as a member.
3. Add test running records directly in Supabase for the logged-in user.
4. Set some records to `approved`.
5. Open `dashboard.html`.
6. Confirm summary cards show approved totals.
7. Confirm pending card counts pending records.
8. Confirm charts render.
9. Confirm leaderboard preview appears when approved records exist.

## Current Scope

This phase displays dashboard data. The add-running-record form is implemented in Phase 7.
