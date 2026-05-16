require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.static('public'));

// Configuration
const DISCOVERY_URL = process.env.DISCOVERY_URL || 'https://lab-core-node.onrender.com/projects';
const INTERVAL = parseInt(process.env.MONITOR_INTERVAL_MS) || 300000; // 5 minutes

// Base services that must ALWAYS be monitored (Fallbacks)
const FIXED_SERVICES = [
    { name: 'Core API (Node.js)', url: 'https://lab-core-node.onrender.com/health' },
    { name: 'Frontend (Next.js)', url: 'https://lab-frontend-nextjs.vercel.app/' }
];

// State
let servicesStatus = [];

// Helper to identify service names based on project data or URL
const getServiceName = (project, url) => {
    if (project && project.title) return project.title;
    if (url.includes('core-node')) return 'Core API (Node.js)';
    if (url.includes('spring')) return 'Backend Legacy (Java)';
    if (url.includes('auth-service')) return 'Auth Service (Go)';
    if (url.includes('vercel.app')) return 'Frontend (Next.js)';
    return 'Unknown Service';
};

// Discovery Logic
async function discoverServices() {
    console.log(`[Discovery] Fetching services from ${DISCOVERY_URL}...`);
    try {
        const response = await axios.get(DISCOVERY_URL, { timeout: 10000 });
        const projects = response.data;
        
        if (Array.isArray(projects)) {
            // Map projects to service objects
            const dynamicServices = projects
                .filter(p => p.live_url && p.live_url.trim() !== '')
                .map(p => ({
                    name: p.title,
                    url: p.live_url,
                    status: 'UNKNOWN',
                    latency: 0,
                    lastChecked: null,
                    error: null
                }));

            // Merge with fixed services (avoiding duplicates)
            const seenUrls = new Set(dynamicServices.map(s => s.url));
            const merged = [...dynamicServices];
            
            for (const fixed of FIXED_SERVICES) {
                if (!seenUrls.has(fixed.url)) {
                    merged.push({
                        ...fixed,
                        status: 'UNKNOWN',
                        latency: 0,
                        lastChecked: null,
                        error: null
                    });
                }
            }

            servicesStatus = merged;
            console.log(`[Discovery] Found ${dynamicServices.length} dynamic services. Total monitored: ${servicesStatus.length}`);
        }
    } catch (error) {
        console.error(`[Discovery] Failed to fetch dynamic services: ${error.message}`);
        // Fallback to fixed services if empty
        if (servicesStatus.length === 0) {
            servicesStatus = FIXED_SERVICES.map(s => ({
                ...s,
                status: 'UNKNOWN',
                latency: 0,
                lastChecked: null,
                error: null
            }));
        }
    }
}

// Monitor Worker
async function checkServices() {
    console.log(`[Monitor] Starting health check at ${new Date().toISOString()}`);
    
    // Always try to discover new services or update URLs before checking
    await discoverServices();

    for (let service of servicesStatus) {
        const start = Date.now();
        try {
            // We use a shorter timeout for the check to not block the loop
            const response = await axios.get(service.url, { timeout: 15000 });
            service.status = 'UP';
            service.latency = Date.now() - start;
            service.error = null;
        } catch (error) {
            service.status = 'DOWN';
            service.latency = Date.now() - start;
            service.error = error.message;
        }
        service.lastChecked = new Date().toISOString();
        console.log(`[Monitor] ${service.name}: ${service.status} (${service.latency}ms)`);
    }
}

// Initial check and interval
checkServices();
setInterval(checkServices, INTERVAL);

// API Endpoints
app.get('/api/status', (req, res) => {
    res.json(servicesStatus);
});

app.listen(PORT, () => {
    console.log(`[Server] Monitor Service running on port ${PORT}`);
});
