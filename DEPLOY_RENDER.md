# 🚀 GUIDE DE DÉPLOIEMENT - BACKEND CECOOS SUR RENDER

## 📋 ÉTAPE 1: Préparer ton repository GitHub

### 1.1 Créer le repo

```bash
# Sur ton machine locale
mkdir cecoos-tracking-backend
cd cecoos-tracking-backend

# Initialiser Git
git init
```

### 1.2 Créer la structure des fichiers

```
cecoos-tracking-backend/
├── server-v2.js           (Backend Express)
├── database.sql           (Migrations SQL)
├── package.json          (Dépendances Node)
├── .env.example          (Variables d'environnement)
├── .gitignore           (Fichiers à ignorer)
└── README.md            (Documentation)
```

### 1.3 Créer un .gitignore

```bash
cat > .gitignore << EOF
node_modules/
.env
.env.local
.env.*.local
.DS_Store
EOF
```

### 1.4 Initialiser le repo et pusher

```bash
git add .
git commit -m "Initial commit - CECOOS Backend V2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cecoos-tracking-backend.git
git push -u origin main
```

---

## 🔧 ÉTAPE 2: Configurer PostgreSQL sur Render

### 2.1 Créer une instance PostgreSQL

1. **Va sur** https://render.com (crée un compte si nécessaire)
2. **Clique** "New +" dans le dashboard
3. **Sélectionne** "PostgreSQL"
4. **Configure:**
   - **Name:** `cecoos-db`
   - **Database:** `cecoos_db`
   - **User:** `cecoos_user`
   - **Plan:** Free (gratuit)
   - **Region:** `singapore` (ou proche de toi)
5. **Clique** "Create Database"
6. **Attends** ~2 minutes que la DB se crée

### 2.2 Récupérer les credentials

Une fois créée:
1. **Va dans** le dashboard PostgreSQL
2. **Copie** la `External Database URL` (commence par `postgresql://`)
3. **Note-la quelque part** (on en aura besoin)

**Format:** 
```
postgresql://cecoos_user:PASSWORD@dpg-xxxxx.render.com:5432/cecoos_db
```

### 2.3 Importer le schéma SQL

Option 1 (Avec psql localement):
```bash
# Si tu as psql installé
psql "postgresql://cecoos_user:PASSWORD@dpg-xxxxx.render.com:5432/cecoos_db" < database.sql
```

Option 2 (Via Render Console):
1. Va dans le dashboard PostgreSQL
2. Clique "Connect"
3. Clique "psql"
4. Copie-colle le contenu de `database.sql`

---

## 🌐 ÉTAPE 3: Créer le Web Service sur Render

### 3.1 Créer un nouveau Web Service

1. **Va sur** https://render.com/dashboard
2. **Clique** "New +" → "Web Service"
3. **Connecte** ton repo GitHub:
   - Clique "Connect account"
   - Autorise Render à accéder à GitHub
   - Sélectionne `cecoos-tracking-backend`

### 3.2 Configurer le Web Service

**Remplis les champs:**

| Champ | Valeur |
|-------|--------|
| **Name** | `cecoos-tracking-backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` (gratuit) |
| **Region** | `singapore` |

### 3.3 Ajouter les variables d'environnement

**Clique** "Advanced" puis "Add Environment Variable"

Ajoute ces variables:

```
NODE_ENV = production
DATABASE_URL = postgresql://cecoos_user:PASSWORD@dpg-xxxxx.render.com:5432/cecoos_db
CORS_ORIGIN = *
SOCKET_IO_CORS_ORIGIN = *
PORT = 5000
```

**⚠️ Important:**
- Remplace `PASSWORD` et `dpg-xxxxx` avec tes vrais values
- Copie-colle la DATABASE_URL depuis l'étape 2.2

### 3.4 Déployer

**Clique** "Create Web Service"

**Attends** ~5-10 minutes que le build se termine

**Tu verras:**
```
✓ Build successful
✓ Service live at: https://cecoos-tracking-backend-xxxx.onrender.com
```

---

## ✅ ÉTAPE 4: Tester le backend

### 4.1 Tester la santé du serveur

```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/health
```

**Réponse attendue:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T14:30:00.000Z"
}
```

### 4.2 Tester la création d'un voyage

```bash
curl -X POST https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Voyage",
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

**Réponse attendue:**
```json
{
  "success": true,
  "message": "Voyage créé avec succès",
  "voyage": {
    "voyage_id": "VOYAGE-1731234567890",
    "tracking_id": "CECOOS-ABC123XYZ",
    "name": "Test Voyage",
    "departure_date": "2025-10-22T08:00:00Z",
    "arrival_date": "2025-11-12T18:00:00Z",
    "status": "active"
  }
}
```

### 4.3 Récupérer tous les voyages

```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages
```

### 4.4 Obtenir la position actuelle

```bash
curl https://cecoos-tracking-backend-xxxx.onrender.com/api/voyages/VOYAGE-1731234567890/position
```

