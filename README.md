# Strive - Application Mobile de Sport Social

## 🎨 Design System

### Couleurs
- **Primary**: `#0C3B2E` (Vert foncé)
- **Secondary**: `#F0F7F4` (Vert clair)
- **Accent**: `#FF6B35` (Orange)
- **Background**: `#FFFFFF` (Blanc)
- **Surface**: `#F8F9FA` (Gris très clair)

## 📁 Structure du Projet

```
strive-mobile/
├── constants/
│   ├── Colors.ts          # Palette de couleurs
│   └── Theme.ts           # Thème complet (typographie, espacement, ombres)
├── lib/
│   └── supabase.ts        # Configuration Supabase
├── services/
│   ├── auth.ts            # Service d'authentification
│   └── events.ts          # Service des événements
├── screens/
│   ├── auth/
│   │   └── AuthScreen.tsx # Écran d'authentification
│   ├── discover/
│   │   └── DiscoverScreen.tsx # Écran découverte d'événements
│   ├── events/
│   │   └── EventsScreen.tsx # Écran mes événements
│   ├── create/
│   │   └── CreateScreen.tsx # Écran création d'événement
│   ├── messages/
│   │   └── MessagesScreen.tsx # Écran conversations
│   ├── profile/
│   │   └── ProfileScreen.tsx # Écran profil utilisateur
│   └── index.ts           # Export des écrans
├── navigation/
│   └── AppNavigator.tsx   # Navigation principale
├── components/
│   ├── common/            # Composants réutilisables
│   └── forms/             # Composants de formulaires
├── types/
│   └── database.ts        # Types TypeScript pour la DB
├── utils/                 # Utilitaires
├── hooks/                 # Hooks React personnalisés
└── supabase/
    └── schema_final.sql   # Schéma de base de données
```

## 🚀 Fonctionnalités

### ✅ Implémentées
- **Authentification complète** (inscription/connexion)
- **Navigation à 5 onglets** (Découvrir, Événements, Créer, Messages, Profil)
- **Design system complet** avec couleurs personnalisées
- **Base de données Supabase** configurée avec schéma optimisé
- **Structure de projet** bien organisée
- **5 écrans principaux** entièrement fonctionnels

### 📱 Écrans disponibles
1. **Découvrir** - Liste des événements avec filtres par sport
2. **Événements** - Mes participations, créations et historique
3. **Créer** - Création d'événement en 7 étapes guidées
4. **Messages** - Conversations par événement avec statuts
5. **Profil** - Profil utilisateur complet avec statistiques

### 🔄 À développer
- Géolocalisation et recherche par proximité
- Chat temps réel avec Supabase Realtime
- Notifications push
- Système de paiement
- Photos et médias

## 🛠️ Technologies

- **React Native** + **Expo**
- **TypeScript**
- **Supabase** (Base de données + Auth)
- **Design System** personnalisé

## 📱 Démarrage

```bash
# Installation des dépendances
pnpm install

# Démarrage du serveur de développement
pnpm start
```

## 🎯 Prochaines étapes

1. Créer la navigation principale
2. Développer les écrans d'événements
3. Implémenter la géolocalisation
4. Ajouter le chat temps réel
