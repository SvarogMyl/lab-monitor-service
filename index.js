require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.static('public'));

// Configuration from Env
const TARGET_URLS = process.env.TARGET_URLS 
    ? process.env.TARGET_URLS.split(',').map(url => url.trim())
    : [
        'https://lab-core-node.onrender.com/api-docs',
        'https://lab-spring-postgres.onrender.com/health',
        'https://lab-frontend-nextjs.vercel.app/'
    ];

const INTERVAL = parseInt(process.env.MONITOR_INTERVAL_MS) || 300000; // 5 minutes default (safer for Render)

// Helper to identify service names based on URL
const getServiceName = (url) => {
    if (url.includes('core-node')) return 'Core API (Node.js)';
    if (url.includes('spring')) return 'Backend Legacy (Java)';
    if (url.includes('auth-service')) return 'Auth Service (Go)';
    if (url.includes('vercel.app')) return 'Frontend (Next.js)';
    return 'Unknown Service';
};

// State
let servicesStatus = TARGET_URLS.map(url => ({
    name: getServiceName(url),
    url: url,
    status: 'UNKNOWN',
    latency: 0,
    lastChecked: null,
    error: null
}));

// Monitor Worker
async function checkServices() {
    console.log(`[Monitor] Starting health check at ${new Date().toISOString()}`);
    
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
