# Phase 7 - Running Record

## What This Phase Builds

Phase 7 adds member running record workflows.

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
- Upload evidence image to Supabase Storage.
- Create `running_records` row with `status = pending`.
- View personal running history.

## Validation

Frontend validation checks:

- Run date must not be in the future.
- Distance must be greater than 0.
- Duration must be greater than 0.
- Evidence file must be JPG, PNG, or WebP.
- Evidence file must be 5 MB or smaller.

Database constraints and RLS still enforce the final security rules.

## Evidence Upload Path

```text
running-evidence/{user_id}/{record_id}/evidence.{ext}
```

## Testing Steps

1. Log in as a member.
2. Open `add-run.html`.
3. Add a valid run without image.
4. Confirm the row appears in `running_records` with `pending`.
5. Add another run with evidence image.
6. Confirm the image appears in Storage under the user's folder.
7. Open `history.html`.
8. Confirm both records appear.
