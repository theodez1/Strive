# Scripts SQL Supabase

## Configuration requise

### 1. storage-public-setup.sql ⭐
**Crée le bucket PUBLIC pour les photos de profil**

**À exécuter:** https://app.supabase.com/project/pangaakinbhlrsrplwfu/sql/new

Ce que fait le script:
- Crée le bucket `profile-pictures` (public, 5MB, jpg/png/webp)
- Configure 4 politiques de sécurité (INSERT, SELECT, DELETE, UPDATE)
- Affiche des résultats de vérification

**Résultat:** URLs publiques permanentes pour les photos de profil

---

### 2. auto-create-conversation.sql ⭐
**Crée automatiquement une conversation pour chaque événement**

**À exécuter:** https://app.supabase.com/project/pangaakinbhlrsrplwfu/sql/new

Ce que fait le script:
- Crée une fonction trigger `create_conversation_for_event()`
- Ajoute un trigger qui s'exécute après chaque création d'événement
- Crée automatiquement une conversation liée à l'événement
- **Ajoute un message système de bienvenue** avec emoji 🎉

**Résultat:** 
- Chaque événement a une conversation
- Message système: "🎉 Conversation créée ! Bienvenue dans le chat de l'événement..."
- Les participants voient immédiatement le message de bienvenue

---

### 3. auto-complete-user-profile.sql
**Complète automatiquement le profil lors de l'inscription**

**À exécuter:** https://app.supabase.com/project/pangaakinbhlrsrplwfu/sql/new

Ce que fait le script:
- Crée un trigger sur `auth.users` qui s'exécute après chaque inscription
- Copie automatiquement username, first_name, last_name depuis les metadata Auth
- Met à jour la table `users` avec ces informations

**Résultat:** Les profils sont automatiquement complétés lors de l'inscription

---

### 4. schema_final.sql
**Schéma complet de la base de données**

Contient toutes les tables, relations, triggers et politiques RLS.

---

## Ordre d'exécution recommandé

1. `schema_final.sql` (si nouvelle installation)
2. `storage-public-setup.sql` (pour les photos de profil)
3. `auto-create-conversation.sql` (pour les conversations automatiques)
4. `auto-complete-user-profile.sql` (pour compléter les profils automatiquement)

---

## Vérifications

### Vérifier le bucket photos
```sql
SELECT * FROM storage.buckets WHERE name = 'profile-pictures';
```

### Vérifier les conversations des événements récents
```sql
SELECT 
  e.name as event_name,
  e.created_at,
  c.id as conversation_id,
  COUNT(m.id) as message_count
FROM events e 
LEFT JOIN conversations c ON c.event_id = e.id 
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY e.id, e.name, e.created_at, c.id
ORDER BY e.created_at DESC 
LIMIT 10;
```

### Vérifier le trigger
```sql
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers
WHERE trigger_name = 'auto_create_conversation_on_event';
```

