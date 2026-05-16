# Specification: Service Monitor & Keep-Alive

## Overview
A lightweight Node.js service designed to monitor the health of the laboratory ecosystem and prevent Render free-tier services from sleeping.

## Components

### 1. Monitor Worker
- **Logic**: Periodically executes HTTP GET requests to a list of target URLs.
- **Frequency**: Every 5 minutes (configured via `MONITOR_INTERVAL_MS`).
- **Timeout**: 15 seconds per request.
- **Reporting**: Logs status (UP/DOWN) and response time (latency).

### 2. Status API
- **Endpoint**: `/api/status`
- **Method**: GET
- **Response**: A JSON array containing the last known status of each service.
- **Payload Example**:
  ```json
  [
    {
      "name": "Core API (Node.js)",
      "url": "https://lab-core-node.onrender.com/api-docs",
      "status": "UP",
      "latency": 124,
      "lastChecked": "2026-05-12T01:15:00Z"
    }
  ]
  ```

### 3. Dashboard UI
- **Path**: `/`
- **Technology**: Vanilla HTML/JS + CSS.
- **Visuals**: Dark mode, "Premium" aesthetics, status indicators (Green/Red).

## Target Services (Current)
1.  **Core API (Node.js)**: `https://lab-core-node.onrender.com/api-docs`
2.  **Backend Legacy (Java)**: `https://lab-spring-postgres.onrender.com/health`
3.  **Frontend (Next.js)**: `https://lab-frontend-nextjs.vercel.app/`
4.  **Auth Service (Go)**: `https://lab-auth-service.onrender.com/health` (Pendiente despliegue)

## Deployment
- **Platform**: Render (Web Service).
- **Environment Variables**:
  - `PORT`: Server port (default 3001).
  - `TARGET_URLS`: Comma-separated list of URLs to monitor.
  - `MONITOR_INTERVAL_MS`: Interval between pings (default 300000).
