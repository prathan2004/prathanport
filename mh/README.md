# MH Running App

Web application for recording, verifying, and ranking running distances for a group of about 70 members.

This project is planned as a static frontend connected directly to Supabase.

## Current Phase

- Phase 1: System Architecture
- Phase 2: Database Design
- Phase 3: Supabase SQL
- Phase 4: Row Level Security
- Phase 5: Authentication
- Phase 6: Member Dashboard
- Phase 7: Running Record
- Phase 8: Leaderboard
- Phase 9: Challenge
- Phase 10: Admin Dashboard
- Phase 11: Security Review

## Documents

- [Phase 1 - System Architecture](docs/phase-01-system-architecture.md)
- [Phase 2 - Database Design](docs/phase-02-database-design.md)
- [Phase 3 - Supabase SQL](docs/phase-03-supabase-sql.md)
- [Phase 4 - RLS Policies](docs/phase-04-rls-policies.md)
- [Phase 5 - Authentication](docs/phase-05-authentication.md)
- [Phase 6 - Member Dashboard](docs/phase-06-member-dashboard.md)
- [Phase 7 - Running Record](docs/phase-07-running-record.md)
- [Phase 8 - Leaderboard](docs/phase-08-leaderboard.md)
- [Phase 9 - Challenge](docs/phase-09-challenge.md)
- [Phase 10 - Admin Dashboard](docs/phase-10-admin-dashboard.md)
- [Phase 11 - Security Review](docs/phase-11-security-review.md)

## SQL

- [Phase 3 Schema SQL](sql/phase-03-schema.sql)
- [Phase 4 RLS SQL](sql/phase-04-rls.sql)

## Planned Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Row Level Security

## Important Security Rule

The frontend must use only the Supabase anon/publishable key. Never place a `service_role` key or any secret key in browser JavaScript.
