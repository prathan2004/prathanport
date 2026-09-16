# Phase 4 - Row Level Security Policies

## What This Phase Builds

Phase 4 enables Row Level Security and creates policies for:

- Member profile access.
- Admin member management.
- Member running record ownership.
- Admin running record approval workflow.
- Challenge visibility and management.
- Challenge joining.
- Supabase Storage evidence access.

SQL file:

```text
sql/phase-04-rls.sql
```

Run this file after `sql/phase-03-schema.sql`.

## Files Created

```text
mh/sql/phase-04-rls.sql
mh/docs/phase-04-rls-policies.md
```

## Security Model

Members can:

- Read active member profiles for leaderboard display.
- Read and update their own profile.
- Insert their own running records as `pending`.
- Read their own running records.
- Update or delete their own `pending` or `rejected` running records.
- Join active challenges.
- Upload evidence only to their own Storage folder.

Admins can:

- Manage all profiles.
- Read, approve, reject, update, and delete all running records.
- Manage all challenges.
- Manage all challenge memberships.
- Read all evidence images.

## Important Rules

The frontend must never include a Supabase `service_role` key.

Use only:

```text
anon / publishable key
```

Admin permission is checked by:

```text
public.is_admin()
```

Active member permission is checked by:

```text
public.is_active_member()
```

These functions read the authenticated user's profile from Supabase, not data passed from the browser.

## Storage Bucket

Bucket:

```text
running-evidence
```

Path format:

```text
{user_id}/{record_id}/evidence.jpg
```

Allowed MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`

Maximum file size:

```text
5 MB
```

## Testing Steps

1. Run `sql/phase-03-schema.sql`.
2. Run `sql/phase-04-rls.sql`.
3. Create a normal member account.
4. Confirm member can read and update own profile.
5. Confirm member cannot set own role to `admin`.
6. Confirm member can insert a `pending` running record.
7. Confirm member cannot insert an `approved` running record.
8. Confirm member cannot read another user's private running records.
9. Promote a test user to admin manually in Supabase Table Editor.
10. Confirm admin can approve or reject running records.
11. Confirm member can upload evidence only to their own folder.

## Known Follow-Up

Phase 5 should implement frontend authentication and route protection using these policies.
