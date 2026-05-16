# Specification: Service Monitor & Keep-Alive

## Overview
A lightweight Node.js service designed to monitor the health of the laboratory ecosystem and prevent Render free-tier services from sleeping.

## Components

### 1. Monitor Worker
- **Logic**: Periodically executes HTTP GET requests to a list of target URLs.
- **Dynamic Discovery**: The monitor fetches the list of target services from the Core API (`/projects`) at the start of each cycle.
- **Frequency**: Every 5 minutes (configured via `MONITOR_INTERVAL_MS`).
- **Timeout**: 15 seconds per request.
- **Reporting**: Logs status (UP/DOWN) and response time (latency).

### 2. Status API
- **Endpoint**: `/api/status`
- **Method**: GET
- **Response**: A JSON array containing the last known status of each service.

### 3. Dashboard UI
- **Path**: `/`
- **Technology**: Vanilla HTML/JS + CSS.
- **Visuals**: Dark mode, "Premium" aesthetics, status indicators (Green/Red).

## Target Services
The list is dynamic and fetched from the Core API. 
**Base Fallbacks**:
1.  **Core API (Node.js)**: `https://lab-core-node.onrender.com/health`
2.  **Frontend (Next.js)**: `https://lab-frontend-nextjs.vercel.app/`

## Deployment
- **Platform**: Render (Web Service).
- **Environment Variables**:
  - `PORT`: Server port (default 3001).
  - `DISCOVERY_URL`: URL to fetch projects (default `https://lab-core-node.onrender.com/projects`).
  - `MONITOR_INTERVAL_MS`: Interval between pings (default 300000).
