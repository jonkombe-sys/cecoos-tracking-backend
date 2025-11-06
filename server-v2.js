// =====================================
// CECOOS TRACKING MARITIME - BACKEND V2
// =====================================
// Technologie: Express.js + PostgreSQL
// Fonctionnalités: API Voyages + Calcul position inversée
// Route réaliste: Dar es Salaam → Shanghai avec waypoints

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

// =====================================
// CONFIGURATION
// =====================================

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// =====================================
// BASE DE DONNÉES
// =====================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

// Test de connexion
pool.on('error', (err) => {
  console.error('Erreur Pool PostgreSQL:', err);
});

// =====================================
// WAYPOINTS - Route réaliste maritime
// =====================================

const voyageWaypoints = {
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

// =====================================
// FONCTIONS UTILITAIRES
// =====================================

/**
 * Interpole la position du navire entre les waypoints
 * @param {number} progress - Progression (0 à 1)
 * @param {array} waypoints - Liste des waypoints
 * @returns {object} Position interpolée {latitude, longitude}
 */
function interpolatePosition(progress, waypoints) {
  // Assure que progress est entre 0 et 1
  progress = Math.max(0, Math.min(1, progress));

  // Calcule l'index du segment actuel
  const segmentIndex = progress * (waypoints.length - 1);
  const currentSegment = Math.floor(segmentIndex);
  const segmentProgress = segmentIndex - currentSegment;

  // Si on a dépassé le dernier waypoint
  if (currentSegment >= waypoints.length - 1) {
    const lastPoint = waypoints[waypoints.length - 1];
    return {
      latitude: lastPoint.lat,
      longitude: lastPoint.lon
    };
  }

  // Interpolation linéaire entre deux waypoints
  const start = waypoints[currentSegment];
  const end = waypoints[currentSegment + 1];

  return {
    latitude: start.lat + (end.lat - start.lat) * segmentProgress,
    longitude: start.lon + (end.lon - start.lon) * segmentProgress
  };
}

/**
 * Calcule la date de départ à partir de l'arrivée et la durée
 * @param {Date} dateArrivee - Date d'arrivée fixe
 * @param {number} dureesJours - Durée du voyage en jours (ex: 21.42 pour 21j10h)
 * @returns {Date} Date de départ calculée
 */
function calculerDateDepart(dateArrivee, dureesJours) {
  const arrive = new Date(dateArrivee);
  const dureesMs = dureesJours * 24 * 60 * 60 * 1000;
  const depart = new Date(arrive.getTime() - dureesMs);
  return depart;
}

/**
 * Calcule la progression actuelle du voyage (0 à 1)
 * @param {Date} dateDepart - Date de départ
 * @param {Date} dateArrivee - Date d'arrivée
 * @returns {number} Progression (0 à 1)
 */
function calculerProgression(dateDepart, dateArrivee) {
  const now = new Date();
  const depart = new Date(dateDepart);
  const arrive = new Date(dateArrivee);

  const totalMs = arrive.getTime() - depart.getTime();
  const elapsedMs = now.getTime() - depart.getTime();

  const progression = elapsedMs / totalMs;
  return Math.max(0, Math.min(1, progression));
}

// =====================================
// API ROUTES
// =====================================

/**
 * GET /api/voyage/current
 * Récupère le voyage actuellement en cours avec position en temps réel
 */
app.get('/api/voyage/current', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM voyages WHERE departure_date <= NOW() AND arrival_date >= NOW() LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        voyage: null,
        message: "Pas de voyage en cours"
      });
    }

    const voyage = result.rows[0];
    const progression = calculerProgression(voyage.departure_date, voyage.arrival_date);
    const waypoints = voyageWaypoints['DAR-SHA'];
    const current_position = interpolatePosition(progression, waypoints);

    // Récupère les infos de départ et arrivée
    const departure = {
      port: voyage.departure_port,
      date: voyage.departure_date,
      latitude: waypoints[0].lat,
      longitude: waypoints[0].lon
    };

    const arrival = {
      port: voyage.arrival_port,
      date: voyage.arrival_date,
      latitude: waypoints[waypoints.length - 1].lat,
      longitude: waypoints[waypoints.length - 1].lon
    };

    res.json({
      voyage: {
        id: voyage.voyage_id,
        name: voyage.voyage_name,
        ship: voyage.ship_name
      },
      current_position,
      progress: Math.round(progression * 100),
      departure,
      arrival
    });

  } catch (error) {
    console.error('Erreur API /voyage/current:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/voyages
 * Récupère tous les voyages
 */
app.get('/api/voyages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM voyages ORDER BY departure_date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur API /voyages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/voyage
 * Crée un nouveau voyage
 */
app.post('/api/voyage', async (req, res) => {
  try {
    const {
      voyage_name,
      ship_name,
      departure_port,
      arrival_port,
      arrival_date,
      duration_days,
      distance_nm
    } = req.body;

    const departure_date = calculerDateDepart(new Date(arrival_date), duration_days);

    const result = await pool.query(
      `INSERT INTO voyages 
        (voyage_name, ship_name, departure_port, arrival_port, departure_date, arrival_date, distance_nm)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [voyage_name, ship_name, departure_port, arrival_port, departure_date, arrival_date, distance_nm]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur API POST /voyage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/voyage/:id
 * Récupère un voyage spécifique avec position en temps réel
 */
app.get('/api/voyage/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM voyages WHERE voyage_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voyage non trouvé' });
    }

    const voyage = result.rows[0];
    const progression = calculerProgression(voyage.departure_date, voyage.arrival_date);
    const waypoints = voyageWaypoints['DAR-SHA'];
    const current_position = interpolatePosition(progression, waypoints);

    res.json({
      voyage,
      current_position,
      progress: Math.round(progression * 100)
    });

  } catch (error) {
    console.error('Erreur API /voyage/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/voyage/:id
 * Supprime un voyage
 */
app.delete('/api/voyage/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM voyages WHERE voyage_id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voyage non trouvé' });
    }

    res.json({ message: 'Voyage supprimé', voyage: result.rows[0] });
  } catch (error) {
    console.error('Erreur API DELETE /voyage/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health
 * Vérifier l'état du serveur
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

// =====================================
// SOCKET.IO - Real-time updates
// =====================================

io.on('connection', (socket) => {
  console.log('✓ Client connecté:', socket.id);

  // Envoie la position actuelle au client
  socket.on('get-position', async () => {
    try {
      const result = await pool.query(
        `SELECT * FROM voyages WHERE departure_date <= NOW() AND arrival_date >= NOW() LIMIT 1`
      );

      if (result.rows.length > 0) {
        const voyage = result.rows[0];
        const progression = calculerProgression(voyage.departure_date, voyage.arrival_date);
        const waypoints = voyageWaypoints['DAR-SHA'];
        const position = interpolatePosition(progression, waypoints);

        socket.emit('position-update', {
          voyage_id: voyage.voyage_id,
          position,
          progress: Math.round(progression * 100),
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erreur Socket.io get-position:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('✗ Client déconnecté:', socket.id);
  });
});

// =====================================
// DÉMARRAGE DU SERVEUR
// =====================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('================================================');
  console.log('🚢 CECOOS TRACKING MARITIME - BACKEND V2');
  console.log('================================================');
  console.log(`✅ Serveur CECOOS démarré sur le port ${PORT}`);
  console.log(`✅ Backend: http://localhost:${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
  console.log('================================================');
});

// =====================================
// EXPORT (pour tests)
// =====================================

module.exports = { app, server, pool };
