const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

let voyages = [];

const waypoints = {
  'DAR-SHA': [
    { name: "Dar es Salaam", lat: -6.80, lon: 39.28 },
    { name: "Bab el-Mandeb", lat: 12.58, lon: 43.48 },
    { name: "Golfe d'Aden", lat: 14.50, lon: 50.20 },
    { name: "Détroit d'Ormuz", lat: 26.06, lon: 56.54 },
    { name: "Golfe Persique", lat: 26.50, lon: 53.00 },
    { name: "Mer d'Oman", lat: 21.00, lon: 58.00 },
    { name: "Océan Indien", lat: 8.00, lon: 70.00 },
    { name: "Détroit de Malacca", lat: 2.31, lon: 102.19 },
    { name: "Mer de Chine", lat: 10.00, lon: 110.00 },
    { name: "Shanghai", lat: 31.23, lon: 121.47 }
  ]
};

function interpolatePosition(progress, waypointsList) {
  progress = Math.max(0, Math.min(1, progress));
  const segmentIndex = progress * (waypointsList.length - 1);
  const currentSegment = Math.floor(segmentIndex);
  const segmentProgress = segmentIndex - currentSegment;
  if (currentSegment >= waypointsList.length - 1) {
    return { latitude: waypointsList[waypointsList.length - 1].lat, longitude: waypointsList[waypointsList.length - 1].lon };
  }
  const start = waypointsList[currentSegment];
  const end = waypointsList[currentSegment + 1];
  return {
    latitude: start.lat + (end.lat - start.lat) * segmentProgress,
    longitude: start.lon + (end.lon - start.lon) * segmentProgress
  };
}

function calculerProgression(dateDepart, dateArrivee) {
  const now = new Date();
  const depart = new Date(dateDepart);
  const arrive = new Date(dateArrivee);
  const totalMs = arrive.getTime() - depart.getTime();
  const elapsedMs = now.getTime() - depart.getTime();
  return Math.max(0, Math.min(1, elapsedMs / totalMs));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'In-Memory' });
});

app.post('/api/voyage', (req, res) => {
  const { voyage_name, ship_name, departure_port, arrival_port, arrival_date, duration_days, distance_nm } = req.body;
  const arriveDate = new Date(arrival_date);
  const departDate = new Date(arriveDate.getTime() - duration_days * 24 * 60 * 60 * 1000);
  
  const voyage = {
    id: voyages.length + 1,
    voyage_name,
    ship_name,
    departure_port,
    arrival_port,
    departure_date: departDate.toISOString(),
    arrival_date,
    distance_nm
  };
  
  voyages.push(voyage);
  res.json({ status: 'OK', voyage });
});

app.get('/api/voyage/current', (req, res) => {
  if (voyages.length === 0) {
    return res.json({ voyage: null });
  }
  
  const voyage = voyages[voyages.length - 1];
  const progression = calculerProgression(voyage.departure_date, voyage.arrival_date);
  const wp = waypoints['DAR-SHA'];
  const current_position = interpolatePosition(progression, wp);
  
  res.json({
    voyage,
    current_position,
    progress: Math.round(progression * 100),
    departure: { port: voyage.departure_port, lat: wp[0].lat, lon: wp[0].lon },
    arrival: { port: voyage.arrival_port, lat: wp[wp.length-1].lat, lon: wp[wp.length-1].lon }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ CECOOS Running on port ${PORT}`);
});
