# Change: Optimization of Availability Routine (May 2026)

## Problem
The "Cold Start" on Render was affecting the user experience in `lab-hub-nextjs` because `lab-core-node` was not included in the monitor's target list and the 10-minute interval was too close to Render's 15-minute suspension limit.

## Solution
1.  **Added `lab-core-node`** to the default `TARGET_URLS` in `index.js`.
2.  **Increased Frequency**: Reduced the monitoring interval from 10 minutes to **5 minutes**.
3.  **Refined Naming**: Implemented a helper function to provide cleaner service names in the status dashboard.

## Impact
All critical services should now remain active as long as the `lab-monitor-service` is kept awake by the external GitHub Action.

## Files Modified
- `index.js`: Logic update and URL addition.
- `openspec/specs/monitor.md`: Documentation update.
