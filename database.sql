-- ====================================
-- CECOOS TRACKING MARITIME - MIGRATIONS PostgreSQL
-- ====================================
-- Exécute ce script pour créer la structure de la base de données

-- ====================================
-- TABLE PRINCIPALE : VOYAGES
-- ====================================

CREATE TABLE IF NOT EXISTS voyages (
  -- Identifiants
  voyage_id VARCHAR(50) PRIMARY KEY,
  tracking_id VARCHAR(50) UNIQUE NOT NULL,
  
  -- Informations du voyage
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, cancelled
  
  -- Port de départ
  departure_port VARCHAR(100) NOT NULL,
  departure_lat DECIMAL(10, 6) NOT NULL,
  departure_lon DECIMAL(10, 6) NOT NULL,
  departure_date TIMESTAMP NOT NULL,
  
  -- Port d'arrivée
  arrival_port VARCHAR(100) NOT NULL,
  arrival_lat DECIMAL(10, 6) NOT NULL,
  arrival_lon DECIMAL(10, 6) NOT NULL,
  arrival_date TIMESTAMP NOT NULL,
  
  -- Caractéristiques du voyage
  speed_knots DECIMAL(5, 2) NOT NULL,          -- Vitesse en noeuds
  distance_nm DECIMAL(10, 2) NOT NULL,         -- Distance en milles nautiques
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Index pour les recherches rapides
  INDEX idx_status (status),
  INDEX idx_departure_date (departure_date),
  INDEX idx_tracking_id (tracking_id)
);

-- ====================================
-- TABLE : POSITIONS (Historique)
-- ====================================
-- Pour tracer l'historique de toutes les positions calculées

CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  voyage_id VARCHAR(50) NOT NULL,
  
  -- Position GPS
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  
  -- Progression
  progression DECIMAL(5, 4) NOT NULL,          -- 0.0 à 1.0
  
  -- Distances
  distance_parcourue DECIMAL(10, 2) NOT NULL,
  distance_restante DECIMAL(10, 2) NOT NULL,
  
  -- Métadonnées
  timestamp_position TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Clé étrangère
  FOREIGN KEY (voyage_id) REFERENCES voyages(voyage_id) ON DELETE CASCADE,
  INDEX idx_voyage_id (voyage_id),
  INDEX idx_timestamp (timestamp_position)
);

-- ====================================
-- TABLE : WAYPOINTS (Points de passage)
-- ====================================
-- Points intermédiaires le long de la route (pour plus de précision)

CREATE TABLE IF NOT EXISTS waypoints (
  id SERIAL PRIMARY KEY,
  voyage_id VARCHAR(50) NOT NULL,
  
  -- Ordre du waypoint
  order_index INTEGER NOT NULL,
  
  -- Position GPS
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  
  -- Description (optionnel)
  description VARCHAR(255),
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Clé étrangère et index
  FOREIGN KEY (voyage_id) REFERENCES voyages(voyage_id) ON DELETE CASCADE,
  UNIQUE (voyage_id, order_index),
  INDEX idx_voyage_id (voyage_id)
);

-- ====================================
-- TABLE : EVENTS (Événements du voyage)
-- ====================================
-- Enregistrer les événements importants

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  voyage_id VARCHAR(50) NOT NULL,
  
  -- Type d'événement
  event_type VARCHAR(50) NOT NULL,  -- 'departed', 'arrived', 'delayed', 'incident', etc.
  
  -- Description
  description TEXT,
  
  -- Métadonnées
  timestamp_event TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Clé étrangère et index
  FOREIGN KEY (voyage_id) REFERENCES voyages(voyage_id) ON DELETE CASCADE,
  INDEX idx_voyage_id (voyage_id),
  INDEX idx_event_type (event_type),
  INDEX idx_timestamp (timestamp_event)
);

-- ====================================
-- TABLE : NOTIFICATIONS
-- ====================================
-- Pour les alertes et notifications

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  voyage_id VARCHAR(50) NOT NULL,
  
  -- Type de notification
  notification_type VARCHAR(50) NOT NULL,  -- 'alert', 'info', 'warning'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Statut
  is_read BOOLEAN DEFAULT FALSE,
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  
  -- Clé étrangère et index
  FOREIGN KEY (voyage_id) REFERENCES voyages(voyage_id) ON DELETE CASCADE,
  INDEX idx_voyage_id (voyage_id),
  INDEX idx_is_read (is_read)
);

