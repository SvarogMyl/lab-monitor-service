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
        'https://lab-spring-postgres.onrender.com/health',
        'https://lab-frontend-nextjs.vercel.app/'
    ];

const INTERVAL = parseInt(process.env.MONITOR_INTERVAL_MS) || 600000; // 10 minutes default

// State
let servicesStatus = TARGET_URLS.map(url => ({
    name: url.includes('render') ? (url.includes('spring') ? 'Backend Java' : 'Auth Service Go') : 'Frontend NextJS',
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
