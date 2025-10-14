-- ============================================
-- Trigger: Compléter automatiquement le profil utilisateur lors de l'inscription
-- ============================================
-- Ce trigger copie les métadonnées de Supabase Auth vers la table users
-- ============================================

-- Créer la fonction qui complète le profil
CREATE OR REPLACE FUNCTION complete_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour les informations du profil depuis auth.users
  UPDATE public.users
  SET
    username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger qui se déclenche après la création d'un utilisateur Auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION complete_user_profile();

-- ============================================
-- Vérification
-- ============================================

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================
-- 🎉 Configuration terminée !
-- ============================================
--
-- Maintenant, lors de l'inscription d'un nouvel utilisateur:
-- 1. Supabase Auth crée le compte
-- 2. Le trigger copie username, first_name, last_name
-- 3. Le profil est automatiquement complété
--
-- Note: Les données dans raw_user_meta_data doivent être
-- fournies lors du signUp():
--
-- supabase.auth.signUp({
--   email: 'user@example.com',
--   password: 'password',
--   options: {
--     data: {
--       username: 'username',
--       first_name: 'First',
--       last_name: 'Last'
--     }
--   }
-- })
-- ============================================

