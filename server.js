const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
const port = 3000;

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware to log each request with timestamp, method, and URL
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Serve frontend static files from the frontend directory
app.use(express.static(path.resolve(__dirname, '../frontend')));

// In-memory storage for tracking links and their visit data
const trackingLinks = {};

/**
 * Helper function to get the client's IP address from the request headers or connection info
 * @param {object} req - Express request object
 * @returns {string|null} - IP address string or null if not found
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null)
  );
}

/**
 * Endpoint to create a new tracking link for a given URL
 * Expects JSON body with { url: string }
 * Returns JSON with { trackingUrl: string }
 */
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

/**
 * Endpoint to track visits to a tracking link by ID
 * Logs visitor IP and location using ipapi.co geolocation API
 * Stores visit data with timestamp and location
 * Redirects visitor to the original URL
 */
app.get('/track/:id', async (req, res) => {
  const id = req.params.id;
  const link = trackingLinks[id];
  if (!link) {
    return res.status(404).send('Tracking link not found');
  }
  const ip = getClientIp(req);
  let location = { ip };
  try {
    // Use free IP geolocation API to get location info
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
    // Ignore geolocation errors and fallback to IP only
  }
  link.visits.push({
    timestamp: new Date().toISOString(),
    location
  });
  // Redirect visitor to the original URL
  res.redirect(link.originalUrl);
});

/**
 * Endpoint to get tracking data for a given tracking link ID
 * Returns JSON with original URL and visits array
 */
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

// Error handling middleware to catch server errors
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Internal Server Error');
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Tracking link server running at http://localhost:${port}`);
});
