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
const DISCOVERY_URL = process.env.DISCOVERY_URL || 'https://api.svasoft.cl/projects';
const INTERVAL = parseInt(process.env.MONITOR_INTERVAL_MS) || 300000; // 5 minutes

// Base services que siempre se monitorean si el discovery falla
const FIXED_SERVICES = [
    { name: 'Backend Core (Node.js)', url: 'https://api.svasoft.cl/health' },
    { name: 'Svarog Web', url: 'https://svasoft.cl' }
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
            console.log(`[Discovery] Retrying in 10s...`);
            await sleep(10000);
            return await discoverServices(false);
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
        const opts = {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SvarogMonitor/1.0)',
                'Accept': 'application/json, text/html, */*'
            }
        };
        try {
            await axios.get(service.url, opts);
            service.status = 'UP';
            service.latency = Date.now() - start;
            service.error = null;
        } catch (error) {
            const httpStatus = error.response?.status;
            // 4xx en raíz — típico en backends que solo exponen /health. Reintentar con /health.
            if ((httpStatus === 404 || httpStatus === 403) && !service.url.endsWith('/health')) {
                try {
                    const healthUrl = service.url.replace(/\/$/, '') + '/health';
                    await axios.get(healthUrl, opts);
                    service.status = 'UP';
                    service.latency = Date.now() - start;
                    service.error = null;
                } catch (healthError) {
                    service.status = 'DOWN';
                    service.latency = Date.now() - start;
                    service.error = healthError.message;
                }
            } else {
                service.status = 'DOWN';
                service.latency = Date.now() - start;
                service.error = error.message;
            }
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
