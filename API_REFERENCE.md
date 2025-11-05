# 📚 GUIDE RAPIDE - API CECOOS BACKEND

**Backend URL:** `https://cecoos-tracking-backend-xxxx.onrender.com`

---

## 🏥 SANTÉ DU SERVEUR

### GET /health
Vérifier que le serveur est en ligne

```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/health
```

**Réponse:** 200 OK
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T14:30:00.000Z"
}
```

---

## 🚢 GESTION DES VOYAGES

### POST /api/voyages
**Créer un nouveau voyage**

```bash
curl -X POST https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dar es Salaam to Shanghai",
    "departure_port": "Dar es Salaam",
    "departure_lat": -6.8016,
    "departure_lon": 39.2948,
    "arrival_port": "Shanghai",
    "arrival_lat": 31.2304,
    "arrival_lon": 121.4737,
    "arrival_date": "2025-11-12T18:00:00Z",
    "duration_days": 21.42,
    "speed_knots": 14,
    "distance_nm": 7004
  }'
```

**Réponse:** 201 Created
```json
{
  "success": true,
  "message": "Voyage créé avec succès",
  "voyage": {
    "voyage_id": "VOYAGE-1731234567890",
    "tracking_id": "CECOOS-ABC123XYZ",
    "name": "Dar es Salaam to Shanghai",
    "departure_date": "2025-10-22T08:00:00Z",
    "arrival_date": "2025-11-12T18:00:00Z",
    "status": "active"
  }
}
```

| Paramètre | Type | Description |
|-----------|------|-------------|
| `name` | string | Nom du voyage |
| `departure_port` | string | Nom du port de départ |
| `departure_lat` | float | Latitude départ (-90 à 90) |
| `departure_lon` | float | Longitude départ (-180 à 180) |
| `arrival_port` | string | Nom du port d'arrivée |
| `arrival_lat` | float | Latitude arrivée |
| `arrival_lon` | float | Longitude arrivée |
| `arrival_date` | ISO 8601 | Date/heure d'arrivée (UTC) |
| `duration_days` | float | Durée en jours (ex: 21.42) |
| `speed_knots` | float | Vitesse en noeuds |
| `distance_nm` | float | Distance en milles nautiques |

---

### GET /api/voyages
**Récupérer tous les voyages actifs**

```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages
```

**Réponse:** 200 OK
```json
{
  "success": true,
  "count": 3,
  "voyages": [
    {
      "voyage_id": "VOYAGE-001",
      "tracking_id": "CECOOS-001",
      "name": "Dar es Salaam to Shanghai",
      "departure_port": "Dar es Salaam",
      "departure_lat": -6.8016,
      "departure_lon": 39.2948,
      "arrival_port": "Shanghai",
      "arrival_lat": 31.2304,
      "arrival_lon": 121.4737,
      "departure_date": "2025-10-22T08:00:00Z",
      "arrival_date": "2025-11-12T18:00:00Z",
      "speed_knots": 14,
      "distance_nm": 7004,
      "status": "active",
      "created_at": "2025-11-05T12:00:00Z",
      "updated_at": "2025-11-05T12:00:00Z"
    }
  ]
}
```

---

### GET /api/voyages/:voyage_id
**Récupérer les détails d'un voyage spécifique**

```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages/VOYAGE-001
```

**Réponse:** 200 OK
```json
{
  "success": true,
  "voyage": {
    "voyage_id": "VOYAGE-001",
    "tracking_id": "CECOOS-001",
    "name": "Dar es Salaam to Shanghai",
    "departure_port": "Dar es Salaam",
    "departure_lat": -6.8016,
    "departure_lon": 39.2948,
    "arrival_port": "Shanghai",
    "arrival_lat": 31.2304,
    "arrival_lon": 121.4737,
    "departure_date": "2025-10-22T08:00:00Z",
    "arrival_date": "2025-11-12T18:00:00Z",
    "speed_knots": 14,
    "distance_nm": 7004,
    "status": "active",
    "created_at": "2025-11-05T12:00:00Z",
    "updated_at": "2025-11-05T12:00:00Z"
  }
}
```

---

### DELETE /api/voyages/:voyage_id
**Supprimer un voyage**

```bash
curl -X DELETE https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages/VOYAGE-001
```

**Réponse:** 200 OK
```json
{
  "success": true,
  "message": "Voyage supprimé"
}
```

---

## 📍 TRACKING - POSITION ACTUELLE

### GET /api/voyages/:voyage_id/position
**Récupérer la position actuelle d'un voyage (par voyage_id)**

```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages/VOYAGE-001/position
```

**Réponse:** 200 OK
```json
{
  "success": true,
  "data": {
    "voyage_id": "VOYAGE-001",
    "timestamp": "2025-11-05T14:30:00.000Z",
    "position": {
      "lat": 12.5234,
      "lon": 65.4321
    },
    "progression": 0.712,
    "progression_percent": 71.2,
    "distance_parcourue": 4984.68,
    "distance_restante": 2019.32,
    "distance_totale": 7004,
    "vitesse_noeuds": 14,
    "status": "in_transit",
    "arrival_date": "2025-11-12T18:00:00Z",
    "eta": "2025-11-12T18:00:00Z"
  }
}
```

| Champ | Signification |
|-------|---------------|
| `position` | Latitude/Longitude actuelle |
| `progression` | 0 à 1 (0% à 100%) |
| `progression_percent` | 0 à 100 (format %) |
| `distance_parcourue` | Nm parcourus |
| `distance_restante` | Nm restants |
| `status` | `not_started`, `in_transit`, `arrived` |
| `eta` | Date d'arrivée estimée (= arrival_date) |

---

### GET /api/tracking/:tracking_id/position
**Récupérer la position actuelle d'un voyage (par tracking_id - PUBLIC)**

```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/api/tracking/CECOOS-001/position
```

**Réponse:** (même format que ci-dessus)

**⚠️ Utilise ce endpoint pour le frontend public!**

---

## 🔌 WEBSOCKET - TEMPS RÉEL

### Subscribe à un voyage

```javascript
import io from 'socket.io-client';

