# Change: Dynamic Service Discovery Implementation (May 2026)

## Problem
Hardcoding target URLs in the monitor required a code change and redeployment every time a new service was added to the ecosystem.

## Solution
Implemented a **Dynamic Discovery** mechanism:
1.  The monitor now calls the Core API's `/projects` endpoint before each health check cycle.
2.  It parses the `live_url` of each project in the database.
3.  It automatically adds these URLs to the monitoring routine.
4.  Includes a "Fixed Fallback" list to ensure core services are monitored even if the discovery API fails.

## Impact
Zero-config scaling: adding a project to the `lab-core-node` database automatically enables its keep-alive monitoring.

## Files Modified
- `index.js`: Implementation of `discoverServices()` and logic refactor.
- `openspec/specs/monitor.md`: Updated to reflect dynamic nature.
