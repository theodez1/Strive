# Strive — Application mobile de sport social

Un réseau social sportif qui permet de découvrir, créer et rejoindre des activités proches de chez soi, discuter avec les participants et suivre ses statistiques.

## 🔎 Sommaire
- Introduction rapide
- Fonctionnalités
- Architecture & dossiers
- Prérequis
- Configuration des variables d’environnement
- Setup Supabase (SQL & politiques Storage)
- Lancer le projet (mobile & backend)
- Build iOS/Android
- Icônes & Splash
- Dépannage
- Licence

---

## 🚀 Introduction rapide
- Mobile: React Native + Expo + TypeScript
- Backend: Node.js + Express + TypeScript + Prisma (PostgreSQL via Supabase)
- Auth & DB & Storage: Supabase

---

## ✅ Fonctionnalités
- Authentification via Supabase Auth
- Découvrir des activités autour de soi (filtres: sport, niveau, horaires, distance, prix)
- Créer/éditer/supprimer des événements
- Rejoindre des activités, gérer les demandes
- Conversations automatiques par événement (+ message système de bienvenue)
- Profil joueur avec statistiques, photo, partenaires de jeu
- Upload d’images (profil) dans un bucket public (URL publique)

---

## 🏗️ Architecture & dossiers
```text
strive-mobile/
├── app.json
├── App.tsx
├── assets/                        # Icônes & splash
├── components/                    # UI & composants réutilisables
├── constants/                     # Couleurs & thème
├── context/                       # Context API (Filtres, Localisation, etc.)
├── hooks/                         # Hooks personnalisés
├── lib/                           # Clients (supabase, prisma client côté app si besoin)
├── navigation/                    # Navigation principale
├── screens/                       # Écrans (discover, events, messages, profile…)
├── services/                      # Appels API, utilitaires
├── supabase/                      # SQL, docs & scripts
├── ios/ | android/                # Projets natifs
├── backend/                       # API Node + Express + Prisma
└── README.md
```

Backend:
```text
backend/
├── src/
│   ├── routes/            # endpoints Express (events, messages, users…)
│   ├── services/          # logique métier (EventsService…)
│   ├── types/             # types TS partagés backend
│   └── server.ts          # bootstrap Express
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tsconfig.json
```

---

## 🧱 Prérequis
- Node.js 18+
- pnpm (recommandé) ou npm/yarn
- Expo CLI
- Xcode (iOS) / Android Studio (Android)
- Compte Supabase (base de données + storage)

```bash
npm i -g pnpm expo-cli
```

---

## 🔐 Variables d’environnement
Créer un fichier `.env` à la racine `strive-mobile/` et un `.env` dans `strive-mobile/backend/`.

Mobile (`strive-mobile/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=...            # https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...       # clé anon
```

Backend (`strive-mobile/backend/.env`):
```env
DATABASE_URL=postgresql://...           # fourni par Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE=...               # service_role key
JWT_SECRET=change-me
PORT=4000
```

---

## 🗃️ Supabase — Setup SQL & Storage
Les scripts se trouvent dans `supabase/`.

Ordre recommandé:
1) `schema_final.sql` (si installation from scratch)
2) `storage-public-setup.sql` (bucket public pour photos de profil + RLS)
3) `auto-create-conversation.sql` (crée conversation + message système à la création d’un événement)
4) `auto-complete-user-profile.sql` (complète auto le profil à l’inscription)

Vérifications rapides:
```sql
-- Bucket public
SELECT * FROM storage.buckets WHERE name = 'profile-pictures';

-- Trigger conversations
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'auto_create_conversation_on_event';
```

Notes:
- Les photos de profil sont publiques (usage social standard, UX plus simple). Si nécessaire, passer en privé + signed URLs.

---

## ▶️ Lancer le projet
Installer les dépendances:
```bash
cd strive-mobile
pnpm install
pnpm --filter ./backend install
```

Démarrer le backend:
```bash
cd strive-mobile/backend
pnpm dev
# API sur http://localhost:4000
```

Démarrer l’app mobile:
```bash
cd strive-mobile
pnpm start
# puis i: iOS Simulator, a: Android Emulator, ou Expo Go
```

---

## 📦 Build iOS/Android (local)
```bash
cd strive-mobile
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```
Pour des builds cloud, utiliser EAS:
```bash
eas build --platform ios
EAS build --platform android
```

---

## 🖼️ Icônes & Splash
Fichiers dans `assets/`:
- `icon.png` (1024x1024)
- `adaptive-icon.png` (Android adaptatif)
- `splash-icon.png`, `notification-icon.png`

iOS: remplacer dans `ios/Strive/Images.xcassets/AppIcon.appiconset/`.
Android: remplacer dans `android/app/src/main/res/mipmap-*/`.

Voir `ICON_GUIDE.md` pour le détail.

---

## 🧰 Dépannage
- iOS Pod issues:
  ```bash
  cd ios && rm -rf Pods build && pod install && cd ..
  ```
- Android gradle cache:
  ```bash
  cd android && ./gradlew clean && cd ..
  ```
- Images React Native: utiliser `response.arrayBuffer()` (pas `blob()`)
- Problème de bande blanche Discover: unifier les backgrounds, supprimer padding/radius superflus, séparer par une bordure grise légère.

---

## 📄 Licence
MIT © Strive
