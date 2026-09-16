# Phase 11 - Security Review

## Review Scope

Phase 11 reviews the current static frontend and Supabase security model.

Reviewed areas:

- Authentication.
- Authorization.
- RLS.
- Input validation.
- XSS prevention.
- Secret management.
- Admin-only actions.

## Current Controls

### Authentication

Supabase Auth handles:

- Email/password registration.
- Login.
- Logout.
- Session persistence.
- Password reset.

### Authorization

Supabase RLS controls:

- Member profile access.
- Own running records.
- Admin access to all records.
- Challenge joins.

### Secret Management

Frontend uses:

```text
SUPABASE_ANON_KEY
```

Frontend must never use:

```text
service_role key
```

### XSS Prevention

Dynamic display text uses `escapeHtml()` in the list-rendering scripts.

### Upload Policy

Image upload is intentionally disabled to avoid Supabase Storage cost and reduce abuse risk.

## Risks / Follow-Up

- Add stricter Content Security Policy during deployment.
- Add rate limiting if the app becomes public.
- Add audit log table for admin approvals/rejections.
- Consider anti-abuse checks for suspicious distances or pace.
- Review all Supabase SQL in a staging project before production.

## Manual Test Checklist

- Member cannot insert approved running record.
- Member cannot read another member's private running records.
- Member cannot update own role/status.
- Member cannot access admin page.
- Admin can approve/reject records.
- Leaderboard counts approved records only.

## Result

The current design keeps sensitive authorization in Supabase/RLS and does not require a custom backend or Storage bucket.
