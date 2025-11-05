// ====================================
// CECOOS TRACKING MARITIME - BACKEND V2
// ====================================
// Technologie: Express.js + PostgreSQL
// Fonctionnalités: API Voyages + Calcul position inversée

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const http = require('http');
const socketIo = require('socket.io');

// ====================================
// CONFIGURATION
// ====================================

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// Middleware
app.use(cors());
app.use(express.json());

// ====================================
// BASE DE DONNÉES
// ====================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

// Test de connexion
pool.on('error', (err) => {
  console.error('Erreur Pool PostgreSQL:', err);
});

// ====================================
// FONCTIONS UTILITAIRES
// ====================================

/**
 * Calculer la date de départ à partir de l'arrivée et la durée
 * @param {Date} dateArrivee - Date d'arrivée fixe
 * @param {number} dureesJours - Durée du voyage en jours (ex: 21.42 pour 21j10h)
 * @returns {Date} Date de départ calculée
 */
function calculerDateDepart(dateArrivee, dureesJours) {
  const arrivee = new Date(dateArrivee);
  const dureesMs = dureesJours * 24 * 60 * 60 * 1000;
  const depart = new Date(arrivee.getTime() - dureesMs);
  return depart;
}

/**
 * Calculer la progression actuelle du voyage (0 à 1)
 * @param {Date} dateDepart - Date de départ
 * @param {Date} dateArrivee - Date d'arrivée
 * @returns {number} Progression (0 à 1)
 */
function calculerProgression(dateDepart, dateArrivee) {
  const maintenant = new Date();
  const depart = new Date(dateDepart);
  const arrivee = new Date(dateArrivee);
  
  // Si déjà arrivé
  if (maintenant >= arrivee) {
    return 1.0;
  }
  
  // Si pas encore parti
  if (maintenant <= depart) {
    return 0.0;
  }
  
  const tempsTotalMs = arrivee.getTime() - depart.getTime();
  const tempsEcoulesMs = maintenant.getTime() - depart.getTime();
  
  return tempsEcoulesMs / tempsTotalMs;
}

/**
 * Interpoler une position entre deux points GPS
 * Utilise la formule sphérique (grand-cercle)
 */
function interpolerPosition(lat1, lon1, lat2, lon2, progression) {
  // Convertir en radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  // Distance angulaire (formule haversine)
  const a = Math.sin((φ2 - φ1) / 2) ** 2 + 
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Interpolation sphérique (SLERP)
  const A = Math.sin((1 - progression) * δ) / Math.sin(δ);
  const B = Math.sin(progression * δ) / Math.sin(δ);
  
  const x = A * Math.cos(φ1) * Math.cos(0) + 
            B * Math.cos(φ2) * Math.cos(Δλ);
  const y = A * Math.cos(φ1) * Math.sin(0) + 
            B * Math.cos(φ2) * Math.sin(Δλ);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  
  const φ = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2));
  const λ = Math.atan2(y, x);
  
  const latResult = (φ * 180) / Math.PI;
  const lonResult = (λ * 180) / Math.PI;
  
  return { lat: latResult, lon: lonResult };
}

/**
 * Calculer la position actuelle d'un voyage
 */
async function calculerPositionActuelle(voyageId) {
  try {
    const result = await pool.query(
      `SELECT * FROM voyages WHERE voyage_id = $1`,
      [voyageId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const voyage = result.rows[0];
    const progression = calculerProgression(voyage.departure_date, voyage.arrival_date);
    const position = interpolerPosition(
      voyage.departure_lat,
      voyage.departure_lon,
      voyage.arrival_lat,
      voyage.arrival_lon,
      progression
    );
    
    const distance_nm = voyage.distance_nm;
    const distanceParcourue = distance_nm * progression;
    const distanceRestante = distance_nm * (1 - progression);
    
    return {
      voyage_id: voyageId,
      timestamp: new Date().toISOString(),
      position: position,
      progression: Math.round(progression * 100) / 100,
      progression_percent: Math.round(progression * 10000) / 100,
      distance_parcourue: Math.round(distanceParcourue * 100) / 100,
      distance_restante: Math.round(distanceRestante * 100) / 100,
      distance_totale: voyage.distance_nm,
      vitesse_noeuds: voyage.speed_knots,
      status: progression >= 1.0 ? 'arrived' : (progression > 0 ? 'in_transit' : 'not_started'),
      arrival_date: voyage.arrival_date,
      eta: voyage.arrival_date
    };
  } catch (error) {
    console.error('Erreur calcul position:', error);
    return null;
  }
}

// ====================================
// ROUTES API
// ====================================

/**
 * GET /health
 * Vérifier que le serveur est en ligne
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/voyages
 * Créer un nouveau voyage
 * Body:
 * {
 *   "name": "Dar es Salaam to Shanghai",
 *   "departure_port": "Dar es Salaam",
 *   "departure_lat": -6.8016,
 *   "departure_lon": 39.2948,
 *   "arrival_port": "Shanghai",
 *   "arrival_lat": 31.2304,
 *   "arrival_lon": 121.4737,
 *   "arrival_date": "2025-11-12T18:00:00Z",
 *   "duration_days": 21.42,
 *   "speed_knots": 14,
 *   "distance_nm": 7004
 * }
 */
app.post('/api/voyages', async (req, res) => {
  try {
    const {
      name,
      departure_port,
      departure_lat,
      departure_lon,
      arrival_port,
      arrival_lat,
      arrival_lon,
      arrival_date,
      duration_days,
      speed_knots,
      distance_nm
    } = req.body;
    
    // Générer un ID unique
    const voyage_id = `VOYAGE-${Date.now()}`;
    const tracking_id = `CECOOS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Calculer la date de départ
    const dateArrivee = new Date(arrival_date);
    const dateDepart = calculerDateDepart(dateArrivee, duration_days);
    
    // Insérer dans la base de données
    const result = await pool.query(
      `INSERT INTO voyages 
       (voyage_id, tracking_id, name, departure_port, departure_lat, departure_lon, 
        arrival_port, arrival_lat, arrival_lon, departure_date, arrival_date, 
        speed_knots, distance_nm, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        voyage_id,
        tracking_id,
        name,
        departure_port,
        departure_lat,
        departure_lon,
        arrival_port,
        arrival_lat,
        arrival_lon,
        dateDepart,
        dateArrivee,
        speed_knots,
        distance_nm,
        'active'
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Voyage créé avec succès',
      voyage: {
        voyage_id: result.rows[0].voyage_id,
        tracking_id: result.rows[0].tracking_id,
        name: result.rows[0].name,
        departure_date: result.rows[0].departure_date,
        arrival_date: result.rows[0].arrival_date,
        status: result.rows[0].status
      }
    });
    
  } catch (error) {
    console.error('Erreur création voyage:', error);
    res.status(500).json({ error: 'Erreur lors de la création du voyage' });
  }
});

/**
 * GET /api/voyages
 * Récupérer tous les voyages actifs
 */
app.get('/api/voyages', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM voyages WHERE status = 'active' ORDER BY departure_date DESC`
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      voyages: result.rows
    });
    
  } catch (error) {
    console.error('Erreur récupération voyages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des voyages' });
  }
});

/**
 * GET /api/voyages/:voyage_id
 * Récupérer les détails d'un voyage
 */
app.get('/api/voyages/:voyage_id', async (req, res) => {
  try {
    const { voyage_id } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM voyages WHERE voyage_id = $1`,
      [voyage_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voyage non trouvé' });
    }
    
    res.json({
      success: true,
      voyage: result.rows[0]
    });
    
  } catch (error) {
    console.error('Erreur récupération voyage:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du voyage' });
  }
});

