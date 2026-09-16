# Phase 8 - Leaderboard

## What This Phase Builds

Phase 8 adds the leaderboard page.

Files:

```text
leaderboard.html
js/leaderboard.js
css/style.css
```

## Features

Ranges:

- Today
- This Week
- This Month
- All Time

Displayed fields:

- Rank
- Display name
- Run count
- Average pace
- Total distance

The logged-in user is highlighted.

## Data Source

The page calls:

```text
get_leaderboard(range_key)
```

Only approved running records are counted.

## Testing Steps

1. Create several member accounts.
2. Add approved running records for each member.
3. Open `leaderboard.html`.
4. Switch range buttons.
5. Confirm totals and rank order update.
6. Confirm the current user row is highlighted.
