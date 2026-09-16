# Phase 7 - Running Record

## What This Phase Builds

Phase 7 adds member running record workflows without image upload.

Files:

```text
add-run.html
history.html
js/running.js
css/style.css
```

## Features

- Add run date.
- Add distance in kilometers.
- Add duration in minutes.
- Auto-preview pace.
- Add note.
- Create `running_records` row with `status = pending`.
- View personal running history.

## Validation

Frontend validation checks:

- Run date must not be in the future.
- Distance must be greater than 0.
- Duration must be greater than 0.

Database constraints and RLS still enforce the final security rules.

## No Image Upload

Image evidence upload was removed to avoid Supabase Storage cost and reduce abuse risk.

## Testing Steps

1. Log in as a member.
2. Open `add-run.html`.
3. Add a valid run.
4. Confirm the row appears in `running_records` with `pending`.
5. Open `history.html`.
6. Confirm the record appears.