const socket = io('https://cecoos-tracking-backend-xxxx.onrender.com');

socket.on('connect', () => {
  console.log('Connecté au serveur');
  
  // S'abonner au voyage
  socket.emit('subscribe_voyage', {
    voyage_id: 'VOYAGE-001'
  });
});

// Recevoir les mises à jour (chaque 10 secondes)
socket.on('position_update', (position) => {
  console.log('Position mise à jour:', position);
  // Afficher sur la carte
});

socket.on('disconnect', () => {
  console.log('Déconnecté du serveur');
});
```

**Les updates arrivent toutes les 10 secondes**

---

## ⚙️ GESTION DES ERREURS

### 404 - Ressource non trouvée

```json
{
  "error": "Voyage non trouvé"
}
```

### 500 - Erreur serveur

```json
{
  "error": "Erreur lors de la création du voyage"
}
```

**Pour déboguer:**
1. Vérifier les logs sur Render
2. Vérifier la DATABASE_URL
3. Redémarrer le service

---

## 📝 EXEMPLES COMPLETS

### Exemple 1 : Créer et tracker un voyage

```bash
# 1. Créer un voyage
VOYAGE=$(curl -X POST https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "departure_port": "Port A",
    "departure_lat": -6.8016,
    "departure_lon": 39.2948,
    "arrival_port": "Port B",
    "arrival_lat": 31.2304,
    "arrival_lon": 121.4737,
    "arrival_date": "2025-11-12T18:00:00Z",
    "duration_days": 21.42,
    "speed_knots": 14,
    "distance_nm": 7004
  }')

# 2. Extraire le voyage_id
VOYAGE_ID=$(echo $VOYAGE | jq -r '.voyage.voyage_id')

# 3. Récupérer la position actuelle
curl https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages/$VOYAGE_ID/position | jq
```

### Exemple 2 : Frontend React

```javascript
import { useEffect, useState } from 'react';

export function TrackingPage({ trackingId }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    // Fetch la position initiale
    fetch(`https://cecoos-tracking-backend-xxxx.onrender.com/api/tracking/${trackingId}/position`)
      .then(r => r.json())
      .then(data => setPosition(data.data));

    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(() => {
      fetch(`https://cecoos-tracking-backend-xxxx.onrender.com/api/tracking/${trackingId}/position`)
        .then(r => r.json())
        .then(data => setPosition(data.data));
    }, 5000);

    return () => clearInterval(interval);
  }, [trackingId]);

  if (!position) return <div>Chargement...</div>;

  return (
    <div>
      <h2>{position.distance_parcourue} nm parcourus</h2>
      <p>Progression: {position.progression_percent}%</p>
      <p>Latitude: {position.position.lat}</p>
      <p>Longitude: {position.position.lon}</p>
      <p>ETA: {position.eta}</p>
    </div>
  );
}
```

---

## 🧪 TESTS RAPIDES

### Test 1 : Health check
```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/health
# Doit retourner: {"status":"ok",...}
```

### Test 2 : Créer un voyage
```bash
curl -X POST https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","departure_port":"A","departure_lat":0,"departure_lon":0,"arrival_port":"B","arrival_lat":1,"arrival_lon":1,"arrival_date":"2025-11-12T18:00:00Z","duration_days":21.42,"speed_knots":14,"distance_nm":7004}'
# Doit retourner: voyage_id et tracking_id
```

### Test 3 : Récupérer les voyages
```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages
# Doit retourner une liste de voyages
```

---

## 📊 DONNÉES DE TEST

### Voyage Dar es Salaam → Shanghai

```json
{
  "name": "Dar es Salaam to Shanghai",
  "departure_port": "Dar es Salaam",
  "departure_lat": -6.8016,
  "departure_lon": 39.2948,
  "arrival_port": "Shanghai",
  "arrival_lat": 31.2304,
  "arrival_lon": 121.4737,
  "arrival_date": "2025-11-12T18:00:00Z",
  "duration_days": 21.42,
  "speed_knots": 14,
  "distance_nm": 7004
}
```

**Départ calculé:** 2025-10-22 08:00 UTC  
**Progression aujourd'hui (5 nov):** ~71.2%

---

## 🔗 LIENS UTILES

- **Documentation Render:** https://render.com/docs
- **Documentation Express:** https://expressjs.com
- **PostgreSQL:** https://postgresql.org
- **Socket.io:** https://socket.io/docs

---

## 💡 TIPS & TRICKS

### Utiliser l'API depuis Node.js

```javascript
const axios = require('axios');

async function getPosition(voyageId) {
  const response = await axios.get(
    `https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages/${voyageId}/position`
  );
  return response.data.data;
}
```

### Automatiser les requêtes

```bash
# Vérifier la position toutes les 5 minutes
while true; do
  curl -s https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages/VOYAGE-001/position | jq '.data | {progression: .progression_percent, lat: .position.lat, lon: .position.lon}'
  sleep 300
done
```

---

**Version 1.0 - API Reference**  
*CECOOS Tracking Maritime Backend*
