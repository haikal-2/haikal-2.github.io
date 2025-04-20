const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Serve frontend static files
app.use(express.static(path.resolve(__dirname, '../frontend')));

// In-memory storage for tracking links and data
const trackingLinks = {};

// Helper function to get client IP address
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

// Endpoint to create a tracking link
app.post('/create', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  const id = crypto.randomBytes(8).toString('hex');
  trackingLinks[id] = {
    originalUrl: url,
    visits: []
  };
  const trackingUrl = `${req.protocol}://${req.get('host')}/track/${id}`;
  res.json({ trackingUrl });
});

// Endpoint to track the link and log location
app.get('/track/:id', async (req, res) => {
  const id = req.params.id;
  const link = trackingLinks[id];
  if (!link) {
    return res.status(404).send('Tracking link not found');
  }
  const ip = getClientIp(req);
  let location = { ip };
  try {
    // Use free IP geolocation API
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    location = {
      ip,
      city: response.data.city,
      region: response.data.region,
      country: response.data.country_name,
      latitude: response.data.latitude,
      longitude: response.data.longitude
    };
  } catch (error) {
    // Ignore geolocation errors
  }
  link.visits.push({
    timestamp: new Date().toISOString(),
    location
  });
  // Redirect to original URL
  res.redirect(link.originalUrl);
});

// Endpoint to get tracking data
app.get('/data/:id', (req, res) => {
  const id = req.params.id;
  const link = trackingLinks[id];
  if (!link) {
    return res.status(404).json({ error: 'Tracking link not found' });
  }
  res.json(link);
});

// Fallback route to serve index.html for SPA support
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// Helper function to get client IP address
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

// Endpoint to create a tracking link
app.post('/create', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  const id = crypto.randomBytes(8).toString('hex');
  trackingLinks[id] = {
    originalUrl: url,
    visits: []
  };
  const trackingUrl = `${req.protocol}://${req.get('host')}/track/${id}`;
  res.json({ trackingUrl });
});

// Endpoint to track the link and log location
app.get('/track/:id', async (req, res) => {
  const id = req.params.id;
  const link = trackingLinks[id];
  if (!link) {
    return res.status(404).send('Tracking link not found');
  }
  const ip = getClientIp(req);
  let location = { ip };
  try {
    // Use free IP geolocation API
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    location = {
      ip,
      city: response.data.city,
      region: response.data.region,
      country: response.data.country_name,
      latitude: response.data.latitude,
      longitude: response.data.longitude
    };
  } catch (error) {
    // Ignore geolocation errors
  }
  link.visits.push({
    timestamp: new Date().toISOString(),
    location
  });
  // Redirect to original URL
  res.redirect(link.originalUrl);
});

// Endpoint to get tracking data
app.get('/data/:id', (req, res) => {
  const id = req.params.id;
  const link = trackingLinks[id];
  if (!link) {
    return res.status(404).json({ error: 'Tracking link not found' });
  }
  res.json(link);
});

app.listen(port, () => {
  console.log(`Tracking link server running at http://localhost:${port}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error');
});