**Réponse attendue:**
```json
{
  "success": true,
  "data": {
    "voyage_id": "VOYAGE-1731234567890",
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
    "eta": "2025-11-12T18:00:00Z"
  }
}
```

---

## 🔗 ÉTAPE 5: Intégrer avec le Frontend

### 5.1 Configurer le Frontend

Utilise l'URL de ton backend:
```
https://cecoos-tracking-backend-xxxx.onrender.com
```

### 5.2 Exemple de requête frontend (JavaScript)

```javascript
// Récupérer la position actuelle
const trackingId = 'CECOOS-ABC123XYZ';
const response = await fetch(
  `https://cecoos-tracking-backend-xxxx.onrender.com/api/tracking/${trackingId}/position`
);
const data = await response.json();
console.log(data.data.position); // { lat: 12.5234, lon: 65.4321 }
```

### 5.3 Exemple avec Socket.io (temps réel)

```javascript
import io from 'socket.io-client';

const socket = io('https://cecoos-tracking-backend-xxxx.onrender.com');

socket.on('connect', () => {
  // S'abonner au voyage
  socket.emit('subscribe_voyage', {
    voyage_id: 'VOYAGE-1731234567890'
  });
});

socket.on('position_update', (position) => {
  console.log('Position mise à jour:', position);
  // Afficher la position sur la carte
});
```

---

## 🐛 DÉPANNAGE

### Le backend ne démarre pas

```bash
# Vérifier les logs sur Render
# Va dans le dashboard → Logs

# Erreurs courantes:
# 1. DATABASE_URL mal configurée
#    → Vérifier la URL
#    → Vérifier que la DB est alive
#
# 2. Port déjà utilisé
#    → Render gère automatiquement le PORT
#
# 3. Dépendances manquantes
#    → npm install manquait
#    → Vérifier package.json
```

### La base de données ne répond pas

```bash
# Sur Render, vérifier:
# 1. Que l'instance PostgreSQL est "Available"
# 2. Que la DATABASE_URL est correcte
# 3. Faire un restart de l'instance

# Tester la connexion:
psql "postgresql://cecoos_user:PASSWORD@dpg-xxxxx.render.com:5432/cecoos_db" -c "SELECT 1"
```

### Les API retournent des erreurs 500

```bash
# Vérifier les logs:
# Va dans Render Dashboard → Service → Logs

# Vérifier la santé:
curl https://cecoos-tracking-backend-xxxx.onrender.com/health

# Vérifier les variables d'environnement:
# Render Dashboard → Environment
```

---

## 📈 MONITORING

### Vérifier la santé du service

```bash
# Tous les 5 minutes
watch -n 300 'curl -s https://cecoos-tracking-backend-xxxx.onrender.com/health | jq'
```

### Consulter les logs

```bash
# Render Dashboard → Service → Logs
# Les logs s'affichent en temps réel
```

### Métriques de performance

```bash
# Sur Render Dashboard:
# → Metrics
# Voir:
# - CPU usage
# - Memory usage
# - Network I/O
# - Response times
```

---

## 🔐 SÉCURITÉ

### Points importants

1. **Ne commit jamais le .env:**
   ```bash
   echo ".env" >> .gitignore
   git rm --cached .env
   ```

2. **Utilise des mots de passe forts:**
   - PostgreSQL: Changé automatiquement par Render
   - API Keys: Génère-les depuis ton dashboard

3. **CORS en production:**
   ```javascript
   // Au lieu de "*", utilise:
   CORS_ORIGIN=https://cecoos.com,https://www.cecoos.com
   ```

4. **Authentification API:**
   - À implémenter dans la PHASE 2
   - Utilise des API Keys
   - Ajoute des rate limits

---

## 📞 SUPPORT

**Besoin d'aide?**

1. **Docs Render:** https://render.com/docs
2. **Docs Express:** https://expressjs.com
3. **Docs PostgreSQL:** https://www.postgresql.org/docs
4. **Docs Socket.io:** https://socket.io/docs

---

## ✅ CHECKLIST

- [ ] Repository GitHub créé
- [ ] PostgreSQL sur Render créé
- [ ] Database.sql exécuté
- [ ] Web Service créé sur Render
- [ ] Variables d'environnement configurées
- [ ] Backend démarre sans erreur
- [ ] /health répond 200
- [ ] /api/voyages crée un voyage
- [ ] /api/voyages/:id/position calcule la position
- [ ] Frontend peut se connecter au backend

---

## 🎉 BRAVO!

**Ton backend est maintenant en PRODUCTION sur Render!**

- ✅ Base de données PostgreSQL active
- ✅ API REST fonctionnelle
- ✅ WebSocket temps réel
- ✅ Calcul inversé implémenté
- ✅ Prêt pour la PHASE 2

**Prochaines étapes:**
- [ ] Créer l'Admin Panel (ÉTAPE 2)
- [ ] Améliorer le Frontend (ÉTAPE 3)
- [ ] Configurer cecoos.com (ÉTAPE 4)

---

**Version 1.0 - Backend CECOOS**  
*Déployed on Render - Production Ready ✨*