/**
 * GET /api/voyages/:voyage_id/position
 * Calculer et retourner la position actuelle d'un voyage
 */
app.get('/api/voyages/:voyage_id/position', async (req, res) => {
  try {
    const { voyage_id } = req.params;
    
    const position = await calculerPositionActuelle(voyage_id);
    
    if (!position) {
      return res.status(404).json({ error: 'Voyage non trouvé' });
    }
    
    res.json({
      success: true,
      data: position
    });
    
  } catch (error) {
    console.error('Erreur calcul position:', error);
    res.status(500).json({ error: 'Erreur lors du calcul de position' });
  }
});

/**
 * GET /api/tracking/:tracking_id/position
 * Même chose mais avec le tracking_id (public)
 */
app.get('/api/tracking/:tracking_id/position', async (req, res) => {
  try {
    const { tracking_id } = req.params;
    
    const result = await pool.query(
      `SELECT voyage_id FROM voyages WHERE tracking_id = $1`,
      [tracking_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tracking ID non trouvé' });
    }
    
    const voyage_id = result.rows[0].voyage_id;
    const position = await calculerPositionActuelle(voyage_id);
    
    res.json({
      success: true,
      data: position
    });
    
  } catch (error) {
    console.error('Erreur calcul position:', error);
    res.status(500).json({ error: 'Erreur lors du calcul de position' });
  }
});

/**
 * DELETE /api/voyages/:voyage_id
 * Supprimer un voyage
 */
app.delete('/api/voyages/:voyage_id', async (req, res) => {
  try {
    const { voyage_id } = req.params;
    
    const result = await pool.query(
      `DELETE FROM voyages WHERE voyage_id = $1 RETURNING voyage_id`,
      [voyage_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voyage non trouvé' });
    }
    
    res.json({
      success: true,
      message: 'Voyage supprimé'
    });
    
  } catch (error) {
    console.error('Erreur suppression voyage:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ====================================
// WEBSOCKET POUR LES MISES À JOUR EN TEMPS RÉEL
// ====================================

io.on('connection', (socket) => {
  console.log(`Client connecté: ${socket.id}`);
  
  // Écouter les demandes de tracking
  socket.on('subscribe_voyage', async (data) => {
    const { voyage_id } = data;
    socket.join(`voyage-${voyage_id}`);
    console.log(`Client ${socket.id} s'abonne au voyage: ${voyage_id}`);
    
    // Envoyer la position immédiatement
    const position = await calculerPositionActuelle(voyage_id);
    if (position) {
      socket.emit('position_update', position);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`Client déconnecté: ${socket.id}`);
  });
});

// Mettre à jour les positions tous les 10 secondes
setInterval(async () => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT voyage_id FROM voyages WHERE status = 'active'`
    );
    
    for (const { voyage_id } of result.rows) {
      const position = await calculerPositionActuelle(voyage_id);
      if (position) {
        io.to(`voyage-${voyage_id}`).emit('position_update', position);
      }
    }
  } catch (error) {
    console.error('Erreur mise à jour WebSocket:', error);
  }
}, 10000);

// ====================================
// DÉMARRER LE SERVEUR
// ====================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Serveur CECOOS démarré sur le port ${PORT}`);
  console.log(`📍 Backend: http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🗄️  Base de données: ${process.env.DB_HOST || 'localhost'}`);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejetée:', reason);
});
