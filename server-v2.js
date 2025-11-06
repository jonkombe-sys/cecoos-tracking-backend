// server-v2.js
// CECOOS – Backend démo "tracking virtuel" (in-memory)

const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// -------------------------
// In-memory data
// -------------------------
const voyages = Object.create(null);

// Ports connus
const PORTS = {
  'Dar es Salaam': { lat: -6.7924, lon: 39.2083 },
  'Shanghai': { lat: 31.2304, lon: 121.4737 },
};

// utils
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
function interpolatePosition(origin, destination, t01) {
  return {
    lat: origin.lat + (destination.lat - origin.lat) * t01,
    lon: origin.lon + (destination.lon - origin.lon) * t01,
  };
}
function computeProgress(departure_date, arrival_date, now = new Date()) {
  const start = new Date(departure_date).getTime();
  const end = new Date(arrival_date).getTime();
  const n = now.getTime();
  if (isNaN(start) || isNaN(end) || start >= end) return 0;
  return clamp01((n - start) / (end - start));
}

function normalizeVoyagePayload(body) {
  const {
    voyage_name,
    ship_name,
    departure_port,
    arrival_port,
    arrival_date,
    duration_days,
    distance_nm,
    origin,
    destination,
    departure_date,
  } = body;

  if (!voyage_name) throw new Error('voyage_name is required');
  if (!ship_name) throw new Error('ship_name is required');
  if (!arrival_date) throw new Error('arrival_date (ISO) is required');
  if (!departure_port && !origin) throw new Error('Provide departure_port or origin {lat, lon}');
  if (!arrival_port && !destination) throw new Error('Provide arrival_port or destination {lat, lon}');

  let originCoord = origin || PORTS[departure_port];
  let destCoord = destination || PORTS[arrival_port];
  if (!originCoord) throw new Error(`Unknown departure_port "${departure_port}"`);
  if (!destCoord) throw new Error(`Unknown arrival_port "${arrival_port}"`);

  let depDate = departure_date;
  if (!depDate) {
    if (typeof duration_days !== 'number' || !isFinite(duration_days)) {
      throw new Error('duration_days required when departure_date not provided');
    }
    const arr = new Date(arrival_date);
    if (isNaN(arr.getTime())) throw new Error('arrival_date invalid');
    const dep = new Date(arr.getTime() - duration_days * 24 * 3600 * 1000);
    depDate = dep.toISOString();
  }

  const distanceNm = typeof distance_nm === 'number' && isFinite(distance_nm) ? distance_nm : null;

  return {
    voyage_name,
    ship_name,
    departure_port: departure_port || null,
    arrival_port: arrival_port || null,
    arrival_date,
    departure_date: depDate,
    duration_days: duration_days ?? null,
    distance_nm: distanceNm,
    origin: originCoord,
    destination: destCoord,
  };
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', mode: 'in-memory', time: new Date().toISOString() });
});

app.post('/api/voyage', (req, res) => {
  try {
    const v = normalizeVoyagePayload(req.body);
    voyages[v.voyage_name] = v;

    const progress = computeProgress(v.departure_date, v.arrival_date);
    const current_position = interpolatePosition(v.origin, v.destination, progress);

    io.to(v.voyage_name).emit('update', {
      voyage_name: v.voyage_name,
      progress,
      current_position,
      ts: new Date().toISOString(),
    });

    res.json({ status: 'OK', voyage: v, progress, current_position });
  } catch (err) {
    res.status(400).json({ status: 'ERROR', message: err.message });
  }
});

app.get('/api/voyage/current', (req, res) => {
  const voyage_name = req.query.voyage_name;
  if (!voyage_name) return res.status(400).json({ status: 'ERROR', message: 'voyage_name is required' });
  const v = voyages[voyage_name];
  if (!v) return res.status(404).json({ status: 'ERROR', message: 'voyage not found' });

  const progress = computeProgress(v.departure_date, v.arrival_date);
  const current_position = interpolatePosition(v.origin, v.destination, progress);
  res.json({ status: 'OK', voyage_name, progress, current_position, ts: new Date().toISOString() });
});

// Socket.io rooms
io.on('connection', (socket) => {
  socket.on('join', (voyage_name) => { if (voyage_name) socket.join(voyage_name); });
  socket.on('leave', (voyage_name) => { if (voyage_name) socket.leave(voyage_name); });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ CECOOS demo backend running on port ${PORT}`);
});
