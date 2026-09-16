# Phase 9 - Challenge

## What This Phase Builds

Phase 9 adds member-facing challenge participation.

Files:

```text
challenge.html
js/challenge.js
css/style.css
```

## Features

- List active or completed challenges visible through RLS.
- Join active challenges.
- Show target distance.
- Show date range.
- Show member progress bar.

## Data Sources

Tables:

- `challenges`
- `challenge_members`

RPC:

```text
get_challenge_progress(challenge_id_input)
```

## Testing Steps

1. Log in as admin.
2. Create an active challenge from `admin.html`.
3. Log in as a member.
4. Open `challenge.html`.
5. Join the challenge.
6. Approve running records inside the challenge date range.
7. Confirm progress increases.
