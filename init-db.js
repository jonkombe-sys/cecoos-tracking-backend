const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://cecoos_user:bcdIEqG3x917TKiLeD2nDeZImqUAdobd@dpg-d45l7vi4d50c73c38p7g-a.frankfurt-postgres.render.com/cecoos_db?sslmode=require'
});

async function init() {
  try {
    // Créer la table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voyages (
        voyage_id VARCHAR(50) PRIMARY KEY,
        tracking_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        departure_port VARCHAR(100) NOT NULL,
        departure_lat DECIMAL(10, 6) NOT NULL,
        departure_lon DECIMAL(10, 6) NOT NULL,
        departure_date TIMESTAMP NOT NULL,
        arrival_port VARCHAR(100) NOT NULL,
        arrival_lat DECIMAL(10, 6) NOT NULL,
        arrival_lon DECIMAL(10, 6) NOT NULL,
        arrival_date TIMESTAMP NOT NULL,
        speed_knots DECIMAL(5, 2) NOT NULL,
        distance_nm DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table voyages créée!');

    // Insérer les données
    await pool.query(`
      INSERT INTO voyages (voyage_id, tracking_id, name, departure_port, departure_lat, departure_lon, arrival_port, arrival_lat, arrival_lon, departure_date, arrival_date, speed_knots, distance_nm, status)
      VALUES ('VOYAGE-001', 'CECOOS-001', 'Dar es Salaam to Shanghai', 'Dar es Salaam', -6.8016, 39.2948, 'Shanghai', 31.2304, 121.4737, '2025-10-22 08:00:00', '2025-11-12 18:00:00', 14, 7004, 'active')
    `);
    console.log('✅ Données insérées!');

    pool.end();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

init();
