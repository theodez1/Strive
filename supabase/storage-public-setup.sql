-- ============================================
-- Configuration du bucket PUBLIC pour photos de profil
-- ============================================
-- Ce script configure le stockage des photos de profil
-- comme un bucket PUBLIC pour un accès facile et rapide
-- (comme Facebook, Instagram, LinkedIn, etc.)
-- ============================================

-- 1. Supprimer l'ancien bucket s'il existe (et son contenu)
-- ============================================

-- Supprimer d'abord toutes les anciennes politiques
DROP POLICY IF EXISTS "Permettre upload de photos de profil" ON storage.objects;
DROP POLICY IF EXISTS "Permettre lecture publique des photos de profil" ON storage.objects;
DROP POLICY IF EXISTS "Permettre lecture authentifiée des photos de profil" ON storage.objects;
DROP POLICY IF EXISTS "Permettre suppression de ses propres photos" ON storage.objects;
DROP POLICY IF EXISTS "Permettre mise à jour de ses propres photos" ON storage.objects;

-- Supprimer le bucket s'il existe (WARNING: supprime tous les fichiers)
DELETE FROM storage.objects WHERE bucket_id = 'profile-pictures';
DELETE FROM storage.buckets WHERE id = 'profile-pictures';

-- 2. Créer le nouveau bucket PUBLIC
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,  -- BUCKET PUBLIC
  5242880,  -- 5 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 3. Créer les politiques de sécurité
-- ============================================

-- Politique 1: UPLOAD (INSERT)
-- Seuls les utilisateurs authentifiés peuvent uploader (anti-spam)
-- Format du nom: {userId}_{timestamp}.{ext}
CREATE POLICY "Permettre upload de photos de profil"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND name LIKE auth.uid()::text || '_%'
);

-- Politique 2: LECTURE (SELECT)
-- Tout le monde peut voir les photos (bucket public)
-- Pas strictement nécessaire car le bucket est public, mais bonne pratique
CREATE POLICY "Permettre lecture publique des photos de profil"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Politique 3: SUPPRESSION (DELETE)
-- Les utilisateurs peuvent supprimer uniquement leurs propres photos
CREATE POLICY "Permettre suppression de ses propres photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND name LIKE auth.uid()::text || '_%'
);

-- Politique 4: MISE À JOUR (UPDATE)
-- Les utilisateurs peuvent mettre à jour uniquement leurs propres photos
CREATE POLICY "Permettre mise à jour de ses propres photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND name LIKE auth.uid()::text || '_%'
);

-- ============================================
-- 4. Vérification
-- ============================================

-- Afficher les informations du bucket
SELECT 
  '✅ BUCKET CRÉÉ' as status,
  id, 
  name, 
  CASE 
    WHEN public THEN '✅ PUBLIC' 
    ELSE '❌ PRIVÉ' 
  END as visibility,
  file_size_limit as taille_max_bytes,
  ROUND(file_size_limit::numeric / 1024 / 1024, 2) as taille_max_MB,
  allowed_mime_types as types_autorisés,
  created_at as créé_le
FROM storage.buckets 
WHERE name = 'profile-pictures';

-- Afficher les politiques créées
SELECT 
  '✅ POLITIQUES CRÉÉES' as status,
  COUNT(*) as nombre_de_politiques,
  string_agg(policyname, ', ' ORDER BY policyname) as noms_des_politiques
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%photos de profil%';

-- ============================================
-- 🎉 Configuration terminée !
-- ============================================
--
-- Le bucket est maintenant PUBLIC avec:
-- ✅ Accès lecture pour tout le monde
-- ✅ Upload réservé aux utilisateurs authentifiés
-- ✅ Suppression/MAJ pour propriétaire uniquement
--
-- URLs des photos:
-- Format: https://xxxxx.supabase.co/storage/v1/object/public/profile-pictures/{userId}_{timestamp}.jpg
-- 
-- Ces URLs sont:
-- ✅ Permanentes (pas d'expiration)
-- ✅ Accessibles sans authentification
-- ✅ Optimisées par CDN
-- ✅ Partageables facilement
--
-- Pour tester:
-- 1. Lancez l'app mobile
-- 2. Profil → Modifier → Photo de profil
-- 3. Choisissez une image de la galerie
-- 4. L'URL publique sera enregistrée dans le profil
-- ============================================