-- ====================================
-- TABLE : ADMINS (Comptes administrateur)
-- ====================================
-- Pour l'accès au panneau d'administration

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Permissions
  role VARCHAR(50) DEFAULT 'admin',  -- 'admin', 'supervisor', 'viewer'
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  INDEX idx_email (email)
);

-- ====================================
-- DONNÉES D'EXEMPLE
-- ====================================

-- Exemple de voyage: Dar es Salaam → Shanghai (21j 10h)
INSERT INTO voyages 
(voyage_id, tracking_id, name, departure_port, departure_lat, departure_lon, 
 arrival_port, arrival_lat, arrival_lon, departure_date, arrival_date, 
 speed_knots, distance_nm, status)
VALUES 
('VOYAGE-DES-SH-2025-001', 'CECOOS-TRACKING-001', 'Dar es Salaam to Shanghai - Nov 2025', 
 'Dar es Salaam', -6.8016, 39.2948,
 'Shanghai', 31.2304, 121.4737,
 '2025-10-22 08:00:00', '2025-11-12 18:00:00',
 14, 7004, 'active');

-- Exemple de waypoints (points intermédiaires)
INSERT INTO waypoints (voyage_id, order_index, latitude, longitude, description)
VALUES
('VOYAGE-DES-SH-2025-001', 1, -6.8016, 39.2948, 'Départ: Dar es Salaam'),
('VOYAGE-DES-SH-2025-001', 2, 0.0, 45.0, 'Océan Indien Nord'),
('VOYAGE-DES-SH-2025-001', 3, 8.0, 65.0, 'Mer d''Arabie'),
('VOYAGE-DES-SH-2025-001', 4, 15.0, 75.0, 'Approche Inde'),
('VOYAGE-DES-SH-2025-001', 5, 20.0, 85.0, 'Asie du Sud'),
('VOYAGE-DES-SH-2025-001', 6, 25.0, 105.0, 'Asie du Sud-Est'),
('VOYAGE-DES-SH-2025-001', 7, 31.2304, 121.4737, 'Arrivée: Shanghai');

-- ====================================
-- VUE : VOYAGES_ACTIFS
-- ====================================
-- Pour avoir rapidement les voyages en cours

CREATE OR REPLACE VIEW voyages_actifs AS
SELECT 
  voyage_id,
  tracking_id,
  name,
  departure_port,
  arrival_port,
  departure_date,
  arrival_date,
  distance_nm,
  speed_knots,
  status
FROM voyages
WHERE status = 'active'
  AND arrival_date > NOW()
ORDER BY departure_date DESC;

-- ====================================
-- INDICES SUPPLÉMENTAIRES
-- ====================================

CREATE INDEX IF NOT EXISTS idx_positions_voyage_timestamp 
ON positions(voyage_id, timestamp_position DESC);

CREATE INDEX IF NOT EXISTS idx_events_voyage_timestamp 
ON events(voyage_id, timestamp_event DESC);

-- ====================================
-- MESSAGES D'INFORMATION
-- ====================================

SELECT 'Base de données CECOOS créée avec succès! 🎉' AS message;
SELECT COUNT(*) AS total_voyages FROM voyages;
SELECT COUNT(*) AS total_waypoints FROM waypoints;

-- ====================================
-- NOTES IMPORTANTES
-- ====================================
-- 
-- 1. CONNEXION POSTGRESQL:
--    User: cecoos_user
--    Password: [À configurer dans Render]
--    Host: [À copier depuis Render]
--    Database: cecoos_db
--
-- 2. DANS RENDER:
--    - Crée une instance PostgreSQL gratuite
--    - Copie la DATABASE_URL
--    - Ajoute-la dans les variables d'environnement du Web Service
--
-- 3. POUR EXÉCUTER:
--    psql postgresql://user:password@host:port/dbname < database.sql
--
-- 4. VOYAGE D'EXEMPLE:
--    Voyage ID: VOYAGE-DES-SH-2025-001
--    Tracking ID: CECOOS-TRACKING-001
--    Départ: 22 octobre 2025, 08:00
--    Arrivée: 12 novembre 2025, 18:00
--    Distance: 7004 nm
--    Vitesse: 14 noeuds
