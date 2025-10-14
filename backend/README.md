# 🚀 Strive Backend API

Backend Express.js avec Prisma et PostGIS pour l'application mobile Strive.

## 🏗️ Architecture

- **Express.js** - Framework web
- **Prisma** - ORM pour PostgreSQL
- **PostGIS** - Extensions géospatiales
- **TypeScript** - Type safety
- **CORS** - Cross-origin requests

## 🚀 Installation

```bash
cd backend
pnpm install
```

## ⚙️ Configuration

1. Copier `.env` depuis le projet principal
2. Vérifier la `DATABASE_URL`
3. Générer le client Prisma :

```bash
pnpm prisma:generate
```

## 🧪 Tests

```bash
# Test de la base de données
pnpm test:prisma

# Test du backend
pnpm test:backend

# Créer des événements de test
pnpm seed:events
```

## 🏃 Démarrage

```bash
# Mode développement
pnpm dev

# Mode production
pnpm build
pnpm start
```

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Statut simple
- `GET /api/health/detailed` - Statut détaillé

### Événements
- `GET /api/events` - Liste avec filtres
- `GET /api/events/:id` - Détail d'un événement
- `GET /api/events/stats/overview` - Statistiques
- `GET /api/events/sports/available` - Sports disponibles

### Filtres supportés
- `lat`, `lng` - Coordonnées GPS
- `radius` - Rayon en km (défaut: 10)
- `sports` - Sports (array)
- `levels` - Niveaux (array)
- `priceMin`, `priceMax` - Prix
- `dateFrom`, `dateTo` - Dates
- `limit`, `offset` - Pagination

## 🌍 Exemple d'utilisation

```bash
# Événements près de Paris
curl "http://localhost:3001/api/events?lat=48.8566&lng=2.3522&radius=5"

# Football à Paris
curl "http://localhost:3001/api/events?lat=48.8566&lng=2.3522&sports=football"

# Événements gratuits
curl "http://localhost:3001/api/events?priceMax=0"
```

## 🔧 Performance

- **PostGIS** - Calculs de distance optimisés
- **Index géospatiaux** - Requêtes <100ms
- **Pagination** - Chargement progressif
- **Cache** - (À implémenter)

## 📊 Monitoring

- Health checks intégrés
- Logs structurés avec Morgan
- Métriques de performance
- Gestion d'erreurs centralisée
