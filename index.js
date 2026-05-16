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

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// State
let servicesStatus = [];

// Discovery Logic with Retry for Cold Starts
async function discoverServices(retry = true) {
    console.log(`[Discovery] Fetching services from ${DISCOVERY_URL}...`);
    try {
        const response = await axios.get(DISCOVERY_URL, { timeout: 10000 });
        const projects = response.data;
        
        if (Array.isArray(projects)) {
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
            console.log(`[Discovery] Success! Monitored services: ${servicesStatus.length}`);
            return true;
        }
    } catch (error) {
        console.warn(`[Discovery] Attempt failed: ${error.message}`);
        
        if (retry) {
            console.log(`[Discovery] Possible Cold Start. Waking up Core API and waiting 30s for retry...`);
            // Attempt to wake up Core API via its health check
            axios.get('https://lab-core-node.onrender.com/health').catch(() => {});
            
            await sleep(30000); // Wait 30 seconds for Render to spin up
            return await discoverServices(false); // One retry only
        }

        // Fallback to fixed services if both attempts fail
        if (servicesStatus.length === 0) {
            console.error(`[Discovery] Discovery failed twice. Using hardcoded fallbacks.`);
            servicesStatus = FIXED_SERVICES.map(s => ({
                ...s,
                status: 'UNKNOWN',
                latency: 0,
                lastChecked: null,
                error: null
            }));
        }
        return false;
    }
}

// Monitor Worker
async function checkServices() {
    console.log(`[Monitor] Starting health check at ${new Date().toISOString()}`);
    
    // Attempt discovery
    await discoverServices();

    for (let service of servicesStatus) {
        const start = Date.now();
        try {
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
