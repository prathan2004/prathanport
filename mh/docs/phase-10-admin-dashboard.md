# Phase 10 - Admin Dashboard

## What This Phase Builds

Phase 10 adds basic admin management.

Files:

```text
admin.html
js/admin.js
css/style.css
```

## Features

- Admin-only route guard.
- Member count.
- Pending running record count.
- Challenge count.
- Member list.
- Activate/inactivate members.
- Review pending running records.
- Approve or reject running records.
- Open evidence image by signed URL.
- Create active challenges.

## Security

The admin page is protected twice:

1. Frontend route guard checks `profile.role === 'admin'`.
2. Supabase RLS enforces admin privileges on database operations.

The frontend guard improves UX only. RLS is the real security boundary.

## Testing Steps

1. Manually promote a test user to admin in Supabase:

```text
profiles.role = admin
profiles.status = active
```

2. Log in as admin.
3. Open `admin.html`.
4. Approve or reject a pending run.
5. Create a challenge.
6. Toggle a member active/inactive.
7. Log in as a normal member and confirm `admin.html` redirects to `dashboard.html`.
