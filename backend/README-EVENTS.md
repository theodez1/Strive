# 🏃 Système d'Événements - Backend

Ce document explique comment utiliser le système d'événements mis en place dans le backend.

## 📋 Vue d'ensemble

Le système d'événements permet de :
- ✅ Récupérer des événements avec filtres avancés
- ✅ Gérer les événements par utilisateur (créés/rejoints)
- ✅ Filtrer par géolocalisation, sport, niveau, prix
- ✅ Obtenir des statistiques et métadonnées
- ✅ Gérer les participants et organisateurs

## 🚀 Démarrage rapide

### 1. Configuration automatique
```bash
cd backend
./scripts/setup-and-test.sh
```

### 2. Configuration manuelle
```bash
# Installer les dépendances
pnpm install

# Générer Prisma
pnpm prisma generate

# Appliquer les migrations
pnpm prisma db push

# Générer des données de test
npx ts-node scripts/seed-events.ts

# Démarrer le serveur
pnpm dev

# Tester les API (dans un autre terminal)
npx ts-node scripts/test-events-api.ts
```

## 📡 API Endpoints

### Événements généraux

#### `GET /api/events`
Récupère tous les événements avec filtres optionnels.

**Paramètres de requête :**
- `lat`, `lng` : Coordonnées pour géolocalisation
- `radius` : Rayon de recherche en km (défaut: 10)
- `sports` : Liste des sports (séparés par virgules)
- `levels` : Liste des niveaux (séparés par virgules)
- `priceMin`, `priceMax` : Fourchette de prix
- `dateFrom`, `dateTo` : Plage de dates
- `limit` : Nombre d'événements (défaut: 50)
- `offset` : Décalage pour pagination (défaut: 0)

**Exemple :**
```bash
curl "http://localhost:3001/api/events?lat=48.8566&lng=2.3522&radius=20&sports=Football,Basketball&limit=10"
```

#### `GET /api/events/:id`
Récupère un événement spécifique par ID.

#### `GET /api/events/sports/available`
Liste tous les sports disponibles.

#### `GET /api/events/stats/overview`
Statistiques générales des événements.

### Événements utilisateur

#### `GET /api/events/user/:userId/created`
Événements créés par un utilisateur.

**Paramètres :**
- `timeframe` : 'upcoming' ou 'past' (défaut: 'upcoming')
- `limit`, `offset` : Pagination

#### `GET /api/events/user/:userId/joined`
Événements rejoints par un utilisateur.

**Paramètres :**
- `timeframe` : 'upcoming' ou 'past' (défaut: 'upcoming')
- `limit`, `offset` : Pagination

## 📱 Intégration Frontend

### Service backend
Le frontend utilise le service `events-backend.ts` qui communique avec ces API :

```typescript
import { eventsBackendService } from '../services/events-backend';

// Récupérer tous les événements
const { data, error } = await eventsBackendService.getEvents({
  latitude: 48.8566,
  longitude: 2.3522,
  radius: 20,
  sports: ['Football', 'Basketball']
});

// Récupérer les événements d'un utilisateur
const createdEvents = await eventsBackendService.getUserCreatedEvents('user-id', {
  timeframe: 'upcoming'
});

const joinedEvents = await eventsBackendService.getUserJoinedEvents('user-id', {
  timeframe: 'upcoming'
});
```

### Configuration
Assurez-vous que l'URL du backend est correcte dans `events-backend.ts` :

```typescript
this.baseURL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';
```

## 🗄️ Base de données

### Tables principales
- `events` : Événements avec géolocalisation
- `users` : Utilisateurs/organisateurs
- `event_participants` : Participants aux événements

### Types d'événements
- **Sport** : Football, Basketball, Tennis, etc.
- **Niveau** : Beginner, Intermediate, Advanced, Expert
- **Prix** : Gratuit ou payant (en euros)

### Géolocalisation
- Utilise PostGIS pour les requêtes géospatiales
- Calcul de distance en kilomètres
- Filtrage par rayon de recherche

## 🧪 Tests

### Tests automatiques
```bash
npx ts-node scripts/test-events-api.ts
```

### Tests manuels
```bash
# Test de santé
curl http://localhost:3001/api/health

# Test des événements
curl "http://localhost:3001/api/events?limit=5"

# Test des sports
curl http://localhost:3001/api/events/sports/available
```

## 📊 Données de test

Le script de seeding génère :
- 3 utilisateurs de test
- 45 événements (15 passés, 30 futurs)
- Événements dans 8 villes françaises
- 10 sports différents
- Participants aléatoires

### Utilisateurs de test
- `organizer1@test.com` (Jean Dupont)
- `organizer2@test.com` (Marie Martin)  
- `organizer3@test.com` (Pierre Durand)

## 🔧 Développement

### Structure des fichiers
```
backend/
├── src/
│   ├── routes/events.ts          # Routes API
│   ├── services/eventsService.ts # Logique métier
│   ├── types/events.ts          # Types TypeScript
│   └── lib.ts                   # Configuration Prisma
├── scripts/
│   ├── seed-events.ts           # Génération de données
│   ├── test-events-api.ts       # Tests API
│   └── setup-and-test.sh        # Script de configuration
└── prisma/
    └── schema.prisma            # Schéma de base de données
```

### Ajout de nouvelles fonctionnalités

1. **Nouvelle route** : Ajouter dans `routes/events.ts`
2. **Logique métier** : Ajouter dans `services/eventsService.ts`
3. **Types** : Définir dans `types/events.ts`
4. **Tests** : Ajouter dans `test-events-api.ts`

## 🚨 Dépannage

### Problèmes courants

#### Le serveur ne démarre pas
```bash
# Vérifier que le port 3001 est libre
lsof -i :3001

# Vérifier les logs
tail -f logs/server.log
```

#### Erreurs de base de données
```bash
# Réinitialiser la base
pnpm prisma db push --force-reset

# Re-générer les données
npx ts-node scripts/seed-events.ts
```

#### Problèmes de géolocalisation
- Vérifier que PostGIS est installé
- Vérifier les coordonnées dans la base de données
- Tester avec des coordonnées valides

### Logs utiles
```bash
# Logs du serveur
pnpm dev

# Logs de test
npx ts-node scripts/test-events-api.ts

# Logs de seeding
npx ts-node scripts/seed-events.ts
```

## 📈 Performance

### Optimisations
- Requêtes SQL optimisées avec index
- Pagination pour les grandes listes
- Cache des sports disponibles
- Filtres géospatiaux avec PostGIS

### Monitoring
- Endpoint de santé : `/api/health`
- Statistiques : `/api/events/stats/overview`
- Logs détaillés dans la console

---

🎉 **Le système d'événements est maintenant opérationnel !**

Pour toute question ou problème, consultez les logs ou les tests API.
